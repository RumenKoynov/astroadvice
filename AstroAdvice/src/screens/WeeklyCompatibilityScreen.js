import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ImageBackground,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BANNER_WEEKLY_COMPAT_AD_UNIT_ID } from '../config/admob';

import { SIGN_IDS, SIGN_ID_BY_EN } from '../i18n/zodiacMap';
import { useUser } from '../context/UserContext';
import AdBanner from '../components/ads/AdBanner';
import { logEvent, logScreen } from '../services/analytics';
import {
  loadWeeklyCompatibility,
  computeWeeklyCompatibility,
  pickAlternateSign,
  WEEKLY_COMPAT_SELECTION_KEY,
  getWeekKey,
} from '../utils/weeklyCompatibility';

export default function WeeklyCompatibilityScreen({ navigation }) {
  const { i18n } = useTranslation('common');
  const insets = useSafeAreaInsets();
  const user = useUser();
  const langKey = (i18n.language || 'en').split('-')[0];
  const userSignId = useMemo(() => {
    const en = user?.westernZodiac || '';
    return SIGN_ID_BY_EN[en] || '';
  }, [user?.westernZodiac]);

  const [weeklyData, setWeeklyData] = useState(null);
  const [weekKey, setWeekKey] = useState(getWeekKey());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [signA, setSignA] = useState(userSignId || 'aries');
  const [signB, setSignB] = useState(pickAlternateSign(userSignId || 'aries'));
  const [activeTarget, setActiveTarget] = useState('a');
  const loggedRef = useRef(false);
  const loggedWeekRef = useRef('');
  const loggedComboRef = useRef('');

  useEffect(() => {
    if (!loggedRef.current) {
      loggedRef.current = true;
      logScreen('WeeklyCompatibility');
      logEvent('feature_opened', { feature: 'weekly_compatibility' });
    }
  }, []);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const cachedSel = await AsyncStorage.getItem(WEEKLY_COMPAT_SELECTION_KEY);
        if (cachedSel && mounted) {
          const parsed = JSON.parse(cachedSel);
          if (parsed?.a) setSignA(parsed.a);
          if (parsed?.b) setSignB(parsed.b);
        }
      } catch {
        // ignore
      }
    })();
    return () => { mounted = false; };
  }, []);

  useEffect(() => {
    AsyncStorage.setItem(
      WEEKLY_COMPAT_SELECTION_KEY,
      JSON.stringify({ a: signA, b: signB })
    );
  }, [signA, signB]);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        setLoading(true);
        setError('');
        const res = await loadWeeklyCompatibility();
        if (!active) return;
        setWeeklyData(res.data);
        setWeekKey(res.weekKey);
      } catch (e) {
        if (!active) return;
        setError(e?.message || 'Failed to load compatibility');
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, []);

  const translations = weeklyData?.translations || {};
  const copy = translations[langKey] || translations.en || {};
  const signLabels = copy.signs || {};
  const order = weeklyData?.order || SIGN_IDS;

  const setTargetSign = (id) => {
    if (activeTarget === 'a') {
      setSignA(id);
      if (id === signB) setSignB(pickAlternateSign(id, order));
    } else {
      setSignB(id);
      if (id === signA) setSignA(pickAlternateSign(id, order));
    }
  };

  const useMySign = () => {
    if (!userSignId) return;
    setSignA(userSignId);
    if (userSignId === signB) setSignB(pickAlternateSign(userSignId, order));
    setActiveTarget('b');
  };

  const swapSigns = () => {
    setSignA(signB);
    setSignB(signA);
  };

  const compatibility = useMemo(() => {
    if (!weeklyData || !signA || !signB) return null;
    return computeWeeklyCompatibility(signA, signB, weeklyData, weekKey);
  }, [weeklyData, signA, signB, weekKey]);

  useEffect(() => {
    if (!weeklyData || !weekKey) return;
    if (loggedWeekRef.current === weekKey) return;
    loggedWeekRef.current = weekKey;
    logEvent('content_loaded', { feature: 'weekly_compatibility', week: weekKey, lang: i18n.language });
  }, [weeklyData, weekKey, i18n.language]);

  useEffect(() => {
    if (!compatibility) return;
    const key = `${weekKey}:${signA}:${signB}`;
    if (loggedComboRef.current === key) return;
    loggedComboRef.current = key;
    logEvent('content_viewed', {
      feature: 'weekly_compatibility',
      week: weekKey,
      sign_a: signA,
      sign_b: signB,
      lang: i18n.language,
    });
  }, [compatibility, weekKey, signA, signB, i18n.language]);

  const label = (id) => signLabels[id] || id;
  const desc = (category, tier) => copy?.desc?.[category]?.[tier] || '';

  return (
    <ImageBackground
      source={require('../../assets/images/home.jpg')}
      style={styles.bg}
      resizeMode="cover"
    >
      <View pointerEvents="none" style={styles.overlay} />
      <SafeAreaView
        style={[
          styles.safe,
          { paddingTop: Math.max(insets.top, 8), paddingBottom: Math.max(insets.bottom, 8) },
        ]}
      >
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <Text style={styles.title}>{copy.title || 'Weekly Compatibility'}</Text>
          <Text style={styles.subtitle}>{copy.subtitle || 'Weekly alignment for your signs.'}</Text>

          {loading && (
            <View style={styles.loading}>
              <ActivityIndicator />
              <Text style={styles.loadingText}>{copy.loading || 'Loading...'}</Text>
            </View>
          )}

          {!!error && !loading && (
            <Text style={styles.errorText}>{error}</Text>
          )}

          {!loading && !!weeklyData && (
            <>
              <View style={styles.pickerRow}>
                <TouchableOpacity
                  style={[styles.targetCard, activeTarget === 'a' && styles.targetCardActive]}
                  onPress={() => setActiveTarget('a')}
                  activeOpacity={0.9}
                >
                  <Text style={styles.targetLabel}>{copy.you || 'Your sign'}</Text>
                  <Text style={styles.targetValue}>{label(signA)}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.targetCard, activeTarget === 'b' && styles.targetCardActive]}
                  onPress={() => setActiveTarget('b')}
                  activeOpacity={0.9}
                >
                  <Text style={styles.targetLabel}>{copy.other || 'Other sign'}</Text>
                  <Text style={styles.targetValue}>{label(signB)}</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.actionsRow}>
                {!!userSignId && (
                  <TouchableOpacity style={styles.actionBtn} onPress={useMySign} activeOpacity={0.9}>
                    <Text style={styles.actionText}>{copy.use_my_sign || 'Use my sign'}</Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity style={styles.actionBtn} onPress={swapSigns} activeOpacity={0.9}>
                  <Text style={styles.actionText}>{copy.swap || 'Swap'}</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.signGrid}>
                {order.map((id) => {
                  const isActive = (activeTarget === 'a' ? signA : signB) === id;
                  return (
                    <TouchableOpacity
                      key={id}
                      style={[styles.signChip, isActive && styles.signChipActive]}
                      onPress={() => setTargetSign(id)}
                      activeOpacity={0.9}
                    >
                      <Text style={[styles.signText, isActive && styles.signTextActive]}>{label(id)}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {!compatibility && (
                <Text style={styles.emptyText}>
                  {copy.select_two || 'Select two signs to reveal compatibility'}
                </Text>
              )}

              {!!compatibility && (
                <View style={styles.results}>
                  <CategoryCard
                    title={copy.love || 'Love'}
                    score={compatibility.love.score}
                    desc={desc('love', compatibility.love.tier)}
                  />
                  <CategoryCard
                    title={copy.friendship || 'Friendship'}
                    score={compatibility.friendship.score}
                    desc={desc('friendship', compatibility.friendship.tier)}
                  />
                  <CategoryCard
                    title={copy.work || 'Work'}
                    score={compatibility.work.score}
                    desc={desc('work', compatibility.work.tier)}
                  />
                </View>
              )}
            </>
          )}
        </ScrollView>

        <View style={[styles.bottomArea, { paddingBottom: 10 + insets.bottom }]}>
          <AdBanner unitId={BANNER_WEEKLY_COMPAT_AD_UNIT_ID} placement="weekly_compat_bottom_banner" />
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()} activeOpacity={0.9}>
            <Text style={styles.backText}>{copy.back || 'Back'}</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </ImageBackground>
  );
}

