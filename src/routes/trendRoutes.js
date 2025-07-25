const express = require('express');
const router = express.Router();
const { analyzeRateTrend } = require('../services/trendService');

router.get('/:pair/:period', async (req, res) => {
  const { pair, period } = req.params;

  try {
    const result = await analyzeRateTrend(pair, period);
    res.json({ success: true, ...result });
  } catch (err) {
    console.error('❌ Lỗi phân tích xu hướng:', err.message);
    res.status(500).json({ success: false, message: 'Lỗi server' });
  }
});

module.exports = router;
