// src/screens/ProfileScreen.js
import React, { useMemo, useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  ImageBackground,
  Modal,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useTheme } from '@react-navigation/native';
import { useUser } from '../context/UserContext';
import { goBackOrHome } from '../utils/nav';
import AdBanner from '../components/ads/AdBanner';
import { BANNER_PROFILE_AD_UNIT_ID } from '../config/admob';

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
  const now = useMemo(() => new Date(), []);
  const MIN_YEAR = 1920;
  const MAX_YEAR = now.getFullYear();
  const MAX_MONTH = now.getMonth() + 1;
  const MAX_DAY = now.getDate();
  const MINUTE_STEP = 5;

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
  const [yearSel, setYearSel] = useState(initDate.getFullYear());
  const [monthSel, setMonthSel] = useState(initDate.getMonth() + 1);
  const [daySel, setDaySel] = useState(initDate.getDate());
  const [hourSel, setHourSel] = useState(initTime.getHours());
  const initMinute = initTime.getMinutes();
  const roundedMinute = Math.round(initMinute / MINUTE_STEP) * MINUTE_STEP;
  const safeMinute = Math.min(60 - MINUTE_STEP, Math.max(0, roundedMinute));
  const [minuteSel, setMinuteSel] = useState(safeMinute);
  const [activePicker, setActivePicker] = useState(null); // 'year' | 'month' | 'day' | 'hour' | 'minute'

  useEffect(() => {
    if (yearSel === MAX_YEAR && monthSel > MAX_MONTH) {
      setMonthSel(MAX_MONTH);
    }
  }, [yearSel, monthSel, MAX_YEAR, MAX_MONTH]);

  useEffect(() => {
    const maxDayInMonth = new Date(yearSel, monthSel, 0).getDate();
    const maxDay = (yearSel === MAX_YEAR && monthSel === MAX_MONTH)
      ? Math.min(maxDayInMonth, MAX_DAY)
      : maxDayInMonth;
    if (daySel > maxDay) setDaySel(maxDay);
  }, [yearSel, monthSel, daySel, MAX_YEAR, MAX_MONTH, MAX_DAY]);

  const dateVal = useMemo(
    () => new Date(yearSel, monthSel - 1, daySel),
    [yearSel, monthSel, daySel]
  );
  const timeVal = useMemo(() => {
    const d = new Date();
    d.setHours(hourSel, minuteSel, 0, 0);
    return d;
  }, [hourSel, minuteSel]);

  const yearOptions = useMemo(() => {
    const years = [];
    for (let y = MAX_YEAR; y >= MIN_YEAR; y--) years.push(y);
    return years;
  }, [MAX_YEAR]);
  const monthOptions = useMemo(() => {
    const end = (yearSel === MAX_YEAR) ? MAX_MONTH : 12;
    return Array.from({ length: end }, (_, i) => i + 1);
  }, [yearSel, MAX_YEAR, MAX_MONTH]);
  const dayOptions = useMemo(() => {
    const maxDayInMonth = new Date(yearSel, monthSel, 0).getDate();
    const end = (yearSel === MAX_YEAR && monthSel === MAX_MONTH)
      ? Math.min(maxDayInMonth, MAX_DAY)
      : maxDayInMonth;
    return Array.from({ length: end }, (_, i) => i + 1);
  }, [yearSel, monthSel, MAX_YEAR, MAX_MONTH, MAX_DAY]);
  const hourOptions = useMemo(() => Array.from({ length: 24 }, (_, i) => i), []);
  const minuteOptions = useMemo(
    () => Array.from({ length: Math.floor(60 / MINUTE_STEP) }, (_, i) => i * MINUTE_STEP),
    []
  );

  // Derived silently (not displayed)
  const dobISO = useMemo(() => fmtDate(dateVal), [dateVal]);
  const age = useMemo(() => calcAge(dobISO), [dobISO]);
  const zodiac = useMemo(() => getWesternZodiac(dobISO), [dobISO]);
  const year = useMemo(() => dateVal.getFullYear(), [dateVal]);
  const cnSign = useMemo(() => getChineseAnimal(year), [year]);
  const cnElem = useMemo(() => getChineseElement(year), [year]);
  const birthHour = useMemo(() => fmtTime(timeVal), [timeVal]);

  const canSave = !!sex && !!dobISO && !!birthHour;

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
      source={require('../../assets/images/home.jpg')}
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
            <View style={styles.selectRow}>
              <SelectBox
                label="YYYY"
                value={String(yearSel)}
                onPress={() => setActivePicker('year')}
              />
              <SelectBox
                label="MM"
                value={String(monthSel).padStart(2, '0')}
                onPress={() => setActivePicker('month')}
              />
              <SelectBox
                label="DD"
                value={String(daySel).padStart(2, '0')}
                onPress={() => setActivePicker('day')}
              />
            </View>
          </Section>

          {/* Birth Hour (required) */}
          <Section label={t('birth_hour') || 'Birth hour'}>
            <View style={styles.selectRow}>
              <SelectBox
                label="HH"
                value={String(hourSel).padStart(2, '0')}
                onPress={() => setActivePicker('hour')}
              />
              <SelectBox
                label="MM"
                value={String(minuteSel).padStart(2, '0')}
                onPress={() => setActivePicker('minute')}
              />
            </View>
            <Text style={styles.hint}>
              {t('birth_hour_required_hint') || 'Please provide your approximate birth hour.'}
            </Text>
          </Section>

          <MysticButton label={t('save') || 'Save'} onPress={saveProfile} disabled={!canSave} />

          <View style={{ height: 24 }} />
        </ScrollView>
        <AdBanner unitId={BANNER_PROFILE_AD_UNIT_ID} />

        <OptionModal
          visible={activePicker === 'year'}
          title="Year"
          options={yearOptions}
          onSelect={(v) => setYearSel(v)}
          onClose={() => setActivePicker(null)}
        />
        <OptionModal
          visible={activePicker === 'month'}
          title="Month"
          options={monthOptions}
          onSelect={(v) => setMonthSel(v)}
          onClose={() => setActivePicker(null)}
          pad={2}
        />
        <OptionModal
          visible={activePicker === 'day'}
          title="Day"
          options={dayOptions}
          onSelect={(v) => setDaySel(v)}
          onClose={() => setActivePicker(null)}
          pad={2}
        />
        <OptionModal
          visible={activePicker === 'hour'}
          title="Hour"
          options={hourOptions}
          onSelect={(v) => setHourSel(v)}
          onClose={() => setActivePicker(null)}
          pad={2}
        />
        <OptionModal
          visible={activePicker === 'minute'}
          title="Minute"
          options={minuteOptions}
          onSelect={(v) => setMinuteSel(v)}
          onClose={() => setActivePicker(null)}
          pad={2}
        />
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

