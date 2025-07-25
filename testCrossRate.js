const calculateCrossRate = require('./src/utils/crossRate');

const rates = {
  USD: 1,
  EUR: 0.85,
  JPY: 110,
  VND: 24000
};

try {
  const rate = calculateCrossRate('EUR', 'JPY', 'USD', rates);
  console.log(`EUR/JPY ≈ ${rate}`);
} catch (err) {
  console.error(err.message);
}


