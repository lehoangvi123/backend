function aggregateRatesFromSources(sources) {
  const merged = {};
  const count = {};

  sources.forEach(source => {
    const rates = source.rates;
    Object.keys(rates).forEach(currency => {
      if (!merged[currency]) {
        merged[currency] = 0;
        count[currency] = 0;
      }
      merged[currency] += rates[currency];
      count[currency] += 1;
    });
  });

  // Tính trung bình cộng
  Object.keys(merged).forEach(currency => {
    merged[currency] = merged[currency] / count[currency];
  });

  return merged;
}

module.exports = aggregateRatesFromSources;
