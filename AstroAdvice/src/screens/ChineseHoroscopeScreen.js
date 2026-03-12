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
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { AdEventType, InterstitialAd } from 'react-native-google-mobile-ads';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { useUser } from '../context/UserContext';
import { apiFetch } from '../services/api';
import { BYPASS_DAILY_LIMITS } from '../config/featureFlags';
import { AD_REQUEST_OPTIONS, INTERSTITIAL_CHINESE_HOROSCOPE_AD_UNIT_ID } from '../config/admob';
import { logEvent, logScreen } from '../services/analytics';

const DATE_KEY = () => new Date().toISOString().slice(0, 10);
const INTERSTITIAL_DAILY_KEY = 'astro_interstitial_chinese_v1';

export default function ChineseHoroscopeScreen({ navigation }) {
  const { colors } = useTheme();
  const { t, i18n } = useTranslation('common');
  const user = useUser();
  const insets = useSafeAreaInsets();
  const interstitial = useMemo(
    () => InterstitialAd.createForAdRequest(INTERSTITIAL_CHINESE_HOROSCOPE_AD_UNIT_ID, AD_REQUEST_OPTIONS),
    []
  );
  const [interstitialLoaded, setInterstitialLoaded] = useState(false);
  const interstitialShowingRef = useRef(false);
  const loggedScreenRef = useRef(false);
  const loggedSignRef = useRef(false);
  const loggedHoroscopeRef = useRef(false);

  const sign = (user?.chineseSign || '').toLowerCase();
  const element = (user?.chineseElement || '').toLowerCase();

  const todayKey = useMemo(() => DATE_KEY(), []);
  const savedRaw = user?.daily?.chineseHoroscope?.[todayKey] || null;
  const locked = !BYPASS_DAILY_LIMITS && !!savedRaw;

  // phases: 'loading' | 'sign' | 'element' | 'horoscope' | 'locked' | 'error'
  const [phase, setPhase] = useState(locked ? 'locked' : 'loading');
  const [signData, setSignData] = useState(null); // { name, desc, imageUrl }
  const [elemData, setElemData] = useState(null); // { name, desc, imageUrl }
  const [horoscope, setHoroscope] = useState(savedRaw?.horoscope || '');
  const [err, setErr] = useState('');

  // Animations
  const fadeSign = useRef(new Animated.Value(0)).current;
  const fadeElem = useRef(new Animated.Value(0)).current;

  const ELEMENT_ADJ_BG = {
    wood: 'Дървено',
    fire: 'Огнено',
    earth: 'Земно',
    metal: 'Метално',
    water: 'Водно',
  };
  const getElementLabel = (elementKey) => {
    if (!elementKey) return '';
    if (i18n.language === 'bg') {
      return ELEMENT_ADJ_BG[elementKey] || t(elementKey) || elementKey;
    }
    return t(elementKey) || elementKey;
  };
  const formatElementTitle = (signKey, elementKey) => {
    const signLabel = signKey ? (t(signKey) || signKey) : '';
    const elementLabel = getElementLabel(elementKey);
    return [elementLabel, signLabel].filter(Boolean).join(' ').trim();
  };
  const signLabel = sign ? (t(sign) || sign) : '';
  const elementTitle = formatElementTitle(sign, element);
  const savedTitle = (() => {
    const slug = savedRaw?.slug || '';
    if (slug.includes('-')) {
      const [savedSign, savedElement] = slug.split('-');
      if (savedSign && savedElement) {
        return formatElementTitle(savedSign, savedElement);
      }
    }
    return savedRaw?.name || '';
  })();

  useEffect(() => {
    if (!loggedScreenRef.current) {
      loggedScreenRef.current = true;
      logScreen('ChineseHoroscope');
      logEvent('feature_opened', { feature: 'chinese_horoscope' });
    }
  }, []);

  useEffect(() => {
    if (locked) {
      setPhase('locked');
      setHoroscope(savedRaw?.horoscope || '');
    } else if (phase === 'locked') {
      setPhase('loading');
    }
    setErr('');
  }, [locked, savedRaw?.horoscope, phase]);

  useEffect(() => {
    if (!horoscope) {
      loggedHoroscopeRef.current = false;
      return;
    }
    if (!loggedHoroscopeRef.current) {
      loggedHoroscopeRef.current = true;
      logEvent('content_viewed', {
        feature: 'chinese_horoscope',
        lang: i18n.language,
        is_cached: locked ? 1 : 0,
      });
    }
  }, [horoscope, i18n.language, locked]);

  useEffect(() => {
    const unsubLoaded = interstitial.addAdEventListener(AdEventType.LOADED, () => {
      setInterstitialLoaded(true);
    });
    const unsubOpened = interstitial.addAdEventListener(AdEventType.OPENED, () => {
      logEvent('ad_impression_shown', {
        placement: 'chinese_horoscope_interstitial',
        ad_type: 'interstitial',
      });
    });
    const unsubClosed = interstitial.addAdEventListener(AdEventType.CLOSED, () => {
      interstitialShowingRef.current = false;
      setInterstitialLoaded(false);
      interstitial.load();
    });
    const unsubError = interstitial.addAdEventListener(AdEventType.ERROR, () => {
      interstitialShowingRef.current = false;
      setInterstitialLoaded(false);
      interstitial.load();
    });
    interstitial.load();
    return () => {
      unsubLoaded();
      unsubOpened();
      unsubClosed();
      unsubError();
    };
  }, [interstitial]);

  const maybeShowInterstitial = async () => {
    if (!interstitialLoaded || interstitialShowingRef.current) return;
    try {
      const lastShown = await AsyncStorage.getItem(INTERSTITIAL_DAILY_KEY);
      if (lastShown === todayKey) return;
      interstitialShowingRef.current = true;
      interstitial.show();
      await AsyncStorage.setItem(INTERSTITIAL_DAILY_KEY, todayKey);
    } catch {
      interstitialShowingRef.current = false;
    }
  };

  // Load sign data on entry
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
        setSignData(null);
        setElemData(null);
        setHoroscope('');
        loggedSignRef.current = false;

        const s = await apiFetch(
          `/chinese/${encodeURIComponent(sign)}?lang=${encodeURIComponent(i18n.language)}`,
          'GET'
        );
        if (!active) return;
        setSignData(s);
        if (!loggedSignRef.current) {
          loggedSignRef.current = true;
          logEvent('chinese_sign_selected', { sign, lang: i18n.language });
        }
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
        logEvent('error_shown', {
          feature: 'chinese_sign',
          code: String(e?.message || 'error').slice(0, 60),
        });
      }
    })();

    return () => { active = false; };
  }, [sign, i18n.language, fadeSign, t]);

  const onRevealElement = async () => {
    if (!sign || !element) {
      setErr(t('set_profile_first') || 'Please set your profile first.');
      return;
    }
    try {
      setErr('');
      const slug = `${sign}-${element}`;
      const d = await apiFetch(
        `/chinese/${encodeURIComponent(slug)}?lang=${encodeURIComponent(i18n.language)}`,
        'GET'
      );
      setElemData(d);
      logEvent('content_revealed', { feature: 'chinese_element', lang: i18n.language });
      if (d?.imageUrl) {
        try { await Image.prefetch(d.imageUrl); } catch {}
      }
      fadeElem.setValue(0);
      Animated.timing(fadeElem, {
        toValue: 1,
        duration: 650,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }).start(() => setPhase('element'));
    } catch (e) {
      setErr(e?.message || 'Failed to reveal element');
      logEvent('error_shown', {
        feature: 'chinese_element',
        code: String(e?.message || 'error').slice(0, 60),
      });
    }
  };

  const onGetTodaysHoroscope = async () => {
    if (!sign || !element) {
      setErr(t('set_profile_first') || 'Please set your profile first.');
      return;
    }
    try {
      setErr('');
      maybeShowInterstitial();
      const data = await apiFetch(
        `/chinese/daily?sign=${encodeURIComponent(sign)}&element=${encodeURIComponent(
          element
        )}&lang=${encodeURIComponent(i18n.language)}`,
        'GET'
      );
      const text = data?.horoscope || '';
      if (!text) {
        setErr('Failed to get horoscope');
        return;
      }
      setHoroscope(text);
      logEvent('content_generated', { feature: 'chinese_horoscope', lang: i18n.language });
      logEvent('chinese_horoscope_loaded', { sign, lang: i18n.language });

      const snapshot = {
        slug: `${sign}-${element}`,
        name: elementTitle || elemData?.name || signData?.name || '',
        desc: elemData?.desc || signData?.desc || '',
        imageUrl: elemData?.imageUrl || signData?.imageUrl || '',
        horoscope: text,
        lang: i18n.language,
      };
      user.setDaily(todayKey, 'chineseHoroscope', snapshot);
      setPhase('horoscope');
    } catch (e) {
      setErr(e?.message || 'Failed to get horoscope');
      logEvent('error_shown', {
        feature: 'chinese_horoscope',
        code: String(e?.message || 'error').slice(0, 60),
      });
    }
  };

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
              {!!savedRaw?.imageUrl && (
                <Image
                  source={{ uri: savedRaw.imageUrl }}
                  style={styles.mainImg}
                  resizeMode="contain"
                />
              )}

              {!!savedTitle && (
                <Text style={styles.titleText}>{savedTitle}</Text>
              )}

              {!!savedRaw?.desc && (
                <View style={styles.card}>
                  <Text style={styles.cardText}>{savedRaw.desc}</Text>
                </View>
              )}

              {!!savedRaw?.horoscope && (
                <View style={styles.card}>
                  <Text style={styles.cardHeader}>
                    {t('todays_horoscope') || "Today's horoscope"}
                  </Text>
                  <Text style={styles.cardText}>{savedRaw.horoscope}</Text>
                </View>
              )}
            </ScrollView>

            <View style={[styles.bottomBar, { paddingBottom: 20 + insets.bottom }]}>
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

  return (
    <ImageBackground
      source={require('../../assets/images/lanterns-bg.jpg')}
      style={styles.bg}
      resizeMode="cover"
    >
      <View style={styles.overlay} />
      <SafeAreaView style={styles.safe}>
        <View style={styles.root}>
          <ScrollView
            style={{ flex: 1, width: '100%' }}
            contentContainerStyle={{ padding: 16, paddingBottom: 120 }}
            showsVerticalScrollIndicator={false}
          >
            {!!signData?.imageUrl && (
              <Animated.Image
                source={{ uri: signData.imageUrl }}
                style={[
                  styles.mainImg,
                  {
                    opacity: elemData
                      ? fadeSign.interpolate({
                          inputRange: [0, 1],
                          outputRange: [1, 0.15],
                        })
                      : fadeSign,
                  },
                ]}
                resizeMode="contain"
              />
            )}

            {!!elemData?.imageUrl && (
              <Animated.Image
                source={{ uri: elemData.imageUrl }}
                style={[styles.mainImgOverlay, { opacity: fadeElem }]}
                resizeMode="contain"
              />
            )}

            <Text style={styles.titleText}>
              {(elemData
                ? (elementTitle || elemData?.name || signData?.name || '')
                : (signLabel || signData?.name || '')
              ).toString()}
            </Text>

            {!!(elemData?.desc || signData?.desc) && (
              <View style={styles.card}>
                <Text style={styles.cardText}>
                  {elemData?.desc || signData?.desc || ''}
                </Text>
              </View>
            )}

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

          <View style={[styles.bottomBar, { paddingBottom: 20 + insets.bottom }]}>
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

            {elemData && !!horoscope && (
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

  cnBtn: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 26,
    backgroundColor: '#7a0c0c',
    borderWidth: 1,
    borderColor: '#d6a63b',
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
