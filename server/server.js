const dotenv = require('dotenv');
// Load environment variables FIRST (before any config that reads them)
dotenv.config({ path: '../.env' });

const express = require('express');
const http = require('http');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const path = require('path');
const session = require('express-session');
const passport = require('./config/passport');
const { connectDB } = require('./config/db');
const { connectRedis } = require('./config/redis');
const { connectCloudinary } = require('./config/cloudinary');
const { initializeSocket } = require('./sockets');
const { logger } = require('./config/logger');
const errorHandler = require('./middleware/errorHandler');

const app = express();
const server = http.createServer(app);

// Trust proxy (required for Render, Heroku, etc. — behind reverse proxy)
app.set('trust proxy', 1);

// Connect to databases and services
connectDB();
connectRedis();
connectCloudinary();

// Initialize Socket.io
initializeSocket(server);

// Security middleware
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  contentSecurityPolicy: false,
}));
const clientOrigin = (process.env.CLIENT_URL || 'http://localhost:3000').replace(/\/+$/, '');
app.use(cors({
  origin: clientOrigin,
  credentials: true,
}));

// Body parsing
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Logging
app.use(morgan('combined', {
  stream: { write: (message) => logger.info(message.trim()) }
}));

// Session middleware (Required for Passport OAuth)
app.use(session({
  secret: process.env.JWT_SECRET || 'secret',
  resave: false,
  saveUninitialized: true,
  cookie: { secure: process.env.NODE_ENV === 'production' }
}));

// Initialize Passport
app.use(passport.initialize());
app.use(passport.session());

// API Routes
app.use('/uploads', express.static(path.join(__dirname, 'uploads'), {
  setHeaders: (res, filePath) => {
    // Force audio MIME type for webm/weba files so HTML5 <audio> can play voice messages
    if (filePath.endsWith('.webm') || filePath.endsWith('.weba')) {
      res.setHeader('Content-Type', 'audio/webm');
      res.setHeader('Accept-Ranges', 'bytes');
    }
  }
}));
app.use('/api/upload', require('./routes/uploadRoutes'));
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/servers', require('./routes/serverRoutes'));
app.use('/api/users', require('./routes/userRoutes'));
app.use('/api/channels', require('./routes/channelRoutes'));
app.use('/api/messages', require('./routes/messageRoutes'));
app.use('/api/friends', require('./routes/friendRoutes'));
app.use('/api/games', require('./routes/gameRoutes'));
app.use('/api/admin', require('./routes/adminRoutes'));
app.use('/api/payments', require('./routes/paymentRoutes'));
app.use('/api/calls', require('./routes/callRoutes'));
app.use('/api/gifs', require('./routes/gifRoutes'));
app.use('/api/contact', require('./routes/contactRoutes'));
app.use('/api/music', require('./routes/musicRoutes'));
app.use('/api/support', require('./routes/supportRoutes'));


// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Error handling
app.use(errorHandler);

// Start server
const PORT = process.env.PORT || 5000;
server.listen(PORT, '0.0.0.0', () => {
  logger.info(`🚀 ServerChat API running on port ${PORT}`);
  logger.info(`📡 Environment: ${process.env.NODE_ENV || 'development'}`);
});

module.exports = { app, server };
