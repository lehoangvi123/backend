const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();
const connectDB = require('./config/db');
const { cacheRate, getCachedRate } = require('./utils/cache');
const historyRoutes = require('./routes/historyRoutes');
const { processHistoricalData } = require('./services/processHistoricalData');
const { invalidateRateCache } = require('./utils/cache'); // 👈 Thêm vào
const { warmupCache } = require('./utils/cache');
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

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: { origin: '*', methods: ['GET', 'POST'] }
});

// ✅ Kết nối MongoDB
connectDB();
app.use(cors());
app.use(express.json()); 
app.use('/api/history', historyRoutes);

// ✅ WebSocket
io.on('connection', (socket) => {
  console.log('⚡ Client connected:', socket.id);
  const rates = getCurrentRates();
  if (Object.keys(rates).length) {
    socket.emit('rateUpdate', rates);
  }
  socket.on('disconnect', () => {
    console.log('❌ Client disconnected:', socket.id);
  });
});

// ✅ API: Tỷ giá hiện tại
app.get('/api/rates/current', (req, res) => {
  const rates = getCurrentRates(); 
  const original = getCurrentOriginalRates();
  const provider = getCurrentProvider();

  if (!Object.keys(rates).length) {
    return res.status(404).json({ success: false, message: 'No current rates available' });
  }

  res.json({ success: true, rates, original, provider });
});

// ✅ API: Danh sách nguồn tỷ giá
app.get('/api/rates/sources', (req, res) => {
  const sources = getCurrentSources();
  if (!sources.length) {
    return res.status(404).json({ success: false, message: 'No source data available' });
  }
  res.json({ success: true, sources });
});

// ✅ API: Chuyển đổi cơ bản có cache
app.post('/api/rates/convert', (req, res) => {
  const { from, to, amount } = req.body;
  const cacheKey = `${from}_${to}`;
  const cachedRate = getCachedRate(cacheKey);

  if (cachedRate !== null) {
    const result = (amount * cachedRate).toFixed(6);
    return res.json({ from, to, amount, result, cached: true });
  }

  const rates = getCurrentRates();
  const fromRate = rates[from];
  const toRate = rates[to];

  if (!fromRate || !toRate || isNaN(amount)) {
    return res.status(400).json({ error: 'Invalid input' });
  }

  const rate = toRate / fromRate;
  cacheRate(cacheKey, rate); // TTL mặc định 1 giờ
  const result = (amount * rate).toFixed(6);
  res.json({ from, to, amount, result, cached: false });
});

// ✅ API: Chuyển đổi chéo
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

// ✅ API: Vô hiệu hóa cache theo cặp tiền
app.post('/api/rates/cache/invalidate', (req, res) => {
  const { from, to } = req.body;
  if (!from || !to) {
    return res.status(400).json({ success: false, message: 'Missing currency pair' });
  }

  const key = `${from}_${to}`;
  invalidateRateCache(key);
  res.json({ success: true, message: `Cache invalidated for ${key}` });
}); 

// Thêm route API
app.post('/api/rates/cache/warmup', (req, res) => {
  const { pairs } = req.body;
  if (!Array.isArray(pairs)) {
    return res.status(400).json({ success: false, message: 'pairs must be an array' });
  }
  warmupCache(pairs, getCurrentRates);
  res.json({ success: true, warmedUp: pairs });
});


// ✅ API: Chỉ số kỹ thuật theo từng loại tiền tệ
app.get('/api/rates/indicators/:currency', async (req, res) => {
  try {
    const currency = req.params.currency.toUpperCase();
    const history = await Rate.find().sort({ createdAt: -1 }).limit(20);

    if (!history.length) {
      return res.status(404).json({ success: false, message: 'Not enough data for indicators' });
    }

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

// ✅ API: Toàn bộ chỉ số kỹ thuật
app.get('/api/rates/indicators', (req, res) => {
  const indicators = getCurrentIndicators();
  if (!Object.keys(indicators).length) {
    return res.status(404).json({ success: false, message: 'No indicators available' });
  }
  res.json({ success: true, indicators });
});

// ✅ API: Tóm tắt thị trường
app.get('/api/rates/summary', (req, res) => {
  const summary = getCurrentMarketSummary();
  if (!summary || Object.keys(summary).length === 0) {
    return res.status(404).json({ success: false, message: 'No market summary available' });
  }
  res.json({ success: true, summary });
}); 

// ✅ Gọi ngay khi khởi động

// ⬇️ Ngay sau fetchRates(io), gọi warmupCache 
fetchRates(io).then(() => {
  warmupCache(
    ['AUD_RON', 'AUD_BRL', 'AUD_CAD', 'AUD_CNY'],
    getCurrentRates
  );
});

// ⏱️ Gọi lại mỗi 1 giờ
setInterval(() => fetchRates(io), 24 * 60 * 60 * 1000);

// ✅ Gọi xử lý dữ liệu lịch sử lần đầu và lặp lại mỗi 24 giờ
processHistoricalData('24h');
setInterval(() => {
  console.log('⏳ Tự động xử lý dữ liệu lịch sử (24h)');
  processHistoricalData('24h');
}, 24 * 60 * 60 * 1000); 

// Khi người dùng cập nhật tỷ giá thủ công
invalidateRateCache('USD_VND');

// ✅ Khởi động server
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
