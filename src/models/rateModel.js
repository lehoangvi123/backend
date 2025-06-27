const mongoose = require('mongoose');

const rateSchema = new mongoose.Schema({
  pair: String,
  rate: Object,
  timestamp: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Rate', rateSchema);
