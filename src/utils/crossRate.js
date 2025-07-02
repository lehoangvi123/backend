// src/utils/crossRate.js
function calculateCrossRate(base, quote, via, rates) {
  if (!rates[base] || !rates[quote] || !rates[via]) {
    throw new Error('❌ One or more currency rates are missing');
  }

  const baseToVia = rates[base] / rates[via];
  const quoteToVia = rates[quote] / rates[via];
  const crossRate = baseToVia / quoteToVia;

  return Number(crossRate.toFixed(6)); // làm tròn 6 chữ số
}

module.exports = calculateCrossRate;
