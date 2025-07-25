// models/rateModel.js
const mongoose = require('mongoose');

const rateSchema = new mongoose.Schema({
  rate: {
    type: Object,
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Rate', rateSchema);
