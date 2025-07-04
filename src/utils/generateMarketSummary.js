// 📁 utils/generateMarketSummary.js
function generateMarketSummary(currentRates, originalRates) {
  const changes = [];

  for (const currency in currentRates) {
    const current = currentRates[currency];
    const original = originalRates[currency];

    if (typeof current === 'number' && typeof original === 'number' && original !== 0) {
      const change = ((current - original) / original) * 100;
      changes.push({ currency, changePercent: change });
    }
  }

  if (changes.length === 0) return null;

  const topGainer = changes.reduce((max, c) => c.changePercent > max.changePercent ? c : max, changes[0]);
  const topLoser = changes.reduce((min, c) => c.changePercent < min.changePercent ? c : min, changes[0]);

  const avgChange = changes.reduce((sum, c) => sum + Math.abs(c.changePercent), 0) / changes.length;

  return {
    topGainer,
    topLoser,
    avgChange: avgChange.toFixed(2),
    sentiment:
      avgChange < 0.5 ? 'Ổn định' :
      avgChange < 1.5 ? 'Biến động nhẹ' :
      avgChange < 3 ? 'Biến động' : 'Biến động mạnh'
  };
}

module.exports = generateMarketSummary;
