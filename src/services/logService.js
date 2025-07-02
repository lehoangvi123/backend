const ConversionLog = require('../models/ConversionLog');

exports.logConversion = async ({ from, to, amount, result }) => {
  try {
    const log = new ConversionLog({ from, to, amount, result });
    await log.save();
  } catch (err) {
    console.error('❌ Log conversion error:', err);
  }
};
