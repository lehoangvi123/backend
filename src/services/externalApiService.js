const axios = require('axios');

async function fetchRatesFromProvider(providerUrl) {
  try {
    const res = await axios.get(providerUrl);
    return res.data;
  } catch (err) {
    console.error('❌ fetchRatesFromProvider error', err);
    throw err;
  }
}

module.exports = { fetchRatesFromProvider };





