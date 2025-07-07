const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();
const connectDB = require('./config/db')
// const generateMarketSummary = require('../utils/generateMarketSummary');
const historyRoutes = require('./routes/historyRoutes');
const { processHistoricalData } = require('./services/processHistoricalData');

const Rate = require('./models/rateModel');
const calculateTechnicalIndicators = require('./utils/calculateTechnicalIndicators'); // 👈 Thêm vào

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

connectDB();
app.use(cors());
app.use(express.json()); 
app.use('/api/history', historyRoutes);

// ✅ MongoDB
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('✅ MongoDB connected'))
  .catch(err => console.error('❌ MongoDB connection error:', err));

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

// ✅ API: Chuyển đổi cơ bản
app.post('/api/rates/convert', (req, res) => {
  const { from, to, amount } = req.body;
  const rates = getCurrentRates();
  const fromRate = rates[from];
  const toRate = rates[to];

  if (!fromRate || !toRate || isNaN(amount)) {
    return res.status(400).json({ error: 'Invalid currency code or amount' });
  }

  const result = (amount / fromRate) * toRate;
  res.json({ from, to, amount, result });
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

// ✅ API: Chỉ số kỹ thuật theo loại tiền tệ cụ thể
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


// ✅ Tạo API GET /api/rates/summary
app.get('/api/rates/summary', (req, res) => {
  const summary = getCurrentMarketSummary();
  if (!summary || Object.keys(summary).length === 0) {
    return res.status(404).json({ success: false, message: 'No market summary available' });
  }
  res.json({ success: true, summary });
});

// ...các phần trên giữ nguyên
fetchRates(io);

// ⏱️ Gọi lại mỗi 1 tiếng để đảm bảo tần suất vừa đủ
setInterval(fetchRates, 60 * 60 * 1000);

// ✅ Gọi xử lý dữ liệu lịch sử 1 lần đầu và lặp mỗi 24 giờ
processHistoricalData('24h');
setInterval(() => {
  console.log('⏳ Xử lý dữ liệu lịch sử 24h');
  processHistoricalData('24h');
}, 24 * 60 * 60 * 1000);



const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));



