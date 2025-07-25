const mongoose = require('mongoose');

const alertSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  from: { type: String, required: true },
  to: { type: String, required: true },
  targetRate: { type: Number, required: true },
  direction: { type: String, enum: ['above', 'below'], required: true }, // trên hay dưới mức
  createdAt: { type: Date, default: Date.now },
  triggered: { type: Boolean, default: false }
});

module.exports = mongoose.model('Alert', alertSchema);
