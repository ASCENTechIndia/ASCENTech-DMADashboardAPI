const { logger, successLogger, errorLogger } = require('./logger');

/**
 * Log an info level message
 */
function logInfo(data, message) {
  logger.info(data, message);
}

/**
 * Log a success level message
 */
function logSuccess(data, message) {
  successLogger.info(data, message);
}

/**
 * Log an error level message
 */
function logError(data, message) {
  errorLogger.error(data, message);
}

/**
 * Log a warning level message
 */
function logWarn(data, message) {
  logger.warn(data, message);
}

/**
 * Log an API success with request details
 */
function logApiSuccess(req, statusCode, responseData, message = 'API request successful') {
  successLogger.info(
    {
      method: req.method,
      path: req.path,
      statusCode,
      userId: req.user?.id,
      ip: req.ip,
      responseData: typeof responseData === 'object' ? JSON.stringify(responseData).slice(0, 500) : responseData,
    },
    message
  );
}

/**
 * Log an API error with request details
 */
function logApiError(req, statusCode, error, message = 'API request failed') {
  errorLogger.error(
    {
      method: req.method,
      path: req.path,
      statusCode,
      userId: req.user?.id,
      ip: req.ip,
      error: error?.message || error,
    },
    message
  );
}

module.exports = {
  logInfo,
  logSuccess,
  logError,
  logWarn,
  logApiSuccess,
  logApiError,
  logger,
  successLogger,
  errorLogger,
};
