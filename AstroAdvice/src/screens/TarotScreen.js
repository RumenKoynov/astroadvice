// src/screens/TarotScreen.js
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
  ScrollView,
  Dimensions,
  Modal,
  ActivityIndicator,
} from 'react-native';
import ViewShot, { captureRef } from 'react-native-view-shot';
import Share from 'react-native-share';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { useTheme } from '@react-navigation/native';
import { AdEventType, RewardedAd, RewardedAdEventType } from 'react-native-google-mobile-ads';

import { apiFetch } from '../services/api';
import { useUser } from '../context/UserContext';
import { BYPASS_DAILY_LIMITS } from '../config/featureFlags';
import AdBanner from '../components/ads/AdBanner';
import { AD_REQUEST_OPTIONS, BANNER_TAROT_AD_UNIT_ID, REWARDED_TAROT_FULL_READING_AD_UNIT_ID } from '../config/admob';
import { logEvent, logScreen } from '../services/analytics';
import { calcAge } from '../utils/astro';
import { PLAY_STORE_URL_ANDROID } from '../config/env';

const { height: SCREEN_H } = Dimensions.get('window');
const DATE_KEY = () => new Date().toISOString().slice(0, 10);

export default function TarotScreen({ navigation }) {
  const { t, i18n } = useTranslation('common');
  const { colors } = useTheme();
  const user = useUser();
  const insets = useSafeAreaInsets();
  const loggedScreenRef = useRef(false);
  const loggedViewedRef = useRef(false);

  const todayKey = useMemo(() => DATE_KEY(), []);
  const savedRaw = user?.daily?.tarotSingle?.[todayKey] || null;
  const hasSaved = !!savedRaw;
  const enforceLimit = !BYPASS_DAILY_LIMITS;
  const locked = enforceLimit && hasSaved;
  const showLocked = hasSaved;

  const [card, setCard] = useState(savedRaw?.card || null);
  const [fullReading, setFullReading] = useState(
    savedRaw?.fullUnlocked ? (savedRaw?.reading || savedRaw?.card?.reading || '') : ''
  );
  const [loading, setLoading] = useState(false);
  const [readingLoading, setReadingLoading] = useState(false);
  const [rewardLoaded, setRewardLoaded] = useState(false);
  const [rewardLoading, setRewardLoading] = useState(false);
  const [shareLoading, setShareLoading] = useState(false);
  const rewardWantsToShow = useRef(false);
  const [phase, setPhase] = useState(showLocked ? 'locked' : 'idle'); // idle | showing | locked
  const [errorMsg, setErrorMsg] = useState('');
  const [previewCard, setPreviewCard] = useState(null);
  const showBanner = !!card && !loading;
  const bottomPad = showBanner ? 8 : 20 + insets.bottom;
  const rewarded = useMemo(
    () => RewardedAd.createForAdRequest(REWARDED_TAROT_FULL_READING_AD_UNIT_ID, AD_REQUEST_OPTIONS),
    []
  );

  // Smooth enter for image + text
  const fade = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(0.98)).current;
  const previewAnim = useRef(new Animated.Value(0)).current;
  const shareShotRef = useRef(null);

  const animateIn = () => {
    fade.setValue(0);
    scale.setValue(0.98);
    Animated.parallel([
      Animated.timing(fade, { toValue: 1, duration: 450, easing: Easing.out(Easing.ease), useNativeDriver: true }),
      Animated.timing(scale, { toValue: 1, duration: 450, easing: Easing.out(Easing.ease), useNativeDriver: true }),
    ]).start();
  };
  const openPreview = (nextCard) => {
    if (!nextCard) return;
    setPreviewCard(nextCard);
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

  useEffect(() => {
    if (!loggedScreenRef.current) {
      loggedScreenRef.current = true;
      logScreen('Tarot');
      logEvent('feature_opened', { feature: 'tarot_single' });
    }
  }, []);

  useEffect(() => {
    if (showLocked && savedRaw?.card) {
      setCard(savedRaw.card);
      setFullReading(
        savedRaw?.fullUnlocked ? (savedRaw?.reading || savedRaw?.card?.reading || '') : ''
      );
      setPhase('locked');
    } else {
      setCard(null);
      setFullReading('');
      setPhase('idle');
    }
    setErrorMsg('');
  }, [showLocked, savedRaw?.card]);

  useEffect(() => {
    if (!showLocked) {
      loggedViewedRef.current = false;
      return;
    }
    if (savedRaw?.card && !loggedViewedRef.current) {
      loggedViewedRef.current = true;
      logEvent('content_viewed', {
        feature: 'tarot_single',
        lang: i18n.language,
        is_cached: 1,
      });
    }
  }, [showLocked, savedRaw?.card, i18n.language]);

  const drawCard = async ({ stayLocked = false } = {}) => {
    setErrorMsg('');
    setLoading(true);
    try {
      const res = await apiFetch(`/tarot/random?lang=${i18n.language}`);
      if (res?.imageUrl) {
        try { await Image.prefetch(res.imageUrl); } catch {}
      }
      setCard(res || null);
      setFullReading('');
      setPhase(stayLocked ? 'locked' : 'showing');
      if (!stayLocked) animateIn();
      // Save for today (locks until tomorrow)
      user.setDaily(todayKey, 'tarotSingle', {
        card: res || null,
        lang: i18n.language,
        reading: '',
        fullUnlocked: false,
      });
      logEvent('content_generated', { feature: 'tarot_single', lang: i18n.language });
      logEvent('tarot_single_reveal', { lang: i18n.language, is_cached: 0 });
      logEvent('content_viewed', { feature: 'tarot_single', lang: i18n.language, is_cached: 0 });
    } catch (e) {
      setErrorMsg(e?.message || 'Failed to draw a card');
      logEvent('error_shown', {
        feature: 'tarot_single',
        code: String(e?.message || 'error').slice(0, 60),
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchFullReading = useCallback(async () => {
    if (!card?.id || readingLoading) return;
    setReadingLoading(true);
    setErrorMsg('');
    try {
      const age = user?.dob ? calcAge(new Date(user.dob)) : null;
      const sex = user?.sex || '';
      const res = await apiFetch(
        `/tarot/random?lang=${encodeURIComponent(i18n.language)}&id=${encodeURIComponent(card.id)}&full=1&sex=${encodeURIComponent(sex)}&age=${encodeURIComponent(age ?? '')}`
      );
      const reading = res?.reading || '';
      if (reading) {
        const nextCard = { ...card, reading };
        setCard(nextCard);
        setFullReading(reading);
        user.setDaily(todayKey, 'tarotSingle', {
          card: nextCard,
          lang: i18n.language,
          reading,
          fullUnlocked: true,
        });
        logEvent('tarot_single_full_reading', { lang: i18n.language });
      }
    } catch (e) {
      setErrorMsg(e?.message || 'Failed to load full reading');
    } finally {
      setReadingLoading(false);
    }
  }, [card?.id, i18n.language, readingLoading, todayKey, user, user?.dob, user?.sex]);

  useEffect(() => {
    const unsubscribeLoaded = rewarded.addAdEventListener(
      RewardedAdEventType.LOADED,
      () => {
        setRewardLoaded(true);
        setRewardLoading(false);
        if (rewardWantsToShow.current) {
          rewardWantsToShow.current = false;
          try {
            rewarded.show();
          } catch {
            // no-op
          }
        }
      }
    );
    const unsubscribeEarned = rewarded.addAdEventListener(
      RewardedAdEventType.EARNED_REWARD,
      () => {
        fetchFullReading();
      }
    );
    const unsubscribeClosed = rewarded.addAdEventListener(
      AdEventType.CLOSED,
      () => {
        setRewardLoaded(false);
        setRewardLoading(false);
        rewardWantsToShow.current = false;
        rewarded.load();
      }
    );
    const unsubscribeError = rewarded.addAdEventListener(
      AdEventType.ERROR,
      () => {
        setRewardLoaded(false);
        setRewardLoading(false);
        rewardWantsToShow.current = false;
      }
    );
    rewarded.load();
    return () => {
      unsubscribeLoaded();
      unsubscribeEarned();
      unsubscribeClosed();
      unsubscribeError();
    };
  }, [rewarded, fetchFullReading]);

  const onWatchRewarded = () => {
    if (rewardLoaded) {
      rewarded.show();
      return;
    }
    setRewardLoading(true);
    rewardWantsToShow.current = true;
    rewarded.load();
  };

  const baseMeaning = card?.baseDescription || '';
  const showFullCta = !!card && !fullReading;
  const fullReadingTitle = t('tarot_full_reading') || 'Full daily reading';
  const fullReadingCta = t('tarot_full_reading_cta') || 'Watch an ad for the full daily reading';
  const loadingLabel = t('loading') || 'Loading...';
  const shareLabel = t('share_facebook') || 'Share to Facebook';
  const shareCardText = (cardName) =>
    t('share_tarot_single', { card: cardName || '' }) || `My daily tarot card: ${cardName || ''}`;
  const shareAppText =
    t('share_app', { url: PLAY_STORE_URL_ANDROID }) || `AstroAdvice: ${PLAY_STORE_URL_ANDROID}`;

  const onShareSingle = async () => {
    if (!card?.name || !shareShotRef.current || shareLoading) return;
    setShareLoading(true);
    const message = [shareCardText(card.name), shareAppText].filter(Boolean).join('\n');
    try {
      const uri = await captureRef(shareShotRef, {
        format: 'png',
        quality: 0.9,
        result: 'tmpfile',
      });
      const url = uri.startsWith('file://') ? uri : `file://${uri}`;
      await Share.open({ message, url });
      logEvent('content_shared', { feature: 'tarot_single', lang: i18n.language, channel: 'facebook' });
    } catch {}
    finally {
      setShareLoading(false);
    }
  };

  const ensureBaseMeaning = useCallback(async () => {
    if (!card?.id || card?.baseDescription) return;
    try {
      const res = await apiFetch(`/tarot/random?lang=${encodeURIComponent(i18n.language)}&id=${encodeURIComponent(card.id)}`);
      if (res?.id) {
        const nextCard = { ...card, ...res };
        setCard(nextCard);
        user.setDaily(todayKey, 'tarotSingle', {
          card: nextCard,
          lang: i18n.language,
          reading: fullReading || '',
          fullUnlocked: !!fullReading,
        });
      }
    } catch {}
  }, [card, fullReading, i18n.language, todayKey, user]);

  useEffect(() => {
    ensureBaseMeaning();
  }, [ensureBaseMeaning]);

  const onPrimary = () => {
    if (showLocked) {
      if (locked) {
        // Back when locked
        if (navigation?.canGoBack?.()) navigation.goBack();
        else navigation.navigate('Home');
      } else {
        // Dev bypass: keep locked layout, allow redraw
        drawCard({ stayLocked: true });
      }
    } else if (!card) {
      drawCard();
    } else {
      // Draw again (still saves as today's single)
      drawCard();
    }
  };

  // ----- Render -----
  // LOCKED view (already drew today)
  if (phase === 'locked') {
    return (
      <ImageBackground
        source={require('../../assets/images/single-tarot-background.jpg')}
        style={styles.bg}
        resizeMode="cover"
      >
        <View pointerEvents="none" style={styles.overlay} />
        <SafeAreaView style={[styles.safe, { backgroundColor: 'transparent' }]}>
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
              {t('next_available_tomorrow') || 'Next single card available tomorrow'}
            </Text>

            <ScrollView
              style={{ flex: 1, width: '100%' }}
              contentContainerStyle={{ padding: 16, paddingBottom: 120 }}
              showsVerticalScrollIndicator={false}
            >
              {!!card?.imageUrl && (
                <ViewShot ref={shareShotRef} options={{ format: 'png', quality: 0.9 }}>
                  <TouchableOpacity activeOpacity={0.9} onPress={() => openPreview(card)}>
                    <Image
                      source={{ uri: card.imageUrl }}
                      style={styles.cardImgLocked}
                      resizeMode="contain"
                    />
                  </TouchableOpacity>
                  {!!card?.name && (
                    <Text style={styles.cardTitle}>{card.name}</Text>
                  )}
                </ViewShot>
              )}
              {!!card?.name && !card?.imageUrl && (
                <Text style={styles.cardTitle}>{card.name}</Text>
              )}
              {!!card?.baseDescription && (
                <View style={styles.cardPanel}>
                  <Text style={styles.cardText}>
                    {card.baseDescription}
                  </Text>
                </View>
              )}
              {fullReading ? (
                <View style={styles.cardPanelAlt}>
                  <Text style={styles.fullReadingTitle}>{fullReadingTitle}</Text>
                  <Text style={styles.cardText}>{fullReading}</Text>
                </View>
              ) : (
                showFullCta && (
                  <>
                    {readingLoading && (
                      <View style={styles.loadingRow}>
                        <ActivityIndicator size="large" color="#ffe7c2" />
                        <Text style={styles.loadingText}>{loadingLabel}</Text>
                      </View>
                    )}
                    <MysticButton
                      label={rewardLoading ? loadingLabel : fullReadingCta}
                      onPress={onWatchRewarded}
                      disabled={rewardLoading || readingLoading}
                    />
                  </>
                )
              )}
            </ScrollView>

            <View style={[styles.bottomBar, { paddingBottom: bottomPad }]}>
              {!!card?.name && (
                <FacebookButton
                  label={shareLoading ? loadingLabel : shareLabel}
                  onPress={onShareSingle}
                  disabled={loading || readingLoading || shareLoading}
                />
              )}
              <MysticButton
                label={
                  locked
                    ? (t('back') || 'Back')
                    : (t('draw_again') || 'Draw again')
                }
                onPress={onPrimary}
                disabled={loading}
              />
            </View>
          </View>
          {showBanner && <AdBanner unitId={BANNER_TAROT_AD_UNIT_ID} />}
        </SafeAreaView>
      </ImageBackground>
    );
  }

  // NORMAL view
  return (
    <ImageBackground
      source={require('../../assets/images/single-tarot-background.jpg')}
      style={styles.bg}
      resizeMode="cover"
    >
      <View pointerEvents="none" style={styles.overlay} />
      <SafeAreaView style={[styles.safe, { backgroundColor: 'transparent' }]}>
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
          {/* Image / content */}
          <View style={styles.centerArea}>
            {loading && (
              <View style={styles.loadingRow}>
                <ActivityIndicator size="large" color="#ffe7c2" />
                <Text style={styles.loadingText}>{t('loading') || 'Loading...'}</Text>
              </View>
            )}

            {!loading && card && (
              <>
                <ViewShot ref={shareShotRef} options={{ format: 'png', quality: 0.9 }}>
                  <TouchableOpacity activeOpacity={0.9} onPress={() => openPreview(card)}>
                    <Animated.Image
                      source={{ uri: card.imageUrl }}
                      style={[styles.cardImg, { opacity: fade, transform: [{ scale }] }]}
                      resizeMode="contain"
                    />
                  </TouchableOpacity>
                  <Animated.Text
                    style={[styles.cardTitle, { opacity: fade, transform: [{ scale }] }]}
                    numberOfLines={1}
                  >
                    {card.name}
                  </Animated.Text>
                </ViewShot>

                {!!baseMeaning && (
                  <Animated.View style={[styles.cardPanel, { opacity: fade, transform: [{ scale }] }]}>
                    <ScrollView
                      style={{ maxHeight: SCREEN_H * 0.28 }}
                      contentContainerStyle={{ padding: 10 }}
                      showsVerticalScrollIndicator={false}
                    >
                      <Text style={styles.cardText}>{baseMeaning}</Text>
                    </ScrollView>
                  </Animated.View>
                )}

                {fullReading ? (
                  <Animated.View style={[styles.cardPanelAlt, { opacity: fade, transform: [{ scale }] }]}>
                    <Text style={styles.fullReadingTitle}>{fullReadingTitle}</Text>
                    <Text style={styles.cardText}>{fullReading}</Text>
                  </Animated.View>
                ) : (
                  showFullCta && (
                    <>
                      {readingLoading && (
                        <View style={styles.loadingRow}>
                          <ActivityIndicator size="large" color="#ffe7c2" />
                          <Text style={styles.loadingText}>{loadingLabel}</Text>
                        </View>
                      )}
                      <MysticButton
                        label={rewardLoading ? loadingLabel : fullReadingCta}
                        onPress={onWatchRewarded}
                        disabled={rewardLoading || readingLoading}
                      />
                    </>
                  )
                )}
              </>
            )}

            {!loading && !card && (
              <Text style={styles.hintCenter}>
                {t('tap_to_choose') || 'Tap below to choose your card'}
              </Text>
            )}

            {!!errorMsg && <Text style={styles.errorText}>{errorMsg}</Text>}
          </View>

          {/* Bottom button */}
          <View style={[styles.bottomBar, { paddingBottom: bottomPad }]}>
            {!!card?.name && (
              <FacebookButton
                label={shareLoading ? loadingLabel : shareLabel}
                onPress={onShareSingle}
                disabled={loading || readingLoading || shareLoading}
              />
            )}
            <MysticButton
              label={
                !card
                  ? (t('choose_card') || 'Choose a card')
                  : (t('draw_again') || 'Draw again')
              }
              onPress={onPrimary}
              disabled={loading}
            />
          </View>
        </View>
        {showBanner && <AdBanner unitId={BANNER_TAROT_AD_UNIT_ID} />}
      </SafeAreaView>
    </ImageBackground>
  );
}

/* --------- Mystic-styled button --------- */
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

/* -------------------- Styles -------------------- */
const styles = StyleSheet.create({
  bg: { flex: 1 },
  overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.45)' },
  safe: { flex: 1 },
  root: { flex: 1 },

  centerArea: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 14,
    paddingTop: 10,
  },

  banner: {
    textAlign: 'center',
    color: '#ffd262',
    fontWeight: '800',
    fontSize: 14,
    marginTop: 12,
    paddingHorizontal: 16,
  },

  cardImg: {
    width: '100%',
    height: SCREEN_H * 0.68,
    borderRadius: 16,
  },
  cardImgLocked: {
    width: '100%',
    height: SCREEN_H * 0.60,
    borderRadius: 16,
  },
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
  cardTitle: {
    marginTop: 10,
    color: '#ffe7c2',
    fontSize: 20,
    fontWeight: '900',
    textAlign: 'center',
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 6,
  },
  cardPanel: {
    marginTop: 10,
    backgroundColor: 'rgba(0,0,0,0.35)',
    borderWidth: 1,
    borderColor: 'rgba(214,166,59,0.25)',
    borderRadius: 14,
    overflow: 'hidden',
  },
  cardPanelAlt: {
    marginTop: 12,
    backgroundColor: 'rgba(0,0,0,0.4)',
    borderWidth: 1,
    borderColor: 'rgba(204,153,255,0.35)',
    borderRadius: 14,
    padding: 12,
  },
  cardText: {
    color: '#fff',
    fontSize: 16,
    lineHeight: 22,
    textAlign: 'center',
  },
  fullReadingTitle: {
    color: '#ffe7c2',
    fontSize: 14,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 6,
    letterSpacing: 0.3,
  },

  hintCenter: {
    color: '#f6e6c9',
    opacity: 0.85,
    textAlign: 'center',
    fontSize: 15,
    paddingHorizontal: 12,
  },
  loadingText: {
    color: '#fff',
    opacity: 0.9,
  },
  errorText: {
    color: '#ffdede',
    textAlign: 'center',
    fontSize: 13,
    marginTop: 10,
  },
  loadingRow: {
    marginTop: 8,
    alignItems: 'center',
    gap: 8,
  },
  loadingText: {
    color: '#ffe7c2',
    fontWeight: '700',
    fontSize: 16,
  },

  bottomBar: {
    padding: 16,
    paddingBottom: 20,
  },

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
  mysticBtnText: {
    color: '#fff',
    fontWeight: '900',
    letterSpacing: 0.5,
    fontSize: 16,
  },
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
