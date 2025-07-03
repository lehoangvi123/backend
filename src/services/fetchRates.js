const fetchRatesFromAvailableAPI = require('./fetchRatesFromAvailableAPI');
const aggregateRatesFromSources = require('../utils/aggregateRates');
const Rate = require('../models/rateModel');

let currentRates = {};
let currentProvider = null;
let currentSources = [];

const fetchRates = async (io) => {
  try {
    const sources = await fetchRatesFromAvailableAPI('USD');
    currentSources = sources;

    if (sources.length > 0) {
      const aggregated = aggregateRatesFromSources(sources);
      currentRates = aggregated;
      currentProvider = 'Aggregated from: ' + sources.map(s => s.provider).join(', ');

      console.log('✅ Aggregated rates from:', currentProvider);
      if (io) io.emit('rateUpdate', currentRates);
    } else {
      console.error('❌ Không thể cập nhật tỷ giá từ bất kỳ API nào');
    }
  } catch (err) {
    console.error('❌ Lỗi không xác định trong fetchRates:', err.message);
  }
};

const getCurrentRates = () => currentRates;
const getCurrentProvider = () => currentProvider;
const getCurrentSources = () => currentSources;

module.exports = {
  fetchRates,
  getCurrentRates,
  getCurrentProvider,
  getCurrentSources
};

