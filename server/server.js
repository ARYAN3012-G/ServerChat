const express = require('express');
const http = require('http');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const dotenv = require('dotenv');
const { connectDB } = require('./config/db');
const { connectRedis } = require('./config/redis');
const { initializeSocket } = require('./sockets');
const { logger } = require('./config/logger');
const errorHandler = require('./middleware/errorHandler');

// Load environment variables
dotenv.config({ path: '../.env' });

const app = express();
const server = http.createServer(app);

// Connect to databases
connectDB();
connectRedis();

// Initialize Socket.io
initializeSocket(server);

// Security middleware
app.use(helmet());
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:3000',
  credentials: true,
}));

// Body parsing
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Logging
app.use(morgan('combined', {
  stream: { write: (message) => logger.info(message.trim()) }
}));

// API Routes
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/users', require('./routes/userRoutes'));
app.use('/api/channels', require('./routes/channelRoutes'));
app.use('/api/messages', require('./routes/messageRoutes'));
app.use('/api/friends', require('./routes/friendRoutes'));
app.use('/api/games', require('./routes/gameRoutes'));
app.use('/api/admin', require('./routes/adminRoutes'));
app.use('/api/payments', require('./routes/paymentRoutes'));

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Error handling
app.use(errorHandler);

// Start server
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  logger.info(`🚀 ServerChat API running on port ${PORT}`);
  logger.info(`📡 Environment: ${process.env.NODE_ENV || 'development'}`);
});

module.exports = { app, server };
