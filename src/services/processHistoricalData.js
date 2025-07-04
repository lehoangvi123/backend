// services/processHistoricalData.js
const Rate = require('../models/rateModel');
const moment = require('moment');

async function processHistoricalData(period) {
  let startTime;
  if (period === '24h') {
    startTime = moment().subtract(24, 'hours');
  } else if (period === '7d') {
    startTime = moment().subtract(7, 'days');
  } else {
    throw new Error('Invalid period');
  }

  const data = await Rate.find({ createdAt: { $gte: startTime.toDate() } }).sort({ createdAt: 1 });
  return data.map(doc => ({
    timestamp: doc.createdAt,
    rates: doc.rate
  }));
}


module.exports = { processHistoricalData };