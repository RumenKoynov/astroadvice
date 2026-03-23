import AsyncStorage from '@react-native-async-storage/async-storage';
import { apiFetch } from '../services/api';
import { SIGN_IDS } from '../i18n/zodiacMap';

export const WEEKLY_COMPAT_CACHE_KEY = 'weekly_compatibility_cache_v1';
export const WEEKLY_COMPAT_SELECTION_KEY = 'weekly_compatibility_selection_v1';

const SUNDAY_NIGHT_HOUR = 20;

const clamp = (value) => Math.max(0, Math.min(100, Math.round(value)));

export const getWeekKey = (now = new Date()) => {
  const date = new Date(now);
  const isSunday = date.getDay() === 0;
  const isSundayNight = isSunday && date.getHours() >= SUNDAY_NIGHT_HOUR;
  if (isSundayNight) {
    date.setDate(date.getDate() + 1);
  }
  const day = date.getDay(); // 0 Sunday
  const diffToMonday = (day + 6) % 7;
  date.setDate(date.getDate() - diffToMonday);
  return date.toISOString().slice(0, 10);
};

export const pickAlternateSign = (current, order = SIGN_IDS) => {
  if (!order.length) return current;
  if (!current) return order[0];
  const idx = order.indexOf(current);
  return order[(idx + 1) % order.length];
};

const hashString = (value) => {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = ((hash << 5) - hash) + value.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
};

const zodiacDistance = (order, aId, bId) => {
  const idxA = order.indexOf(aId);
  const idxB = order.indexOf(bId);
  if (idxA < 0 || idxB < 0) return 0;
  const diff = Math.abs(idxA - idxB);
  return Math.min(diff, order.length - diff);
};

const aspectBonus = (distance) => {
  if (distance === 0) return 6;
  if (distance === 6) return 8;
  if (distance === 4 || distance === 8) return 6;
  if (distance === 3 || distance === 9) return -4;
  if (distance === 2 || distance === 10) return 4;
  return 0;
};

const weeklyDelta = (weekKey, aId, bId, category) => {
  const pairKey = [aId, bId].sort().join('|');
  const seed = hashString(`${weekKey}:${pairKey}:${category}`);
  return (seed % 13) - 6;
};

const tierForScore = (score) => {
  if (score >= 75) return 'high';
  if (score >= 55) return 'mid';
  return 'low';
};

export const computeWeeklyCompatibility = (signA, signB, data, weekKey) => {
  if (!data) return null;
  const order = data.order || SIGN_IDS;
  const metaById = Object.fromEntries((data.signs || []).map((s) => [s.id, s]));
  const a = metaById[signA];
  const b = metaById[signB];
  if (!a || !b) return null;

  const elementScore = data.matrices?.element?.[a.element]?.[b.element] ?? 60;
  const modalityScore = data.matrices?.modality?.[a.modality]?.[b.modality] ?? 60;
  const polarityScore = data.matrices?.polarity?.[a.polarity]?.[b.polarity] ?? 60;

  const base = (elementScore * 0.6) + (modalityScore * 0.25) + (polarityScore * 0.15);
  const sameElement = a.element === b.element;
  const sameModality = a.modality === b.modality;
  const oppositePolarity = a.polarity !== b.polarity;
  const distance = zodiacDistance(order, signA, signB);
  const aspect = aspectBonus(distance);

  const loveScore = clamp(
    base
    + aspect
    + weeklyDelta(weekKey, signA, signB, 'love')
    + (sameElement ? 8 : 0)
    + (oppositePolarity ? 6 : 0)
    - (sameModality ? 2 : 0)
  );

  const friendshipScore = clamp(
    base
    + Math.max(-2, aspect - 2)
    + weeklyDelta(weekKey, signA, signB, 'friendship')
    + (sameModality ? 8 : 0)
    + (sameElement ? 5 : 0)
  );

  const workScore = clamp(
    base
    + Math.max(-3, aspect - 3)
    + weeklyDelta(weekKey, signA, signB, 'work')
    + (sameModality ? 10 : 0)
    + (oppositePolarity ? 4 : 0)
  );

  return {
    love: { score: loveScore, tier: tierForScore(loveScore) },
    friendship: { score: friendshipScore, tier: tierForScore(friendshipScore) },
    work: { score: workScore, tier: tierForScore(workScore) },
  };
};

export const WEEKLY_COMPAT_TRANSLATION_KEYS = [
  'title',
  'subtitle',
  'you',
  'other',
  'use_my_sign',
  'swap',
  'select_two',
  'love',
  'friendship',
  'work',
  'score',
  'loading',
  'back',
  'signs',
  'desc',
];

export const loadWeeklyCompatibility = async () => {
  const weekKey = getWeekKey();
  try {
    const cachedRaw = await AsyncStorage.getItem(WEEKLY_COMPAT_CACHE_KEY);
    if (cachedRaw) {
      const cached = JSON.parse(cachedRaw);
      if (cached?.weekKey === weekKey && cached?.data) {
        return { weekKey, data: cached.data, cached: true };
      }
    }
  } catch {
    // ignore
  }

  const response = await apiFetch('/compatibility/weekly', 'GET');
  const data = response?.data || response;
  if (!data) throw new Error('Compatibility data missing');

  try {
    await AsyncStorage.setItem(
      WEEKLY_COMPAT_CACHE_KEY,
      JSON.stringify({ weekKey, data, fetchedAt: new Date().toISOString() })
    );
  } catch {
    // ignore
  }

  return { weekKey, data, cached: false };
};
