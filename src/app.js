const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const rateLimit = require('express-rate-limit');

const { config, validateConfig } = require('./config/env');
const routes = require('./routes');
const { notFoundHandler, errorHandler } = require('./middleware/error-handler');
const { attachResponseHelpers } = require('./libs/response');
const oracledb = require('oracledb');

function createApp() {
  validateConfig();

  const app = express();

  app.use(helmet());
  app.use(
    cors({
      // origin: config.corsOrigin === '*' ? true : config.corsOrigin.split(',').map((x) => x.trim()),
      origin: [
    'http://localhost:5173',
    'https://rtsdashboard.dhulecorporation.in',
    'https://rtsdashboard.nagarkaryavalinewuat.com'
  ],
      credentials: true,
    })
  );
  app.use(compression());
  app.use(express.json({ limit: '2mb' }));
  app.use(express.urlencoded({ extended: true }));
  app.use(attachResponseHelpers);
  // app.use(
  //   rateLimit({
  //     windowMs: config.rateLimitWindowMs,
  //     max: config.rateLimitMax,
  //     standardHeaders: true,
  //     legacyHeaders: false,
  //   })
  // );

  app.use('/api', routes);

  app.get('/api/health', async (req, res) => {
  let connection;

  try {
    connection = await oracledb.getConnection();

    const result = await connection.execute(`SELECT 1 FROM dual`);

    res.status(200).json({
      status: 'OK',
      message: 'Server & DB are healthy',
      db: result.rows ? 'Connected' : 'Unknown',
      uptime: process.uptime(),
      timestamp: new Date()
    });

  } catch (error) {
    res.status(500).json({
      status: 'ERROR',
      message: 'Health check failed',
      db: 'Disconnected',
      error: error.message
    });
  } finally {
    if (connection) {
      try { await connection.close(); } catch (e) {}
    }
  }
});

  app.get('/api/test', (req, res) => {
  res.json({
    status: 'OK',
    message: 'Node server is running',
    time: new Date()
  });
});

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}

module.exports = {
  createApp,
};
