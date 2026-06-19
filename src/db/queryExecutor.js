const oracledb = require("oracledb");
const { getConnection } = require("../config/db");

/**
 * Generic query executor (Oracle)
 * @param {string} sql - SQL with :param bindings
 * @param {Object|Array} params - bind params
 * @param {Object} options
 */
async function executeQuery(sql, params = {}, options = {}) {
  let connection;

  try {
    const dbName = options.dbName || options.dbKey || "db1";
    connection = await getConnection(dbName);
    const { dbName: _dbName, dbKey: _dbKey, ...safeOptions } = options || {};

    const start = Date.now();

    const result = await connection.execute(sql, params, {
      outFormat: oracledb.OUT_FORMAT_OBJECT, // rows as objects
      autoCommit: true,
      ...safeOptions,
    });

    const duration = Date.now() - start;

    return {
      success: true,
      rowCount: result.rows ? result.rows.length : 0,
      rows: result.rows || [],
      outBinds: result.outBinds || null,
      rowsAffected: result.rowsAffected || 0,
      metaData: result.metaData || [],
      executionTimeMs: duration,
    };
  } catch (err) {
    throw err;
  } finally {
    if (connection) {
      await connection.close(); // ⚠️ must
    }
  }
}

module.exports = { executeQuery };