const express = require('express');
const router = express.Router();
const { getPopularCurrencyPairs } = require('../services/popularPairService');

// GET /api/rates/popular
router.get('/popular', async (req, res) => {
  try {
    const result = await getPopularCurrencyPairs(10); // top 10
    res.json({ success: true, pairs: result });
  } catch (error) {
    console.error('Lỗi API popular:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;
