// 📁 utils/calculateTechnicalIndicators.js

/**
 * Tính các chỉ báo kỹ thuật đơn giản như SMA, EMA, RSI cho dữ liệu tỷ giá
 * @param {Array} historicalData - Dữ liệu dạng [{ currency: 'USD', value: 1.2 }, ...]
 * @param {string} currency - Đồng tiền cần phân tích
 * @returns {Object} indicators
 */
function calculateTechnicalIndicators(historicalData, currency) {
  const prices = historicalData
    .filter(item => item.currency === currency)
    .map(item => item.value);

  const sma = simpleMovingAverage(prices, 5);
  const ema = exponentialMovingAverage(prices, 5);
  const rsi = relativeStrengthIndex(prices, 14);

  return { sma, ema, rsi };
}

function simpleMovingAverage(data, period) {
  if (data.length < period) return null;
  const slice = data.slice(-period);
  const sum = slice.reduce((acc, val) => acc + val, 0);
  return +(sum / period).toFixed(6);
}

function exponentialMovingAverage(data, period) {
  if (data.length < period) return null;
  const k = 2 / (period + 1);
  let ema = data.slice(0, period).reduce((acc, val) => acc + val, 0) / period;
  for (let i = period; i < data.length; i++) {
    ema = data[i] * k + ema * (1 - k);
  }
  return +ema.toFixed(6);
}

function relativeStrengthIndex(data, period) {
  if (data.length < period + 1) return null;
  let gains = 0, losses = 0;
  for (let i = 1; i <= period; i++) {
    const change = data[i] - data[i - 1];
    if (change > 0) gains += change;
    else losses -= change;
  }
  const avgGain = gains / period;
  const avgLoss = losses / period;
  if (avgLoss === 0) return 100;
  const rs = avgGain / avgLoss;
  const rsi = 100 - 100 / (1 + rs);
  return +rsi.toFixed(2);
}

module.exports = calculateTechnicalIndicators;
