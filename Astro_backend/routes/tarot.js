const express = require('express');
const path = require('path');
const fs = require('fs');
const router = express.Router();
const tarot = require('../data/tarotDescriptions'); // { id: { name:{}, desc:{} } }

function buildImgUrl(req, id) {
  const base =
    process.env.API_PUBLIC_BASE ||
    `${req.protocol}://${req.get('host')}`;
  const exts = ['.png', '.jpg', '.jpeg'];
  const found = exts.find(ext => fs.existsSync(path.join(__dirname, '..', 'cards', id + ext)));
  return `${base}/cards/${id}${found || '.png'}`;
}

router.get('/random', (req, res) => {
  const lang = (req.query.lang || 'en').toLowerCase();
  const ids = Object.keys(tarot);
  const id = ids[Math.floor(Math.random() * ids.length)];
  const meta = tarot[id] || {};
  const name = (meta.name && (meta.name[lang] || meta.name.en)) || id;
  const description = (meta.desc && (meta.desc[lang] || meta.desc.en)) || '';
  return res.json({ id, name, description, imageUrl: buildImgUrl(req, id) });
});

module.exports = router;




