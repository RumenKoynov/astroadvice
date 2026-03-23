// src/screens/ThreeTarotCardsScreen.js
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ImageBackground,
  SafeAreaView,
  Animated,
  Easing,
  Image,
  TouchableOpacity,
  Dimensions,
  ScrollView,
  Modal,
  ActivityIndicator,
} from 'react-native';
import ViewShot, { captureRef } from 'react-native-view-shot';
import Share from 'react-native-share';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

import { apiFetch } from '../services/api';
import { useUser } from '../context/UserContext';
import { BYPASS_DAILY_LIMITS } from '../config/featureFlags';
import NativeAdCard from '../components/ads/NativeAdCard';
import {
  NATIVE_THREE_TAROT_AD_UNIT_ID,
  NATIVE_THREE_TAROT_READING_AD_UNIT_ID_1,
  NATIVE_THREE_TAROT_READING_AD_UNIT_ID_2,
} from '../config/admob';
import { logEvent, logScreen } from '../services/analytics';
import { PLAY_STORE_URL_ANDROID } from '../config/env';

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');
const DATE_KEY = () => new Date().toISOString().slice(0, 10); // YYYY-MM-DD

export default function ThreeTarotCardsScreen({ navigation }) {
  const { t, i18n } = useTranslation('common');
  const user = useUser();
  const insets = useSafeAreaInsets();
  const loggedScreenRef = useRef(false);
  const loggedViewedRef = useRef(false);
  const loggedGridRef = useRef(false);

  const todayKey = useMemo(() => DATE_KEY(), []);
  const savedRaw = user?.daily?.tarotThree?.[todayKey] || null;
  const bypass = BYPASS_DAILY_LIMITS;
  const useSaved = !bypass && !!savedRaw;
  const hasReading = !!savedRaw?.reading?.trim();
  const locked = useSaved && hasReading;

  // phases: 'locked' | 'loading' | 'revealing' | 'grid' | 'error'
  const [phase, setPhase] = useState(locked ? 'locked' : 'loading');
  const [cards, setCards] = useState(savedRaw?.cards || []);
  const [reading, setReading] = useState(savedRaw?.reading || '');
  const [errorMsg, setErrorMsg] = useState('');
  const [loadingReading, setLoadingReading] = useState(false);
  const [previewCard, setPreviewCard] = useState(null);
  const previewAnim = useRef(new Animated.Value(0)).current;
  const isActiveRef = useRef(true);
  const shareShotRef = useRef(null);
  const [shareLoading, setShareLoading] = useState(false);

  // Reveal state (fullscreen one-by-one)
  const [revealIndex, setRevealIndex] = useState(-1);
  const fade = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(0.98)).current;

  const animateIn = () => {
    fade.setValue(0);
    scale.setValue(0.98);
    Animated.parallel([
      Animated.timing(fade, { toValue: 1, duration: 450, easing: Easing.out(Easing.ease), useNativeDriver: true }),
      Animated.timing(scale, { toValue: 1, duration: 450, easing: Easing.out(Easing.ease), useNativeDriver: true }),
    ]).start();
  };

  useEffect(() => {
    isActiveRef.current = true;
    return () => { isActiveRef.current = false; };
  }, []);

  useEffect(() => {
    if (!loggedScreenRef.current) {
      loggedScreenRef.current = true;
      logScreen('ThreeTarot');
      logEvent('feature_opened', { feature: 'tarot_three' });
    }
  }, []);

  useEffect(() => {
    if (locked) {
      setPhase('locked');
      setCards(savedRaw?.cards || []);
      setReading(savedRaw?.reading || '');
      setRevealIndex(-1);
      setErrorMsg('');
      setLoadingReading(false);
      return;
    }
    if (useSaved) {
      if (phase === 'revealing') return;
      setPhase('grid');
      setCards(savedRaw?.cards || []);
      setReading(savedRaw?.reading || '');
      setRevealIndex(-1);
      setErrorMsg('');
      setLoadingReading(false);
    }
  }, [locked, useSaved, savedRaw?.reading, savedRaw?.cards, phase]);

  useEffect(() => {
    if (phase !== 'grid') {
      loggedGridRef.current = false;
    }
    if (phase === 'grid' && cards.length === 3 && !loggedGridRef.current) {
      loggedGridRef.current = true;
      logEvent('content_viewed', {
        feature: 'tarot_three',
        lang: i18n.language,
        is_cached: locked || useSaved ? 1 : 0,
      });
    }
  }, [phase, cards.length, i18n.language, locked, useSaved]);

  useEffect(() => {
    if (!locked) {
      loggedViewedRef.current = false;
      return;
    }
    if (savedRaw?.cards?.length === 3 && !loggedViewedRef.current) {
      loggedViewedRef.current = true;
      logEvent('content_viewed', {
        feature: 'tarot_three',
        lang: i18n.language,
        is_cached: 1,
      });
    }
  }, [locked, savedRaw?.cards, i18n.language]);

  useEffect(() => {
    if (locked || useSaved) return;
    setPhase('loading');
    setCards([]);
    setReading('');
    setRevealIndex(-1);
    setErrorMsg('');
    setLoadingReading(false);
  }, [locked, useSaved]);

  const draw = async () => {
    setPhase('loading');
    setErrorMsg('');
    logEvent('tarot_three_draw_start', { lang: i18n.language });
    try {
      const data = await apiFetch(`/threetarotcards/draw?lang=${i18n.language}`, 'GET');
      const trio = Array.isArray(data?.cards) ? data.cards.slice(0, 3) : [];
      // prefetch images
      await Promise.all(trio.map(c => (c?.imageUrl ? Image.prefetch(c.imageUrl) : Promise.resolve())));
      if (!isActiveRef.current) return;

      setCards(trio);
      setReading('');
      setPhase('revealing');
      logEvent('content_generated', { feature: 'tarot_three', lang: i18n.language });
      if (!bypass) {
        // Save cards immediately to prevent re-draw before reveal
        user.setDaily(todayKey, 'tarotThree', { cards: trio, reading: '', lang: i18n.language });
      }

      // Reveal with EXACTLY 1.5s between starts
      const startReveal = (idx = 0) => {
        if (!isActiveRef.current) return;
        setRevealIndex(idx);
        const step = idx === 0 ? 'past' : idx === 1 ? 'present' : 'future';
        logEvent('tarot_three_reveal_step', { step, lang: i18n.language });
        animateIn();
        const NEXT_DELAY_MS = 2300;
        setTimeout(() => {
          if (!isActiveRef.current) return;
          if (idx < 2) startReveal(idx + 1);
          else setTimeout(() => isActiveRef.current && setPhase('grid'), 800);
        }, NEXT_DELAY_MS);
      };
      setTimeout(() => startReveal(0), 350);
    } catch (e) {
      if (!isActiveRef.current) return;
      setErrorMsg(e?.message || 'Failed to draw cards');
      setPhase('error');
      logEvent('error_shown', {
        feature: 'tarot_three',
        code: String(e?.message || 'error').slice(0, 60),
      });
    }
  };

  // Kick off draw if not locked
  useEffect(() => {
    if (locked || useSaved) return;
    draw();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [locked, useSaved]);

  const onRevealTruth = async () => {
    if (cards.length !== 3) return;
    setLoadingReading(true);
    setErrorMsg('');
    try {
      const payload = {
        cards: cards.map(c => ({ id: c.id, name: c.name })),
        lang: i18n.language,
        spread: 'past-present-future',
      };
      const res = await apiFetch('/threetarotcards/reading', 'POST', payload);
      const text = res?.reading || '';
      setReading(text);
      logEvent('tarot_three_reading_generated', { lang: i18n.language });
      logEvent('content_generated', { feature: 'tarot_three_reading', lang: i18n.language });
      // Save reading for today â†’ lock until tomorrow
      user.setDaily(todayKey, 'tarotThree', { cards, reading: text, lang: i18n.language });
    } catch (e) {
      setErrorMsg(e?.message || 'Failed to generate reading');
      logEvent('error_shown', {
        feature: 'tarot_three_reading',
        code: String(e?.message || 'error').slice(0, 60),
      });
    } finally {
      setLoadingReading(false);
    }
  };

  const splitReadingParts = (text) => {
    if (!text) return [];
    const parts = text
      .split(/\n\s*\n/g)
      .map((part) => part.trim())
      .filter(Boolean);
    if (parts.length >= 3) return parts.slice(0, 3);
    return [text.trim()];
  };

  const renderReadingWithAds = (text) => {
    const parts = splitReadingParts(text);
    if (!parts.length) return null;
    if (parts.length < 3) {
      return (
        <View style={styles.readingWrap}>
          <Text style={styles.readingText}>{text}</Text>
        </View>
      );
    }
    return (
      <View style={styles.readingWrap}>
        <Text style={styles.readingText}>{parts[0]}</Text>
        <View style={styles.readingAd}>
          <NativeAdCard unitId={NATIVE_THREE_TAROT_READING_AD_UNIT_ID_1} />
        </View>
        <Text style={styles.readingText}>{parts[1]}</Text>
        <View style={styles.readingAd}>
          <NativeAdCard unitId={NATIVE_THREE_TAROT_READING_AD_UNIT_ID_2} />
        </View>
        <Text style={styles.readingText}>{parts[2]}</Text>
      </View>
    );
  };

  const showRevealBtn = phase === 'grid' && !locked && (!reading || reading.trim().length === 0);
  const shareLabel = t('share_facebook') || 'Share to Facebook';
  const shareSpreadText = (past, present, future) =>
    t('share_tarot_three', { past, present, future })
    || `My tarot spread: Past ${past}, Present ${present}, Future ${future}.`;
  const shareAppText =
    t('share_app', { url: PLAY_STORE_URL_ANDROID }) || `AstroAdvice: ${PLAY_STORE_URL_ANDROID}`;

  const onShareThree = async () => {
    if (cards.length < 3 || !shareShotRef.current || shareLoading) return;
    setShareLoading(true);
    const past = cards[0]?.name || '';
    const present = cards[1]?.name || '';
    const future = cards[2]?.name || '';
    const message = [shareSpreadText(past, present, future), shareAppText].filter(Boolean).join('\n');
    try {
      const uri = await captureRef(shareShotRef, {
        format: 'png',
        quality: 0.9,
        result: 'tmpfile',
      });
      const url = uri.startsWith('file://') ? uri : `file://${uri}`;
      await Share.open({ message, url });
      logEvent('content_shared', { feature: 'tarot_three', lang: i18n.language, channel: 'facebook' });
    } catch {}
    finally {
      setShareLoading(false);
    }
  };
  const openPreview = (card) => {
    if (!card) return;
    setPreviewCard(card);
    previewAnim.setValue(0);
    Animated.timing(previewAnim, {
      toValue: 1,
      duration: 220,
      easing: Easing.out(Easing.ease),
      useNativeDriver: true,
    }).start();
  };
  const closePreview = () => {
    if (!previewCard) return;
    Animated.timing(previewAnim, {
      toValue: 0,
      duration: 180,
      easing: Easing.in(Easing.ease),
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (finished) setPreviewCard(null);
    });
  };

  /* ---------- Sub-views ---------- */
  const FullscreenReveal = () => {
    if (revealIndex < 0 || !cards[revealIndex]) return null;
    const c = cards[revealIndex];
    const label = revealIndex === 0 ? (t('past') || 'Past')
                : revealIndex === 1 ? (t('present') || 'Present')
                : (t('future') || 'Future');
    return (
      <View style={styles.revealWrap}>
        <Animated.Image
          source={{ uri: c.imageUrl }}
          style={[styles.revealImg, { opacity: fade, transform: [{ scale }] }]}
          resizeMode="contain"
        />
        <Animated.View style={[styles.revealCaption, { opacity: fade, transform: [{ scale }] }]}>
          <Text style={styles.revealPhase}>{label}</Text>
          <Text style={styles.revealName} numberOfLines={1}>{c.name}</Text>
        </Animated.View>
      </View>
    );
  };

  const GridScroll = () => {
    const imgH = (reading || loadingReading) ? IMG_H * 0.82 : IMG_H;
    return (
    <ScrollView
      style={{ flex: 1, width: '100%' }}
      contentContainerStyle={{ paddingHorizontal: PANEL_PAD, paddingTop: 12, paddingBottom: 120 }} // space for footer button
      showsVerticalScrollIndicator
    >
      <ViewShot ref={shareShotRef} options={{ format: 'png', quality: 0.9 }}>
        <View style={styles.gridWrap}>
          <View style={styles.row}>
            {cards.slice(0, 2).map((c, i) => (
              <TouchableOpacity
                key={c.id || i}
                style={styles.cell}
                activeOpacity={0.9}
                onPress={() => openPreview(c)}
              >
                <Image source={{ uri: c.imageUrl }} style={[styles.cellImg, { height: imgH }]} resizeMode="contain" />
                <Text style={styles.cellLabel}>{i === 0 ? (t('past') || 'Past') : (t('present') || 'Present')}</Text>
                <Text style={styles.cellName} numberOfLines={1}>{c.name}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <View style={[styles.row, { justifyContent: 'center' }]}>
            <TouchableOpacity
              style={styles.cell}
              activeOpacity={0.9}
              onPress={() => openPreview(cards[2])}
            >
              <Image source={{ uri: cards[2].imageUrl }} style={[styles.cellImg, { height: imgH }]} resizeMode="contain" />
              <Text style={styles.cellLabel}>{t('future') || 'Future'}</Text>
              <Text style={styles.cellName} numberOfLines={1}>{cards[2].name}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ViewShot>

      {loadingReading && (
        <View style={styles.loadingRow}>
          <ActivityIndicator size="large" color="#ffe7c2" />
          <Text style={styles.loadingText}>{t('loading') || 'Loading...'}</Text>
        </View>
      )}

      {!!reading && renderReadingWithAds(reading)}

      <NativeAdCard unitId={NATIVE_THREE_TAROT_AD_UNIT_ID} />
    </ScrollView>
    );
  };

  /* ---------- LOCKED VIEW ---------- */
  if (phase === 'locked') {
    const imgH = savedRaw?.reading ? IMG_H * 0.82 : IMG_H;
    return (
      <ImageBackground
        source={require('../../assets/images/three-tarot-background.jpg')}
        style={styles.bg}
        resizeMode="cover"
      >
        <View pointerEvents="none" style={styles.overlay} />
        <SafeAreaView style={styles.safe}>
          <View style={styles.root}>
            <Modal
              visible={!!previewCard}
              transparent
              animationType="fade"
              onRequestClose={closePreview}
            >
              <TouchableOpacity style={styles.modalBackdrop} activeOpacity={1} onPress={closePreview}>
                <TouchableOpacity style={styles.modalSafe} activeOpacity={1} onPress={() => {}}>
                  <SafeAreaView style={styles.modalSafeInner}>
                    <TouchableOpacity style={styles.modalCloseBtn} onPress={closePreview} activeOpacity={0.8}>
                      <Text style={styles.modalCloseText}>X</Text>
                    </TouchableOpacity>
                      {!!previewCard && (
                        <Animated.View
                          style={[
                            styles.modalContent,
                            {
                              opacity: previewAnim,
                              transform: [
                                {
                                  scale: previewAnim.interpolate({
                                    inputRange: [0, 1],
                                    outputRange: [0.96, 1],
                                  }),
                                },
                              ],
                            },
                          ]}
                        >
                          <Image source={{ uri: previewCard.imageUrl }} style={styles.modalImage} resizeMode="contain" />
                          <Text style={styles.modalCardName} numberOfLines={1}>{previewCard.name}</Text>
                        </Animated.View>
                      )}
                  </SafeAreaView>
                </TouchableOpacity>
              </TouchableOpacity>
            </Modal>
            <Text style={styles.banner}>
              {t('next_available_tomorrow') || 'Next Tarot reading available tomorrow'}
            </Text>

            <ScrollView
              style={{ flex: 1, width: '100%' }}
              contentContainerStyle={{ padding: 16, paddingBottom: 120 }}
              showsVerticalScrollIndicator
            >
              <ViewShot ref={shareShotRef} options={{ format: 'png', quality: 0.9 }}>
                <View style={styles.gridWrap}>
                  <View style={styles.row}>
                    {savedRaw?.cards?.slice(0, 2).map((c, i) => (
                      <TouchableOpacity
                        key={c.id || i}
                        style={styles.cell}
                        activeOpacity={0.9}
                        onPress={() => openPreview(c)}
                      >
                        <Image source={{ uri: c.imageUrl }} style={[styles.cellImg, { height: imgH }]} resizeMode="contain" />
                        <Text style={styles.cellLabel}>
                          {i === 0 ? (t('past') || 'Past') : (t('present') || 'Present')}
                        </Text>
                        <Text style={styles.cellName} numberOfLines={1}>{c.name}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                  <View style={[styles.row, { justifyContent: 'center' }]}>
                    <TouchableOpacity
                      style={styles.cell}
                      activeOpacity={0.9}
                      onPress={() => openPreview(savedRaw?.cards?.[2])}
                    >
                      <Image source={{ uri: savedRaw?.cards?.[2]?.imageUrl }} style={[styles.cellImg, { height: imgH }]} resizeMode="contain" />
                      <Text style={styles.cellLabel}>{t('future') || 'Future'}</Text>
                      <Text style={styles.cellName} numberOfLines={1}>{savedRaw?.cards?.[2]?.name}</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </ViewShot>

              {!!savedRaw?.reading && renderReadingWithAds(savedRaw.reading)}

              <NativeAdCard unitId={NATIVE_THREE_TAROT_AD_UNIT_ID} />
            </ScrollView>

            <View style={[styles.bottomBar, { zIndex: 10, paddingBottom: 20 + insets.bottom }]}>
              <FacebookButton
                label={shareLoading ? (t('loading') || 'Loading...') : shareLabel}
                onPress={onShareThree}
                disabled={shareLoading}
              />
              <MysticButton
                label={t('back') || 'Back'}
                onPress={() =>
                  navigation?.canGoBack?.() ? navigation.goBack() : navigation.navigate('Home')
                }
              />
            </View>
          </View>
        </SafeAreaView>
      </ImageBackground>
    );
  }

  /* ---------- MAIN VIEW ---------- */
  return (
    <ImageBackground
      source={require('../../assets/images/three-tarot-background.jpg')}
      style={styles.bg}
      resizeMode="cover"
    >
      <View pointerEvents="none" style={styles.overlay} />
      <SafeAreaView style={styles.safe}>
        <View style={styles.root}>
          <Modal
            visible={!!previewCard}
            transparent
            animationType="fade"
            onRequestClose={closePreview}
          >
            <TouchableOpacity style={styles.modalBackdrop} activeOpacity={1} onPress={closePreview}>
              <TouchableOpacity style={styles.modalSafe} activeOpacity={1} onPress={() => {}}>
                <SafeAreaView style={styles.modalSafeInner}>
                  <TouchableOpacity style={styles.modalCloseBtn} onPress={closePreview} activeOpacity={0.8}>
                    <Text style={styles.modalCloseText}>X</Text>
                  </TouchableOpacity>
                    {!!previewCard && (
                      <Animated.View
                        style={[
                          styles.modalContent,
                          {
                            opacity: previewAnim,
                            transform: [
                              {
                                scale: previewAnim.interpolate({
                                  inputRange: [0, 1],
                                  outputRange: [0.96, 1],
                                }),
                              },
                            ],
                          },
                        ]}
                      >
                        <Image source={{ uri: previewCard.imageUrl }} style={styles.modalImage} resizeMode="contain" />
                        <Text style={styles.modalCardName} numberOfLines={1}>{previewCard.name}</Text>
                      </Animated.View>
                    )}
                </SafeAreaView>
              </TouchableOpacity>
            </TouchableOpacity>
          </Modal>
          <View style={[styles.main, phase !== 'grid' && styles.centered]}>
            {phase === 'loading' && (
              <View style={styles.loadingRow}>
                <ActivityIndicator size="large" color="#ffe7c2" />
                <Text style={styles.loadingText}>{t('loading') || 'Loading...'}</Text>
              </View>
            )}

            {phase === 'revealing' && <FullscreenReveal />}

            {phase === 'grid' && <GridScroll />}

            {phase === 'error' && (
              <>
                <Text style={styles.errorText}>{errorMsg || 'Failed to load cards'}</Text>
                <View style={{ height: 12 }} />
                <MysticButton
                  label={t('try_again') || 'Try again'}
                  onPress={() => setPhase('loading')}
                />
              </>
            )}
          </View>

          <View style={[styles.bottomBar, { zIndex: 10, paddingBottom: 20 + insets.bottom }]}>
            {showRevealBtn ? (
              <MysticButton
                label={t('reveal_the_truth') || 'Reveal the truth'}
                onPress={onRevealTruth}
                disabled={loadingReading}
              />
            ) : (
              phase === 'grid' && (
                <>
                  <FacebookButton
                    label={shareLoading ? (t('loading') || 'Loading...') : shareLabel}
                    onPress={onShareThree}
                    disabled={loadingReading || shareLoading}
                  />
                  <MysticButton
                    label={t('back') || 'Back'}
                    onPress={() =>
                      navigation?.canGoBack?.() ? navigation.goBack() : navigation.navigate('Home')
                    }
                  />
                </>
              )
            )}
          </View>
        </View>
      </SafeAreaView>
    </ImageBackground>
  );
}

/* ---------- Mystic Button ---------- */
function MysticButton({ label, onPress, disabled }) {
  return (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={onPress}
      disabled={disabled}
      style={[styles.mysticBtn, disabled && { opacity: 0.6 }]}
    >
      <View style={styles.mysticBtnGlow} />
      <Text style={styles.mysticBtnText}>{label}</Text>
    </TouchableOpacity>
  );
}

function FacebookButton({ label, onPress, disabled }) {
  return (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={onPress}
      disabled={disabled}
      style={[styles.fbBtn, disabled && styles.fbBtnDisabled]}
    >
      <Text style={styles.fbBtnText}>{label}</Text>
    </TouchableOpacity>
  );
}

/* ---------- Styles ---------- */
const PANEL_PAD = 16;
const GAP = 14;
const IMG_W = (SCREEN_W - PANEL_PAD * 2 - GAP) / 2;
const IMG_H = IMG_W * 1.75;

const styles = StyleSheet.create({
  bg: { flex: 1 },
  overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.35)' },
  safe: { flex: 1, backgroundColor: 'transparent' },
  root: { flex: 1 },

  main: { flex: 1 },
  centered: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: PANEL_PAD,
    paddingTop: 18,
  },

  hint: { color: '#fff', opacity: 0.9, textAlign: 'center' },
  loadingText: {
    marginTop: 10,
    color: '#fff2d2',
    opacity: 0.95,
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: 0.4,
  },
  loadingRow: {
    marginTop: 6,
    alignItems: 'center',
    gap: 8,
  },
  errorText: { color: '#ffdede', textAlign: 'center', fontSize: 13, marginTop: 8 },

  /* Reveal fullscreen */
  revealWrap: { width: '100%', alignItems: 'center', justifyContent: 'center' },
  revealImg: { width: '100%', height: SCREEN_H * 0.7, borderRadius: 16 },
  revealCaption: { marginTop: 10, alignItems: 'center' },
  revealPhase: { color: '#fff', fontWeight: '800', fontSize: 16 },
  revealName: { color: '#fff', opacity: 0.95, fontSize: 14, marginTop: 2 },

  /* Grid (2 + 1) */
  gridWrap: { width: '100%', alignItems: 'center' },
  row: { width: '100%', flexDirection: 'row', justifyContent: 'space-between', marginBottom: GAP },
  cell: { width: IMG_W, alignItems: 'center' },
  cellImg: { width: IMG_W, height: IMG_H, borderRadius: 12 },
  cellLabel: { marginTop: 6, color: '#fff', fontWeight: '700' },
  cellName: { marginTop: 2, color: '#fff', fontSize: 12, opacity: 0.95 },

  /* Reading panel â€” outer ScrollView provides scrolling */
  /* Card preview modal */
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.85)',
  },
  modalSafe: {
    flex: 1,
    padding: 16,
    justifyContent: 'center',
  },
  modalSafeInner: {
    flex: 1,
    justifyContent: 'center',
  },
  modalContent: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalImage: {
    width: '100%',
    height: SCREEN_H * 0.7,
    borderRadius: 16,
  },
  modalCardName: {
    marginTop: 10,
    color: '#fff',
    fontSize: 16,
    fontWeight: '800',
    textAlign: 'center',
  },
  modalCloseBtn: {
    alignSelf: 'flex-end',
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.25)',
    marginBottom: 12,
  },
  modalCloseText: {
    color: '#fff',
    fontWeight: '800',
    fontSize: 16,
    lineHeight: 18,
  },

  /* Reading panel */
  readingWrap: {
    width: '100%',
    marginTop: 12,
    borderRadius: 12,
    backgroundColor: 'rgba(0,0,0,0.35)',
    borderWidth: 1,
    borderColor: 'rgba(214,166,59,0.25)',
    padding: 12,
  },
  readingText: { color: '#fff', fontSize: 16, lineHeight: 22, textAlign: 'center' },
  readingAd: {
    marginVertical: 10,
  },

  /* Footer */
  bottomBar: { padding: 16, paddingBottom: 20 },

  /* Banner (locked) */
  banner: {
    textAlign: 'center',
    color: '#ffd262',
    fontWeight: '800',
    fontSize: 14,
    marginTop: 12,
    paddingHorizontal: 16,
  },

  /* Mystic button */
  mysticBtn: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 24,
    overflow: 'hidden',
    backgroundColor: '#2b1f3a',
    borderWidth: 1,
    borderColor: 'rgba(204,153,255,0.4)',
  },
  mysticBtnGlow: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(164, 69, 255, 0.25)',
    opacity: 0.35,
  },
  mysticBtnText: { color: '#fff', fontWeight: '900', letterSpacing: 0.5, fontSize: 16 },
  fbBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 24,
    backgroundColor: '#1877F2',
    borderWidth: 1,
    borderColor: '#1667d6',
  },
  fbBtnDisabled: {
    opacity: 0.6,
  },
  fbBtnText: {
    color: '#fff',
    fontWeight: '800',
    fontSize: 15,
    letterSpacing: 0.3,
  },
});


















