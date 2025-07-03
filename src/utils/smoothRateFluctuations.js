/**
 * Làm mượt tỷ giá hiện tại bằng cách trộn với giá mới
 * @param {Object} newRates - tỷ giá mới từ fetch
 * @param {Object} oldRates - tỷ giá hiện tại đang lưu
 * @param {number} alpha - hệ số làm mượt (0.2 là phổ biến)
 * @returns {Object} smoothedRates
 */
function smoothRateFluctuations(newRates, oldRates = {}, alpha = 0.2) {
  const smoothed = {};

  for (const currency in newRates) {
    const newRate = newRates[currency];
    const oldRate = oldRates[currency] ?? newRate; // nếu chưa có thì dùng luôn new
    smoothed[currency] = alpha * newRate + (1 - alpha) * oldRate;
  }

  return smoothed;
}

module.exports = smoothRateFluctuations;
