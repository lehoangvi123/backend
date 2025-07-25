const Rate = require('../models/rateModel');

async function saveRateToDB(rates) {
  try {
    const newRate = new Rate({ rate: rates });
    await newRate.save();
    console.log('✅ Đã lưu tỷ giá vào MongoDB');
  } catch (err) {
    console.error('❌ Lỗi khi lưu tỷ giá:', err.message);
  }
}

module.exports = saveRateToDB;
