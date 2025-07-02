const express = require('express');
const router = express.Router();
const Rate = require('../models/rateModel');

// Lấy tỷ giá mới nhất
router.get('/current', async (req, res) => {
  try {
    const rateDoc = await Rate.findOne().sort({ createdAt: -1 });
    if (!rateDoc) return res.status(404).json({ error: 'No rates found' });
    res.json({ success: true, rates: rateDoc.rate });
  } catch (err) {
    console.error('❌ current rate error', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Lịch sử tỷ giá (filter theo from, to date)
router.get('/history', async (req, res) => {
  const { from, to } = req.query;

  try {
    const query = {};
    if (from || to) {
      query.createdAt = {};
      if (from) query.createdAt.$gte = new Date(from);
      if (to) query.createdAt.$lte = new Date(to);
    }

    const history = await Rate.find(query).sort({ createdAt: -1 }).limit(100);
    res.json({ success: true, data: history });
  } catch (err) {
    console.error('❌ History query error:', err);
    res.status(500).json({ success: false, error: 'Failed to fetch history' });
  }
});

// Chuyển đổi tiền tệ đơn giản
router.post('/convert', async (req, res) => {
  const { from, to, amount } = req.body;
  if (!from || !to || !amount) {
    return res.status(400).json({ error: 'Missing parameters' });
  }

  try {
    const rateDoc = await Rate.findOne().sort({ createdAt: -1 });
    if (!rateDoc) return res.status(404).json({ error: 'No rates found' });

    const rates = rateDoc.rate;
    const fromRate = rates[from];
    const toRate = rates[to];

    if (!fromRate || !toRate) {
      return res.status(400).json({ error: 'Invalid currency code' });
    }

    const result = (amount / fromRate) * toRate;
    res.json({ success: true, from, to, amount, result });
  } catch (err) {
    console.error('❌ convert error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Chuyển đổi tiền tệ qua một đồng trung gian (cross rate)
router.post('/convert-cross', async (req, res) => {
  const { base, quote, via } = req.body;

  if (!base || !quote || !via) {
    return res.status(400).json({ error: 'Missing base, quote, or via currency' });
  }

  try {
    const rateDoc = await Rate.findOne().sort({ createdAt: -1 });
    if (!rateDoc) return res.status(404).json({ error: 'No rates available' });

    const rates = rateDoc.rate;
    const baseVia = rates[base];
    const quoteVia = rates[quote];
    const viaRate = rates[via];

    if (!baseVia || !quoteVia || !viaRate) {
      return res.status(400).json({ error: 'Invalid currency code' });
    }

    // Công thức: base/quote = base/via / quote/via
    const crossRate = (baseVia / viaRate) / (quoteVia / viaRate);
    res.json({ success: true, base, quote, via, rate: crossRate });
  } catch (err) {
    console.error('❌ convert-cross error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
