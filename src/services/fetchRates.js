const fetchRatesFromAvailableAPI = require('./fetchRatesFromAvailableAPI');
const aggregateRatesFromSources = require('../utils/aggregateRates');
const Rate = require('../models/rateModel');
const smoothRateFluctuations = require('../utils/smoothRateFluctuations');
const detectRateAnomalies = require('../utils/detectRateAnomalies');
const calculateTechnicalIndicators = require('../utils/calculateTechnicalIndicators');
const saveRateToDB = require('./saveRateToDB');
const generateMarketSummary = require('../utils/generateMarketSummary');

// 🔄 Biến toàn cục
let currentRates = {};
let currentProvider = null;
let currentSources = [];
let currentOriginalRates = {}; // giữ tỷ giá gốc để so sánh
let currentIndicators = {};
let currentMarketSummary = {};

// ✅ Hàm chính để fetch và xử lý tỷ giá
const fetchRates = async (io) => {
  try {
    const sources = await fetchRatesFromAvailableAPI('USD');
    currentSources = sources;

    if (sources.length === 0) {
      console.error('❌ Không thể cập nhật tỷ giá từ bất kỳ API nào');
      return;
    }

    // 1. Tổng hợp
    const aggregated = aggregateRatesFromSources(sources);

    // 2. Phát hiện bất thường
    const anomalies = detectRateAnomalies(aggregated, currentOriginalRates, 0.1);
    if (anomalies.hasAnomaly && io) {
      console.warn('⚠️ Có tỷ giá bất thường:', anomalies.anomalies);
      io.emit('rateAnomalies', anomalies.anomalies);
    }

    // 3. Chỉ số kỹ thuật
    const history = await Rate.find().sort({ createdAt: -1 }).limit(20);
    const indicators = {};
    for (const currency of Object.keys(aggregated)) {
      const historyArray = history
        .map(h => ({ currency, value: h.rate[currency] }))
        .filter(v => v.value != null);
      indicators[currency] = calculateTechnicalIndicators(historyArray, currency);
    }
    currentIndicators = indicators;

    // 4. Làm mượt dao động
    const smoothed = smoothRateFluctuations(aggregated, currentRates, 0.2);
    currentRates = smoothed;

    // 5. Lưu vào DB
    await saveRateToDB(currentRates);

    // 6. Tạo tóm tắt thị trường 📊
    const marketSummary = generateMarketSummary(currentRates, currentOriginalRates);
    currentMarketSummary = marketSummary;

    // 🛑 Sau khi đã dùng xong originalRates mới cập nhật
    currentOriginalRates = aggregated;

    // 7. Ghi nhận nguồn dữ liệu
    currentProvider = 'Aggregated from: ' + sources.map(s => s.provider).join(', ');
    console.log('✅ Tổng hợp tỷ giá từ:', currentProvider);
    console.log('📘 Market Summary:', currentMarketSummary);

    // 8. Emit về client
    if (io) {
      io.emit('rateUpdate', currentRates);
      io.emit('marketSummary', currentMarketSummary);
    }

  } catch (err) {
    console.error('❌ Lỗi không xác định trong fetchRates:', err.message);
  }
};

// ✅ Getters
const getCurrentRates = () => currentRates;
const getCurrentOriginalRates = () => currentOriginalRates;
const getCurrentProvider = () => currentProvider;
const getCurrentSources = () => currentSources;
const getCurrentIndicators = () => currentIndicators;
const getCurrentMarketSummary = () => currentMarketSummary;

// ✅ Export
module.exports = {
  fetchRates,
  getCurrentRates,
  getCurrentOriginalRates,
  getCurrentProvider,
  getCurrentSources,
  getCurrentIndicators,
  getCurrentMarketSummary
};
