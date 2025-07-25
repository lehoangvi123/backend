// utils/checkRateLimits.js
const RateLimit = require('../models/RateLimit');

const LIMITS = {
  convert: 100,
  alert: 10,
};

async function checkRateLimits(userId, operation) {
  // 👇 Nếu không có userId, bỏ qua kiểm tra giới hạn
  if (!userId) return { allowed: true };

  const today = new Date().toISOString().slice(0, 10);
  const limit = LIMITS[operation] || 100;

  const record = await RateLimit.findOneAndUpdate(
    { userId, operation, date: today },
    { $inc: { count: 1 } },
    { upsert: true, new: true }
  );

  if (record.count > limit) {
    return { allowed: false, message: `Bạn đã vượt quá giới hạn ${limit} lần cho hoạt động "${operation}" hôm nay.` };
  }

  return { allowed: true };
}


module.exports = checkRateLimits;
