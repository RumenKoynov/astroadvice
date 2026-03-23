const express = require('express');
const { getAppConfig } = require('../lib/appConfig');

const router = express.Router();

// GET /app-config
router.get('/app-config', (req, res) => {
  res.json(getAppConfig());
});

module.exports = router;

