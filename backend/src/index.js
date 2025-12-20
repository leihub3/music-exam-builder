require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const compression = require('compression');

// Routes
const authRoutes = require('./routes/auth.routes');
const examRoutes = require('./routes/exams.routes');
const questionRoutes = require('./routes/questions.routes');
const attemptRoutes = require('./routes/attempts.routes');
const notationRoutes = require('./routes/notation.routes');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(helmet()); // Security headers
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}));
app.use(compression()); // Compress responses
app.use(morgan('dev')); // Logging
app.use(express.json()); // Parse JSON bodies
app.use(express.urlencoded({ extended: true })); // Parse URL-encoded bodies

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    success: true, 
    message: 'Music Exam Builder API is running',
    timestamp: new Date().toISOString()
  });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/exams', examRoutes);
app.use('/api/questions', questionRoutes);
app.use('/api/attempts', attemptRoutes);
app.use('/api/notation', notationRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'Route not found'
  });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('Global error handler:', err);
  res.status(err.status || 500).json({
    success: false,
    error: err.message || 'Internal server error'
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`
  ╔═══════════════════════════════════════╗
  ║   Music Exam Builder API Server      ║
  ║   Environment: ${process.env.NODE_ENV || 'development'}                 ║
  ║   Port: ${PORT}                           ║
  ╚═══════════════════════════════════════╝
  
  Server is running at http://localhost:${PORT}
  Health check: http://localhost:${PORT}/health
  `);
});

module.exports = app;

