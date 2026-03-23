// src/screens/HomeScreen.js
import React, { useEffect } from 'react';
import { View, Text, StyleSheet, ImageBackground, Pressable, SafeAreaView, ScrollView } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { useTheme } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import AdBanner from '../components/ads/AdBanner';
import { BANNER_HOME_AD_UNIT_ID } from '../config/admob';
import { logEvent, logScreen } from '../services/analytics';

export default function HomeScreen({ navigation }) {
  const { colors } = useTheme();
  const { t } = useTranslation('common');

  useEffect(() => {
    logScreen('Home');
  }, []);

  const openFeature = (feature, route) => {
    logEvent('feature_opened', { feature });
    navigation.navigate(route);
  };

  return (
    <ImageBackground
      source={require('../../assets/images/home.jpg')}
      style={styles.bg}
      resizeMode="cover"
    >
      <LinearGradient
        colors={['rgba(10,0,30,0.7)', 'rgba(10,0,30,0.35)', 'rgba(10,0,30,0.7)']}
        style={styles.overlay}
      />

      <Pressable
        onPress={() => {
          logEvent('feature_opened', { feature: 'settings' });
          navigation.navigate('Settings');
        }}
        style={styles.settingsBtn}
        accessibilityRole="button"
        accessibilityLabel={t('settings') || 'Settings'}
      >
        <Text style={styles.settingsBtnIcon}>{'\u2699'}</Text>
      </Pressable>

      <SafeAreaView style={styles.safe}>
        <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>{t('home_title') || 'Choose your path'}</Text>

        <Pressable
          onPress={() => openFeature('daily_advice', 'StandardZodiac')}
          style={[styles.card, { borderColor: 'rgba(255,215,0,0.35)' }]}
        >
          <Text style={styles.cardTitle}>{t('go_standard') || 'Daily Horoscope'}</Text>
          <Text style={styles.cardHint}>{t('go_standard_hint') || 'Short, fun guidance for today'}</Text>
        </Pressable>

        <Pressable
          onPress={() => openFeature('tarot_single', 'Tarot')}
          style={[styles.card, { borderColor: 'rgba(0,188,212,0.35)' }]}
        >
          <Text style={styles.cardTitle}>{t('go_tarot') || 'Tarot Card'}</Text>
          <Text style={styles.cardHint}>{t('go_tarot_hint') || 'Your daily tarot card'}</Text>
        </Pressable>

        <Pressable
          onPress={() => openFeature('tarot_three', 'ThreeTarot')}
          style={[styles.card, { borderColor: 'rgba(0,188,212,0.35)' }]}
        >
          <Text style={styles.cardTitle}>{t('tarot_three') || 'Tarot (3-Card Reading)'}</Text>
          <Text style={styles.cardHint}>{t('tarot_three_hint') || 'Past • Present • Future'}</Text>
        </Pressable>

        <Pressable
          onPress={() => openFeature('weekly_compatibility', 'WeeklyCompatibility')}
          style={[styles.card, { borderColor: 'rgba(255,120,180,0.35)' }]}
        >
          <Text style={styles.cardTitle}>{t('go_compat') || 'Weekly Compatibility'}</Text>
          <Text style={styles.cardHint}>{t('go_compat_hint') || 'See this week’s alignment for two signs'}</Text>
        </Pressable>

        <Pressable
          onPress={() => openFeature('chinese_horoscope', 'ChineseHoroscope')}
          style={[styles.card, { borderColor: 'rgba(255,64,129,0.35)' }]}
        >
          <Text style={styles.cardTitle}>{t('go_chinese') || 'Chinese Horoscope'}</Text>
          <Text style={styles.cardHint}>{t('go_chinese_hint') || 'Your zodiac animal & traits'}</Text>
        </Pressable>

        <Pressable
          onPress={() => openFeature('daily_number', 'Number')}
          style={[styles.card, { borderColor: 'rgba(164,69,255,0.45)' }]}
        >
          <Text style={styles.cardTitle}>{t('daily_number_title') || 'Your daily number'}</Text>
          <Text style={styles.cardHint}>{t('daily_number_hint') || 'Reveal a number for today'}</Text>
        </Pressable>

        <Pressable
          onPress={() => openFeature('movie_quotes', 'MovieQuotes')}
          style={[styles.card, { borderColor: 'rgba(255,210,98,0.35)' }]}
        >
          <Text style={styles.cardTitle}>{t('go_movies') || 'Movie Quotes'}</Text>
          <Text style={styles.cardHint}>{t('go_movies_hint') || 'A famous quote for today'}</Text>
        </Pressable>

        <Pressable
          onPress={() => openFeature('learn_tarot', 'LearnTarot')}
          style={[styles.card, { borderColor: 'rgba(255,171,64,0.35)' }]}
        >
          <Text style={styles.cardTitle}>{t('learn_tarot_title') || 'Learn Tarot'}</Text>
          <Text style={styles.cardHint}>{t('learn_tarot_hint') || 'Card meanings, keywords, and a quiz'}</Text>
        </Pressable>



        </ScrollView>
        <AdBanner unitId={BANNER_HOME_AD_UNIT_ID} />
      </SafeAreaView>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  bg: { flex: 1 },
  overlay: { ...StyleSheet.absoluteFillObject },
  safe: { flex: 1 },
  container: {
    paddingHorizontal: 18,
    paddingTop: 24,
    paddingBottom: 24,
    gap: 18,
  },
  title: {
    color: '#EDE7F6',
    fontSize: 22,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 10,
    letterSpacing: 0.5,
  },
  settingsBtn: {
    position: 'absolute',
    top: 18,
    left: 18,
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.4)',
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
    elevation: 4,
    zIndex: 2,
  },
  settingsBtnIcon: {
    color: '#F3E5F5',
    fontSize: 20,
    fontWeight: '700',
  },
  card: {
    borderWidth: 1,
    borderRadius: 18,
    paddingVertical: 22,
    paddingHorizontal: 16,
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  cardTitle: { color: '#F3E5F5', fontSize: 18, fontWeight: '800', textAlign: 'center', marginBottom: 6 },
  cardHint: { color: '#E0DFF7', fontSize: 14, textAlign: 'center', opacity: 0.9 },
});
