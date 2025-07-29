// backend/src/routes/historyRoutes.js
const express = require('express');
const router = express.Router();
const { processHistoricalData } = require('../services/processHistoricalData');

router.get('/:period', async (req, res) => {
  try {
    const data = await processHistoricalData(req.params.period);
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: 'Lỗi khi xử lý dữ liệu lịch sử' });
  }
});

module.exports = router;
