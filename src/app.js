const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

// Models
const Rate = require('./models/rateModel');

// Dịch vụ tỷ giá
const {
  fetchRates,
  getCurrentRates,
  getCurrentProvider
} = require('./services/fetchRates');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: { origin: '*', methods: ['GET', 'POST'] }
});

// Middleware
app.use(cors());
app.use(express.json());

// MongoDB
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('✅ MongoDB connected'))
  .catch(err => console.error('❌ MongoDB connection error:', err));

// WebSocket
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

// API: Lấy tỷ giá hiện tại
app.get('/api/rates/current', (req, res) => {
  const rates = getCurrentRates();
  const provider = getCurrentProvider();

  if (!Object.keys(rates).length) {
    return res.status(404).json({ success: false, message: 'No current rates available' });
  }

  res.json({ success: true, rates, provider });
});

// API: Chuyển đổi thông thường
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

// ✅ API: Chuyển đổi chéo (cross rate)
app.post('/api/rates/convert-cross', (req, res) => {
  const { from, to, via, amount } = req.body;
  const rates = getCurrentRates();

  const fromRate = rates[from];
  const toRate = rates[to];
  const viaRate = rates[via];

  if (!fromRate || !toRate || !viaRate || isNaN(amount)) {
    return res.status(400).json({ error: 'Invalid currency code or amount' });
  }

  const crossRate = fromRate / toRate; // hoặc: (fromRate / viaRate) / (toRate / viaRate)
  const result = amount * crossRate;

  res.json({ from, to, via, amount, rate: crossRate, result });
});

// Fetch định kỳ mỗi 5 phút
setInterval(() => fetchRates(io), 5 * 60 * 1000);
fetchRates(io); // Lần đầu

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
