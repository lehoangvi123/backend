const express = require('express');
const router = express.Router();
const Rate = require('../models/rateModel');

// GET: Lấy tỷ giá hiện tại
router.get('/current', async (req, res) => {
  try {
    const rateDoc = await Rate.findOne().sort({ createdAt: -1 });
    if (!rateDoc) return res.status(404).json({ error: 'No rates found' });
    res.json(rateDoc);
  } catch (err) {
    console.error('❌ current rate error', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST: Chuyển đổi tiền tệ
router.post('/convert', async (req, res) => {
  let { from, to, amount } = req.body;
  if (!from || !to || !amount) {
    return res.status(400).json({ error: 'Missing parameters' });
  } 

  from = from.toUpperCase();
  to = to.toUpperCase();
  amount = parseFloat(amount); 

  try {
    const rateDoc = await Rate.findOne({ pair: 'USD' }).sort({ createdAt: -1 });
    if (!rateDoc) return res.status(404).json({ error: 'No rate data available' });

    const rates = rateDoc.rate;

    let usdAmount;
    if (from === 'USD') { 
      usdAmount = amount;
    } else if (rates[from]) {
      usdAmount = amount / rates[from];
    } else {
      return res.status(400).json({ error: `Unsupported from currency: ${from}` });
    }

    let result;
    if (to === 'USD') {
      result = usdAmount;
    } else if (rates[to]) {
      result = usdAmount * rates[to];
    } else {
      return res.status(400).json({ error: `Unsupported to currency: ${to}` });
    }

    res.json({
      from,
      to,
      amount,
      result: result.toFixed(2)
    });
  } catch (err) {
    console.error('❌ conversion error', err);
    res.status(500).json({ error: 'Conversion failed' });
  }
});

module.exports = router;
