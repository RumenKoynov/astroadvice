// src/screens/MovieQuotesScreen.js
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
import ViewShot, { captureRef } from 'react-native-view-shot';
import Share from 'react-native-share';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { useUser } from '../context/UserContext';
import { BYPASS_DAILY_LIMITS } from '../config/featureFlags';
import { apiFetch } from '../services/api';
import { logEvent, logScreen } from '../services/analytics';
import AdBanner from '../components/ads/AdBanner';
import { BANNER_MOVIE_QUOTES_AD_UNIT_ID } from '../config/admob';
import { PLAY_STORE_URL_ANDROID } from '../config/env';

const DATE_KEY = () => new Date().toISOString().slice(0, 10);

export default function MovieQuotesScreen({ navigation }) {
  const { t, i18n } = useTranslation('common');
  const user = useUser();
  const insets = useSafeAreaInsets();
  const loggedRef = useRef(false);

  const todayKey = useMemo(() => DATE_KEY(), []);
  const savedRaw = user?.daily?.movieQuotes?.[todayKey] || null;
  const matchContext = !!savedRaw && savedRaw.lang === i18n.language;
  const effectiveSaved = BYPASS_DAILY_LIMITS ? null : (matchContext ? savedRaw : null);
  const locked = !!effectiveSaved;

  const [data, setData] = useState(effectiveSaved || null);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [shareLoading, setShareLoading] = useState(false);
  const shareShotRef = useRef(null);

  useEffect(() => {
    if (!loggedRef.current) {
      loggedRef.current = true;
      logScreen('MovieQuotes');
      logEvent('feature_opened', { feature: 'movie_quotes' });
    }
  }, []);

  useEffect(() => {
    setData(effectiveSaved || null);
    setErrorMsg('');
  }, [effectiveSaved]);

  const fetchQuote = async () => {
    setErrorMsg('');
    setLoading(true);
    try {
      const res = await apiFetch(`/movies/quote?lang=${encodeURIComponent(i18n.language)}`);
      setData(res);
      user.setDaily(todayKey, 'movieQuotes', { ...res, lang: i18n.language });
      logEvent('content_generated', { feature: 'movie_quotes', lang: i18n.language });
    } catch (e) {
      setErrorMsg(e?.message || 'Failed to load quote');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (locked) return;
    fetchQuote();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [i18n.language, locked]);

  useEffect(() => {
    if (quote) {
      logEvent('content_viewed', { feature: 'movie_quotes', lang: i18n.language, is_cached: locked ? 1 : 0 });
    }
  }, [quote, i18n.language, locked]);

  const quote = data?.quote || '';
  const movie = data?.movie || '';
  const year = data?.year || '';
  const actors = Array.isArray(data?.actors) ? data.actors : [];
  const actorsText = actors.filter(Boolean).join(', ');
  const shareLabel = t('share_facebook') || 'Share to Facebook';
  const shareQuoteText = () =>
    t('share_movie_quote', { quote, movie, year }) || `“${quote}” — ${movie} (${year})`;
  const shareAppText =
    t('share_app', { url: PLAY_STORE_URL_ANDROID }) || `AstroAdvice: ${PLAY_STORE_URL_ANDROID}`;

  const onShareQuote = async () => {
    if (!quote || !shareShotRef.current || shareLoading) return;
    setShareLoading(true);
    const message = [shareQuoteText(), shareAppText].filter(Boolean).join('\n');
    try {
      const uri = await captureRef(shareShotRef, {
        format: 'png',
        quality: 0.9,
        result: 'tmpfile',
      });
      const url = uri.startsWith('file://') ? uri : `file://${uri}`;
      await Share.open({ message, url });
      logEvent('content_shared', { feature: 'movie_quotes', lang: i18n.language, channel: 'facebook' });
    } catch {}
    finally {
      setShareLoading(false);
    }
  };

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
        <View style={styles.root}>
          <ScrollView
            style={{ flex: 1, width: '100%' }}
            contentContainerStyle={{ padding: 18, paddingBottom: 120 }}
            showsVerticalScrollIndicator={false}
          >
            <Text style={styles.title}>{t('movie_quotes_title') || 'Movie Quotes'}</Text>

            {loading && (
              <View style={styles.loadingRow}>
                <ActivityIndicator size="large" color="#ffe7c2" />
                <Text style={styles.loadingText}>{t('loading') || 'Loading...'}</Text>
              </View>
            )}

            <ViewShot ref={shareShotRef} options={{ format: 'png', quality: 0.9 }}>
              {!!quote && (
                <View style={styles.quoteCard}>
                  <Text style={styles.quoteText}>{`“${quote}”`}</Text>
                </View>
              )}

              {!!movie && (
                <View style={styles.metaCard}>
                  <Text style={styles.metaLabel}>{t('movie_quote_movie') || 'Movie'}</Text>
                  <Text style={styles.metaValue}>{movie}</Text>

                  {!!actorsText && (
                    <>
                      <View style={styles.metaSpacer} />
                      <Text style={styles.metaLabel}>{t('movie_quote_actors') || 'Actors'}</Text>
                      <Text style={styles.metaValue}>{actorsText}</Text>
                    </>
                  )}

                  {!!year && (
                    <>
                      <View style={styles.metaSpacer} />
                      <Text style={styles.metaLabel}>{t('movie_quote_year') || 'Year'}</Text>
                      <Text style={styles.metaValue}>{year}</Text>
                    </>
                  )}
                </View>
              )}
            </ViewShot>

            {!!errorMsg && <Text style={styles.errorText}>{errorMsg}</Text>}

            {!loading && !quote && !errorMsg && (
              <Text style={styles.hintText}>{t('loading') || 'Loading...'}</Text>
            )}

            {!!quote && (
              <Text style={styles.nextText}>
                {t('next_available_tomorrow') || 'Next available tomorrow'}
              </Text>
            )}
          </ScrollView>

          <View style={[styles.bottomBar, { paddingBottom: 16 + insets.bottom }]}>
            <AdBanner unitId={BANNER_MOVIE_QUOTES_AD_UNIT_ID} placement="movie_quotes_bottom_banner" />
            {!!errorMsg && (
              <TouchableOpacity style={styles.secondaryBtn} onPress={fetchQuote} activeOpacity={0.85}>
                <Text style={styles.secondaryText}>{t('try_again') || 'Try again'}</Text>
              </TouchableOpacity>
            )}
            {!!quote && (
              <TouchableOpacity style={styles.fbBtn} onPress={onShareQuote} activeOpacity={0.85} disabled={shareLoading}>
                <Text style={styles.fbBtnText}>{shareLoading ? (t('loading') || 'Loading...') : shareLabel}</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()} activeOpacity={0.9}>
              <Text style={styles.backText}>{t('back') || 'Back'}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  bg: { flex: 1 },
  overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.55)' },
  safe: { flex: 1 },
  root: { flex: 1 },
  title: {
    color: '#ffe7c2',
    fontSize: 22,
    fontWeight: '900',
    textAlign: 'center',
    marginBottom: 14,
  },
  quoteCard: {
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(214,166,59,0.3)',
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  quoteText: {
    color: '#fff',
    fontSize: 18,
    fontStyle: 'italic',
    lineHeight: 26,
    textAlign: 'center',
  },
  metaCard: {
    marginTop: 14,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(204,153,255,0.35)',
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  metaLabel: {
    color: '#ffd262',
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 4,
    letterSpacing: 0.2,
  },
  metaValue: {
    color: '#fff',
    textAlign: 'center',
    fontSize: 15,
    lineHeight: 22,
  },
  metaSpacer: { height: 10 },
  nextText: {
    marginTop: 16,
    color: '#ffd262',
    textAlign: 'center',
    fontWeight: '700',
  },
  loadingRow: {
    marginTop: 6,
    alignItems: 'center',
    gap: 8,
  },
  loadingText: {
    color: '#ffe7c2',
    fontWeight: '700',
    fontSize: 16,
  },
  hintText: {
    color: '#ffe7c2',
    textAlign: 'center',
    marginTop: 10,
  },
  errorText: {
    color: '#ffdede',
    textAlign: 'center',
    marginTop: 12,
  },
  bottomBar: {
    paddingHorizontal: 18,
    paddingTop: 6,
    gap: 10,
  },
  backBtn: {
    alignSelf: 'stretch',
    paddingVertical: 14,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(204,153,255,0.4)',
    backgroundColor: '#2b1f3a',
  },
  backText: { color: '#fff', fontWeight: '800', textAlign: 'center', fontSize: 16 },
  secondaryBtn: {
    alignSelf: 'stretch',
    paddingVertical: 12,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: 'rgba(214,166,59,0.45)',
    backgroundColor: 'rgba(43,31,58,0.6)',
  },
  secondaryText: { color: '#ffe7c2', fontWeight: '700', textAlign: 'center' },
  fbBtn: {
    alignSelf: 'stretch',
    paddingVertical: 12,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#1667d6',
    backgroundColor: '#1877F2',
  },
  fbBtnText: {
    color: '#fff',
    fontWeight: '800',
    textAlign: 'center',
    fontSize: 15,
    letterSpacing: 0.3,
  },
});
