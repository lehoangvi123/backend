const mongoose = require('mongoose');

const archivedRateSchema = new mongoose.Schema({
  rate: {
    type: Map,
    of: Number,
    required: true,
  },
  source: String,
  provider: String,
  createdAt: {
    type: Date,
    default: Date.now,
  }
});

module.exports = mongoose.model('ArchivedRate', archivedRateSchema);
