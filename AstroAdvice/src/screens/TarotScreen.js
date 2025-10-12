// src/screens/TarotScreen.js
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
  TouchableOpacity,
  ScrollView,
  Dimensions,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useTheme } from '@react-navigation/native';

import { apiFetch } from '../services/api';
import { useUser } from '../context/UserContext';
import { BYPASS_DAILY_SINGLE_LIMIT } from '../config/featureFlags'; // add to your flags if you want

const { height: SCREEN_H } = Dimensions.get('window');
const DATE_KEY = () => new Date().toISOString().slice(0, 10);

export default function TarotScreen({ navigation }) {
  const { t, i18n } = useTranslation('common');
  const { colors } = useTheme();
  const user = useUser();

  const todayKey = useMemo(() => DATE_KEY(), []);
  const savedToday = user?.daily?.tarotSingle?.[todayKey] || null;
  const locked = !BYPASS_DAILY_SINGLE_LIMIT && !!savedToday;

  const [card, setCard] = useState(savedToday?.card || null);
  const [loading, setLoading] = useState(false);
  const [phase, setPhase] = useState(locked ? 'locked' : 'idle'); // idle | showing | locked
  const [errorMsg, setErrorMsg] = useState('');

  // Smooth enter for image + text
  const fade = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(0.98)).current;

  const animateIn = () => {
    fade.setValue(0);
    scale.setValue(0.98);
    Animated.parallel([
      Animated.timing(fade, { toValue: 1, duration: 450, easing: Easing.out(Easing.ease), useNativeDriver: true }),
      Animated.timing(scale, { toValue: 1, duration: 450, easing: Easing.out(Easing.ease), useNativeDriver: true }),
    ]).start();
  };

  const drawCard = async () => {
    setErrorMsg('');
    setLoading(true);
    try {
      const res = await apiFetch(`/tarot/random?lang=${i18n.language}`);
      if (res?.imageUrl) {
        try { await Image.prefetch(res.imageUrl); } catch {}
      }
      setCard(res || null);
      setPhase('showing');
      animateIn();
      // Save for today (locks until tomorrow)
      user.setDaily(todayKey, 'tarotSingle', { card: res || null });
    } catch (e) {
      setErrorMsg(e?.message || 'Failed to draw a card');
    } finally {
      setLoading(false);
    }
  };

  const onPrimary = () => {
    if (locked) {
      // Back when locked
      if (navigation?.canGoBack?.()) navigation.goBack();
      else navigation.navigate('Home');
    } else if (!card) {
      drawCard();
    } else {
      // Draw again (still saves as today's single)
      drawCard();
    }
  };

  // ----- Render -----
  // LOCKED view (already drew today)
  if (phase === 'locked') {
    return (
      <ImageBackground
        source={require('../../assets/images/lanterns-bg.jpg')}
        style={styles.bg}
        resizeMode="cover"
      >
        <View pointerEvents="none" style={styles.overlay} />
        <SafeAreaView style={[styles.safe, { backgroundColor: 'transparent' }]}>
          <View style={styles.root}>
            <Text style={styles.banner}>
              {t('next_available_tomorrow') || 'Next single card available tomorrow'}
            </Text>

            <ScrollView
              style={{ flex: 1, width: '100%' }}
              contentContainerStyle={{ padding: 16, paddingBottom: 120 }}
              showsVerticalScrollIndicator={false}
            >
              {!!savedToday?.card?.imageUrl && (
                <Image
                  source={{ uri: savedToday.card.imageUrl }}
                  style={styles.cardImgLocked}
                  resizeMode="contain"
                />
              )}
              {!!savedToday?.card?.name && (
                <Text style={styles.cardTitle}>{savedToday.card.name}</Text>
              )}
              {!!savedToday?.card?.description && (
                <View style={styles.cardPanel}>
                  <Text style={styles.cardText}>{savedToday.card.description}</Text>
                </View>
              )}
            </ScrollView>

            <View style={styles.bottomBar}>
              <MysticButton
                label={t('back') || 'Back'}
                onPress={() => (navigation?.canGoBack?.() ? navigation.goBack() : navigation.navigate('Home'))}
              />
            </View>
          </View>
        </SafeAreaView>
      </ImageBackground>
    );
  }

  // NORMAL view
  return (
    <ImageBackground
      source={require('../../assets/images/lanterns-bg.jpg')}
      style={styles.bg}
      resizeMode="cover"
    >
      <View pointerEvents="none" style={styles.overlay} />
      <SafeAreaView style={[styles.safe, { backgroundColor: 'transparent' }]}>
        <View style={styles.root}>
          {/* Image / content */}
          <View style={styles.centerArea}>
            {loading && <Text style={styles.loadingText}>{t('loading') || 'Loading...'}</Text>}

            {!loading && card && (
              <>
                <Animated.Image
                  source={{ uri: card.imageUrl }}
                  style={[styles.cardImg, { opacity: fade, transform: [{ scale }] }]}
                  resizeMode="contain"
                />
                <Animated.Text
                  style={[styles.cardTitle, { opacity: fade, transform: [{ scale }] }]}
                  numberOfLines={1}
                >
                  {card.name}
                </Animated.Text>

                {!!card.description && (
                  <Animated.View style={[styles.cardPanel, { opacity: fade, transform: [{ scale }] }]}>
                    <ScrollView
                      style={{ maxHeight: SCREEN_H * 0.28 }}
                      contentContainerStyle={{ padding: 10 }}
                      showsVerticalScrollIndicator={false}
                    >
                      <Text style={styles.cardText}>{card.description}</Text>
                    </ScrollView>
                  </Animated.View>
                )}
              </>
            )}

            {!loading && !card && (
              <Text style={styles.hintCenter}>
                {t('tap_to_choose') || 'Tap below to choose your card'}
              </Text>
            )}

            {!!errorMsg && <Text style={styles.errorText}>{errorMsg}</Text>}
          </View>

          {/* Bottom button */}
          <View style={styles.bottomBar}>
            <MysticButton
              label={
                !card
                  ? (t('choose_card') || 'Choose a card')
                  : (t('draw_again') || 'Draw again')
              }
              onPress={onPrimary}
              disabled={loading}
            />
          </View>
        </View>
      </SafeAreaView>
    </ImageBackground>
  );
}

