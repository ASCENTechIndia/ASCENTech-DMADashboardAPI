const oracledb = require("oracledb");
const { getConnection } = require("../config/db");

/**
 * Execute multiple queries inside a transaction (Oracle)
 */
async function withTx(fn, options = {}) {
  let connection;

  try {
    const dbName = options.dbName || options.dbKey || "db1";
    connection = await getConnection(dbName);

    const result = await fn(connection);

    await connection.commit(); // ✅ commit manually
    return result;
  } catch (err) {
    if (connection) {
      try {
        await connection.rollback(); // ✅ rollback manually
      } catch (_) {}
    }
    throw err;
  } finally {
    if (connection) {
      await connection.close(); // ⚠️ must
    }
  }
}

/**
 * Call stored procedure WITHOUT transaction (Oracle)
 */
async function callProcNoTx(sql, params = {}, options = {}) {
  let connection;

  try {
    const dbName = options.dbName || options.dbKey || "db1";
    connection = await getConnection(dbName);

    const result = await connection.execute(sql, params, {
      autoCommit: true, // ✅ no transaction
    });

    return result.outBinds || result.rows || null;
  } catch (err) {
    err.message = `[PROC-NO-TX] ${err.message}`;
    throw err;
  } finally {
    if (connection) {
      await connection.close();
    }
  }
}

module.exports = { withTx, callProcNoTx };