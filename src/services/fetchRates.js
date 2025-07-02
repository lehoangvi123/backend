const fetchRatesFromAvailableAPI = require('./fetchRatesFromAvailableAPI');
const aggregateRatesFromSources = require('../utils/aggregateRates');
const Rate = require('../models/rateModel')


let currentRates = {};
let currentProvider = null;

const fetchRates = async (io) => {
  try {
    const sources = await fetchRatesFromAvailableAPI('USD'); // Mảng nhiều kết quả

    if (sources.length > 0) { 
      const aggregated = aggregateRatesFromSources(sources);
      currentRates = aggregated;
      currentProvider = 'Aggregated from: ' + sources.map(s => s.provider).join(', ');

      console.log('✅ Aggregated rates from:', currentProvider); // 👈 Dòng log này sẽ xuất hiện
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

module.exports = {
  fetchRates,
  getCurrentRates,
  getCurrentProvider
};
