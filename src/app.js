const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const connectDB = require('./config/db');
const {
  cacheRate,
  getCachedRate,
  invalidateRateCache,
  warmupCache,
  getCacheStatistics,
  optimizeCacheMemory,
  clearExpiredCache
} = require('./utils/cache');
const historyRoutes = require('./routes/historyRoutes');
const userRoutes = require('./routes/userRoutes');
const { processHistoricalData } = require('./services/processHistoricalData');
const { saveRate, archiveOldData } = require('./services/rateService');
const { logConversion } = require('./services/conversionService');
const Rate = require('./models/rateModel');
const calculateTechnicalIndicators = require('./utils/calculateTechnicalIndicators');
const {
  fetchRates,
  getCurrentRates,
  getCurrentOriginalRates,
  getCurrentProvider,
  getCurrentSources,
  getCurrentIndicators,
  getCurrentMarketSummary
} = require('./services/fetchRates');
const validateBusinessRules = require('./utils/validateBusinessRules');
const checkRateLimits = require('./utils/checkRateLimits');

const popularPairsRoute = require('./routes/popularPairRoutes');
const alertRoutes = require('./routes/alertRoutes');
const trendRoutes = require('./routes/trendRoutes');
const profileRoutes = require('./routes/profile');
const feedbackRoutes = require('./routes/feedback');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: { origin: '*', methods: ['GET', 'POST'] }
});

// Connect to MongoDB
connectDB();

app.use(cors());
app.use(express.json());

