require('dotenv').config(); // để sử dụng biến .env nếu cần

const fetchRates = require('./src/services/fetchRatesFromAvailableAPI');

(async () => {
  const result = await fetchRates('USD'); // hoặc 'EUR', 'VND'
  if (result) {
    console.log(`💡 Provider sử dụng: ${result.provider}`);
    console.log(result.rates);
  } else {
    console.log('Không thể lấy dữ liệu từ bất kỳ API nào');
  }
})();

