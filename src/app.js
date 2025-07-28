// app.js (hoặc index.js)
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const connectDB = require('./config/db');
const historyRoutes = require('./routes/historyRoutes');
const userRoutes = require('./routes/userRoutes');
const popularPairsRoute = require('./routes/popularPairRoutes');
const alertRoutes = require('./routes/alertRoutes');
const trendRoutes = require('./routes/trendRoutes');
const profileRoutes = require('./routes/profile');
const feedbackRoutes = require('./routes/feedback');

const {
  cacheRate,
  getCachedRate,
  invalidateRateCache,
  warmupCache,
  getCacheStatistics,
  optimizeCacheMemory,
  clearExpiredCache
} = require('./utils/cache');

const {
  processHistoricalData
} = require('./services/processHistoricalData');

const {
  saveRate,
  archiveOldData
} = require('./services/rateService');

const {
  logConversion
} = require('./services/conversionService');

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

const app = express();
const server = http.createServer(app);
// 👉 Cấu hình Socket.IO chính xác hơn (thêm timeout để xử lý disconnect ổn định)
const io = socketIo(server, {
  cors: { origin: '*', methods: ['GET', 'POST'] },
  pingTimeout: 10000,     // Client không phản hồi trong 10s sẽ bị disconnect
  pingInterval: 5000      // Ping mỗi 5s để kiểm tra kết nối
});
 
// 👉 Thêm dòng này:
let connectedClients = 0;
// Kết nối DB
connectDB();

app.use(cors());
app.use(express.json());

// REST API Routes
app.use('/api/history', historyRoutes);
app.use('/api/users', userRoutes);
app.use('/api/rates', popularPairsRoute);
app.use('/api', alertRoutes);
app.use('/api/rates/trend', trendRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/feedback', feedbackRoutes);

io.on('connection', (socket) => {
  console.log(`🆕 New client connected: ${socket.id}`);
  console.log(`👥 Tổng số client đang kết nối: ${io.sockets.sockets.size}`);

  // Gửi dữ liệu tỷ giá hiện tại khi vừa kết nối
  const rates = getCurrentRates();
  if (Object.keys(rates).length) {
    socket.emit('rateUpdate', rates);
  }

  // Client yêu cầu theo dõi 1 cặp tiền
  socket.on('subscribeToPair', (pairCode) => {
    console.log(`➕ ${socket.id} subscribed to ${pairCode}`);
    socket.join(pairCode);
  });

  // Client hủy theo dõi 1 cặp tiền
  socket.on('unsubscribeFromPair', (pairCode) => {
    console.log(`➖ ${socket.id} unsubscribed from ${pairCode}`);
    socket.leave(pairCode);
  });

  // Khi client ngắt kết nối
  socket.on('disconnect', (reason) => {
    console.log(`❌ Client disconnected: ${socket.id} (${reason})`);
    console.log(`👥 Tổng số client còn lại: ${io.sockets.sockets.size}`);
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

// Các route API phụ trợ khác giữ nguyên...

// Khởi động hệ thống
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
