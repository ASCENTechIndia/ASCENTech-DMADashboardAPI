const oracledb = require("oracledb");
const { getConnection } = require("../config/db");

async function executeProcedure({
  name,
  statement,
  binds: directBinds,
  params = [],
  isFunction = false,
  useTx = true,
  dbName = "db1",
  options = {},
}) {
  let connection;

  try {
    connection = await getConnection(dbName);

    let sql = statement;
    let binds = directBinds;

    if (!sql) {
      // Build bind parameters for positional procedure/function call
      binds = {};
      params.forEach((p, i) => {
        binds[`p${i + 1}`] = {
          val: p.value ?? null,
          dir: p.out ? oracledb.BIND_OUT : oracledb.BIND_IN,
          type: p.type || oracledb.STRING,
        };
      });

      if (isFunction) {
        sql = `BEGIN :result := ${name}(${params
          .map((_, i) => `:p${i + 1}`)
          .join(",")}); END;`;

        binds.result = { dir: oracledb.BIND_OUT, type: oracledb.STRING };
      } else {
        sql = `BEGIN ${name}(${params
          .map((_, i) => `:p${i + 1}`)
          .join(",")}); END;`;
      }
    } else {
      binds = binds || {};
    }

    const start = Date.now();
    const { dbName: _dbName, dbKey: _dbKey, ...safeOptions } = options || {};
    const autoCommit = !useTx;

    const result = await connection.execute(sql, binds, {
      autoCommit,
      ...safeOptions,
    });

    if (result.outBinds) {
  for (const key in result.outBinds) {
    const val = result.outBinds[key];

    if (val && typeof val.getRows === "function") {
      const rows = await val.getRows(1000);
      await val.close();
      result.outBinds[key] = rows; 
    }
  }
}

    if (useTx) {
      await connection.commit();
    }

    const executionTimeMs = Date.now() - start;

    return {
      success: true,
      procedure: name || "anonymous",
      isFunction,
      executionTimeMs,
      rows: result.rows || [],
      outBinds: result.outBinds || null,
      rowsAffected: result.rowsAffected || 0,
      metaData: result.metaData || [],
    };
  } catch (err) {
    if (connection && useTx) {
      try {
        await connection.rollback();
      } catch (_rollbackErr) {
        // Ignore rollback failures and rethrow original error.
      }
    }
    throw err;
  } finally {
    if (connection) {
      await connection.close(); // ⚠️ important
    }
  }
}

module.exports = { executeProcedure };