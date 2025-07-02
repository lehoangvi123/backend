require('dotenv').config();
const checkAPIHealth = require('./src/services/checkAPIHealth');

checkAPIHealth('USD'); // Bạn có thể thay bằng 'VND', 'EUR'
