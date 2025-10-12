// src/screens/SettingsScreen.js
import React, { useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Switch,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useTheme } from '@react-navigation/native';
import { useUser } from '../context/UserContext';


import {
  BYPASS_DAILY_ZODIAC_LIMIT,
  BYPASS_DAILY_READING_LIMIT,
  BYPASS_DAILY_CHINESE_LIMIT,
} from '../config/featureFlags';

export default function SettingsScreen({ navigation }) {
  const { t, i18n } = useTranslation('common');
  const { colors } = useTheme();
  const user = useUser();

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
      user.setLanguage(code);
    } catch (e) {
      // no-op; i18n will keep previous language
    }
  };

  const isDark = user.theme === 'dark';
  const toggleTheme = () => user.setTheme(isDark ? 'light' : 'dark');

  const clearToday = () => {
    // Clears all “today” buckets; keep profile
    user.clearDaily();
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
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

        {/* Theme */}
        <Section title={t('theme') || 'Theme'}>
          <View style={styles.rowBetween}>
            <Text style={styles.itemTitle}>
              {isDark ? (t('dark') || 'Dark') : (t('light') || 'Light')}
            </Text>
            <Switch value={isDark} onValueChange={toggleTheme} />
          </View>
        </Section>

        {/* Daily data */}
        <Section title={t('daily_data') || 'Daily data'}>
          <MysticButton
            label={t('clear_saved_today') || "Clear saved today's content"}
            onPress={clearToday}
          />
          <Text style={styles.hintSmall}>
            {t('daily_data_explain') ||
              'Clears saved advice, tarot and Chinese horoscope for today.'}
          </Text>
        </Section>

        {/* Dev flags (read-only) */}
        <Section title="Developer flags (read-only)">
          <FlagRow name="BYPASS_DAILY_ZODIAC_LIMIT" value={!!BYPASS_DAILY_ZODIAC_LIMIT} />
          <FlagRow name="BYPASS_DAILY_READING_LIMIT" value={!!BYPASS_DAILY_READING_LIMIT} />
          <FlagRow name="BYPASS_DAILY_CHINESE_LIMIT" value={!!BYPASS_DAILY_CHINESE_LIMIT} />
          <Text style={styles.hintSmall}>
            These are set in <Text style={styles.mono}>/src/sonfig/featureFlags.js</Text>.
          </Text>
        </Section>

        {/* Back */}
        <View style={{ height: 8 }} />
        <MysticButton label={t('back') || 'Back'} onPress={() => navigation.goBack()} />
        <View style={{ height: 24 }} />
      </ScrollView>
    </SafeAreaView>
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

function FlagRow({ name, value }) {
  return (
    <View style={styles.rowBetween}>
      <Text style={styles.flagName}>{name}</Text>
      <Text style={[styles.flagVal, value ? styles.flagOn : styles.flagOff]}>
        {value ? 'ON' : 'OFF'}
      </Text>
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
  safe: { flex: 1 },
  scroll: { flex: 1 },
  content: { padding: 16, paddingBottom: 40 },

  section: {
    backgroundColor: 'rgba(255,255,255,0.06)',
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

  // Dev flags
  flagName: {
    color: '#d9ccff',
    fontSize: 13,
  },
  flagVal: {
    fontWeight: '800',
    letterSpacing: 0.4,
  },
  flagOn: { color: '#9effa7' },
  flagOff: { color: '#ffbdbd' },

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






