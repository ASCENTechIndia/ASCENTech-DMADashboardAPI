const fs = require('node:fs');
const path = require('node:path');
const { logger } = require('./logger');

const logsDir = path.join(process.cwd(), 'logs');
const auditLogFile = path.join(logsDir, 'audit.log');

function ensureLogPath() {
  if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir, { recursive: true });
  }
}

function writeAuditLine(event) {
  ensureLogPath();
  const line = `${JSON.stringify(event)}\n`;
  fs.appendFileSync(auditLogFile, line, 'utf8');
}

function auditLog({ action, actor, module, entityId, status, details = {}, requestMeta = {} }) {
  const event = {
    ts: new Date().toISOString(),
    action,
    module,
    actor,
    entityId,
    status,
    requestMeta,
    details,
  };

  logger.info({ audit: event }, 'Audit event');
  writeAuditLine(event);
}

module.exports = {
  auditLog,
};
