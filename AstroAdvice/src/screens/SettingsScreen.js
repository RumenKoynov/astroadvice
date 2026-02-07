// src/screens/SettingsScreen.js
import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Switch,
  ImageBackground,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTranslation } from 'react-i18next';
import { useUser } from '../context/UserContext';
import { DEV_OVERRIDE_KEY, setDeveloperMode } from '../config/featureFlags';

export default function SettingsScreen({ navigation }) {
  const { t, i18n } = useTranslation('common');
  const user = useUser();
  const [isDeveloper, setIsDeveloper] = useState(false);

  const langs = useMemo(
    () => [
      { code: 'en', label: 'English' },
      { code: 'bg', label: 'Български' },
      { code: 'ru', label: 'Русский' },
      { code: 'fr', label: 'Français' },
      { code: 'de', label: 'Deutsch' },
      { code: 'tr', label: 'Türkçe' },
      // add two more system UI languages (example)
      { code: 'es', label: 'Español' },
      { code: 'it', label: 'Italiano' },
    ],
    []
  );

  const onChangeLang = async (code) => {
    try {
      await i18n.changeLanguage(code);
      await AsyncStorage.setItem('uiLanguage', code);
      user.setLanguage(code);
    } catch (e) {
      // no-op; i18n will keep previous language
    }
  };

  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(DEV_OVERRIDE_KEY);
        if (raw === null) {
          setDeveloperMode(null);
          setIsDeveloper(__DEV__);
        } else {
          const enabled = raw === '1';
          setIsDeveloper(enabled);
          setDeveloperMode(enabled);
        }
      } catch {
        setDeveloperMode(null);
        setIsDeveloper(__DEV__);
      }
    })();
  }, []);

  const toggleDeveloper = async (next) => {
    const value = !!next;
    setIsDeveloper(value);
    setDeveloperMode(value);
    try {
      await AsyncStorage.setItem(DEV_OVERRIDE_KEY, value ? '1' : '0');
    } catch {
      // no-op
    }
  };

  return (
    <ImageBackground
      source={require('../../assets/images/home.jpg')}
      style={styles.bg}
      resizeMode="cover"
    >
      <View pointerEvents="none" style={styles.overlay} />
      <SafeAreaView style={styles.safe}>
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
          {/* Profile */}
          <Section title={t('profile') || 'Profile'}>
            <MysticButton
              label={t('edit_profile') || 'Edit profile'}
              onPress={() => navigation.navigate('Profile')}
            />
          </Section>

        {/* Language */}
        <Section title={t('language') || 'Language'}>
          <View style={styles.langGrid}>
            {langs.map((l) => {
              const active = i18n.language === l.code;
              return (
                <TouchableOpacity
                  key={l.code}
                  onPress={() => onChangeLang(l.code)}
                  style={[styles.pill, active && styles.pillActive]}
                  activeOpacity={0.9}
                >
                  <Text style={[styles.pillText, active && styles.pillTextActive]}>
                    {l.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
          <Text style={styles.hintSmall}>
            {t('language_applies_immediately') || 'Changes apply immediately.'}
          </Text>
        </Section>

        {/* Debug */}
        <Section title={t('developer') || 'Developer'}>
          <View style={styles.rowBetween}>
            <Text style={styles.itemTitle}>
              {t('is_developer') || 'is_developer'}
            </Text>
            <Switch
              value={isDeveloper}
              onValueChange={toggleDeveloper}
            />
          </View>
          <Text style={styles.hintSmall}>
            {t('developer_debug_hint') || 'Enables debug bypasses for daily limits.'}
          </Text>
        </Section>

        {/* Back */}
        <View style={{ height: 8 }} />
        <MysticButton label={t('back') || 'Back'} onPress={() => navigation.goBack()} />
        <View style={{ height: 24 }} />
        </ScrollView>
      </SafeAreaView>
    </ImageBackground>
  );
}

/* ---------- Small presentational components ---------- */
function Section({ title, children }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={{ height: 6 }} />
      {children}
    </View>
  );
}

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
  overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.65)' },
  safe: { flex: 1, backgroundColor: 'transparent' },
  scroll: { flex: 1 },
  content: { padding: 16, paddingBottom: 40 },

  section: {
    backgroundColor: 'rgba(0,0,0,0.55)',
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
  },
  sectionTitle: {
    color: '#fff',
    fontWeight: '800',
    fontSize: 16,
    letterSpacing: 0.2,
  },

  rowBetween: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 6,
  },

  // Language pills
  langGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  pill: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(204,153,255,0.35)',
    backgroundColor: 'rgba(43,31,58,0.6)',
  },
  pillActive: {
    backgroundColor: '#2b1f3a',
    borderColor: 'rgba(204,153,255,0.9)',
  },
  pillText: {
    color: '#e9e0ff',
    fontWeight: '600',
    letterSpacing: 0.2,
  },
  pillTextActive: { color: '#fff' },

  hintSmall: {
    marginTop: 8,
    color: '#d7d2e8',
    opacity: 0.85,
    fontSize: 12,
  },

  // Buttons
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
    marginTop: 6,
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

  itemTitle: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 15,
  },

  mono: { fontFamily: 'monospace', color: '#fff' },
});






