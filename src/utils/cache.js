// 📁 utils/cache.js

const cache = new Map();

function cacheRate(key, value, ttl) {
  const expiresAt = Date.now() + ttl;
  cache.set(key, { value, expiresAt });

  setTimeout(() => {
    const entry = cache.get(key);
    if (entry && entry.expiresAt <= Date.now()) {
      cache.delete(key);
    }
  }, ttl);
}

function getCachedRate(key) {
  const entry = cache.get(key);
  if (!entry) return null;

  if (Date.now() > entry.expiresAt) {
    cache.delete(key);
    return null;
  }

  return entry.value;
}

module.exports = { cacheRate, getCachedRate };
