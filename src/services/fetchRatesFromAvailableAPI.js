const axios = require('axios');
const apis = require('./externalApiService');

async function fetchRatesFromAvailableAPI(base = 'USD') {
  const results = [];

  for (const api of apis) {
    const url = api.url(base);
    if (!url) continue;

    try {
      const response = await axios.get(url);
      if (api.checkSuccess(response)) {
        console.log(`✅ Thành công với ${api.name}`);
        results.push({
          provider: api.name,
          rates: api.extract(response)
        });
      } else {
        console.warn(`⚠️ ${api.name} trả về dữ liệu không hợp lệ`);
      }
    } catch (err) {
      console.warn(`❌ Lỗi từ ${api.name}:`, err.message);
    }
  }

  return results;
}

module.exports = fetchRatesFromAvailableAPI;