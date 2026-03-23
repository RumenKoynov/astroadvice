import React from 'react';
import renderer from 'react-test-renderer';
import LearnTarotScreen from '../src/screens/LearnTarotScreen';
import { learnTarotCards } from '../src/data/learnTarotCards';
import { buildQuizQuestions } from '../src/utils/learnTarotQuiz';

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key, opts) => (opts && opts.defaultValue ? opts.defaultValue : key),
    i18n: { language: 'en' },
  }),
}));

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

describe('Learn Tarot dataset', () => {
  it('has 78 cards with unique ids and localized fields', () => {
    const ids = new Set();
    const langs = ['en', 'bg', 'ru', 'es', 'tr', 'fr', 'de', 'it'];
    expect(learnTarotCards.length).toBe(78);
    learnTarotCards.forEach((card) => {
      expect(card.id).toBeTruthy();
      expect(ids.has(card.id)).toBe(false);
      ids.add(card.id);
      expect(card.image).toBeTruthy();
      langs.forEach((lang) => {
        expect(card.name[lang]).toBeTruthy();
        expect(card.keywords[lang]).toBeTruthy();
        expect(card.meaning[lang]).toBeTruthy();
        expect(card.advice[lang]).toBeTruthy();
      });
    });
  });
});

describe('Learn Tarot quiz logic', () => {
  it('builds questions with correct answers included', () => {
    const questions = buildQuizQuestions(learnTarotCards, 'en', 5);
    expect(questions.length).toBeGreaterThan(0);
    questions.forEach((q) => {
      const optionIds = q.options.map((o) => o.id);
      expect(optionIds).toContain(q.answerId);
      expect(new Set(optionIds).size).toBe(optionIds.length);
    });
  });
});

describe('Learn Tarot screen', () => {
  it('renders and navigates to detail', () => {
    const navigation = { navigate: jest.fn() };
    const tree = renderer.create(<LearnTarotScreen navigation={navigation} />);
    const first = learnTarotCards[0];
    const cardBtn = tree.root.findByProps({ testID: `learn-tarot-card-${first.id}` });
    cardBtn.props.onPress();
    expect(navigation.navigate).toHaveBeenCalledWith('TarotCardDetail', { id: first.id });
  });
});
