// 📁 utils/detectRateAnomalies.js

/**
 * Phát hiện tỷ giá bất thường nếu thay đổi quá lớn so với lần trước đó.
 * @param {Object} newRates - Tỷ giá mới nhất (VD: { USD: 1.0, EUR: 0.9, ... })
 * @param {Object} previousRates - Tỷ giá trước đó
 * @param {number} threshold - Ngưỡng phần trăm thay đổi lớn nhất hợp lệ (VD: 0.1 là 10%)
 * @returns {Object} - { anomalies: [], hasAnomaly: boolean }
 */
function detectRateAnomalies(newRates, previousRates, threshold = 0.1) {
  const anomalies = [];

  for (const currency in newRates) {
    const newValue = newRates[currency];
    const oldValue = previousRates[currency];

    if (!oldValue || oldValue === 0) continue;

    const change = Math.abs((newValue - oldValue) / oldValue);
    if (change > threshold) {
      anomalies.push({
        currency,
        oldValue,
        newValue,
        changePercent: +(change * 100).toFixed(2),
      });
    }
  }

  return {
    anomalies,
    hasAnomaly: anomalies.length > 0
  };
}

module.exports = detectRateAnomalies;
