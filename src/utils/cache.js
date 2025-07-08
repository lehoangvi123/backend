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

function getCacheStatistics() {
  const now = Date.now();
  let total = 0, expired = 0, active = 0;
  const entries = [];

  for (const [key, { value: rate, expiresAt }] of cache.entries()) {
    total++;
    const isExpired = expiresAt < now;
    if (isExpired) expired++;
    else active++;

    entries.push({
      currencyPair: key,
      rate,
      expiry: new Date(expiresAt).toISOString(),
      status: isExpired ? 'expired' : 'active'
    });
  }

  return {
    total,
    active,
    expired,
    entries
  };
} 

function optimizeCacheMemory() {
  const now = Date.now();
  let removed = 0;

  for (const [key, { expiresAt }] of cache.entries()) {
    if (expiresAt < now) {
      cache.delete(key);
      removed++;
    }
  }

  console.log(`🧹 Đã xoá ${removed} cache hết hạn`);
  return removed;
} 

function clearExpiredCache() {
  const now = Date.now();
  let removed = 0;

  for (const [key, entry] of cache.entries()) {
    if (entry.expiresAt < now) {
      cache.delete(key);
      removed++;
    }
  }

  return removed;
}


module.exports = {
  cacheRate,
  getCachedRate,
  invalidateRateCache, 
  warmupCache, 
  getCacheStatistics, 
  optimizeCacheMemory, 
  clearExpiredCache // 👈 Thêm export
};
