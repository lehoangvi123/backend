const redis = require('redis');
const client = redis.createClient({ url: process.env.REDIS_URL });

client.on('error', (err) => console.log('Redis Client Error', err));
client.connect();

async function cacheRate(key, value) {
  await client.set(key, JSON.stringify(value), { EX: 60 });
}

async function getCachedRate(key) {
  const data = await client.get(key);
  return data ? JSON.parse(data) : null;
}

module.exports = { cacheRate, getCachedRate };
