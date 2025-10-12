// server/models/TarotDaily.js
const { Schema, model, Types } = require('mongoose');

const CardSchema = new Schema(
  {
    id: String,
    name: String,
    description: String,
    imageUrl: String,
  },
  { _id: false }
);

const TarotDailySchema = new Schema(
  {
    userId: { type: Types.ObjectId, ref: 'User', required: true, index: true },
    date:   { type: String, required: true, index: true }, // YYYY-MM-DD (server day)
    lang:   { type: String, default: 'en' },
    cards:  { type: [CardSchema], default: [] },
    reading:{ type: String, default: '' },
  },
  { timestamps: true }
);

TarotDailySchema.index({ userId: 1, date: 1 }, { unique: true });

module.exports = model('TarotDaily', TarotDailySchema);
