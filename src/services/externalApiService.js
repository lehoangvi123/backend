// const { getCurrentKey } = require('./keyManager');

const apis = [
  {
    name: 'ExchangeRate API',
    url: (base) => `https://v6.exchangerate-api.com/v6/${process.env.EXCHANGE_API_KEY}/latest/${base}`,
    extract: (res) => res.data.conversion_rates,
    checkSuccess: (res) => res.data?.result === 'success'
  },
  {
    name: 'Open ER API',
    url: (base) => {
      if (base !== 'USD') return null; // Chỉ hỗ trợ base = USD trong gói free
      return `https://openexchangerates.org/api/latest.json?app_id=${process.env.OPEN_ER_API_KEY}`;
    },
    extract: (res) => res.data.rates,
    checkSuccess: (res) => !!res.data?.rates 
  },
  {
    name: 'Frankfurter API',
    url: (base) => `https://api.frankfurter.app/latest?from=${base}`,
    extract: (res) => res.data.rates,
    checkSuccess: (res) => !!res.data?.rates
  }
];

module.exports = apis;
