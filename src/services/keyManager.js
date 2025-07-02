// load bbiến môi trường 
require('dotenv').config();

const exchangeKeys = process.env.EXCHANGE_API_KEYS.split(',');
const openErKeys = process.env.OPEN_ER_API_KEYS.split(',');

let currentKeyIndex = {
  'ExchangeRate API': 0,
  'Open ER API': 0
};

function getCurrentKey(provider) {
  if (provider === 'ExchangeRate API') {
    return exchangeKeys[currentKeyIndex[provider]];
  }
  if (provider === 'Open ER API') {
    return openErKeys[currentKeyIndex[provider]];
  }
  return null;
}

function rotateAPIKey(provider) {
  if (provider === 'ExchangeRate API') {
    currentKeyIndex[provider] = (currentKeyIndex[provider] + 1) % exchangeKeys.length;
  }
  if (provider === 'Open ER API') {
    currentKeyIndex[provider] = (currentKeyIndex[provider] + 1) % openErKeys.length;
  }
  console.warn(`🔁 Đã xoay API key cho ${provider}`);
}

module.exports = {
  getCurrentKey,
  rotateAPIKey
};
