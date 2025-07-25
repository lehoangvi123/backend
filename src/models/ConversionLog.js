const mongoose = require('mongoose');

const conversionLogSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: false }, // có thể không cần đăng nhập
  from: { type: String, required: true },
  to: { type: String, required: true },
  amount: { type: Number, required: true },
  result: { type: Number, required: true },
  rate: { type: Number, required: true },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('ConversionLog', conversionLogSchema);
