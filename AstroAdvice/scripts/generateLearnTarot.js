const fs = require('fs');
const path = require('path');

const LANGS = ['en', 'bg', 'ru', 'es', 'tr', 'fr', 'de', 'it'];

const majors = [
  { id: 'the-fool', file: '00-TheFool.jpg', en: 'The Fool' },
  { id: 'the-magician', file: '01-TheMagician.jpg', en: 'The Magician' },
  { id: 'the-high-priestess', file: '02-TheHighPriestess.jpg', en: 'The High Priestess' },
  { id: 'the-empress', file: '03-TheEmpress.jpg', en: 'The Empress' },
  { id: 'the-emperor', file: '04-TheEmperor.jpg', en: 'The Emperor' },
  { id: 'the-hierophant', file: '05-TheHierophant.jpg', en: 'The Hierophant' },
  { id: 'the-lovers', file: '06-TheLovers.jpg', en: 'The Lovers' },
  { id: 'the-chariot', file: '07-TheChariot.jpg', en: 'The Chariot' },
  { id: 'strength', file: '08-Strength.jpg', en: 'Strength' },
  { id: 'the-hermit', file: '09-TheHermit.jpg', en: 'The Hermit' },
  { id: 'wheel-of-fortune', file: '10-WheelOfFortune.jpg', en: 'Wheel of Fortune' },
  { id: 'justice', file: '11-Justice.jpg', en: 'Justice' },
  { id: 'the-hanged-man', file: '12-TheHangedMan.jpg', en: 'The Hanged Man' },
  { id: 'death', file: '13-Death.jpg', en: 'Death' },
  { id: 'temperance', file: '14-Temperance.jpg', en: 'Temperance' },
  { id: 'the-devil', file: '15-TheDevil.jpg', en: 'The Devil' },
  { id: 'the-tower', file: '16-TheTower.jpg', en: 'The Tower' },
  { id: 'the-star', file: '17-TheStar.jpg', en: 'The Star' },
  { id: 'the-moon', file: '18-TheMoon.jpg', en: 'The Moon' },
  { id: 'the-sun', file: '19-TheSun.jpg', en: 'The Sun' },
  { id: 'judgement', file: '20-Judgement.jpg', en: 'Judgement' },
  { id: 'the-world', file: '21-TheWorld.jpg', en: 'The World' },
];

const majorMissingDesc = {
  'the-hanged-man': {
    en: 'The Hanged Man brings a pause, a new perspective, and surrender. It suggests letting go of control to see the truth in a different light.',
  },
  death: {
    en: 'Death marks transformation, endings, and renewal. It clears the old to make room for the new and invites deep change.',
  },
  temperance: {
    en: 'Temperance is balance, harmony, and patience. It encourages moderation and the calm blending of opposites.',
  },
  'the-devil': {
    en: 'The Devil points to attachment, temptation, or feeling stuck. It calls for honest awareness and reclaiming your freedom.',
  },
  'the-tower': {
    en: 'The Tower signals sudden change and a breakthrough. Though disruptive, it clears false foundations so truth can stand.',
  },
  'the-star': {
    en: 'The Star brings hope, healing, and gentle guidance. It renews faith and invites you to trust the path ahead.',
  },
  'the-moon': {
    en: 'The Moon speaks of intuition, uncertainty, and hidden truths. It asks you to navigate with inner knowing.',
  },
  judgement: {
    en: 'Judgement marks awakening and a call to rise. It invites reflection, forgiveness, and stepping into your next chapter.',
  },
  'the-world': {
    en: 'The World symbolizes completion, integration, and wholeness. It celebrates progress and the closing of a cycle.',
  },
};

const ranks = [
  { id: 'ace', index: 1 },
  { id: '2', index: 2 },
  { id: '3', index: 3 },
  { id: '4', index: 4 },
  { id: '5', index: 5 },
  { id: '6', index: 6 },
  { id: '7', index: 7 },
  { id: '8', index: 8 },
  { id: '9', index: 9 },
  { id: '10', index: 10 },
  { id: 'page', index: 11 },
  { id: 'knight', index: 12 },
  { id: 'queen', index: 13 },
  { id: 'king', index: 14 },
];

const suits = [
  { id: 'wands', file: 'Wands' },
  { id: 'cups', file: 'Cups' },
  { id: 'pentacles', file: 'Pentacles' },
  { id: 'swords', file: 'Swords' },
];

const tarotBase = require(path.resolve(__dirname, '../../Astro_backend/data/tarotDescriptions'));

