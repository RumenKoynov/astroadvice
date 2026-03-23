import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ImageBackground,
  SafeAreaView,
  FlatList,
  TouchableOpacity,
  Image,
  Animated,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AdEventType, InterstitialAd } from 'react-native-google-mobile-ads';
import { learnTarotCards } from '../data/learnTarotCards';
import { buildQuizQuestions } from '../utils/learnTarotQuiz';
import {
  AD_REQUEST_OPTIONS,
  BANNER_LEARN_TAROT_TOP_AD_UNIT_ID,
  BANNER_LEARN_TAROT_QUIZ_AD_UNIT_ID,
  INTERSTITIAL_LEARN_TAROT_QUIZ_AD_UNIT_ID,
  NATIVE_LEARN_TAROT_INLINE_AD_UNIT_ID,
} from '../config/admob';
import AdBanner from '../components/ads/AdBanner';
import NativeAdCard from '../components/ads/NativeAdCard';
import { logEvent, logScreen } from '../services/analytics';

const TABS = { CARDS: 'cards', QUIZ: 'quiz' };

export default function LearnTarotScreen({ navigation }) {
  const { t, i18n } = useTranslation('common');
  const insets = useSafeAreaInsets();
  const [tab, setTab] = useState(TABS.CARDS);

  const [quizActive, setQuizActive] = useState(false);
  const [quizDone, setQuizDone] = useState(false);
  const [questions, setQuestions] = useState([]);
  const [quizIndex, setQuizIndex] = useState(0);
  const [selected, setSelected] = useState(null);
  const [score, setScore] = useState(0);
  const [quizCardId, setQuizCardId] = useState(null);
  const interstitial = useMemo(
    () => InterstitialAd.createForAdRequest(INTERSTITIAL_LEARN_TAROT_QUIZ_AD_UNIT_ID, AD_REQUEST_OPTIONS),
    []
  );
  const [interstitialLoaded, setInterstitialLoaded] = useState(false);
  const interstitialShowingRef = useRef(false);
  const loggedRef = useRef(false);

  const langKey = (i18n.language || 'en').split('-')[0];

  const filteredCards = useMemo(() => learnTarotCards, []);

  const cardRows = useMemo(() => {
    const rows = [];
    let row = [];
    let count = 0;
    filteredCards.forEach((card) => {
      row.push(card);
      count += 1;
      if (row.length === 2) {
        rows.push({ type: 'row', id: `row-${rows.length}`, items: row });
        row = [];
      }
      if (count % 10 === 0) {
        if (row.length) {
          rows.push({ type: 'row', id: `row-${rows.length}`, items: row });
          row = [];
        }
        rows.push({ type: 'ad', id: `ad-${count}` });
      }
    });
    if (row.length) {
      rows.push({ type: 'row', id: `row-${rows.length}`, items: row });
    }
    return rows;
  }, [filteredCards]);

  const startQuiz = () => {
    logEvent('quiz_started', { feature: 'learn_tarot', lang: i18n.language });
    const q = buildQuizQuestions(learnTarotCards, langKey, 5);
    setQuestions(q);
    setQuizIndex(0);
    setSelected(null);
    setScore(0);
    setQuizActive(true);
    setQuizDone(false);
  };

  useEffect(() => {
    if (!loggedRef.current) {
      loggedRef.current = true;
      logScreen('LearnTarot');
      logEvent('feature_opened', { feature: 'learn_tarot' });
    }
  }, []);

  useEffect(() => {
    const unsubLoaded = interstitial.addAdEventListener(AdEventType.LOADED, () => {
      setInterstitialLoaded(true);
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
      unsubClosed();
      unsubError();
    };
  }, [interstitial]);

  const current = questions[quizIndex];
  const onSelect = (optionId) => {
    if (!current || selected) return;
    setSelected(optionId);
    if (optionId === current.answerId) {
      setScore((s) => s + 1);
      logEvent('quiz_answer', { feature: 'learn_tarot', correct: 1, lang: i18n.language });
    } else {
      logEvent('quiz_answer', { feature: 'learn_tarot', correct: 0, lang: i18n.language });
    }
  };

  const nextQuestion = () => {
    if (!current) return;
    if (quizIndex + 1 >= questions.length) {
      logEvent('quiz_completed', { feature: 'learn_tarot', score, total: questions.length, lang: i18n.language });
      setQuizDone(true);
      return;
    }
    if (quizIndex === 2 && interstitialLoaded && !interstitialShowingRef.current) {
      interstitialShowingRef.current = true;
      interstitial.show();
    }
    setQuizIndex((i) => i + 1);
    setSelected(null);
  };

  const retryQuiz = () => {
    setQuizActive(false);
    setQuizDone(false);
    setQuestions([]);
    setQuizIndex(0);
    setSelected(null);
    setScore(0);
  };

  const renderCard = (item) => {
    const name = item.name[langKey] || item.name.en;
    return (
      <TouchableOpacity
        testID={`learn-tarot-card-${item.id}`}
        style={styles.card}
        onPress={() => {
          logEvent('card_opened', { feature: 'learn_tarot', id: item.id, lang: i18n.language });
          navigation.navigate('TarotCardDetail', { id: item.id });
        }}
        activeOpacity={0.9}
      >
        <Image source={item.image} style={styles.cardImage} resizeMode="contain" />
        <Text style={styles.cardName} numberOfLines={2}>{name}</Text>
      </TouchableOpacity>
    );
  };

  const renderRow = ({ item }) => {
    if (item.type === 'ad') {
      return (
        <NativeAdCard
          unitId={NATIVE_LEARN_TAROT_INLINE_AD_UNIT_ID}
          placement="learn_tarot_cards_inline_native_test"
        />
      );
    }
    return (
      <View style={styles.row}>
        {item.items.map((card) => (
          <View key={card.id} style={styles.rowItem}>
            {renderCard(card)}
          </View>
        ))}
        {item.items.length === 1 && <View style={styles.rowItem} />}
      </View>
    );
  };

  const getImageSource = (id) => {
    const found = learnTarotCards.find((c) => c.id === id);
    return found?.image;
  };

  const backToHome = () => {
    setQuizActive(false);
    setQuizDone(false);
    setQuestions([]);
    setQuizIndex(0);
    setSelected(null);
    setScore(0);
    setTab(TABS.CARDS);
    navigation.navigate('Home');
  };

  useEffect(() => {
    if (tab !== TABS.QUIZ || quizActive) return;
    const idx = Math.floor(Math.random() * learnTarotCards.length);
    setQuizCardId(learnTarotCards[idx]?.id || null);
  }, [tab, quizActive]);

  const bounceAnim = useRef(new Animated.Value(0)).current;
  const bounceLoopRef = useRef(null);
  useEffect(() => {
    const shouldAnimate = tab === TABS.QUIZ && !quizActive;
    if (!shouldAnimate) {
      if (bounceLoopRef.current) {
        bounceLoopRef.current.stop();
        bounceLoopRef.current = null;
      }
      bounceAnim.setValue(0);
      return undefined;
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(bounceAnim, { toValue: 1, duration: 900, useNativeDriver: true }),
        Animated.timing(bounceAnim, { toValue: 0, duration: 900, useNativeDriver: true }),
      ])
    );
    bounceLoopRef.current = loop;
    loop.start();
    return () => {
      loop.stop();
      bounceLoopRef.current = null;
    };
  }, [bounceAnim, tab, quizActive]);

  return (
    <ImageBackground
      source={require('../../assets/images/single-tarot-background.jpg')}
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
        <Text style={styles.title}>{t('learn_tarot_title') || 'Learn Tarot'}</Text>

        <View style={styles.tabs}>
          <TouchableOpacity
            style={[styles.tabBtn, tab === TABS.CARDS && styles.tabBtnActive]}
            onPress={() => setTab(TABS.CARDS)}
          >
            <Text style={styles.tabText}>{t('learn_tarot_cards') || 'Cards'}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tabBtn, tab === TABS.QUIZ && styles.tabBtnActive]}
            onPress={() => setTab(TABS.QUIZ)}
          >
            <Text style={styles.tabText}>{t('learn_tarot_quiz') || 'Quiz'}</Text>
          </TouchableOpacity>
        </View>

        {tab === TABS.CARDS && (
          <>
            <AdBanner unitId={BANNER_LEARN_TAROT_TOP_AD_UNIT_ID} placement="learn_tarot_cards_top_banner" />
            <FlatList
              data={cardRows}
              keyExtractor={(item) => item.id}
              contentContainerStyle={styles.list}
              renderItem={renderRow}
              initialNumToRender={8}
              maxToRenderPerBatch={8}
              windowSize={5}
              removeClippedSubviews
              showsVerticalScrollIndicator={false}
            />
          </>
        )}

        {tab === TABS.QUIZ && (
          <View style={styles.quizWrap}>
            {!quizActive && (
              <>
                <View style={styles.quizMenu}>
                  <View style={styles.quizCenter}>
                    {!!quizCardId && (
                      <Animated.View
                        style={[
                          styles.quizGlow,
                          {
                            transform: [
                              {
                                translateY: bounceAnim.interpolate({
                                  inputRange: [0, 1],
                                  outputRange: [0, -8],
                                }),
                              },
                            ],
                          },
                        ]}
                      >
                        <Image
                          source={getImageSource(quizCardId)}
                          style={styles.quizCenterImage}
                          resizeMode="contain"
                        />
                      </Animated.View>
                    )}
                  </View>
                  <View style={styles.quizMenuButtons}>
                    <TouchableOpacity style={styles.quizBtnSecondary} onPress={startQuiz} activeOpacity={0.9}>
                      <Text style={styles.quizBtnText}>{t('learn_tarot_start_quiz') || 'Start quiz'}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.quizBtnSecondary} onPress={backToHome} activeOpacity={0.9}>
                      <Text style={styles.quizBtnText}>{t('back') || 'Back'}</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </>
            )}

            {quizActive && current && !quizDone && (
              <View style={styles.quizContent}>
                <View style={styles.quizBody}>
                  <Text style={styles.quizProgress}>
                    {t('learn_tarot_progress') || 'Progress'}: {quizIndex + 1}/{questions.length}
                  </Text>
                  <Text style={styles.quizScore}>
                    {t('learn_tarot_score') || 'Score'}: {score}
                  </Text>
                  <Image source={getImageSource(current.imageId)} style={styles.quizImage} resizeMode="contain" />
                  <Text style={styles.quizPrompt}>
                    {t('learn_tarot_choose') || 'Choose the correct card'}
                  </Text>
                  <View style={styles.options}>
                    {current.options.map((opt) => {
                      const isChosen = selected === opt.id;
                      const isCorrect = selected && opt.id === current.answerId;
                      const isWrong = selected && isChosen && opt.id !== current.answerId;
                      return (
                        <TouchableOpacity
                          key={opt.id}
                          style={[
                            styles.optionBtn,
                            isCorrect && styles.optionCorrect,
                            isWrong && styles.optionWrong,
                          ]}
                          onPress={() => onSelect(opt.id)}
                          activeOpacity={0.9}
                        >
                          <Text style={styles.optionText}>{opt.label}</Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                  {selected && (
                    <TouchableOpacity style={styles.quizBtn} onPress={nextQuestion} activeOpacity={0.9}>
                      <Text style={styles.quizBtnText}>{t('learn_tarot_next') || 'Next'}</Text>
                    </TouchableOpacity>
                  )}
                </View>
                <AdBanner unitId={BANNER_LEARN_TAROT_QUIZ_AD_UNIT_ID} placement="learn_tarot_quiz_bottom_banner" />
              </View>
            )}

            {quizActive && quizDone && (
              <View style={styles.quizDone}>
                <Text style={styles.quizDoneText}>{t('learn_tarot_quiz_done') || 'Quiz complete!'}</Text>
                <Text style={styles.quizScore}>
                  {t('learn_tarot_score') || 'Score'}: {score}/{questions.length}
                </Text>
                <TouchableOpacity style={styles.quizBtn} onPress={retryQuiz} activeOpacity={0.9}>
                  <Text style={styles.quizBtnText}>{t('learn_tarot_retry') || 'Retry'}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.quizBtnSecondary} onPress={backToHome} activeOpacity={0.9}>
                  <Text style={styles.quizBtnText}>{t('back') || 'Back'}</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        )}
      </SafeAreaView>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  bg: { flex: 1 },
  overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.55)' },
  safe: { flex: 1, paddingHorizontal: 16 },
  title: {
    marginBottom: 10,
    color: '#ffe7c2',
    fontSize: 22,
    fontWeight: '900',
    textAlign: 'center',
  },
  tabs: {
    flexDirection: 'row',
    gap: 10,
    justifyContent: 'center',
    marginBottom: 10,
  },
  tabBtn: {
    paddingVertical: 12,
    paddingHorizontal: 32,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: 'rgba(214,166,59,0.35)',
    backgroundColor: 'rgba(43, 31, 58, 0.55)',
  },
  tabBtnActive: {
    backgroundColor: '#321f47',
    borderColor: 'rgba(214,166,59,0.85)',
  },
  tabText: { color: '#fff', fontWeight: '800', fontSize: 16 },
  list: { paddingBottom: 20 },
  row: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  rowItem: { flex: 1 },
  card: {
    backgroundColor: 'rgba(0,0,0,0.4)',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(214,166,59,0.25)',
    padding: 10,
  },
  cardImage: { width: '100%', height: 160 },
  cardName: {
    marginTop: 6,
    color: '#ffe7c2',
    textAlign: 'center',
    fontWeight: '800',
    fontSize: 13,
  },
  quizWrap: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  quizMenu: { flex: 1, width: '100%', justifyContent: 'space-between' },
  quizCenter: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  quizGlow: {
    padding: 12,
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,210,98,0.4)',
    shadowColor: '#ffd262',
    shadowOpacity: 0.35,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
  },
  quizCenterImage: { width: 250, height: 370 },
  quizMenuButtons: { paddingBottom: 8 },
  quizBtn: {
    marginTop: 14,
    paddingVertical: 12,
    paddingHorizontal: 22,
    borderRadius: 22,
    backgroundColor: '#2b1f3a',
    borderWidth: 1,
    borderColor: 'rgba(204,153,255,0.4)',
  },
  quizBtnSecondary: {
    marginTop: 12,
    paddingVertical: 14,
    paddingHorizontal: 26,
    borderRadius: 22,
    backgroundColor: 'rgba(43,31,58,0.6)',
    borderWidth: 1,
    borderColor: 'rgba(204,153,255,0.35)',
    alignSelf: 'stretch',
    marginHorizontal: 24,
  },
  quizBtnText: { color: '#fff', fontWeight: '800', textAlign: 'center' },
  quizImage: { width: 180, height: 260, marginVertical: 12 },
  quizPrompt: { color: '#ffe7c2', fontWeight: '700', marginBottom: 8 },
  quizContent: {
    flex: 1,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 6,
  },
  quizBody: { width: '100%', alignItems: 'center' },
  options: { width: '100%', gap: 8 },
  optionBtn: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(214,166,59,0.25)',
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  optionText: { color: '#fff', textAlign: 'center', fontWeight: '600' },
  optionCorrect: { borderColor: 'rgba(88,214,141,0.9)', backgroundColor: 'rgba(20,60,30,0.6)' },
  optionWrong: { borderColor: 'rgba(255,105,97,0.9)', backgroundColor: 'rgba(60,20,20,0.6)' },
  quizProgress: { color: '#d9c9ee', marginBottom: 4 },
  quizScore: { color: '#d9c9ee', marginBottom: 6 },
  quizDone: { alignItems: 'center' },
  quizDoneText: { color: '#ffe7c2', fontWeight: '800', fontSize: 16 },
});
