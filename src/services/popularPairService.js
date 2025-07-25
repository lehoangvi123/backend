const ConversionLog = require('../models/ConversionLog');

/**
 * Lấy top cặp tiền được quy đổi nhiều nhất từ ConversionLog
 * @param {number} limit - Số lượng cặp phổ biến cần lấy
 * @returns {Promise<Array<string>>} - Mảng các cặp tiền phổ biến
 */
async function getPopularCurrencyPairs(limit = 10) {
  const result = await ConversionLog.aggregate([
    {
      $project: {
        pair: { $concat: ['$from', '_', '$to'] } // Tạo chuỗi "USD_VND"
      }
    },
    {
      $group: {
        _id: '$pair',
        count: { $sum: 1 }
      }
    },
    {
      $sort: { count: -1 }
    },
    {
      $limit: limit
    },
    {
      $project: {
        _id: 0,
        pair: '$_id',
        count: 1
      }
    }
  ]);

  return result; // [{ pair: 'USD_VND', count: 15 }, ...]
}

module.exports = { getPopularCurrencyPairs };
