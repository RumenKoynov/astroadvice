// src/screens/ProfileScreen.js
// Requires: @react-native-community/datetimepicker
//   npm i @react-native-community/datetimepicker
//   (iOS) cd ios && pod install

import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Platform,
  ImageBackground,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useTranslation } from 'react-i18next';
import { useTheme } from '@react-navigation/native';
import { useUser } from '../context/UserContext';
import { goBackOrHome } from '../utils/nav';

/* ---------- Helpers: zodiac derivation (silent) ---------- */
function getWesternZodiac(dateISO) {
  if (!dateISO) return '';
  const d = new Date(dateISO);
  if (isNaN(d)) return '';
  const m = d.getMonth() + 1;
  const day = d.getDate();
  const after = (mm, dd) => (m > mm) || (m === mm && day >= dd);
  if (after(3,21) && !after(4,20)) return 'Aries';
  if (after(4,20) && !after(5,21)) return 'Taurus';
  if (after(5,21) && !after(6,21)) return 'Gemini';
  if (after(6,21) && !after(7,23)) return 'Cancer';
  if (after(7,23) && !after(8,23)) return 'Leo';
  if (after(8,23) && !after(9,23)) return 'Virgo';
  if (after(9,23) && !after(10,23)) return 'Libra';
  if (after(10,23) && !after(11,22)) return 'Scorpio';
  if (after(11,22) && !after(12,22)) return 'Sagittarius';
  if (after(12,22) || !after(1,20)) return 'Capricorn';
  if (after(1,20) && !after(2,19)) return 'Aquarius';
  return 'Pisces';
}
function getChineseAnimal(year) {
  if (!year) return '';
  const animals = ['rat','ox','tiger','rabbit','dragon','snake','horse','goat','monkey','rooster','dog','pig'];
  const idx = (year - 4) % 12;
  return animals[(idx + 12) % 12];
}
function getChineseElement(year) {
  if (!year) return '';
  const stemsIndex = (year - 4) % 10;
  const norm = (stemsIndex + 10) % 10;
  if (norm <= 1) return 'wood';
  if (norm <= 3) return 'fire';
  if (norm <= 5) return 'earth';
  if (norm <= 7) return 'metal';
  return 'water';
}
function calcAge(dateISO) {
  if (!dateISO) return '';
  const d = new Date(dateISO);
  if (isNaN(d)) return '';
  const now = new Date();
  let a = now.getFullYear() - d.getFullYear();
  const m = now.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < d.getDate())) a--;
  return a;
}

/* ---------- Utils ---------- */
const fmtDate = (d) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};
const fmtTime = (d) => {
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  return `${hh}:${mm}`;
};

