const Alert = require('../models/Alert');

exports.createRateAlert = async (req, res) => {
  try {
    const { userId, from, to, targetRate, direction } = req.body;

    if (!userId || !from || !to || !targetRate || !direction) {
      return res.status(400).json({ success: false, message: "Thiếu thông tin cảnh báo." });
    }

    const newAlert = new Alert({ userId, from, to, targetRate, direction });
    await newAlert.save();

    res.json({ success: true, message: "Đã tạo cảnh báo thành công", alert: newAlert });
  } catch (error) {
    console.error("❌ Lỗi khi tạo cảnh báo:", error.message);
    res.status(500).json({ success: false, message: "Lỗi server" });
  }
};
