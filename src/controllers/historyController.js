// controllers/historyController.js
const Rate = require('../models/rateModel');

exports.getHistoryByPeriod = async (req, res) => {
  const { period } = req.params;

  // Tính thời gian bắt đầu tương ứng với period
  let startTime = new Date();
  if (period === '24h') {
    startTime.setHours(startTime.getHours() - 24);
  } else if (period === '7d') {
    startTime.setDate(startTime.getDate() - 7);
  } else if (period === '30d') {
    startTime.setDate(startTime.getDate() - 30);
  } else {
    return res.status(400).json({ success: false, message: 'Invalid period. Use 24h, 7d, or 30d' });
  }

  try {
    const history = await Rate.find({ timestamp: { $gte: startTime } })
      .sort({ timestamp: 1 })
      .limit(1000);

    const grouped = {};

    history.forEach((entry) => {
      Object.entries(entry.rates).forEach(([pair, rate]) => {
        if (!grouped[pair]) grouped[pair] = [];
        grouped[pair].push({ timestamp: entry.timestamp, rate });
      });
    });

    res.json({ success: true, period, data: grouped });
  } catch (error) {
    console.error('❌ Lỗi khi lấy dữ liệu lịch sử:', error);
    res.status(500).json({ success: false, message: 'Server error while fetching history' });
  }
};
