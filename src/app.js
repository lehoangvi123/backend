const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const mongoose = require('mongoose');
const cors = require('cors');
const axios = require('axios');
require('dotenv').config();

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: { origin: '*', methods: ['GET', 'POST'] }
});

app.use(cors());
app.use(express.json()); 

app.get('/api/rates/current', (req, res) => {
  if (Object.keys(currentRates).length) {
    res.json({ success: true, rates: currentRates });
  } else {
    res.status(404).json({ success: false, message: 'Rates not available yet' });
  }
});


app.post('/api/rates/convert', (req, res) => {
  const { from, to, amount } = req.body;
  const fromRate = currentRates[from];
  const toRate = currentRates[to];

  if (!fromRate || !toRate) {
    return res.status(400).json({ error: 'Invalid currency code' });
  }

  const result = (amount / fromRate) * toRate;

  res.json({ from, to, amount, result });
});



mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('✅ MongoDB connected'))
  .catch(err => console.error('❌ MongoDB connection error:', err));

// Lưu trữ giá hiện tại
let currentRates = {};

const fetchRates = async () => {
  try {
    const response = await axios.get(`https://v6.exchangerate-api.com/v6/${process.env.EXCHANGE_API_KEY}/latest/USD`);

    if (response.data.result === 'success') {
      // Lọc các rate cần thiết (USD, VND, EUR)
      // currentRates = { 
      //   USD: response.data.conversion_rates.USD,
      //   VND: response.data.conversion_rates.VND,
      //   EUR: response.data.conversion_rates.EUR
      // };   
      currentRates = response.data.conversion_rates;
      console.log('✅ Updated rates:', currentRates);
      io.emit('rateUpdate', currentRates);
    } else {
      console.error('❌ ExchangeRate-API error:', response.data['error-type']);
    }

  } catch (err) {
    console.error('❌ Error fetching rates:', err.message);
  }
};


io.on('connection', (socket) => {
  console.log('⚡ Client connected:', socket.id);
  if (Object.keys(currentRates).length) {
    socket.emit('rateUpdate', currentRates);
  }

  socket.on('disconnect', () => {
    console.log('❌ Client disconnected:', socket.id);
  });
});

setInterval(fetchRates, 3600000); // mỗi 5 giây fetch
fetchRates(); // lần đầu     

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
