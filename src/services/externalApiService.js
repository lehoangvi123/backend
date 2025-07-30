// const { getCurrentKey } = require('./keyManager');

const apis = [
  // {
  //   name: 'ExchangeRate API',
  //   url: (base) => `https://api.exchangerate-api.com/v4/latest/USD`,
  //   extract: (res) => res.data.conversion_rates,
  //   checkSuccess: (res) => res.data?.result === 'success'
  // },
  // {
  //   name: 'Open ER API',
  //   url: (base) => {
  //     if (base !== 'USD') return null; // Chỉ hỗ trợ base = USD trong gói free
  //     return `https://openexchangerates.org/api/latest.json?app_id=${process.env.OPEN_ER_API_KEY}`;
  //   },
  //   extract: (res) => res.data.rates,
  //   checkSuccess: (res) => !!res.data?.rates 
  // }, 
  {
    name: 'ExchangeAPI',
    url: (base) => `https://api.exchangerate-api.com/v4/latest/USD`,
    extract: (res) => res.data.rates,
    checkSuccess: (res) => !!res.data?.rates
  } 
];

module.exports = apis;