function SelectBox({ label, value, onPress }) {
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.92} style={styles.selectBox}>
      <Text style={styles.selectLabel}>{label}</Text>
      <Text style={styles.selectValue}>{value}</Text>
    </TouchableOpacity>
  );
}

function OptionModal({ visible, title, options, onSelect, onClose, pad = 0 }) {
  if (!visible) return null;
  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <TouchableOpacity style={styles.modalBackdrop} activeOpacity={1} onPress={onClose}>
        <TouchableOpacity style={styles.modalSheet} activeOpacity={1} onPress={() => {}}>
          <Text style={styles.modalTitle}>{title}</Text>
          <ScrollView style={styles.modalList} contentContainerStyle={{ paddingBottom: 8 }}>
            {options.map((opt) => {
              const value = typeof opt === 'number' ? opt : opt?.value;
              const label = typeof opt === 'number'
                ? String(opt).padStart(pad, '0')
                : (opt?.label ?? String(opt));
              return (
                <TouchableOpacity
                  key={`${title}-${value}`}
                  style={styles.modalItem}
                  onPress={() => {
                    onSelect(value);
                    onClose();
                  }}
                >
                  <Text style={styles.modalItemText}>{label}</Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
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
  overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.65)' },
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

  selectRow: { flexDirection: 'row', gap: 10 },
  selectBox: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(214,166,59,0.25)',
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  selectLabel: {
    color: '#ffd262',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.4,
  },
  selectValue: {
    marginTop: 2,
    color: '#fff',
    fontWeight: '800',
    fontSize: 16,
    letterSpacing: 0.3,
  },

  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.65)',
    padding: 16,
    justifyContent: 'center',
  },
  modalSheet: {
    backgroundColor: '#1b1325',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(214,166,59,0.35)',
    padding: 14,
    maxHeight: '70%',
  },
  modalTitle: {
    color: '#ffd262',
    fontWeight: '800',
    fontSize: 16,
    marginBottom: 8,
    textAlign: 'center',
  },
  modalList: { maxHeight: 360 },
  modalItem: {
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.06)',
  },
  modalItemText: {
    color: '#fff',
    fontSize: 15,
    textAlign: 'center',
  },

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








