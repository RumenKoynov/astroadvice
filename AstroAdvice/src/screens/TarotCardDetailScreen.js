import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ImageBackground,
  SafeAreaView,
  Image,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { learnTarotCards } from '../data/learnTarotCards';
import { getLocalized } from '../utils/learnTarotQuiz';
import AdBanner from '../components/ads/AdBanner';
import { BANNER_LEARN_TAROT_DETAIL_AD_UNIT_ID } from '../config/admob';

export default function TarotCardDetailScreen({ route, navigation }) {
  const { t, i18n } = useTranslation('common');
  const insets = useSafeAreaInsets();
  const langKey = (i18n.language || 'en').split('-')[0];
  const card = learnTarotCards.find((c) => c.id === route?.params?.id);

  if (!card) {
    return (
      <SafeAreaView style={styles.safePlain}>
        <Text style={styles.errorText}>{t('try_again') || 'Try again'}</Text>
      </SafeAreaView>
    );
  }

  const local = getLocalized(card, langKey);

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
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <Image source={card.image} style={styles.image} resizeMode="contain" />
          <Text style={styles.title}>{local.name}</Text>

          <Section title={t('learn_tarot_keywords') || 'Keywords'}>
            <View style={styles.keywordWrap}>
              {(local.keywords || []).map((k) => (
                <Text key={k} style={styles.keyword}>{k}</Text>
              ))}
            </View>
          </Section>

          <Section title={t('learn_tarot_meaning') || 'Meaning'}>
            <Text style={styles.text}>{local.meaning}</Text>
          </Section>

          <Section title={t('learn_tarot_advice') || 'Advice'}>
            <Text style={styles.text}>{local.advice}</Text>
          </Section>

        </ScrollView>

        <View style={[styles.bottomArea, { paddingBottom: 10 + insets.bottom }]}>
          <AdBanner unitId={BANNER_LEARN_TAROT_DETAIL_AD_UNIT_ID} placement="learn_tarot_detail_bottom_banner" />
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()} activeOpacity={0.9}>
            <Text style={styles.backText}>{t('back') || 'Back'}</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </ImageBackground>
  );
}

function Section({ title, children }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={{ height: 6 }} />
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  bg: { flex: 1 },
  overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.55)' },
  safe: { flex: 1, paddingHorizontal: 16 },
  safePlain: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  content: { paddingBottom: 24 },
  image: { width: '100%', height: 320 },
  title: {
    color: '#ffe7c2',
    fontSize: 22,
    fontWeight: '900',
    textAlign: 'center',
    marginVertical: 8,
  },
  section: {
    marginTop: 10,
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(214,166,59,0.25)',
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  sectionTitle: {
    color: '#ffd262',
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  text: { color: '#fff', lineHeight: 20 },
  keywordWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  keyword: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: 'rgba(43,31,58,0.65)',
    color: '#fff',
    fontSize: 12,
  },
  bottomArea: {
    paddingTop: 8,
    paddingBottom: 10,
    alignItems: 'center',
  },
  backBtn: {
    marginTop: 8,
    alignSelf: 'stretch',
    marginHorizontal: 24,
    paddingHorizontal: 26,
    paddingVertical: 14,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(204,153,255,0.4)',
    backgroundColor: '#2b1f3a',
  },
  backText: { color: '#fff', fontWeight: '800', fontSize: 15, textAlign: 'center' },
  errorText: { color: '#fff' },
});
