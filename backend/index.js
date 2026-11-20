const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const cookieParser = require('cookie-parser');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const eventRoutes = require('./routes/events');
const attendanceRoutes = require('./routes/attendance');
const taskRoutes = require('./routes/tasks');
const submissionRoutes = require('./routes/submissions');
const analyticsRoutes = require('./routes/analytics');
const dashboardRoutes = require('./routes/dashboard');

const app = express();
const PORT = process.env.PORT || 5000;
const IS_PROD = process.env.NODE_ENV === 'production';

// Security middleware
app.use(helmet());
app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? process.env.CLIENT_URL 
    : 'http://localhost:3000',
  credentials: true
}));

// Rate limiting
// Global limiter: relaxed in development to avoid throttling dev traffic
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: IS_PROD ? 200 : 2000, // higher ceiling for local dev
  standardHeaders: true,
  legacyHeaders: false,
  message: 'Too many requests from this IP',
  validate: { xForwardedForHeader: false },
});
app.use(limiter);

// Strict auth limiter ONLY on the login endpoint
const authLoginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: IS_PROD ? 5 : 50,
  standardHeaders: true,
  legacyHeaders: false,
  message: 'Too many authentication attempts',
  validate: { xForwardedForHeader: false },
});
app.use('/api/auth/login', authLoginLimiter);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Static file serving for uploads
app.use('/uploads', express.static('uploads'));

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/events', eventRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/submissions', submissionRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/dashboard', dashboardRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ 
    error: 'Something went wrong!',
    ...(process.env.NODE_ENV === 'development' && { details: err.message })
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

const server = app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
});

// ---- Global error handlers ----
process.on('unhandledRejection', (reason) => {
  console.error('Unhandled Promise Rejection:', reason);
  if (IS_PROD) {
    shutdown('unhandledRejection');
  }
});

process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
  if (IS_PROD) {
    process.exit(1);
  }
});

// ---- Graceful shutdown ----
const { pool } = require('./config/database');
async function shutdown(signal) {
  try {
    console.log(`\n${signal} received. Shutting down gracefully...`);
    await pool.end().catch(() => {});
    server.close(() => {
      console.log('HTTP server closed. Bye.');
      process.exit(0);
    });
    // Force exit if close takes too long
    setTimeout(() => process.exit(0), 5000).unref();
  } catch (e) {
    console.error('Error during shutdown:', e);
    process.exit(1);
  }
}

['SIGINT', 'SIGTERM'].forEach(sig => process.on(sig, () => shutdown(sig)));
