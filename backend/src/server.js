require('dotenv').config();

const http = require('http');
const { Server } = require('socket.io');

const app = require('./app');
const connectDB = require('./config/db');
const registerSockets = require('./sockets');
const logger = require('./utils/logger');

const PORT = process.env.PORT || 5050;

async function start() {
  await connectDB();

  const server = http.createServer(app);

  const io = new Server(server, {
    cors: {
      origin: process.env.CLIENT_ORIGIN?.split(',') || '*',
      credentials: true,
    },
  });

  app.set('io', io);
  registerSockets(io);

  server.listen(PORT, () => {
    logger.info(`SHS API ready on http://localhost:${PORT}`);
  });

  const shutdown = (signal) => {
    logger.info(`${signal} received — shutting down`);
    server.close(() => process.exit(0));
  };
  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
}

start().catch((err) => {
  logger.error('Failed to boot server', err);
  process.exit(1);
});
