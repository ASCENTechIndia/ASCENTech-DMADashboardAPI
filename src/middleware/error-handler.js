const { logger, logError } = require('../utils/log');

function notFoundHandler(req, res) {
  logError(
    {
      method: req.method,
      path: req.originalUrl,
      ip: req.ip,
    },
    `Route not found: ${req.originalUrl}`
  );

  return res.fail('Route not found', 404, { path: req.originalUrl });
}

function errorHandler(err, req, res, next) {
  const stack = process.env.NODE_ENV === 'development' ? err.stack : undefined;

  logError(
    {
      err: {
        message: err.message,
        code: err.code,
        name: err.name,
        stack,
      },
      path: req.originalUrl,
      method: req.method,
      ip: req.ip,
    },
    'Unhandled error'
  );

  if (err && err.name === 'ZodError') {
    return res.fail('Validation failed', 400, { issues: err.issues || [] });
  }

  const status = err.status || 500;
  const message = err.publicMessage || err.message || 'Internal server error';

  return res.fail(message, status);
}

module.exports = {
  notFoundHandler,
  errorHandler,
};
