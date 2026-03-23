const express = require('express');
const weeklyCompatibility = require('../data/weeklyCompatibility');

const router = express.Router();

// GET /compatibility/weekly
router.get('/compatibility/weekly', (req, res) => {
  res.json({ data: weeklyCompatibility });
});

module.exports = router;

