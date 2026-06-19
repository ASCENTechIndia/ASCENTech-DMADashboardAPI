const oracledb = require("oracledb");
const env = require("./env");

oracledb.outFormat = oracledb.OUT_FORMAT_OBJECT;
oracledb.fetchAsString = [oracledb.CLOB];

const pools = new Map();

function getDbProfile(dbName = env.DB_DEFAULT_NAME || "db1") {
  const profile = env[dbName];
  if (!profile || !profile.user || !profile.password) {
    throw new Error(`Invalid or unconfigured DB profile: ${dbName}`);
  }
  return {
    user: profile.user,
    password: profile.password,
    connectString: env.DB_CONNECT_STRING,
  };
}

// Create pool (recommended)
async function initDB(dbName = env.DB_DEFAULT_NAME || "db1") {
  if (pools.has(dbName)) {
    return pools.get(dbName);
  }

  const profile = getDbProfile(dbName);

  const pool = await oracledb.createPool({
    user: profile.user,
    password: profile.password,
    connectString: profile.connectString,
    poolAlias: `pool_${dbName}`,
    poolMin: env.config?.oracle?.poolMin || 2,
    poolMax: env.config?.oracle?.poolMax || 20,
    poolIncrement: env.config?.oracle?.poolIncrement || 2,
    poolTimeout: env.config?.oracle?.poolTimeout || 60,
  });

  pools.set(dbName, pool);
  return pool;
}

async function getConnection(dbName = "db1") {
  if (!pools.has(dbName)) {
    await initDB(dbName);
  }

  return pools.get(dbName).getConnection();
}

async function closeDBPools() {
  for (const pool of pools.values()) {
    await pool.close(10);
  }
  pools.clear();
}

module.exports = {
  initDB,
  getConnection,
  closeDBPools,
  getDbProfile,
};