function CategoryCard({ title, score, desc }) {
  return (
    <View style={styles.categoryCard}>
      <Text style={styles.categoryTitle}>{title}</Text>
      <View style={styles.scoreRow}>
        <View style={styles.barTrack}>
          <View style={[styles.barFill, { width: `${score}%` }]} />
        </View>
        <Text style={styles.scoreText}>{score}</Text>
      </View>
      <Text style={styles.categoryDesc}>{desc}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  bg: { flex: 1 },
  overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.6)' },
  safe: { flex: 1 },
  content: { padding: 16, paddingBottom: 30 },
  title: {
    color: '#ffe7c2',
    fontSize: 24,
    fontWeight: '900',
    textAlign: 'center',
  },
  subtitle: {
    color: '#e4dcf5',
    textAlign: 'center',
    marginTop: 6,
    marginBottom: 12,
  },
  loading: {
    alignItems: 'center',
    marginVertical: 16,
    gap: 6,
  },
  loadingText: { color: '#d9c9ee' },
  errorText: { color: '#ffdede', textAlign: 'center', marginTop: 12 },
  pickerRow: { flexDirection: 'row', gap: 10 },
  targetCard: {
    flex: 1,
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(214,166,59,0.25)',
    backgroundColor: 'rgba(0,0,0,0.35)',
    alignItems: 'center',
  },
  targetCardActive: {
    borderColor: 'rgba(214,166,59,0.85)',
    backgroundColor: 'rgba(43,31,58,0.7)',
  },
  targetLabel: { color: '#ffd262', fontWeight: '800', fontSize: 12 },
  targetValue: { color: '#fff', fontWeight: '800', marginTop: 4 },
  actionsRow: { flexDirection: 'row', gap: 10, marginTop: 10 },
  actionBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(204,153,255,0.4)',
    backgroundColor: '#2b1f3a',
    alignItems: 'center',
  },
  actionText: { color: '#fff', fontWeight: '700' },
  signGrid: {
    marginTop: 12,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  signChip: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(214,166,59,0.25)',
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  signChipActive: {
    borderColor: 'rgba(214,166,59,0.85)',
    backgroundColor: 'rgba(43,31,58,0.8)',
  },
  signText: { color: '#e9e0ff', fontWeight: '700' },
  signTextActive: { color: '#fff' },
  emptyText: {
    color: '#e3d8f2',
    textAlign: 'center',
    marginTop: 16,
  },
  results: { marginTop: 16, gap: 12 },
  categoryCard: {
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(214,166,59,0.25)',
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  categoryTitle: { color: '#ffd262', fontWeight: '800', marginBottom: 6 },
  scoreRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  barTrack: {
    flex: 1,
    height: 10,
    borderRadius: 6,
    backgroundColor: 'rgba(255,255,255,0.15)',
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    backgroundColor: '#ffd262',
  },
  scoreText: { color: '#fff', width: 32, textAlign: 'right', fontWeight: '800' },
  categoryDesc: { color: '#fff', marginTop: 8, lineHeight: 20 },
  bottomArea: {
    paddingTop: 6,
    paddingBottom: 10,
    alignItems: 'center',
  },
  backBtn: {
    marginTop: 10,
    alignSelf: 'stretch',
    marginHorizontal: 24,
    paddingHorizontal: 30,
    paddingVertical: 16,
    borderRadius: 26,
    borderWidth: 1,
    borderColor: 'rgba(204,153,255,0.4)',
    backgroundColor: '#2b1f3a',
  },
  backText: { color: '#fff', fontWeight: '800', fontSize: 16, textAlign: 'center' },
});
