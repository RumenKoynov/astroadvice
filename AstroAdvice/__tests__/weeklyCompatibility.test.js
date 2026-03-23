import React from 'react';
import renderer from 'react-test-renderer';
import WeeklyCompatibilityScreen from '../src/screens/WeeklyCompatibilityScreen';
import {
  computeWeeklyCompatibility,
  pickAlternateSign,
  WEEKLY_COMPAT_TRANSLATION_KEYS,
} from '../src/utils/weeklyCompatibility';

const baseTranslation = {
  title: 'Weekly Compatibility',
  subtitle: 'Fresh alignment for the week ahead.',
  you: 'Your sign',
  other: 'Other sign',
  use_my_sign: 'Use my sign',
  swap: 'Swap',
  select_two: 'Select two signs to reveal this week’s compatibility',
  love: 'Love',
  friendship: 'Friendship',
  work: 'Work',
  score: 'Score',
  loading: 'Loading...',
  back: 'Back',
  signs: { aries: 'Aries' },
  desc: {
    love: { high: 'x', mid: 'y', low: 'z' },
    friendship: { high: 'x', mid: 'y', low: 'z' },
    work: { high: 'x', mid: 'y', low: 'z' },
  },
};

const translations = ['en', 'bg', 'ru', 'fr', 'de', 'tr', 'es', 'it']
  .reduce((acc, lang) => {
    acc[lang] = baseTranslation;
    return acc;
  }, {});

const fixture = {
  order: [
    'aries','taurus','gemini','cancer','leo','virgo',
    'libra','scorpio','sagittarius','capricorn','aquarius','pisces'
  ],
  signs: [
    { id: 'aries', element: 'fire', modality: 'cardinal', polarity: 'yang' },
    { id: 'taurus', element: 'earth', modality: 'fixed', polarity: 'yin' },
    { id: 'gemini', element: 'air', modality: 'mutable', polarity: 'yang' },
    { id: 'cancer', element: 'water', modality: 'cardinal', polarity: 'yin' },
    { id: 'leo', element: 'fire', modality: 'fixed', polarity: 'yang' },
    { id: 'virgo', element: 'earth', modality: 'mutable', polarity: 'yin' },
    { id: 'libra', element: 'air', modality: 'cardinal', polarity: 'yang' },
    { id: 'scorpio', element: 'water', modality: 'fixed', polarity: 'yin' },
    { id: 'sagittarius', element: 'fire', modality: 'mutable', polarity: 'yang' },
    { id: 'capricorn', element: 'earth', modality: 'cardinal', polarity: 'yin' },
    { id: 'aquarius', element: 'air', modality: 'fixed', polarity: 'yang' },
    { id: 'pisces', element: 'water', modality: 'mutable', polarity: 'yin' },
  ],
  matrices: {
    element: {
      fire: { fire: 78, air: 90, earth: 50, water: 44 },
      air: { fire: 90, air: 76, earth: 52, water: 48 },
      earth: { fire: 50, air: 52, earth: 80, water: 90 },
      water: { fire: 44, air: 48, earth: 90, water: 78 },
    },
    modality: {
      cardinal: { cardinal: 64, fixed: 54, mutable: 70 },
      fixed: { cardinal: 54, fixed: 72, mutable: 60 },
      mutable: { cardinal: 70, fixed: 60, mutable: 66 },
    },
    polarity: {
      yang: { yang: 66, yin: 78 },
      yin: { yang: 78, yin: 64 },
    },
  },
  translations,
};

jest.mock('../src/utils/weeklyCompatibility', () => {
  const actual = jest.requireActual('../src/utils/weeklyCompatibility');
  return {
    ...actual,
    loadWeeklyCompatibility: jest.fn(async () => ({ weekKey: '2026-01-05', data: fixture })),
  };
});

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key, opts) => (opts && opts.defaultValue ? opts.defaultValue : key),
    i18n: { language: 'en' },
  }),
}));

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
}));

jest.mock('../src/context/UserContext', () => ({
  useUser: () => ({ westernZodiac: 'Aries' }),
}));

describe('Weekly compatibility data', () => {
  it('has 12 signs and valid compatibility scores', () => {
    expect(fixture.signs.length).toBe(12);
    const data = computeWeeklyCompatibility('aries', 'leo', fixture, '2026-01-05');
    expect(data).toBeTruthy();
    ['love', 'friendship', 'work'].forEach((key) => {
      expect(data[key].score).toBeGreaterThanOrEqual(0);
      expect(data[key].score).toBeLessThanOrEqual(100);
      expect(['high', 'mid', 'low']).toContain(data[key].tier);
    });
  });

  it('picks an alternate sign different from current', () => {
    const alt = pickAlternateSign('aries', fixture.order);
    expect(alt).not.toBe('aries');
  });
});

describe('Weekly compatibility translations', () => {
  it('has required translation keys for all languages', () => {
    Object.keys(fixture.translations).forEach((lang) => {
      WEEKLY_COMPAT_TRANSLATION_KEYS.forEach((key) => {
        expect(fixture.translations[lang][key]).toBeTruthy();
      });
    });
  });
});

describe('Weekly compatibility screen', () => {
  it('renders without crashing', () => {
    const tree = renderer.create(<WeeklyCompatibilityScreen />);
    expect(tree.toJSON()).toBeTruthy();
  });
});
