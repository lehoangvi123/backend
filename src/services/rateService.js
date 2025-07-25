const Rate = require('../models/rateModel');
const ArchivedRate = require('../models/ArchivedRate');
const ConversionLog = require('../models/ConversionLog');

/**
 * Làm sạch dữ liệu rate: loại bỏ các cặp có giá trị không hợp lệ (NaN, undefined, null)
 */
function sanitizeRateData(rateMap) {
  const cleaned = {};
  for (const [currency, value] of Object.entries(rateMap)) {
    if (!isNaN(value)) {
      cleaned[currency] = value;
    } else {
      console.warn(`⚠️ Loại bỏ ${currency}: ${value} vì không hợp lệ`);
    }
  }
  return cleaned;
}

/**
 * Lưu tỷ giá hiện tại vào MongoDB
 * @param {Object} currencyRate - Ví dụ: { USD: 1, VND: 24500, EUR: 0.92 }
 */
async function saveRate(currencyRate) {
  try {
    const cleanedRate = sanitizeRateData(currencyRate);
    const rateDoc = new Rate({
      rate: cleanedRate,
      createdAt: new Date()
    });
    await rateDoc.save();
    console.log('✅ Tỷ giá đã được lưu vào MongoDB');
  } catch (error) {
    console.error('❌ Lỗi khi lưu tỷ giá:', error.message);
  }
}

/**
 * Trả về lịch sử tỷ giá thô theo thời gian
 */
async function getRawRateHistory(fromDate, toDate) {
  return await Rate.find({
    createdAt: { $gte: new Date(fromDate), $lte: new Date(toDate) }
  }).sort({ createdAt: 1 });
}

/**
 * Trả về lịch sử tỷ giá theo cặp (base/quote)
 * @param {string} pair - Ví dụ: "USD_VND"
 */
async function getRateHistory(pair, fromDate, toDate) {
  const [from, to] = pair.split('_');
  const query = {
    createdAt: { $gte: new Date(fromDate), $lte: new Date(toDate) },
    [`rate.${from}`]: { $exists: true },
    [`rate.${to}`]: { $exists: true }
  };

  const history = await Rate.find(query).sort({ createdAt: 1 });

  return history.map(doc => ({
    timestamp: doc.createdAt,
    rate: doc.rate[to] / doc.rate[from],
    base: from,
    quote: to,
  }));
}

/**
 * Di chuyển dữ liệu trước cutoffDate sang bảng Archive
 * @param {String} cutoffDate - ISO format, ví dụ: "2025-07-01"
 */
async function archiveOldData(cutoffDate) {
  const date = new Date(cutoffDate);
  if (isNaN(date)) throw new Error('❌ Ngày cutoff không hợp lệ');

  const oldRates = await Rate.find({ createdAt: { $lt: date } });

  if (!oldRates.length) {
    console.log('📭 Không có dữ liệu cũ để lưu trữ.');
    return { archived: 0, message: 'Không có dữ liệu cũ để lưu trữ.' };
  }

  const archived = await ArchivedRate.insertMany(oldRates.map(r => ({
    rate: sanitizeRateData(r.rate),
    source: r.source,
    provider: r.provider,
    createdAt: r.createdAt
  })));

  await Rate.deleteMany({ createdAt: { $lt: date } });

  console.log(`📦 Đã lưu trữ ${archived.length} bản ghi`);
  return { archived: archived.length };
}

/**
 * Lấy các cặp tiền tệ phổ biến nhất dựa vào ConversionLog
 */
// async function getPopularCurrencyPairs() {
//   const results = await ConversionLog.aggregate([
//     {
//       $group: {
//         _id: { from: "$from", to: "$to" },
//         count: { $sum: 1 }
//       }
//     },
//     { $sort: { count: -1 } },
//     { $limit: 10 }
//   ]);
//   return results;
// }

module.exports = {
  saveRate,
  getRawRateHistory,
  getRateHistory,
  archiveOldData
};
