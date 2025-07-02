const fs = require('fs');
const path = require('path');

function logAPIUsage(provider, endpoint) {
  const logPath = path.join(__dirname, '..', 'logs', 'api_usage.log');
  const logEntry = `[${new Date().toISOString()}] ${provider} called: ${endpoint}\n`;

  fs.appendFile(logPath, logEntry, (err) => {
    if (err) {
      console.error('❌ Lỗi ghi log API:', err.message);
    }
  });
}


module.exports = logAPIUsage;



