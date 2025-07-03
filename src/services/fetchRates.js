const fetchRatesFromAvailableAPI = require('./fetchRatesFromAvailableAPI');
const aggregateRatesFromSources = require('../utils/aggregateRates');
const Rate = require('../models/rateModel');
const smoothRateFluctuations = require('../utils/smoothRateFluctuations')


let currentRates = {};
let currentProvider = null;
let currentSources = []; 
let currentOriginalRates = {}; 

const fetchRates = async (io) => {
  try {
    const sources = await fetchRatesFromAvailableAPI('USD');
    currentSources = sources;

    if (sources.length > 0) {
      const aggregated = aggregateRatesFromSources(sources);
      currentRates = aggregated;  
        currentOriginalRates = aggregated;

         // 👇 Làm mượt dao động
      const smoothed = smoothRateFluctuations(aggregated, currentRates, 0.2);
      currentRates = smoothed; 

      

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
const getCurrentOriginalRates = () => currentOriginalRates
const getCurrentProvider = () => currentProvider;
const getCurrentSources = () => currentSources;

module.exports = {
  fetchRates,
  getCurrentRates, 
    getCurrentOriginalRates,
  getCurrentProvider,
  getCurrentSources
};

