// src/screens/StandardZodiacScreen.js
import React, { useEffect, useMemo, useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ImageBackground,
  SafeAreaView,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { useTheme } from '@react-navigation/native';
import { apiFetch } from '../services/api';
import { useUser } from '../context/UserContext';
import { BYPASS_DAILY_LIMITS } from '../config/featureFlags';
import { SIGN_ID_BY_EN } from '../i18n/zodiacMap';
import NativeAdCard from '../components/ads/NativeAdCard';
import { NATIVE_DAILY_HOROSCOPE_AD_UNIT_ID } from '../config/admob';
import { logEvent, logScreen } from '../services/analytics';

const DATE_KEY = () => new Date().toISOString().slice(0, 10);

// map capitalized sign â†’ local image require
const zodiacBg = {
  Aries: require('../../assets/images/Aries.png'),
  Taurus: require('../../assets/images/Taurus.png'),
  Gemini: require('../../assets/images/Gemini.png'),
  Cancer: require('../../assets/images/Cancer.png'),
  Leo: require('../../assets/images/Leo.png'),
  Virgo: require('../../assets/images/Virgo.png'),
  Libra: require('../../assets/images/Libra.png'),
  Scorpio: require('../../assets/images/Scorpio.png'),
  Sagittarius: require('../../assets/images/Sagittarius.png'),
  Capricorn: require('../../assets/images/Capricorn.png'),
  Aquarius: require('../../assets/images/Aquarius.png'),
  Pisces: require('../../assets/images/Pisces.png'),
};

export default function StandardZodiacScreen({ navigation }) {
  const { t, i18n } = useTranslation('common');
  const { colors } = useTheme();
  const user = useUser();
  const insets = useSafeAreaInsets();
  const loggedScreenRef = useRef(false);
  const loggedViewedRef = useRef(false);

  const sign = user?.westernZodiac || '';
  const sex = user?.sex || '';
  const dob = user?.dob || '';

  const age = useMemo(() => {
    if (!dob) return '';
    try {
      const d = new Date(dob);
      const now = new Date();
      let a = now.getFullYear() - d.getFullYear();
      const m = now.getMonth() - d.getMonth();
      if (m < 0 || (m === 0 && now.getDate() < d.getDate())) a--;
      return a;
    } catch {
      return '';
    }
  }, [dob]);

  const todayKey = useMemo(() => DATE_KEY(), []);
  const savedRaw = user?.daily?.advice?.[todayKey] || null;
  const ageKey = typeof age === 'number' ? age : Number(age || '');
  const matchContext = !!savedRaw
    && savedRaw.sign === sign
    && savedRaw.sex === sex
    && savedRaw.lang === i18n.language
    && Number(savedRaw.age) === (Number.isFinite(ageKey) ? ageKey : Number(savedRaw.age));
  const effectiveSaved = BYPASS_DAILY_LIMITS ? null : (matchContext ? savedRaw : null);

  const [advice, setAdvice] = useState(effectiveSaved?.advice || effectiveSaved?.text || '');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (!loggedScreenRef.current) {
      loggedScreenRef.current = true;
      logScreen('StandardZodiac');
      logEvent('feature_opened', { feature: 'daily_advice' });
    }
  }, []);

  useEffect(() => {
    setAdvice(effectiveSaved?.advice || effectiveSaved?.text || '');
    setErrorMsg('');
  }, [effectiveSaved?.advice, effectiveSaved?.text]);

  useEffect(() => {
    if (!advice) {
      loggedViewedRef.current = false;
      return;
    }
    if (!loggedViewedRef.current) {
      loggedViewedRef.current = true;
      logEvent('content_viewed', {
        feature: 'daily_advice',
        lang: i18n.language,
        is_cached: isLocked ? 1 : 0,
      });
    }
  }, [advice, i18n.language, isLocked]);

  const isLocked = !BYPASS_DAILY_LIMITS && !!effectiveSaved;

  const bgSource = zodiacBg[sign] || require('../../assets/images/std-horoscope-bg.jpg');
  const signId = sign ? (SIGN_ID_BY_EN[sign] || sign.toLowerCase()) : '';
  const localizedSign = signId ? (t(signId) || sign) : '';

  const fetchAdvice = async () => {
    if (!sign) {
      setErrorMsg(t('set_profile_first') || 'Please set your profile first.');
      return;
    }
    setErrorMsg('');
    setLoading(true);
    try {
      const qs = new URLSearchParams({
        sign,
        lang: i18n.language,
        sex: String(sex || ''),
        age: String(age || ''),
      }).toString();
      const data = await apiFetch(`/getDailyAdvice?${qs}`, 'GET');
      const text = data?.advice || [data?.base, data?.personalized].filter(Boolean).join('\\n\\n');
      setAdvice(text);
      // save for today (locks until tomorrow, invalidated by sign/age/sex/lang)
      user.setDaily(todayKey, 'advice', {
        sign,
        age: Number.isFinite(ageKey) ? ageKey : '',
        sex,
        lang: i18n.language,
        base: data?.base || '',
        personalized: data?.personalized || '',
        advice: text,
      });
      logEvent('content_generated', { feature: 'daily_advice', lang: i18n.language });
    } catch (e) {
      setErrorMsg(e?.message || 'Failed to fetch advice');
      logEvent('error_shown', {
        feature: 'daily_advice',
        code: String(e?.message || 'error').slice(0, 60),
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <ImageBackground source={bgSource} style={styles.bg} resizeMode="cover">
      <View style={styles.overlay} />
      <SafeAreaView style={styles.safe}>
        <View style={styles.root}>
          <View style={styles.topSpace} />

          {/* Title / Sign */}
          {!!sign && (
            <Text style={styles.signTitle}>
              {localizedSign}
            </Text>
          )}

          {/* Locked banner (if used today) */}
          {isLocked && (
            <Text style={styles.lockedText}>
              {t('next_available_tomorrow') || 'Next zodiac advice available tomorrow'}
            </Text>
          )}

          {/* Content */}
          <ScrollView
            style={{ flex: 1, width: '100%' }}
            contentContainerStyle={{ paddingHorizontal: 18, paddingBottom: 120 }}
            showsVerticalScrollIndicator={false}
          >
            {/* Advice text (saved or fetched) */}
            {loading && (
              <View style={styles.loadingRow}>
              <ActivityIndicator size="large" color="#ffe7c2" />
              <Text style={styles.loadingText}>{t('loading') || 'Loading...'}</Text>
            </View>
            )}
            {!!(advice || (isLocked && (savedRaw?.advice || savedRaw?.text))) && (
              <View style={styles.card}>
                <Text style={styles.cardText}>{advice || savedRaw?.advice || savedRaw?.text || ''}</Text>
              </View>
            )}

            {/* Error */}
            {!!errorMsg && <Text style={styles.errorText}>{errorMsg}</Text>}

            <NativeAdCard unitId={NATIVE_DAILY_HOROSCOPE_AD_UNIT_ID} />
          </ScrollView>

          {/* Footer button */}
          <View style={[styles.bottomBar, { paddingBottom: 20 + insets.bottom }]}>
            {(BYPASS_DAILY_LIMITS || (!isLocked && !advice)) ? (
              <MysticButton
                label={t('get_todays_advice') || "Get today's advice"}
                onPress={fetchAdvice}
                disabled={loading}
              />
            ) : (
              <MysticButton
                label={t('back') || 'Back'}
                onPress={() => navigation.goBack()}
              />
            )}
          </View>
        </View>
      </SafeAreaView>
    </ImageBackground>
  );
}

/* ---------- Mystic Button (shared style) ---------- */
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

/* -------------------- Styles -------------------- */
const styles = StyleSheet.create({
  bg: { flex: 1 },
  overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.35)' },
  safe: { flex: 1 },
  root: { flex: 1, alignItems: 'center' },
  topSpace: { height: 12 },

  signTitle: {
    marginTop: 8,
    color: '#fff',
    fontSize: 22,
    fontWeight: '800',
    textShadowColor: 'rgba(0,0,0,0.35)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },

  lockedText: {
    marginTop: 6,
    color: '#ffe9a6',
    fontWeight: '700',
    fontSize: 14,
    textAlign: 'center',
    paddingHorizontal: 16,
  },

  card: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 14,
    padding: 16,
    marginTop: 16,
  },
  cardText: {
    color: '#fff',
    fontSize: 16,
    lineHeight: 22,
    textAlign: 'center',
  },

  bottomBar: {
    padding: 16,
    paddingBottom: 20,
    width: '100%',
  },

  errorText: {
    color: '#ffdede',
    textAlign: 'center',
    marginTop: 10,
    fontSize: 13,
  },
  loadingRow: {
    marginTop: 10,
    alignItems: 'center',
    gap: 8,
  },
  loadingText: {
    color: '#ffe7c2',
    fontWeight: '700',
    fontSize: 16,
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
    fontWeight: '700',
    letterSpacing: 0.4,
    fontSize: 16,
  },
});








