const fetchRatesFromAvailableAPI = require('./fetchRatesFromAvailableAPI');
const aggregateRatesFromSources = require('../utils/aggregateRates');
const Rate = require('../models/rateModel');
const smoothRateFluctuations = require('../utils/smoothRateFluctuations');
const detectRateAnomalies = require('../utils/detectRateAnomalies');
const calculateTechnicalIndicators = require('../utils/calculateTechnicalIndicators');

let currentRates = {};
let currentProvider = null;
let currentSources = [];
let currentOriginalRates = {}; 
let currentIndicators = {};  

const fetchRates = async (io) => {
  try {
    const sources = await fetchRatesFromAvailableAPI('USD');
    currentSources = sources;

    if (sources.length > 0) {
      const aggregated = aggregateRatesFromSources(sources);

      // Kiểm tra bất thường
      const anomaliesResult = detectRateAnomalies(aggregated, currentOriginalRates, 0.1);
      if (anomaliesResult.hasAnomaly) {
        console.warn('⚠️ Có tỷ giá bất thường:', anomaliesResult.anomalies);
        if (io) io.emit('rateAnomalies', anomaliesResult.anomalies);
      } 

      // Tính toán chỉ số kỹ thuật cho mỗi loại tiền tệ
      const history = await Rate.find().sort({ createdAt: -1 }).limit(20);
      const indicators = {};
      for (const currency of Object.keys(aggregated)) {
        const historyArray = history
          .map(h => ({ currency, value: h.rate[currency] }))
          .filter(v => v.value != null);
        indicators[currency] = calculateTechnicalIndicators(historyArray, currency);
      }
      currentIndicators = indicators;

      // Lưu bản gốc và làm mượt
      currentOriginalRates = aggregated;
      const smoothed = smoothRateFluctuations(aggregated, currentRates, 0.2);
      currentRates = smoothed;

      currentProvider = 'Aggregated from: ' + sources.map(s => s.provider).join(', ');

      console.log('✅ Tổng hợp tỷ giá từ:', currentProvider);
      if (io) io.emit('rateUpdate', currentRates);
    } else {
      console.error('❌ Không thể cập nhật tỷ giá từ bất kỳ API nào');
    }
  } catch (err) {
    console.error('❌ Lỗi không xác định trong fetchRates:', err.message);
  }
};

const getCurrentRates = () => currentRates;
const getCurrentOriginalRates = () => currentOriginalRates;
const getCurrentProvider = () => currentProvider;
const getCurrentSources = () => currentSources;
const getCurrentIndicators = () => currentIndicators;

module.exports = {
  fetchRates,
  getCurrentRates,
  getCurrentOriginalRates,
  getCurrentProvider,
  getCurrentSources,  
  getCurrentIndicators
};
