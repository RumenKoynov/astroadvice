const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const adviceRoutes = require('./routes/advice');
const tarotRoutes = require('./routes/tarot');
const threeTarotRoutes = require('./routes/threetarotcards');
const chineseRoutes = require('./routes/chinese');

const app = express();
app.use(cors());
app.use(express.json());

// Static assets (cards + chinese images)
app.use('/cards', express.static(path.join(__dirname, 'cards')));
app.use('/cz', express.static(path.join(__dirname, 'chinese-zodiac')));

// Health
app.get('/health', (req, res) => res.json({ ok: true }));

// Public routes
app.use('/', adviceRoutes);                 // GET /getDailyAdvice
app.use('/tarot', tarotRoutes);             // /tarot/random
app.use('/threetarotcards', threeTarotRoutes); // /threetarotcards/draw + /reading
app.use('/chinese', chineseRoutes);         // /chinese/:slug + /daily

// 404
app.use((req, res) => res.status(404).json({ message: 'Not found' }));

const PORT = process.env.PORT || 3000;
const HOST = '0.0.0.0';
app.listen(PORT, HOST, () => {
  console.log(`🚀 Server http://${HOST}:${PORT}`);
  if (process.env.API_PUBLIC_BASE) console.log(`📡 Public base: ${process.env.API_PUBLIC_BASE}`);
});









