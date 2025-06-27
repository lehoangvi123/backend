const { fetchRatesFromProvider } = require('../services/externalApiService');
const Rate = require('../models/rateModel');
const { cacheRate } = require('../utils/cache');

async function getCurrentRate(req, res) {
  try {
    const data = await fetchRatesFromProvider('https://api.apilayer.com/exchangerates_data/latest?base=USD');

    // Lưu DB 
    await Rate.create({
      pair: 'USD',
      rate: data.rates, 
    });     

    // Cache
    await cacheRate('USD', data.rates);

    res.json(data);
  } catch (err) {
    console.error('❌ getCurrentRate error', err);
    res.status(500).json({ error: 'Failed to get rate' });
  }
}

module.exports = { getCurrentRate };
