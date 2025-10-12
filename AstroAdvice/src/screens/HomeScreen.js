// src/screens/HomeScreen.js
import React from 'react';
import { View, Text, StyleSheet, ImageBackground, Pressable } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { useTheme } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';

export default function HomeScreen({ navigation }) {
  const { colors } = useTheme();
  const { t } = useTranslation('common');

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

      <View style={styles.container}>
        <Text style={styles.title}>{t('home_title') || 'Choose your path'}</Text>

        <Pressable
          onPress={() => navigation.navigate('StandartZodiac')}
          style={[styles.card, { borderColor: 'rgba(255,215,0,0.35)' }]}
        >
          <Text style={styles.cardTitle}>{t('go_standard') || 'Daily Horoscope'}</Text>
          <Text style={styles.cardHint}>{t('go_standard_hint') || 'Short, fun guidance for today'}</Text>
        </Pressable>

        <Pressable
          onPress={() => navigation.navigate('ChineseHoroscope')}
          style={[styles.card, { borderColor: 'rgba(255,64,129,0.35)' }]}
        >
          <Text style={styles.cardTitle}>{t('go_chinese') || 'Chinese Horoscope'}</Text>
          <Text style={styles.cardHint}>{t('go_chinese_hint') || 'Your zodiac animal & traits'}</Text>
        </Pressable>

 <Pressable onPress={() => navigation.navigate('Tarot')} style={[styles.card, { borderColor: 'rgba(0,188,212,0.35)' }]}>
  <Text style={styles.cardTitle}>{t('go_tarot') || 'Tarot (Single)'}</Text>
  <Text style={styles.cardHint}>{t('go_tarot_hint') || 'Draw one card & meaning'}</Text>
</Pressable>

<Pressable onPress={() => navigation.navigate('ThreeTarot')} style={[styles.card, { borderColor: 'rgba(0,188,212,0.35)' }]}>
  <Text style={styles.cardTitle}>{t('tarot_three') || 'Tarot (3-Card Reading)'}</Text>
  <Text style={styles.cardHint}>{t('tarot_three_hint') || 'Past • Present • Future'}</Text>
</Pressable>



      </View>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  bg: { flex: 1 },
  overlay: { ...StyleSheet.absoluteFillObject },
  container: {
    flex: 1,
    paddingHorizontal: 18,
    paddingTop: 24,
    paddingBottom: 24,
    justifyContent: 'center',
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

