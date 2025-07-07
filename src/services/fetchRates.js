const fetchRatesFromAvailableAPI = require('./fetchRatesFromAvailableAPI');
const aggregateRatesFromSources = require('../utils/aggregateRates');
const Rate = require('../models/rateModel');
const smoothRateFluctuations = require('../utils/smoothRateFluctuations');
const detectRateAnomalies = require('../utils/detectRateAnomalies');
const calculateTechnicalIndicators = require('../utils/calculateTechnicalIndicators');
const saveRateToDB = require('./saveRateToDB');
const generateMarketSummary = require('../utils/generateMarketSummary');

let currentRates = {};
let currentProvider = null;
let currentSources = [];
let currentOriginalRates = {};
let currentIndicators = {};
let currentMarketSummary = {};

const fetchRates = async (io) => {
  try {
    const sources = await fetchRatesFromAvailableAPI('USD');
    currentSources = sources;

    if (sources.length === 0) {
      console.error('❌ Không thể cập nhật tỷ giá từ bất kỳ API nào');
      return;
    }

    const aggregated = aggregateRatesFromSources(sources);
    const anomalies = detectRateAnomalies(aggregated, currentOriginalRates, 0.1);
    if (anomalies.hasAnomaly && io) {
      console.warn('⚠️ Tỷ giá bất thường:', anomalies.anomalies);
      io.emit('rateAnomalies', anomalies.anomalies);
    }

    const history = await Rate.find().sort({ createdAt: -1 }).limit(20);
    const indicators = {};
    for (const currency of Object.keys(aggregated)) {
      const historyArray = history
        .map(h => ({ currency, value: h.rate[currency] }))
        .filter(v => v.value != null);
      indicators[currency] = calculateTechnicalIndicators(historyArray, currency);
    }
    currentIndicators = indicators;

    const smoothed = smoothRateFluctuations(aggregated, currentRates, 0.2);
    currentRates = smoothed;

    await saveRateToDB(currentRates);

    const marketSummary = generateMarketSummary(currentRates, currentOriginalRates);
    currentMarketSummary = marketSummary;
    currentOriginalRates = aggregated;
    currentProvider = 'Aggregated from: ' + sources.map(s => s.provider).join(', ');

    console.log('✅ Tổng hợp tỷ giá từ:', currentProvider);

    if (io) {
      io.emit('rateUpdate', currentRates);
      io.emit('marketSummary', currentMarketSummary);
    }
  } catch (err) {
    console.error('❌ Lỗi trong fetchRates:', err.message);
  }
};

const getCurrentRates = () => currentRates;
const getCurrentOriginalRates = () => currentOriginalRates;
const getCurrentProvider = () => currentProvider;
const getCurrentSources = () => currentSources;
const getCurrentIndicators = () => currentIndicators;
const getCurrentMarketSummary = () => currentMarketSummary;

module.exports = {
  fetchRates,
  getCurrentRates,
  getCurrentOriginalRates,
  getCurrentProvider,
  getCurrentSources,
  getCurrentIndicators,
  getCurrentMarketSummary
};