function buildCardImages() {
  const lines = [];
  majors.forEach((m) => {
    lines.push(`  '${m.id}': require('../../assets/cards/${m.file}'),`);
  });
  suits.forEach((s) => {
    ranks.forEach((r) => {
      const id = `${r.id}-of-${s.id}`;
      const num = String(r.index).padStart(2, '0');
      lines.push(`  '${id}': require('../../assets/cards/${s.file}${num}.jpg'),`);
    });
  });
  return lines.join('\n');
}

const cardImagesBlock = buildCardImages();

const out = `const tarotBase = ${JSON.stringify(tarotBase, null, 2)};

const LANGS = ${JSON.stringify(LANGS)};

const cardImages = {
${cardImagesBlock}
};

const majorMissingDesc = ${JSON.stringify(majorMissingDesc, null, 2)};

const suitKeywords = {
  wands: {
    en: ['Inspiration', 'Action', 'Growth'],
    bg: ['Вдъхновение', 'Действие', 'Растеж'],
    ru: ['Вдохновение', 'Действие', 'Рост'],
    es: ['Inspiración', 'Acción', 'Crecimiento'],
    tr: ['İlham', 'Eylem', 'Büyüme'],
    fr: ['Inspiration', 'Action', 'Croissance'],
    de: ['Inspiration', 'Handlung', 'Wachstum'],
    it: ['Ispirazione', 'Azione', 'Crescita'],
  },
  cups: {
    en: ['Emotion', 'Connection', 'Intuition'],
    bg: ['Емоция', 'Връзка', 'Интуиция'],
    ru: ['Эмоции', 'Связь', 'Интуиция'],
    es: ['Emoción', 'Conexión', 'Intuición'],
    tr: ['Duygu', 'Bağ', 'Sezgi'],
    fr: ['Émotion', 'Lien', 'Intuition'],
    de: ['Gefühl', 'Verbindung', 'Intuition'],
    it: ['Emozione', 'Connessione', 'Intuizione'],
  },
  swords: {
    en: ['Thought', 'Clarity', 'Challenge'],
    bg: ['Мисъл', 'Яснота', 'Предизвикателство'],
    ru: ['Мысль', 'Ясность', 'Вызов'],
    es: ['Pensamiento', 'Claridad', 'Desafío'],
    tr: ['Düşünce', 'Netlik', 'Zorluk'],
    fr: ['Pensée', 'Clarté', 'Défi'],
    de: ['Gedanke', 'Klarheit', 'Herausforderung'],
    it: ['Pensiero', 'Chiarezza', 'Sfida'],
  },
  pentacles: {
    en: ['Stability', 'Work', 'Abundance'],
    bg: ['Стабилност', 'Работа', 'Изобилие'],
    ru: ['Стабильность', 'Труд', 'Изобилие'],
    es: ['Estabilidad', 'Trabajo', 'Abundancia'],
    tr: ['İstikrar', 'Çaba', 'Bolluk'],
    fr: ['Stabilité', 'Travail', 'Abondance'],
    de: ['Stabilität', 'Arbeit', 'Fülle'],
    it: ['Stabilità', 'Lavoro', 'Abbondanza'],
  },
};

const suitAdvice = {
  wands: {
    en: 'Take inspired action today.',
    bg: 'Действай вдъхновено днес.',
    ru: 'Действуй вдохновенно сегодня.',
    es: 'Actúa con inspiración hoy.',
    tr: 'Bugün ilhamla harekete geç.',
    fr: 'Agis avec inspiration aujourd’hui.',
    de: 'Handle heute inspiriert.',
    it: 'Agisci con ispirazione oggi.',
  },
  cups: {
    en: 'Lead with your heart today.',
    bg: 'Води със сърцето си днес.',
    ru: 'Сегодня действуй сердцем.',
    es: 'Hoy actúa con el corazón.',
    tr: 'Bugün kalbinle hareket et.',
    fr: 'Laisse ton cœur guider aujourd’hui.',
    de: 'Handle heute mit dem Herzen.',
    it: 'Lascia parlare il cuore oggi.',
  },
  swords: {
    en: 'Seek clarity before you act.',
    bg: 'Потърси яснота преди действие.',
    ru: 'Ищи ясность, прежде чем действовать.',
    es: 'Busca claridad antes de actuar.',
    tr: 'Harekete geçmeden önce netlik ara.',
    fr: 'Cherche la clarté avant d’agir.',
    de: 'Suche Klarheit, bevor du handelst.',
    it: 'Cerca chiarezza prima di agire.',
  },
  pentacles: {
    en: 'Ground yourself in what is practical.',
    bg: 'Заземи се в практичното.',
    ru: 'Опирайся на практичное.',
    es: 'Enraíza en lo práctico.',
    tr: 'Pratiğe dayan ve sağlam kal.',
    fr: 'Ancre-toi dans le concret.',
    de: 'Bleib im Praktischen verankert.',
    it: 'Resta ancorato al pratico.',
  },
};

const majorAdvice = {
  en: 'Reflect on this card’s message and let it guide you today.',
  bg: 'Помисли върху посланието и нека те води днес.',
  ru: 'Размышляй над посланием карты и следуй ему сегодня.',
  es: 'Reflexiona sobre el mensaje y deja que te guíe hoy.',
  tr: 'Kartın mesajını düşün ve bugün sana rehber olsun.',
  fr: 'Réfléchis à ce message et laisse-le te guider aujourd’hui.',
  de: 'Denke über die Botschaft nach und lass sie dich heute leiten.',
  it: 'Rifletti sul messaggio e lascia che ti guidi oggi.',
};

const majorKeywords = {
  en: ['Insight', 'Purpose', 'Transformation'],
  bg: ['Прозрение', 'Смисъл', 'Промяна'],
  ru: ['Озарение', 'Смысл', 'Преобразование'],
  es: ['Perspicacia', 'Propósito', 'Transformación'],
  tr: ['İçgörü', 'Amaç', 'Dönüşüm'],
  fr: ['Clarté', 'But', 'Transformation'],
  de: ['Einsicht', 'Sinn', 'Wandel'],
  it: ['Intuizione', 'Scopo', 'Trasformazione'],
};

const minorSuitForId = (id) => {
  if (id.endsWith('-of-wands')) return 'wands';
  if (id.endsWith('-of-cups')) return 'cups';
  if (id.endsWith('-of-swords')) return 'swords';
  return 'pentacles';
};

const fixText = (value) => {
  if (!value || typeof value !== 'string') return value;
  if (!/[ÃÐÑ]/.test(value)) return value;
  try {
    return decodeURIComponent(escape(value));
  } catch {
    return value;
  }
};

const normalizeObj = (obj) => {
  if (!obj) return {};
  if (Array.isArray(obj)) return { en: obj };
  if (typeof obj === 'string') return { en: obj };
  return obj;
};

const localize = (obj) => {
  const normalized = normalizeObj(obj);
  const out = {};
  LANGS.forEach((l) => {
    const raw = normalized[l] || normalized.en || '';
    out[l] = fixText(raw);
  });
  return out;
};

const getName = (id) => {
  const base = tarotBase[id];
  if (base && base.name) return localize(base.name);
  const major = ${JSON.stringify(majors.reduce((acc, m) => {
  acc[m.id] = { en: m.en };
  return acc;
}, {}), null, 2)};
  return localize(major[id] || { en: id });
};

const getMeaning = (id) => {
  const base = tarotBase[id];
  if (base && base.desc) return localize(base.desc);
  return localize(majorMissingDesc[id] || { en: '' });
};

const toArray = (val) => {
  if (Array.isArray(val)) return val;
  if (typeof val === 'string') {
    return val.split(',').map((s) => s.trim()).filter(Boolean);
  }
  return [];
};

const getKeywords = (id) => {
  const base = tarotBase[id];
  if (base && base.keywords) {
    const localized = localize(base.keywords);
    const out = {};
    LANGS.forEach((l) => {
      out[l] = toArray(localized[l] || localized.en);
    });
    return out;
  }
  if (id.includes('-of-')) {
    const suit = minorSuitForId(id);
    const localized = localize({ ...suitKeywords[suit], en: suitKeywords[suit].en });
    const out = {};
    LANGS.forEach((l) => {
      out[l] = toArray(localized[l] || localized.en);
    });
    return out;
  }
  const localized = localize(majorKeywords);
  const out = {};
  LANGS.forEach((l) => {
    out[l] = toArray(localized[l] || localized.en);
  });
  return out;
};

const getAdvice = (id) => {
  if (id.includes('-of-')) {
    const suit = minorSuitForId(id);
    return localize(suitAdvice[suit]);
  }
  return localize(majorAdvice);
};

const majors = ${JSON.stringify(majors.map(m => m.id))};
const ranks = ${JSON.stringify(ranks.map(r => r.id))};
const suits = ${JSON.stringify(suits.map(s => s.id))};

const minorIds = [];
for (const suit of suits) {
  for (const rank of ranks) {
    minorIds.push(\`\${rank}-of-\${suit}\`);
  }
}

export const learnTarotCards = [...majors, ...minorIds].map((id) => ({
  id,
  image: cardImages[id],
  name: getName(id),
  keywords: getKeywords(id),
  meaning: getMeaning(id),
  advice: getAdvice(id),
}));
`;

const outPath = path.resolve(__dirname, '../src/data/learnTarotCards.js');
fs.writeFileSync(outPath, out, 'utf8');
console.log('Generated learnTarotCards.js');
