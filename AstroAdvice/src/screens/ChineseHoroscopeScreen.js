// src/screens/ChineseHoroscopeScreen.js
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
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { useTheme } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';

import { useUser } from '../context/UserContext';
import { apiFetch } from '../services/api';
import {
  BYPASS_DAILY_CHINESE_LIMIT,
} from '../config/featureFlags'; // <- per your note

const DATE_KEY = () => new Date().toISOString().slice(0, 10);

export default function ChineseHoroscopeScreen({ navigation }) {
  const { colors } = useTheme();
  const { t, i18n } = useTranslation('common');
  const user = useUser();

  const sign = (user?.chineseSign || '').toLowerCase();     // e.g., 'rat'
  const element = (user?.chineseElement || '').toLowerCase(); // e.g., 'water'
  const todayKey = useMemo(() => DATE_KEY(), []);
  const savedToday = user?.daily?.chineseHoroscope?.[todayKey] || null;
  const locked = !BYPASS_DAILY_CHINESE_LIMIT && !!savedToday;

  // phases: 'loading' | 'sign' | 'element' | 'horoscope' | 'locked' | 'error'
  const [phase, setPhase] = useState(locked ? 'locked' : 'loading');

  const [signData, setSignData] = useState(null);       // { name:{}, desc:{}, imageUrl }
  const [elemData, setElemData] = useState(null);       // { name:{}, desc:{}, imageUrl }
  const [horoscope, setHoroscope] = useState(savedToday?.horoscope || '');
  const [err, setErr] = useState('');

  // Animations
  const fadeSign = useRef(new Animated.Value(0)).current;
  const fadeElem = useRef(new Animated.Value(0)).current;

  // Early exit: LOCKED VIEW
  if (phase === 'locked') {
    return (
      <ImageBackground
        source={require('../../assets/images/lanterns-bg.jpg')}
        style={styles.bg}
        resizeMode="cover"
      >
        <View style={styles.overlay} />
        <SafeAreaView style={styles.safe}>
          <View style={styles.root}>
            <Text style={styles.banner}>
              {t('next_available_tomorrow') || 'Next Chinese horoscope available tomorrow'}
            </Text>

            <ScrollView
              style={{ flex: 1, width: '100%' }}
              contentContainerStyle={{ padding: 16, paddingBottom: 120 }}
              showsVerticalScrollIndicator={false}
            >
              {!!savedToday?.imageUrl && (
                <Image
                  source={{ uri: savedToday.imageUrl }}
                  style={styles.mainImg}
                  resizeMode="contain"
                />
              )}

              {!!savedToday?.name && (
                <Text style={styles.titleText}>
                  {savedToday.name}
                </Text>
              )}

              {!!savedToday?.desc && (
                <View style={styles.card}>
                  <Text style={styles.cardText}>{savedToday.desc}</Text>
                </View>
              )}

              {!!savedToday?.horoscope && (
                <View style={styles.card}>
                  <Text style={styles.cardHeader}>
                    {t('todays_horoscope') || "Today's horoscope"}
                  </Text>
                  <Text style={styles.cardText}>{savedToday.horoscope}</Text>
                </View>
              )}
            </ScrollView>

            <View style={styles.bottomBar}>
              <ChineseButton
                label={t('back') || 'Back'}
                onPress={() => navigation.navigate('Home')}
              />
            </View>
          </View>
        </SafeAreaView>
      </ImageBackground>
    );
  }

  // Flow when NOT locked
  useEffect(() => {
    let active = true;
    (async () => {
      try {
        if (!sign) {
          setErr(t('set_profile_first') || 'Please set your profile first.');
          setPhase('error');
          return;
        }
        setErr('');
        setPhase('loading');

        // 1) Fetch SIGN data and fade in
        const s = await apiFetch(`/chinese/${sign}`, 'GET');
        if (!active) return;
        setSignData(s);
        // Preload image then animate
        if (s?.imageUrl) {
          try { await Image.prefetch(s.imageUrl); } catch {}
        }
        fadeSign.setValue(0);
        Animated.timing(fadeSign, {
          toValue: 1,
          duration: 600,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        }).start(() => {
          if (active) setPhase('sign');
        });
      } catch (e) {
        if (!active) return;
        setErr(e?.message || 'Failed to load sign');
        setPhase('error');
      }
    })();

    return () => { active = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sign, i18n.language]);

  const onRevealElement = async () => {
    if (!sign || !element) return;
    try {
      setErr('');
      // 2) Fetch ELEMENT (sign-element) and cross-fade
      const slug = `${sign}-${element}`;
      const d = await apiFetch(`/chinese/${slug}`, 'GET');
      setElemData(d);

      // Preload element image
      if (d?.imageUrl) {
        try { await Image.prefetch(d.imageUrl); } catch {}
      }

      // Cross-fade: show elem image, fade it in
      fadeElem.setValue(0);
      Animated.timing(fadeElem, {
        toValue: 1,
        duration: 650,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }).start(() => setPhase('element'));
    } catch (e) {
      setErr(e?.message || 'Failed to reveal element');
    }
  };

  const onGetTodaysHoroscope = async () => {
    if (!sign || !element) return;
    try {
      setErr('');
      const data = await apiFetch(
        `/chinese/daily?sign=${encodeURIComponent(sign)}&element=${encodeURIComponent(
          element
        )}&lang=${encodeURIComponent(i18n.language)}`,
        'GET'
      );
      const text = data?.horoscope || '';
      setHoroscope(text);

      // Save daily snapshot for lock
      const snapshot = {
        slug: `${sign}-${element}`,
        name: elemData?.name || signData?.name || '',
        desc: elemData?.desc || signData?.desc || '',
        imageUrl: elemData?.imageUrl || signData?.imageUrl || '',
        horoscope: text,
      };
      user.setDaily(todayKey, 'chineseHoroscope', snapshot);

      setPhase('horoscope');
    } catch (e) {
      setErr(e?.message || 'Failed to get horoscope');
    }
  };

  return (
    <ImageBackground
      source={require('../../assets/images/lanterns-bg.jpg')}
      style={styles.bg}
      resizeMode="cover"
    >
      <View style={styles.overlay} />
      <SafeAreaView style={styles.safe}>
        <View style={styles.root}>
          {/* Content */}
          <ScrollView
            style={{ flex: 1, width: '100%' }}
            contentContainerStyle={{ padding: 16, paddingBottom: 120 }}
            showsVerticalScrollIndicator={false}
          >
            {/* SIGN image (fades in first) */}
            {!!signData?.imageUrl && (
              <Animated.Image
                source={{ uri: signData.imageUrl }}
                style={[styles.mainImg, { opacity: elemData ? fadeSign.interpolate({
                  inputRange: [0, 1],
                  outputRange: [1, 0.15], // dim sign when element is revealed
                }) : fadeSign }]}
                resizeMode="contain"
              />
            )}

            {/* ELEMENT image (cross-fades in on top) */}
            {!!elemData?.imageUrl && (
              <Animated.Image
                source={{ uri: elemData.imageUrl }}
                style={[styles.mainImgOverlay, { opacity: fadeElem }]}
                resizeMode="contain"
              />
            )}

            {/* Title */}
            <Text style={styles.titleText}>
              {(elemData?.name || signData?.name || '').toString()}
            </Text>

            {/* Description (sign or element-specific when available) */}
            {!!(elemData?.desc || signData?.desc) && (
              <View style={styles.card}>
                <Text style={styles.cardText}>
                  {elemData?.desc || signData?.desc || ''}
                </Text>
              </View>
            )}

            {/* Horoscope (after request) */}
            {!!horoscope && (
              <View style={styles.card}>
                <Text style={styles.cardHeader}>
                  {t('todays_horoscope') || "Today's horoscope"}
                </Text>
                <Text style={styles.cardText}>{horoscope}</Text>
              </View>
            )}

            {!!err && <Text style={styles.errorText}>{err}</Text>}
          </ScrollView>

          {/* Footer buttons */}
          <View style={styles.bottomBar}>
            {!elemData && (
              <ChineseButton
                label={t('reveal_my_element') || 'Reveal my element'}
                onPress={onRevealElement}
              />
            )}

            {elemData && !horoscope && (
              <ChineseButton
                label={t('todays_horoscope') || "Today's horoscope"}
                onPress={onGetTodaysHoroscope}
              />
            )}

            {(elemData && !!horoscope) && (
              <ChineseButton
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

/* --------- Chinese-styled button --------- */
function ChineseButton({ label, onPress, disabled }) {
  return (
    <TouchableOpacity
      activeOpacity={0.9}
      onPress={onPress}
      disabled={disabled}
      style={[styles.cnBtn, disabled && { opacity: 0.6 }]}
    >
      <View style={styles.cnBtnBorder} />
      <Text style={styles.cnBtnText}>{label}</Text>
    </TouchableOpacity>
  );
}

/* -------------------- Styles -------------------- */
const styles = StyleSheet.create({
  bg: { flex: 1 },
  overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.3)' },
  safe: { flex: 1 },
  root: { flex: 1 },

  mainImg: {
    width: '100%',
    height: 320,
    borderRadius: 16,
  },
  mainImgOverlay: {
    position: 'absolute',
    top: 16,
    left: 16,
    right: 16,
    height: 320,
    borderRadius: 16,
  },

  titleText: {
    color: '#ffe7c2',
    fontSize: 22,
    fontWeight: '800',
    textAlign: 'center',
    marginTop: 12,
    textShadowColor: 'rgba(0,0,0,0.35)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },

  card: {
    backgroundColor: 'rgba(0,0,0,0.35)',
    borderWidth: 1,
    borderColor: 'rgba(255,210,98,0.25)',
    borderRadius: 14,
    padding: 14,
    marginTop: 12,
  },
  cardHeader: {
    color: '#ffd262',
    fontWeight: '800',
    marginBottom: 6,
    textAlign: 'center',
    letterSpacing: 0.2,
  },
  cardText: {
    color: '#fff',
    fontSize: 16,
    lineHeight: 22,
    textAlign: 'center',
  },

  banner: {
    textAlign: 'center',
    color: '#ffd262',
    fontWeight: '800',
    fontSize: 14,
    marginTop: 12,
    paddingHorizontal: 16,
  },

  bottomBar: {
    padding: 16,
    paddingBottom: 20,
  },

  errorText: {
    color: '#ffdede',
    textAlign: 'center',
    marginTop: 10,
    fontSize: 13,
  },

  // Chinese-styled button
  cnBtn: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 26,
    backgroundColor: '#7a0c0c', // deep red
    borderWidth: 1,
    borderColor: '#d6a63b',     // gold
    overflow: 'hidden',
  },
  cnBtnBorder: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 26,
    borderWidth: 2,
    borderColor: 'rgba(214,166,59,0.35)',
  },
  cnBtnText: {
    color: '#ffe7c2',
    fontWeight: '800',
    letterSpacing: 0.4,
    fontSize: 16,
  },
});





