// src/screens/NumberScreen.js
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ImageBackground,
  SafeAreaView,
  Animated,
  Easing,
  TouchableOpacity,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import LinearGradient from 'react-native-linear-gradient';
import { useTranslation } from 'react-i18next';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AdEventType, RewardedAd, RewardedAdEventType } from 'react-native-google-mobile-ads';
import { BYPASS_DAILY_LIMITS } from '../config/featureFlags';
import { AD_REQUEST_OPTIONS, REWARDED_NUMBER_AD_UNIT_ID } from '../config/admob';

const MIN_NUMBER = 1;
const MAX_NUMBER = 50;
const DATE_KEY = () => new Date().toISOString().slice(0, 10);
const STORAGE_KEY = 'astro_daily_number_v1';

export default function NumberScreen({ navigation }) {
  const { t, i18n } = useTranslation('common');
  const insets = useSafeAreaInsets();
  const todayKey = useMemo(() => DATE_KEY(), []);
  const [numbers, setNumbers] = useState([]);
  const [rewardUnlocked, setRewardUnlocked] = useState(false);
  const [rewardLoaded, setRewardLoaded] = useState(false);
  const [rewardLoading, setRewardLoading] = useState(false);
  const [isSpinning, setIsSpinning] = useState(false);
  const [spinningIndex, setSpinningIndex] = useState(null);
  const [spinValue1, setSpinValue1] = useState(null);
  const [spinValue2, setSpinValue2] = useState(null);
  const enforceLimit = !BYPASS_DAILY_LIMITS;

  const fade1 = useRef(new Animated.Value(0)).current;
  const scale1 = useRef(new Animated.Value(0.92)).current;
  const pulse1 = useRef(new Animated.Value(0)).current;
  const fade2 = useRef(new Animated.Value(0)).current;
  const scale2 = useRef(new Animated.Value(0.92)).current;
  const pulse2 = useRef(new Animated.Value(0)).current;
  const numbersRef = useRef(numbers);
  const spinTimerRef = useRef(null);
  const spinIntervalRef = useRef(null);
  const rewarded = useMemo(
    () => RewardedAd.createForAdRequest(REWARDED_NUMBER_AD_UNIT_ID, AD_REQUEST_OPTIONS),
    []
  );

  const hasFirst = numbers.length >= 1;
  const hasSecond = numbers.length >= 2;
  const canRevealSecond = rewardUnlocked && hasFirst && !hasSecond;
  const canReveal = !enforceLimit || !hasFirst || canRevealSecond;

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        if (!active) return;
        if (raw) {
          const data = JSON.parse(raw);
          const savedForToday = data?.date === todayKey;
          if (savedForToday) {
            const savedNumbers = Array.isArray(data?.numbers)
              ? data.numbers.filter((n) => typeof n === 'number')
              : (typeof data?.number === 'number' ? [data.number] : []);
            setNumbers(savedNumbers);
            setRewardUnlocked(!!data?.rewardUnlocked);
            if (savedNumbers.length > 0) {
              fade1.setValue(1);
              scale1.setValue(1);
            }
            if (savedNumbers.length > 1) {
              fade2.setValue(1);
              scale2.setValue(1);
            }
            setIsSpinning(false);
            setSpinningIndex(null);
            setSpinValue1(null);
            setSpinValue2(null);
            return;
          }
        }
        setNumbers([]);
        setRewardUnlocked(false);
        setIsSpinning(false);
        setSpinningIndex(null);
        setSpinValue1(null);
        setSpinValue2(null);
      } catch {
        setNumbers([]);
        setRewardUnlocked(false);
        setIsSpinning(false);
        setSpinningIndex(null);
        setSpinValue1(null);
        setSpinValue2(null);
      }
    })();
    return () => { active = false; };
  }, [todayKey, i18n.language, fade1, scale1, fade2, scale2]);

  useEffect(() => {
    numbersRef.current = numbers;
  }, [numbers]);

  useEffect(() => {
    return () => {
      if (spinTimerRef.current) clearTimeout(spinTimerRef.current);
      if (spinIntervalRef.current) clearInterval(spinIntervalRef.current);
    };
  }, []);

  const persistState = async (nextNumbers, nextRewardUnlocked) => {
    try {
      await AsyncStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          date: todayKey,
          numbers: nextNumbers,
          rewardUnlocked: !!nextRewardUnlocked,
          lang: i18n.language,
        })
      );
    } catch {}
  };

  useEffect(() => {
    const unsubscribeLoaded = rewarded.addAdEventListener(
      RewardedAdEventType.LOADED,
      () => {
        setRewardLoaded(true);
        setRewardLoading(false);
      }
    );
    const unsubscribeEarned = rewarded.addAdEventListener(
      RewardedAdEventType.EARNED_REWARD,
      () => {
        setRewardUnlocked(true);
        persistState(numbersRef.current, true);
      }
    );
    const unsubscribeClosed = rewarded.addAdEventListener(
      AdEventType.CLOSED,
      () => {
        setRewardLoaded(false);
        rewarded.load();
      }
    );
    const unsubscribeError = rewarded.addAdEventListener(
      AdEventType.ERROR,
      () => {
        setRewardLoaded(false);
        setRewardLoading(false);
      }
    );
    rewarded.load();
    return () => {
      unsubscribeLoaded();
      unsubscribeEarned();
      unsubscribeClosed();
      unsubscribeError();
    };
  }, [rewarded, todayKey, i18n.language]);

  const pickNumber = (exclude) => {
    let next = Math.floor(Math.random() * (MAX_NUMBER - MIN_NUMBER + 1)) + MIN_NUMBER;
    if (typeof exclude === 'number') {
      while (next === exclude) {
        next = Math.floor(Math.random() * (MAX_NUMBER - MIN_NUMBER + 1)) + MIN_NUMBER;
      }
    }
    return next;
  };

  const spinFor = (index, onDone) => {
    if (spinTimerRef.current) clearTimeout(spinTimerRef.current);
    if (spinIntervalRef.current) clearInterval(spinIntervalRef.current);
    setIsSpinning(true);
    setSpinningIndex(index);
    const setSpinValue = index === 0 ? setSpinValue1 : setSpinValue2;
    const fade = index === 0 ? fade1 : fade2;
    const scale = index === 0 ? scale1 : scale2;
    fade.setValue(1);
    scale.setValue(1);
    const spinOnce = () => setSpinValue(pickNumber());
    spinOnce();
    spinIntervalRef.current = setInterval(spinOnce, 150);
    const durationMs = 1500 + Math.floor(Math.random() * 600); // 1.5s - 2.1s
    spinTimerRef.current = setTimeout(() => {
      if (spinIntervalRef.current) clearInterval(spinIntervalRef.current);
      setIsSpinning(false);
      setSpinningIndex(null);
      onDone();
    }, durationMs);
  };

  const revealNumber = async () => {
    if (!canReveal || isSpinning) return;
    const isSecondReveal = enforceLimit && hasFirst;
    const index = isSecondReveal ? 1 : 0;
    spinFor(index, async () => {
      const exclude = isSecondReveal ? numbers[0] : null;
      const next = pickNumber(exclude);
      const nextNumbers = !enforceLimit
        ? [next]
        : (hasFirst ? [numbers[0], next] : [next]);
      setNumbers(nextNumbers);
      await persistState(nextNumbers, rewardUnlocked);

      const fade = isSecondReveal ? fade2 : fade1;
      const scale = isSecondReveal ? scale2 : scale1;
      const pulse = isSecondReveal ? pulse2 : pulse1;
      fade.setValue(0);
      scale.setValue(0.92);
      pulse.setValue(0);

      Animated.parallel([
        Animated.timing(fade, {
          toValue: 1,
          duration: 420,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(scale, {
          toValue: 1,
          duration: 420,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.sequence([
          Animated.timing(pulse, {
            toValue: 1,
            duration: 520,
            easing: Easing.out(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(pulse, {
            toValue: 0,
            duration: 820,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ]),
      ]).start();
    });
  };

  const onWatchRewarded = () => {
    if (rewardLoaded) {
      rewarded.show();
      return;
    }
    setRewardLoading(true);
    rewarded.load();
  };

  const hint = t('daily_number_hint') || 'Reveal a number for today';
  const title = t('daily_number_title') || 'Your daily number';
  const revealLabel = t('reveal_number') || 'Reveal my number';
  const drawAgainLabel = t('draw_again') || 'Reveal again';
  const lockedLabel = t('back') || 'Back';
  const lockedBanner = t('next_available_tomorrow') || 'Next available tomorrow';
  const watchAdLabel = t('watch_ad_for_second_number') || 'Watch an ad for a second number';
  const revealSecondLabel = t('reveal_second_number') || 'Reveal second number';
  const unlockedLabel = t('second_number_unlocked') || 'Second number unlocked';

  const showRewardButton = enforceLimit && hasFirst && !hasSecond && !rewardUnlocked;
  const showUnlockedBanner = enforceLimit && hasFirst && !hasSecond && rewardUnlocked;
  const showLockedBanner = enforceLimit && hasSecond;
  const showSecondOrb = hasSecond || (isSpinning && spinningIndex === 1);
  const displayFirst = (isSpinning && spinningIndex === 0 && typeof spinValue1 === 'number')
    ? spinValue1
    : (hasFirst ? numbers[0] : null);
  const displaySecond = (isSpinning && spinningIndex === 1 && typeof spinValue2 === 'number')
    ? spinValue2
    : (hasSecond ? numbers[1] : null);
  const primaryLabel = !hasFirst
    ? revealLabel
    : (!enforceLimit ? drawAgainLabel : (canRevealSecond ? revealSecondLabel : lockedLabel));
  const primaryAction = (!hasFirst || !enforceLimit || canRevealSecond)
    ? revealNumber
    : () => navigation.goBack();

  return (
    <ImageBackground
      source={require('../../assets/images/number-background.jpg')}
      style={styles.bg}
      resizeMode="cover"
    >
      <LinearGradient
        colors={['rgba(4, 0, 12, 0.85)', 'rgba(12, 0, 24, 0.45)', 'rgba(4, 0, 12, 0.9)']}
        style={styles.overlay}
      />

      <SafeAreaView style={styles.safe}>
        <View style={styles.root}>
          <View style={styles.centerArea}>
            <Text style={styles.title}>{title}</Text>
            <Text style={styles.subtitle}>{hint}</Text>
            {showLockedBanner && <Text style={styles.banner}>{lockedBanner}</Text>}
            {showUnlockedBanner && <Text style={styles.bannerAlt}>{unlockedLabel}</Text>}

            <View style={[styles.orbWrap, showSecondOrb && styles.orbWrapDouble]}>
              <NumberOrb
                value={displayFirst}
                fade={fade1}
                scale={scale1}
                pulse={pulse1}
              />
              {showSecondOrb && (
                <NumberOrb
                  value={displaySecond}
                  fade={fade2}
                  scale={scale2}
                  pulse={pulse2}
                />
              )}
            </View>

          </View>

          <View style={[styles.bottomBar, { paddingBottom: 24 + insets.bottom }]}>
            {showRewardButton && (
              <MysticButton
                label={rewardLoading ? (t('loading') || 'Loading...') : watchAdLabel}
                onPress={onWatchRewarded}
                disabled={rewardLoading || isSpinning}
                variant="secondary"
              />
            )}
            <MysticButton
              label={primaryLabel}
              onPress={primaryAction}
              disabled={isSpinning}
            />
          </View>
        </View>
      </SafeAreaView>
    </ImageBackground>
  );
}

function NumberOrb({ value, fade, scale, pulse }) {
  const empty = typeof value !== 'number';
  return (
    <View style={styles.orbSlot}>
      <Animated.View
        style={[
          styles.orbGlow,
          {
            opacity: empty
              ? 0.35
              : pulse.interpolate({ inputRange: [0, 1], outputRange: [0.25, 0.75] }),
            transform: [
              {
                scale: empty
                  ? 1
                  : pulse.interpolate({ inputRange: [0, 1], outputRange: [0.95, 1.08] }),
              },
            ],
          },
        ]}
      />
      <Animated.View
        style={[
          styles.orb,
          {
            opacity: empty ? 0.7 : fade,
            transform: [{ scale: empty ? 1 : scale }],
          },
        ]}
      >
        <Text style={styles.numberText}>{empty ? '-' : value}</Text>
      </Animated.View>
    </View>
  );
}

function MysticButton({ label, onPress, disabled, variant = 'primary' }) {
  return (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={onPress}
      disabled={disabled}
      style={[
        styles.mysticBtn,
        variant === 'secondary' && styles.mysticBtnSecondary,
        disabled && { opacity: 0.6 },
      ]}
    >
      <View style={styles.mysticBtnGlow} />
      <Text style={styles.mysticBtnText}>{label}</Text>
    </TouchableOpacity>
  );
}

  const styles = StyleSheet.create({
  bg: { flex: 1 },
  overlay: { ...StyleSheet.absoluteFillObject },
  safe: { flex: 1 },
  root: { flex: 1 },
  centerArea: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 18,
  },
  title: {
    color: '#f6e9ff',
    fontSize: 24,
    fontWeight: '800',
    textAlign: 'center',
    letterSpacing: 0.6,
  },
  subtitle: {
    color: '#d9c9ee',
    fontSize: 14,
    textAlign: 'center',
    marginTop: 6,
    marginBottom: 22,
    opacity: 0.9,
  },
  banner: {
    color: '#ffd262',
    fontSize: 13,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 16,
    letterSpacing: 0.3,
  },
  bannerAlt: {
    color: '#bfe5ff',
    fontSize: 12,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 12,
    letterSpacing: 0.2,
  },
  orbWrap: {
    width: 220,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    height: 220,
  },
  orbWrapDouble: {
    height: 380,
  },
  orbSlot: {
    width: 220,
    height: 220,
    alignItems: 'center',
    justifyContent: 'center',
  },
  orbGlow: {
    position: 'absolute',
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: 'rgba(162, 82, 255, 0.25)',
    shadowColor: '#b66bff',
    shadowOpacity: 0.6,
    shadowRadius: 22,
    shadowOffset: { width: 0, height: 0 },
  },
  orb: {
    width: 170,
    height: 170,
    borderRadius: 85,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(24, 12, 40, 0.9)',
    borderWidth: 1,
    borderColor: 'rgba(210, 165, 255, 0.5)',
  },
  numberText: {
    color: '#ffe7c2',
    fontSize: 62,
    lineHeight: 66,
    fontWeight: '900',
    textShadowColor: 'rgba(0,0,0,0.45)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 10,
  },
  bottomBar: {
    padding: 16,
    paddingBottom: 24,
    gap: 10,
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
    borderColor: 'rgba(204,153,255,0.5)',
  },
  mysticBtnSecondary: {
    backgroundColor: 'rgba(43,31,58,0.6)',
    borderColor: 'rgba(204,153,255,0.35)',
  },
  mysticBtnGlow: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(164, 69, 255, 0.25)',
    opacity: 0.35,
  },
  mysticBtnText: {
    color: '#fff',
    fontWeight: '800',
    letterSpacing: 0.5,
    fontSize: 16,
  },
});