export default function ProfileScreen({ navigation }) {
  const { t } = useTranslation('common');
  const { colors } = useTheme();
  const user = useUser();

  // hydrate existing or defaults
  const initDate = user?.dob ? new Date(user.dob) : new Date(1990, 0, 1);
  const initTime = (() => {
    if (user?.birthHour) {
      const [hh, mm] = String(user.birthHour).split(':').map(x => parseInt(x || '0', 10));
      const dt = new Date();
      dt.setHours(isNaN(hh) ? 0 : hh, isNaN(mm) ? 0 : mm, 0, 0);
      return dt;
    }
    const dt = new Date();
    dt.setHours(12, 0, 0, 0);
    return dt;
  })();

  const [sex, setSex] = useState(user?.sex || '');
  const [dateVal, setDateVal] = useState(initDate);
  const [timeVal, setTimeVal] = useState(initTime);

  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);

  // Derived silently (not displayed)
  const dobISO = useMemo(() => fmtDate(dateVal), [dateVal]);
  const age = useMemo(() => calcAge(dobISO), [dobISO]);
  const zodiac = useMemo(() => getWesternZodiac(dobISO), [dobISO]);
  const year = useMemo(() => dateVal.getFullYear(), [dateVal]);
  const cnSign = useMemo(() => getChineseAnimal(year), [year]);
  const cnElem = useMemo(() => getChineseElement(year), [year]);
  const birthHour = useMemo(() => fmtTime(timeVal), [timeVal]);

  const canSave = !!sex && !!dobISO && !!birthHour;

  const onChangeDate = (event, selectedDate) => {
    setShowDatePicker(Platform.OS === 'ios'); // keep open on iOS
    if (selectedDate) setDateVal(selectedDate);
  };
  const onChangeTime = (event, selectedTime) => {
    setShowTimePicker(Platform.OS === 'ios');
    if (selectedTime) setTimeVal(selectedTime);
  };

  const saveProfile = async () => {
    if (!canSave) {
      alert(t('set_profile_first') || 'Please fill date of birth, sex and birth hour.');
      return;
    }
    await user.setProfile({
      dob: dobISO,
      sex,
      birthHour,
      westernZodiac: zodiac,
      chineseSign: cnSign,
      chineseElement: cnElem,
      age,
    });
    goBackOrHome();
  };

  return (
    <ImageBackground
      source={require('../../assets/images/lanterns-bg.jpg')}
      style={styles.bg}
      resizeMode="cover"
    >
      <View pointerEvents="none" style={styles.overlay} />
      <SafeAreaView style={[styles.safe, { backgroundColor: 'transparent' }]}>
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={styles.title}>{t('profile') || 'Profile'}</Text>
          <Text style={styles.subtitle}>
            {t('profile_intro') || 'Tell the stars who you are to unlock your path.'}
          </Text>

          {/* Sex */}
          <Section label={t('sex') || 'Sex'}>
            <View style={styles.row}>
              <Chip
                label={t('male') || 'Male'}
                active={sex === 'male'}
                onPress={() => setSex('male')}
              />
              <Chip
                label={t('female') || 'Female'}
                active={sex === 'female'}
                onPress={() => setSex('female')}
              />
            </View>
          </Section>

          {/* DOB */}
          <Section label={t('dob') || 'Date of birth'}>
            <PickerButton
              label={dobISO}
              onPress={() => setShowDatePicker(true)}
              icon="📅"
            />
            {showDatePicker && (
              <DateTimePicker
                value={dateVal}
                mode="date"
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                onChange={onChangeDate}
                maximumDate={new Date()} // no future dates
              />
            )}
          </Section>

          {/* Birth Hour (required) */}
          <Section label={t('birth_hour') || 'Birth hour'}>
            <PickerButton
              label={birthHour}
              onPress={() => setShowTimePicker(true)}
              icon="⏰"
            />
            {showTimePicker && (
              <DateTimePicker
                value={timeVal}
                mode="time"
                is24Hour
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                onChange={onChangeTime}
              />
            )}
            <Text style={styles.hint}>
              {t('birth_hour_required_hint') || 'Please provide your approximate birth hour.'}
            </Text>
          </Section>

          <MysticButton label={t('save') || 'Save'} onPress={saveProfile} disabled={!canSave} />

          <View style={{ height: 24 }} />
        </ScrollView>
      </SafeAreaView>
    </ImageBackground>
  );
}

/* ---------- Presentational ---------- */
function Section({ label, children }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionLabel}>{label}</Text>
      <View style={{ height: 8 }} />
      {children}
    </View>
  );
}

function Chip({ label, active, onPress }) {
  return (
    <TouchableOpacity
      activeOpacity={0.9}
      onPress={onPress}
      style={[styles.chip, active && styles.chipActive]}
    >
      <Text style={[styles.chipText, active && styles.chipTextActive]}>{label}</Text>
    </TouchableOpacity>
  );
}

function PickerButton({ label, onPress, icon }) {
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.92} style={styles.pickerBtn}>
      <Text style={styles.pickerIcon}>{icon || '✦'}</Text>
      <Text style={styles.pickerText}>{label}</Text>
    </TouchableOpacity>
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

/* ---------- Styles ---------- */
const styles = StyleSheet.create({
  bg: { flex: 1 },
  overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.5)' },
  safe: { flex: 1 },
  scroll: { flex: 1 },
  content: { padding: 16, paddingBottom: 40 },

  title: {
    color: '#ffe7c2',
    fontSize: 24,
    fontWeight: '900',
    textAlign: 'center',
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 6,
  },
  subtitle: {
    color: '#f6e6c9',
    opacity: 0.85,
    textAlign: 'center',
    marginTop: 6,
    marginBottom: 10,
  },

  section: {
    backgroundColor: 'rgba(20, 12, 28, 0.65)',
    borderWidth: 1,
    borderColor: 'rgba(214,166,59,0.25)',
    borderRadius: 16,
    padding: 14,
    marginTop: 12,
  },
  sectionLabel: {
    color: '#ffd262',
    fontWeight: '800',
    letterSpacing: 0.3,
  },

  row: { flexDirection: 'row', gap: 10 },

  chip: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: 'rgba(214,166,59,0.35)',
    backgroundColor: 'rgba(43, 31, 58, 0.55)',
  },
  chipActive: {
    backgroundColor: '#321f47',
    borderColor: 'rgba(214,166,59,0.85)',
  },
  chipText: { color: '#e9e0ff', fontWeight: '700' },
  chipTextActive: { color: '#fff' },

  pickerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(214,166,59,0.25)',
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  pickerIcon: { fontSize: 18, color: '#ffd262' },
  pickerText: { color: '#fff', fontWeight: '700', letterSpacing: 0.3 },

  hint: {
    marginTop: 6,
    color: '#d7d2e8',
    opacity: 0.85,
    fontSize: 12,
  },

  mysticBtn: {
    marginTop: 16,
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 28,
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
    letterSpacing: 0.6,
    fontSize: 16,
  },
});







