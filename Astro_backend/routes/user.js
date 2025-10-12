const express = require('express');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

const router = express.Router();

// simple JWT auth middleware
function auth(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ message: 'No token provided' });
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.userId = decoded.id;
    next();
  } catch {
    return res.status(401).json({ message: 'Invalid token' });
  }
}

// PATCH /user/profile
router.patch('/profile', auth, async (req, res) => {
  try {
    const {
      language, sex, age, birthDate, birthTimeApprox,
      zodiacSign, chineseZodiac
    } = req.body;

    const updated = await User.findByIdAndUpdate(
      req.userId,
      { language, sex, age, birthDate, birthTimeApprox, zodiacSign, chineseZodiac },
      { new: true }
    );
    if (!updated) return res.status(404).json({ message: 'User not found' });
    res.json(updated);
  } catch (err) {
    console.error('Profile update error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});


module.exports = router;

