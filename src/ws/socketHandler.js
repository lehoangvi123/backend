function initSocket(io) {
  io.on('connection', (socket) => {
    console.log(`⚡ Client connected: ${socket.id}`);

    // Example emit
    socket.emit('rateUpdate', { msg: 'Welcome to FX rate updates' });

    socket.on('disconnect', () => {
      console.log(`❌ Client disconnected: ${socket.id}`);
    });
  });
}

module.exports = { initSocket };
