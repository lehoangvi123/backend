function convertBaseRate(rates, targetBase) {
  if (!rates[targetBase]) {
    throw new Error(`Target base ${targetBase} not found in rates`);
  }

  const baseRate = rates[targetBase];
  const convertedRates = {};

  for (const [currency, rate] of Object.entries(rates)) {
    convertedRates[currency] = rate / baseRate;
  }

  convertedRates[targetBase] = 1.0; // Base to itself is 1

  return convertedRates;
}


module.exports = { convertBaseRate };
