const Rate = require('../models/rateModel');

function calculateTrend(data) {
  if (data.length < 2) return 'Không đủ dữ liệu';

  const start = data[0].rate;
  const end = data[data.length - 1].rate;

  const change = ((end - start) / start) * 100;

  if (change > 1) return 'Tăng 📈';
  if (change < -1) return 'Giảm 📉';
  return 'Đi ngang 🔁';
}

async function analyzeRateTrend(pair, period = '30d') {
  const [from, to] = pair.split('_');
  const end = new Date();
  let start;

  switch (period) {
    case '7d':
      start = new Date(end.getTime() - 7 * 24 * 60 * 60 * 1000); break;
    case '90d':
      start = new Date(end.getTime() - 90 * 24 * 60 * 60 * 1000); break;
    default:
      start = new Date(end.getTime() - 30 * 24 * 60 * 60 * 1000); break;
  }

  const history = await Rate.find({ createdAt: { $gte: start, $lte: end } }).sort('createdAt');

  const values = history.map(item => {
    const rate = item.rate;
    const value = rate[to] / rate[from];
    return { date: item.createdAt, rate: value };
  });

  const trend = calculateTrend(values);

  return { pair, period, trend, values };
}

module.exports = { analyzeRateTrend };
