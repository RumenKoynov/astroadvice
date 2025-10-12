// server/models/ChineseDaily.js
const { Schema, model, Types } = require('mongoose');

const ChineseDailySchema = new Schema(
  {
    userId: { type: Types.ObjectId, ref: 'User', required: true, index: true },
    date:   { type: String, required: true, index: true }, // YYYY-MM-DD
    slug:   { type: String, required: true },              // e.g. "monkey-water"
    lang:   { type: String, default: 'en' },
    horoscope: { type: String, default: '' },
  },
  { timestamps: true }
);

ChineseDailySchema.index({ userId: 1, date: 1, slug: 1 }, { unique: true });

module.exports = model('ChineseDaily', ChineseDailySchema);
