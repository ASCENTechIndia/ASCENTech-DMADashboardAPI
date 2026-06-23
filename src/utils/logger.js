const pino = require('pino');
const fs = require('fs');
const path = require('path');

// Create logs directory if it doesn't exist
const logsDir = path.join(__dirname, '../../logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

['app.log', 'success.log', 'error.log'].forEach((fileName) => {
  const filePath = path.join(logsDir, fileName);
  if (!fs.existsSync(filePath)) {
    fs.closeSync(fs.openSync(filePath, 'a'));
  }
});

function createTargets(fileName, level = 'info') {
  return [
    {
      target: 'pino/file',
      level,
      options: { destination: path.join(logsDir, fileName) },
    },
  ];
}

const logger = pino(
  {
    level: process.env.LOG_LEVEL || 'info',
  },
  pino.transport({
    targets: createTargets('app.log', process.env.LOG_LEVEL || 'info'),
  })
);

// Success logger
const successLogger = pino(
  { level: 'info', name: 'success' },
  pino.transport({
    targets: [
      {
        target: 'pino/file',
        options: { destination: path.join(logsDir, 'success.log') },
      },
    ],
  })
);

// Error logger
const errorLogger = pino(
  { level: 'error', name: 'error' },
  pino.transport({
    targets: createTargets('error.log', 'error'),
  })
);

module.exports = {
  logger,
  successLogger,
  errorLogger,
};
