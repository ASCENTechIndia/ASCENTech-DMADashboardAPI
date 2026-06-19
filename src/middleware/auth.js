const jwt = require('jsonwebtoken');
const { config } = require('../config/env');
const { logApiError, logInfo } = require('../utils/log');

function authRequired(req, res, next) {
  const authHeader = req.headers.authorization || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.substring(7) : null;

  if (!token) {
    logApiError(req, 401, 'Missing bearer token', 'Authentication failed: no token');
    return res.fail('Missing bearer token', 401);
  }

  try {
    const payload = jwt.verify(token, config.jwtSecret);
    req.user = payload;
    logInfo({ userId: payload.userId, path: req.originalUrl }, 'Authentication successful');
    return next();
  } catch (err) {
    logApiError(req, 401, err.message, 'Authentication failed: invalid or expired token');
    return res.fail('Invalid or expired token', 401);
  }
}

module.exports = {
  authRequired,
};
