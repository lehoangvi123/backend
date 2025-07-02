// models/Rate.js
const mongoose = require('mongoose');

const rateSchema = new mongoose.Schema({
  base: { type: String, default: 'USD' },
  rate: { type: mongoose.Schema.Types.Mixed }, // key-value các tỷ giá
}, {
  timestamps: true // ✅ Tự động sinh createdAt, updatedAt
});

module.exports = mongoose.model('Rate', rateSchema);
