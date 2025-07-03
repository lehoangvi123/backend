const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const Rate = require('./models/rateModel');
const {
  fetchRates,
  getCurrentRates,
  getCurrentProvider,
  getCurrentSources
} = require('./services/fetchRates');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: { origin: '*', methods: ['GET', 'POST'] }
});

app.use(cors());
app.use(express.json());

mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('✅ MongoDB connected'))
  .catch(err => console.error('❌ MongoDB connection error:', err));

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

app.get('/api/rates/current', (req, res) => {
  const rates = getCurrentRates();
  const provider = getCurrentProvider();
  if (!Object.keys(rates).length) {
    return res.status(404).json({ success: false, message: 'No current rates available' });
  }
  res.json({ success: true, rates, provider });
});

app.get('/api/rates/sources', (req, res) => {
  const sources = getCurrentSources();
  if (!sources.length) {
    return res.status(404).json({ success: false, message: 'No source data available' });
  }
  res.json({ success: true, sources });
});

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

setInterval(() => fetchRates(io), 5 * 60 * 1000);
fetchRates(io);

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));



