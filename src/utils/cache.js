// utils/cache.js

const cache = new Map();

function cacheRate(key, value, ttl = 60 * 60 * 1000) {
  const expiresAt = Date.now() + ttl;
  cache.set(key, { value, expiresAt });
}

function getCachedRate(key) {
  const cached = cache.get(key);
  if (!cached) return null;
  if (Date.now() > cached.expiresAt) {
    cache.delete(key);
    return null;
  }
  return cached.value;
}

// ✅ Hàm mới: Invalidate cache theo cặp tiền
function invalidateRateCache(key) {
  cache.delete(key);
} 

// 🆕 Warm up function
const warmupCache = (pairs, getRatesFn) => {
  const rates = getRatesFn();
  for (const pair of pairs) {
    const [from, to] = pair.split('_');
    const fromRate = rates[from];
    const toRate = rates[to];
    if (fromRate && toRate) {
      const rate = toRate / fromRate;
      cacheRate(pair, rate);
      console.log(`🔥 Warmed up ${pair} = ${rate}`);
    } else {
      console.warn(`⚠️ Không thể warmup ${pair} do thiếu dữ liệu`);
    }
  }
};

module.exports = {
  cacheRate,
  getCachedRate,
  invalidateRateCache, 
  warmupCache
};