/* --------- Mystic-styled button --------- */
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
  overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.45)' },
  safe: { flex: 1 },
  root: { flex: 1 },

  centerArea: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 14,
    paddingTop: 10,
  },

  banner: {
    textAlign: 'center',
    color: '#ffd262',
    fontWeight: '800',
    fontSize: 14,
    marginTop: 12,
    paddingHorizontal: 16,
  },

  cardImg: {
    width: '100%',
    height: SCREEN_H * 0.5,
    borderRadius: 16,
  },
  cardImgLocked: {
    width: '100%',
    height: SCREEN_H * 0.45,
    borderRadius: 16,
  },
  cardTitle: {
    marginTop: 10,
    color: '#ffe7c2',
    fontSize: 20,
    fontWeight: '900',
    textAlign: 'center',
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 6,
  },
  cardPanel: {
    marginTop: 10,
    backgroundColor: 'rgba(0,0,0,0.35)',
    borderWidth: 1,
    borderColor: 'rgba(214,166,59,0.25)',
    borderRadius: 14,
    overflow: 'hidden',
  },
  cardText: {
    color: '#fff',
    fontSize: 16,
    lineHeight: 22,
    textAlign: 'center',
  },

  hintCenter: {
    color: '#f6e6c9',
    opacity: 0.85,
    textAlign: 'center',
    fontSize: 15,
    paddingHorizontal: 12,
  },
  loadingText: {
    color: '#fff',
    opacity: 0.9,
  },
  errorText: {
    color: '#ffdede',
    textAlign: 'center',
    fontSize: 13,
    marginTop: 10,
  },

  bottomBar: {
    padding: 16,
    paddingBottom: 20,
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
    fontWeight: '900',
    letterSpacing: 0.5,
    fontSize: 16,
  },
});










