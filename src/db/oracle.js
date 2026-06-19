const oracledb = require('oracledb');
const { config } = require('../config/env');
const { initDB, getConnection: getDbConnection, closeDBPools } = require('../config/db');
const { logger } = require('../utils/logger');

oracledb.outFormat = oracledb.OUT_FORMAT_OBJECT;
oracledb.fetchAsString = [oracledb.CLOB];

function resolveDbName(executionContext = {}, options = {}) {
  if (options.dbName) return options.dbName;
  if (executionContext.dbName) return executionContext.dbName;
  if (executionContext.req?.user?.dbName) return executionContext.req.user.dbName;
  if (executionContext.req?.user?.dbKey) return executionContext.req.user.dbKey;
  if (executionContext.user?.dbName) return executionContext.user.dbName;
  if (executionContext.user?.dbKey) return executionContext.user.dbKey;
  return config.oracle.defaultKey || 'db1';
}

async function initOraclePool(dbName = config.oracle.defaultKey || 'db1') {
  const pool = await initDB(dbName);
  logger.info({ dbName }, 'Oracle pool initialized');
  return pool;
}

async function getConnection(executionContext = {}, options = {}) {
  const dbName = resolveDbName(executionContext, options);
  return getDbConnection(dbName);
}

async function closeOraclePool() {
  await closeDBPools();
  logger.info('Oracle pools closed');
}

async function execute(sql, binds = {}, options = {}, executionContext = {}) {
  const connection = await getConnection(executionContext, options);
  try {
    const { dbName: _dbName, dbKey: _dbKey, ...safeOptions } = options || {};
    const result = await connection.execute(sql, binds, {
      autoCommit: false,
      ...safeOptions,
    });
    return result;
  } finally {
    await connection.close();
  }
}

async function executeWithCommit(sql, binds = {}, options = {}, executionContext = {}) {
  const connection = await getConnection(executionContext, options);
  try {
    const { dbName: _dbName, dbKey: _dbKey, ...safeOptions } = options || {};
    const result = await connection.execute(sql, binds, {
      autoCommit: false,
      ...safeOptions,
    });
    await connection.commit();
    return result;
  } catch (err) {
    await connection.rollback();
    throw err;
  } finally {
    await connection.close();
  }
}

module.exports = {
  oracledb,
  resolveDbName,
  initOraclePool,
  getConnection,
  closeOraclePool,
  execute,
  executeWithCommit,
};
