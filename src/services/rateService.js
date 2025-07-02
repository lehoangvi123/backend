const Rate = require('../models/Rate');

exports.getRateHistory = async (fromDate, toDate) => {
  return await Rate.find({ createdAt: { $gte: new Date(fromDate), $lte: new Date(toDate) } })
    .sort({ createdAt: 1 });
};  

exports.archiveOldData = async (cutoffDate) => {
  const result = await Rate.deleteMany({ createdAt: { $lt: new Date(cutoffDate) } });
  console.log(`[📦] Archived ${result.deletedCount} old records.`);
}; 

exports.getPopularCurrencyPairs = async () => {
  const ConversionLog = require('../models/ConversionLog');
  const results = await ConversionLog.aggregate([
    {
      $group: {
        _id: { from: "$from", to: "$to" },
        count: { $sum: 1 }
      }
    },
    { $sort: { count: -1 } },
    { $limit: 10 }
  ]);

  return results;
};
