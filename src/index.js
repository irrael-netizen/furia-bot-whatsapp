const express = require('express');
const cors = require('cors');
const config = require('./config');
const logger = require('./logger');
const { verifyTwilioSignature } = require('./middleware/auth');
const { handleWhatsappWebhook } = require('./whatsapp/webhook');
const { initializeScheduler } = require('./scheduler/reporter');

/**
 * Furia Bot WhatsApp - Main Express Application
 * Financial intelligence bot for WhatsApp messaging
 */

// Initialize Express app
const app = express();

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors());

// Request logging middleware
app.use((req, res, next) => {
  logger.info({
    message: 'Incoming request',
    method: req.method,
    path: req.path,
    ip: req.ip,
  });
  next();
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: config.nodeEnv,
    version: '1.0.0',
  });
});

// Root endpoint
app.get('/', (req, res) => {
  res.status(200).json({
    name: 'Furia Bot WhatsApp',
    description: 'Financial intelligence bot for WhatsApp messaging',
    version: '1.0.0',
    status: 'running',
  });
});

// WhatsApp webhook endpoint
app.post('/webhook', verifyTwilioSignature, handleWhatsappWebhook);

// 404 handler
app.use((req, res) => {
  logger.warn({
    message: 'Route not found',
    method: req.method,
    path: req.path,
  });
  res.status(404).json({
    error: 'Not found',
    message: `Route ${req.method} ${req.path} does not exist`,
  });
});

// Error handler
app.use((err, req, res, next) => {
  logger.error({
    message: 'Unhandled error',
    error: err.message,
    stack: err.stack,
    path: req.path,
  });

  res.status(500).json({
    error: 'Internal server error',
    message: config.isDevelopment ? err.message : 'An unexpected error occurred',
  });
});

// Start server function
function startServer() {
  const server = app.listen(config.port, () => {
    logger.info({
      message: `Bot running on port ${config.port}`,
      port: config.port,
      environment: config.nodeEnv,
      roles: config.roles,
      divisions: config.divisions,
    });

    // Initialize scheduler for daily reports
    initializeScheduler();
    logger.info({ message: 'Scheduler initialized' });
  });

  // Graceful shutdown
  process.on('SIGTERM', () => {
    logger.info({ message: 'SIGTERM received, shutting down gracefully' });
    server.close(() => {
      logger.info({ message: 'Server closed' });
      process.exit(0);
    });
  });

  process.on('SIGINT', () => {
    logger.info({ message: 'SIGINT received, shutting down gracefully' });
    server.close(() => {
      logger.info({ message: 'Server closed' });
      process.exit(0);
    });
  });

  return server;
}

// Start server if this is the main module
if (require.main === module) {
  startServer();
}

// Export app and startServer for testing
module.exports = { app, startServer };
