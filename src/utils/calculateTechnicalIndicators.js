function calculateTechnicalIndicators(historicalData, currency) {
  const prices = historicalData
    .filter(item => item.currency === currency)
    .map(item => item.value);

  const sma = prices.length >= 5 ? simpleMovingAverage(prices, 5) : 'N/A';
  const ema = prices.length >= 5 ? exponentialMovingAverage(prices, 5) : 'N/A';
  const rsi = prices.length >= 15 ? relativeStrengthIndex(prices, 14) : 'N/A';

  return { sma, ema, rsi };
}

function simpleMovingAverage(data, period) {
  const slice = data.slice(-period);
  const sum = slice.reduce((acc, val) => acc + val, 0);
  return +(sum / period).toFixed(6);
}

function exponentialMovingAverage(data, period) {
  const k = 2 / (period + 1);
  let ema = data.slice(0, period).reduce((acc, val) => acc + val, 0) / period;
  for (let i = period; i < data.length; i++) {
    ema = data[i] * k + ema * (1 - k);
  }
  return +ema.toFixed(6);
}

function relativeStrengthIndex(data, period) {
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
  return +(100 - 100 / (1 + rs)).toFixed(2);
}

module.exports = calculateTechnicalIndicators;
