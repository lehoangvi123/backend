const conversionLogSchema = new mongoose.Schema({
  from: String,
  to: String,
  amount: Number,
  result: Number,
  timestamp: { type: Date, default: Date.now }
});

module.exports = mongoose.model('ConversionLog', conversionLogSchema);
