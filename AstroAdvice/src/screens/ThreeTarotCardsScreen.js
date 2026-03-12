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
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

import { apiFetch } from '../services/api';
import { useUser } from '../context/UserContext';
import { BYPASS_DAILY_LIMITS } from '../config/featureFlags';
import NativeAdCard from '../components/ads/NativeAdCard';
import { NATIVE_THREE_TAROT_AD_UNIT_ID } from '../config/admob';
import { logEvent, logScreen } from '../services/analytics';

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
  const savedToday = savedRaw && savedRaw.lang === i18n.language ? savedRaw : null;
  const bypass = BYPASS_DAILY_LIMITS;
  const useSaved = !bypass && !!savedToday;
  const hasReading = useSaved && !!savedToday?.reading?.trim();
  const locked = hasReading;

  // phases: 'locked' | 'loading' | 'revealing' | 'grid' | 'error'
  const [phase, setPhase] = useState(locked ? 'locked' : 'loading');
  const [cards, setCards] = useState(savedToday?.cards || []);
  const [reading, setReading] = useState(savedToday?.reading || '');
  const [errorMsg, setErrorMsg] = useState('');
  const [loadingReading, setLoadingReading] = useState(false);
  const [previewCard, setPreviewCard] = useState(null);
  const previewAnim = useRef(new Animated.Value(0)).current;
  const isActiveRef = useRef(true);

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
      setCards(savedToday?.cards || []);
      setReading(savedToday?.reading || '');
      setRevealIndex(-1);
      setErrorMsg('');
      setLoadingReading(false);
      return;
    }
    if (useSaved) {
      if (phase === 'revealing') return;
      setPhase('grid');
      setCards(savedToday?.cards || []);
      setReading(savedToday?.reading || '');
      setRevealIndex(-1);
      setErrorMsg('');
      setLoadingReading(false);
    }
  }, [locked, useSaved, savedToday?.reading, savedToday?.cards, i18n.language, phase]);

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
    if (savedToday?.cards?.length === 3 && !loggedViewedRef.current) {
      loggedViewedRef.current = true;
      logEvent('content_viewed', {
        feature: 'tarot_three',
        lang: i18n.language,
        is_cached: 1,
      });
    }
  }, [locked, savedToday?.cards, i18n.language]);

  useEffect(() => {
    if (locked || useSaved) return;
    setPhase('loading');
    setCards([]);
    setReading('');
    setRevealIndex(-1);
    setErrorMsg('');
    setLoadingReading(false);
  }, [locked, useSaved, i18n.language]);

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
  }, [i18n.language, locked]);

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

  const showRevealBtn = phase === 'grid' && !locked && (!reading || reading.trim().length === 0);
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

        {!!reading && (
          <View style={styles.readingWrap}>
            <Text style={styles.readingText}>{reading}</Text>
          </View>
        )}

        <NativeAdCard unitId={NATIVE_THREE_TAROT_AD_UNIT_ID} />
      </View>
    </ScrollView>
    );
  };

  /* ---------- LOCKED VIEW ---------- */
  if (phase === 'locked') {
    const imgH = savedToday?.reading ? IMG_H * 0.82 : IMG_H;
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
              <View style={styles.gridWrap}>
                <View style={styles.row}>
                  {savedToday.cards?.slice(0, 2).map((c, i) => (
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
                    onPress={() => openPreview(savedToday.cards?.[2])}
                  >
                    <Image source={{ uri: savedToday.cards?.[2]?.imageUrl }} style={[styles.cellImg, { height: imgH }]} resizeMode="contain" />
                    <Text style={styles.cellLabel}>{t('future') || 'Future'}</Text>
                    <Text style={styles.cellName} numberOfLines={1}>{savedToday.cards?.[2]?.name}</Text>
                  </TouchableOpacity>
                </View>
              </View>

              {!!savedToday.reading && (
                <View style={styles.readingWrap}>
                  <Text style={styles.readingText}>{savedToday.reading}</Text>
                </View>
              )}

              <NativeAdCard unitId={NATIVE_THREE_TAROT_AD_UNIT_ID} />
            </ScrollView>

            <View style={[styles.bottomBar, { zIndex: 10, paddingBottom: 20 + insets.bottom }]}>
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
              <DrawingIndicator label={t('drawing_cards') || 'Drawing cards...'} />
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
                <MysticButton
                  label={t('back') || 'Back'}
                  onPress={() =>
                    navigation?.canGoBack?.() ? navigation.goBack() : navigation.navigate('Home')
                  }
                />
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

/* ---------- Drawing Indicator ---------- */
function DrawingIndicator({ label }) {
  const spin = useRef(new Animated.Value(0)).current;
  const pulse = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const spinAnim = Animated.loop(
      Animated.timing(spin, {
        toValue: 1,
        duration: 1200,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    );
    const pulseAnim = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 700, easing: Easing.out(Easing.quad), useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0, duration: 700, easing: Easing.in(Easing.quad), useNativeDriver: true }),
      ])
    );
    spinAnim.start();
    pulseAnim.start();
    return () => {
      spinAnim.stop();
      pulseAnim.stop();
    };
  }, [spin, pulse]);

  const rotate = spin.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });
  const glowScale = pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.08] });
  const glowOpacity = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.35, 0.7] });

  return (
    <View style={styles.loaderWrap}>
      <View style={styles.loaderOrb}>
        <Animated.View
          style={[
            styles.loaderGlow,
            { opacity: glowOpacity, transform: [{ scale: glowScale }] },
          ]}
        />
        <Animated.View style={[styles.loaderSpinner, { transform: [{ rotate }] }]} />
        <View style={styles.loaderCore} />
      </View>
      <Text style={styles.loadingText}>{label}</Text>
    </View>
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
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 0.4,
  },
  loaderWrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  loaderOrb: {
    width: 56,
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loaderGlow: {
    position: 'absolute',
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(255,210,98,0.18)',
  },
  loaderSpinner: {
    position: 'absolute',
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 2,
    borderColor: 'rgba(255,210,98,0.85)',
    borderTopColor: 'rgba(255,210,98,0.08)',
    borderRightColor: 'rgba(255,210,98,0.22)',
  },
  loaderCore: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#ffd262',
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
});


















