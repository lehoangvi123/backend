// 📁 utils/detectRateAnomalies.js

/**
 * Phát hiện tỷ giá bất thường nếu thay đổi quá lớn so với lần trước đó.
 * @param {Object} newRates - Tỷ giá mới nhất (VD: { USD: 1.0, EUR: 0.9, ... })
 * @param {Object} previousRates - Tỷ giá trước đó
 * @param {number} threshold - Ngưỡng phần trăm thay đổi lớn nhất hợp lệ (VD: 0.1 là 10%)
 * @returns {Object} - { anomalies: [], hasAnomaly: boolean }
 */

function detectRateAnomalies(currentRates, previousRates = {}, threshold = 0.1) {
  const anomalies = {};

  for (const currency in currentRates) {
    const newRate = currentRates[currency];
    const oldRate = previousRates[currency];

    if (oldRate !== undefined) {
      const change = Math.abs(newRate - oldRate) / oldRate;

      if (change > threshold) {
        anomalies[currency] = {
          oldRate: oldRate,
          newRate: newRate,
          change: (change * 100).toFixed(2) + '%'
        };
      }
    }
  }

  return {
    hasAnomaly: Object.keys(anomalies).length > 0,
    anomalies
  };
}

module.exports = detectRateAnomalies;
