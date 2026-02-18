// src/screens/StandartZodiacScreen.js
import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ImageBackground,
  SafeAreaView,
  TouchableOpacity,
  ScrollView,
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

const DATE_KEY = () => new Date().toISOString().slice(0, 10);

// map capitalized sign → local image require
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

export default function StandartZodiacScreen({ navigation }) {
  const { t, i18n } = useTranslation('common');
  const { colors } = useTheme();
  const user = useUser();
  const insets = useSafeAreaInsets();

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
  const saved = savedRaw && savedRaw.lang === i18n.language ? savedRaw : null;
  const effectiveSaved = BYPASS_DAILY_LIMITS ? null : saved;

  const [advice, setAdvice] = useState(effectiveSaved?.text || '');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    setAdvice(effectiveSaved?.text || '');
    setErrorMsg('');
  }, [effectiveSaved?.text, i18n.language]);

  const isLocked = !BYPASS_DAILY_LIMITS && !!saved;

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
      const text = data?.advice || '';
      setAdvice(text);
      // save for today (locks until tomorrow)
      user.setDaily(todayKey, 'advice', { sign, text, lang: i18n.language });
    } catch (e) {
      setErrorMsg(e?.message || 'Failed to fetch advice');
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
            {!!(advice || (isLocked && saved?.text)) && (
              <View style={styles.card}>
                <Text style={styles.cardText}>{advice || saved?.text || ''}</Text>
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






