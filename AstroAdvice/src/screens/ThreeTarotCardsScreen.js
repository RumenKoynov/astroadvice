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
} from 'react-native';
import { useTranslation } from 'react-i18next';

import { apiFetch } from '../services/api';
import { useUser } from '../context/UserContext';
import { BYPASS_DAILY_READING_LIMIT } from '../config/featureFlags';

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');
const DATE_KEY = () => new Date().toISOString().slice(0, 10); // YYYY-MM-DD

export default function ThreeTarotCardsScreen({ navigation }) {
  const { t, i18n } = useTranslation('common');
  const user = useUser();

  const todayKey = useMemo(() => DATE_KEY(), []);
  const savedToday = user?.daily?.tarotThree?.[todayKey] || null;
  const locked = !BYPASS_DAILY_READING_LIMIT && !!savedToday;

  // phases: 'locked' | 'loading' | 'revealing' | 'grid' | 'error'
  const [phase, setPhase] = useState(locked ? 'locked' : 'loading');
  const [cards, setCards] = useState(savedToday?.cards || []);
  const [reading, setReading] = useState(savedToday?.reading || '');
  const [errorMsg, setErrorMsg] = useState('');
  const [loadingReading, setLoadingReading] = useState(false);

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

  const draw = async (activeRef) => {
    setPhase('loading');
    setErrorMsg('');
    try {
      const data = await apiFetch(`/threetarotcards/draw?lang=${i18n.language}`, 'GET');
      const trio = Array.isArray(data?.cards) ? data.cards.slice(0, 3) : [];
      // prefetch images
      await Promise.all(trio.map(c => (c?.imageUrl ? Image.prefetch(c.imageUrl) : Promise.resolve())));
      if (!activeRef.current) return;

      setCards(trio);
      setReading('');
      setPhase('revealing');

      // Reveal with EXACTLY 1.5s between starts
      const startReveal = (idx = 0) => {
        if (!activeRef.current) return;
        setRevealIndex(idx);
        animateIn();
        const NEXT_DELAY_MS = 1500;
        setTimeout(() => {
          if (!activeRef.current) return;
          if (idx < 2) startReveal(idx + 1);
          else setTimeout(() => activeRef.current && setPhase('grid'), 500);
        }, NEXT_DELAY_MS);
      };
      setTimeout(() => startReveal(0), 350);
    } catch (e) {
      if (!activeRef.current) return;
      setErrorMsg(e?.message || 'Failed to draw cards');
      setPhase('error');
    }
  };

  // Kick off draw if not locked
  useEffect(() => {
    if (locked) return;
    const activeRef = { current: true };
    draw(activeRef);
    return () => { activeRef.current = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [i18n.language]);

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
      // Save snapshot for today → lock until tomorrow
      user.setDaily(todayKey, 'tarotThree', { cards, reading: text });
    } catch (e) {
      setErrorMsg(e?.message || 'Failed to generate reading');
    } finally {
      setLoadingReading(false);
    }
  };

  const showRevealBtn = phase === 'grid' && !locked && (!reading || reading.trim().length === 0);

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

  const GridScroll = () => (
    <ScrollView
      style={{ flex: 1, width: '100%' }}
      contentContainerStyle={{ paddingHorizontal: PANEL_PAD, paddingTop: 12, paddingBottom: 120 }} // space for footer button
      showsVerticalScrollIndicator
    >
      <View style={styles.gridWrap}>
        <View style={styles.row}>
          {cards.slice(0, 2).map((c, i) => (
            <View key={c.id || i} style={styles.cell}>
              <Image source={{ uri: c.imageUrl }} style={styles.cellImg} resizeMode="contain" />
              <Text style={styles.cellLabel}>{i === 0 ? (t('past') || 'Past') : (t('present') || 'Present')}</Text>
              <Text style={styles.cellName} numberOfLines={1}>{c.name}</Text>
            </View>
          ))}
        </View>
        <View style={[styles.row, { justifyContent: 'center' }]}>
          <View style={styles.cell}>
            <Image source={{ uri: cards[2].imageUrl }} style={styles.cellImg} resizeMode="contain" />
            <Text style={styles.cellLabel}>{t('future') || 'Future'}</Text>
            <Text style={styles.cellName} numberOfLines={1}>{cards[2].name}</Text>
          </View>
        </View>

        {!!reading && (
          <View style={styles.readingWrap}>
            <Text style={styles.readingText}>{reading}</Text>
          </View>
        )}
      </View>
    </ScrollView>
  );

  /* ---------- LOCKED VIEW ---------- */
  if (phase === 'locked') {
    return (
      <ImageBackground
        source={require('../../assets/images/three-tarot-background.jpg')}
        style={styles.bg}
        resizeMode="cover"
      >
        <View pointerEvents="none" style={styles.overlay} />
        <SafeAreaView style={styles.safe}>
          <View style={styles.root}>
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
                    <View key={c.id || i} style={styles.cell}>
                      <Image source={{ uri: c.imageUrl }} style={styles.cellImg} resizeMode="contain" />
                      <Text style={styles.cellLabel}>
                        {i === 0 ? (t('past') || 'Past') : (t('present') || 'Present')}
                      </Text>
                      <Text style={styles.cellName} numberOfLines={1}>{c.name}</Text>
                    </View>
                  ))}
                </View>
                <View style={[styles.row, { justifyContent: 'center' }]}>
                  <View style={styles.cell}>
                    <Image source={{ uri: savedToday.cards?.[2]?.imageUrl }} style={styles.cellImg} resizeMode="contain" />
                    <Text style={styles.cellLabel}>{t('future') || 'Future'}</Text>
                    <Text style={styles.cellName} numberOfLines={1}>{savedToday.cards?.[2]?.name}</Text>
                  </View>
                </View>
              </View>

              {!!savedToday.reading && (
                <View style={styles.readingWrap}>
                  <Text style={styles.readingText}>{savedToday.reading}</Text>
                </View>
              )}
            </ScrollView>

            <View style={[styles.bottomBar, { zIndex: 10 }]}>
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
          <View style={[styles.main, phase !== 'grid' && styles.centered]}>
            {phase === 'loading' && (
              <Text style={styles.hint}>{t('loading') || 'Loading...'}</Text>
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

          <View style={[styles.bottomBar, { zIndex: 10 }]}>
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
  errorText: { color: '#ffdede', textAlign: 'center', fontSize: 13, marginTop: 8 },

  /* Reveal fullscreen */
  revealWrap: { width: '100%', alignItems: 'center', justifyContent: 'center' },
  revealImg: { width: '100%', height: SCREEN_H * 0.6, borderRadius: 16 },
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

  /* Reading panel — outer ScrollView provides scrolling */
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

















