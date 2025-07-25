const aggregateRatesFromSources = require('./src/utils/aggregateRates');

const result = aggregateRatesFromSources([
  {
    provider: 'ExchangeRate API',
    rates: { USD: 1, EUR: 0.91, JPY: 144.2 }
  },
  {
    provider: 'Frankfurter API',
    rates: { USD: 1, EUR: 0.905, JPY: 144.5 }
  }
]);

console.log(result);
// Output: { USD: 1, EUR: 0.9075, JPY: 144.35 }
