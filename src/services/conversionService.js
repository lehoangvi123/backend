const ConversionLog = require('../models/ConversionLog');

/**
 * Ghi log chuyển đổi tiền tệ
 * @param {Object} conversionData - { userId, from, to, amount, result, rate }
 */
const logConversion = async (conversionData) => {
  try {
    const log = new ConversionLog(conversionData);
    await log.save();
    console.log('✅ Đã lưu log giao dịch:', log._id);
  } catch (err) {
    console.error('❌ Lỗi khi lưu log giao dịch:', err.message);
  }
};

module.exports = { logConversion };
