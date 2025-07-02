const axios = require('axios');
const apis = require('./externalApiService');

async function checkAPIHealth(base = 'USD') {
  console.log(`🔍 Đang kiểm tra sức khỏe API với base: ${base}\n`);

  for (const api of apis) {
    const url = api.url(base);

    if (!url) {
      console.log(`⚠️ ${api.name}: ❌ Không hỗ trợ base ${base}`);
      continue;
    }

    try {
      const res = await axios.get(url, { timeout: 5000 });

      if (api.checkSuccess(res)) {
        console.log(`✅ ${api.name}: Hoạt động tốt`);
      } else {
        console.log(`❌ ${api.name}: Trả về dữ liệu không hợp lệ`);
      }

    } catch (err) {
      console.log(`🚫 ${api.name}: Không thể kết nối (${err.message})`);
    }
  }
}

module.exports = checkAPIHealth;
