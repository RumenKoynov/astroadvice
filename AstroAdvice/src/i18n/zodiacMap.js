// Canonical IDs (do NOT translate these)
export const SIGN_IDS = [
  'aries','taurus','gemini','cancer','leo','virgo',
  'libra','scorpio','sagittarius','capricorn','aquarius','pisces'
];

// Canonical ID -> English name (what your backend expects, if it wants English)
export const SIGN_EN_BY_ID = {
  aries: 'Aries',
  taurus: 'Taurus',
  gemini: 'Gemini',
  cancer: 'Cancer',
  leo: 'Leo',
  virgo: 'Virgo',
  libra: 'Libra',
  scorpio: 'Scorpio',
  sagittarius: 'Sagittarius',
  capricorn: 'Capricorn',
  aquarius: 'Aquarius',
  pisces: 'Pisces',
};

// If your DB already stores English names, use this to read -> id
export const SIGN_ID_BY_EN = Object.fromEntries(
  Object.entries(SIGN_EN_BY_ID).map(([id, en]) => [en, id])
);