// Routes
app.use('/api/history', historyRoutes);
app.use('/api/users', userRoutes);
app.use('/api/rates', popularPairsRoute);
app.use('/api', alertRoutes);
app.use('/api/rates/trend', trendRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/feedback', feedbackRoutes);

// WebSocket
io.on('connection', (socket) => {
  console.log('⚡ Client connected:', socket.id);
  const rates = getCurrentRates();
  if (Object.keys(rates).length) {
    socket.emit('rateUpdate', rates);
  }

  socket.on('subscribeToPair', (pairCode) => {
    console.log(`${socket.id} subscribed to ${pairCode}`);
    socket.join(pairCode);
  });

  socket.on('unsubscribeFromPair', (pairCode) => {
    socket.leave(pairCode);
  });

  socket.on('disconnect', () => {
    console.log('❌ Client disconnected:', socket.id);
  });
});

// API Endpoints
app.get('/api/rates/current', (req, res) => {
  const rates = getCurrentRates();
  const original = getCurrentOriginalRates();
  const provider = getCurrentProvider();
  if (!Object.keys(rates).length) {
    return res.status(404).json({ success: false, message: 'No current rates available' });
  }
  res.json({ success: true, rates, original, provider });
});

app.get('/api/rates/sources', (req, res) => {
  const sources = getCurrentSources();
  if (!sources.length) {
    return res.status(404).json({ success: false, message: 'No source data available' });
  }
  res.json({ success: true, sources });
});

app.post('/api/rates/convert', async (req, res) => {
  const { from, to, amount, userId } = req.body;

  const validation = validateBusinessRules({ type: 'convert', from, to, amount });
  if (!validation.valid) {
    return res.status(400).json({ success: false, message: validation.message });
  }

  const limitCheck = await checkRateLimits(userId, 'convert');
  if (!limitCheck.allowed) {
    return res.status(429).json({ success: false, message: limitCheck.message });
  }

  const cacheKey = `${from}_${to}`;
  const cachedRate = getCachedRate(cacheKey);
  if (cachedRate !== null) {
    const result = (amount * cachedRate).toFixed(6);
    await logConversion({ from, to, amount, result, rate: cachedRate, userId });
    return res.json({ from, to, amount, result, cached: true });
  }

  const rates = getCurrentRates();
  const fromRate = rates[from];
  const toRate = rates[to];
  if (!fromRate || !toRate || isNaN(amount)) {
    return res.status(400).json({ error: 'Invalid input' });
  }

  const rate = toRate / fromRate;
  cacheRate(cacheKey, rate);
  const result = (amount * rate).toFixed(6);
  await logConversion({ from, to, amount, result, rate, userId });
  res.json({ from, to, amount, result, cached: false });
});

app.post('/api/rates/convert-cross', (req, res) => {
  const { from, to, via, amount } = req.body;
  const rates = getCurrentRates();
  const fromRate = rates[from];
  const toRate = rates[to];
  const viaRate = rates[via];
  if (!fromRate || !toRate || !viaRate || isNaN(amount)) {
    return res.status(400).json({ error: 'Invalid currency code or amount' });
  }
  const crossRate = fromRate / toRate;
  const result = amount * crossRate;
  res.json({ from, to, via, amount, rate: crossRate, result });
});

app.post('/api/rates/cache/invalidate', (req, res) => {
  const { from, to } = req.body;
  if (!from || !to) return res.status(400).json({ success: false, message: 'Missing currency pair' });
  invalidateRateCache(`${from}_${to}`);
  res.json({ success: true, message: `Cache invalidated for ${from}_${to}` });
});

app.post('/api/rates/cache/warmup', (req, res) => {
  const { pairs } = req.body;
  if (!Array.isArray(pairs)) return res.status(400).json({ success: false, message: 'pairs must be an array' });
  warmupCache(pairs, getCurrentRates);
  res.json({ success: true, warmedUp: pairs });
});

app.post('/api/rates/cache/optimize', (req, res) => {
  const removed = optimizeCacheMemory();
  res.json({ success: true, removed });
});

app.post('/api/rates/cache/clear-expired', (req, res) => {
  const removedCount = clearExpiredCache();
  res.json({ success: true, removed: removedCount });
});

app.post('/api/rates/save', async (req, res) => {
  const currencyRate = req.body;
  if (!currencyRate || typeof currencyRate !== 'object') {
    return res.status(400).json({ success: false, message: 'Invalid rate data' });
  }
  try {
    await saveRate(currencyRate);
    res.json({ success: true, message: 'Tỷ giá đã được lưu thành công' });
  } catch (err) {
    console.error('❌ Lỗi khi lưu tỷ giá:', err.message);
    res.status(500).json({ success: false, message: 'Lỗi khi lưu tỷ giá' });
  }
});

app.post('/api/rates/archive', async (req, res) => {
  const { cutoffDate } = req.body;
  if (!cutoffDate) return res.status(400).json({ success: false, message: 'cutoffDate là bắt buộc' });
  try {
    const result = await archiveOldData(cutoffDate);
    res.json({ success: true, ...result });
  } catch (err) {
    console.error('❌ Lỗi khi lưu trữ dữ liệu:', err.message);
    res.status(500).json({ success: false, message: err.message });
  }
});

app.get('/api/rates/cache/stats', (req, res) => {
  const stats = getCacheStatistics();
  res.json({ success: true, stats });
});

app.get('/api/rates/indicators/:currency', async (req, res) => {
  try {
    const currency = req.params.currency.toUpperCase();
    const history = await Rate.find().sort({ createdAt: -1 }).limit(20);
    const historyArray = history
      .map(h => ({ currency, value: h.rate[currency] }))
      .filter(v => v.value != null);
    if (!historyArray.length) {
      return res.status(404).json({ success: false, message: 'No valid history for this currency' });
    }
    const indicators = calculateTechnicalIndicators(historyArray, currency);
    res.json({ success: true, currency, indicators });
  } catch (error) {
    console.error('❌ Error calculating indicators:', error.message);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

app.get('/api/rates/indicators', (req, res) => {
  const indicators = getCurrentIndicators();
  if (!Object.keys(indicators).length) {
    return res.status(404).json({ success: false, message: 'No indicators available' });
  }
  res.json({ success: true, indicators });
});

app.get('/api/rates/summary', (req, res) => {
  const summary = getCurrentMarketSummary();
  if (!summary || Object.keys(summary).length === 0) {
    return res.status(404).json({ success: false, message: 'No market summary available' });
  }
  res.json({ success: true, summary });
});

// Initialize system
fetchRates(io).then(() => {
  warmupCache(['AUD_RON', 'AUD_BRL', 'AUD_CAD', 'AUD_CNY'], getCurrentRates);
});

setInterval(() => fetchRates(io), 60 * 60 * 1000); // hourly
setInterval(() => optimizeCacheMemory(), 10 * 60 * 1000); // every 10 minutes
setInterval(() => {
  console.log('⏳ Xử lý dữ liệu lịch sử (24h)');
  processHistoricalData('24h');
}, 24 * 60 * 60 * 1000); // daily

const PORT = process.env.PORT || 5000;
app.get('/', (req, res) => res.send('🟢 FX Backend API is running...'));
server.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));


