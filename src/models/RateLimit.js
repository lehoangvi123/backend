// models/RateLimit.js
const mongoose = require('mongoose');

const rateLimitSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  operation: { type: String, required: true }, // e.g., 'convert'
  date: { type: String, required: true },       // YYYY-MM-DD
  count: { type: Number, default: 0 }
});

rateLimitSchema.index({ userId: 1, operation: 1, date: 1 }, { unique: true });

module.exports = mongoose.model('RateLimit', rateLimitSchema);
