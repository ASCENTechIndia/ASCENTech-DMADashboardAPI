const dotenv = require("dotenv");
dotenv.config();

function must(name) {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env var: ${name}`);
  return v;
}

function asInt(value, fallback) {
  const parsed = Number.parseInt(value, 10);
  return Number.isNaN(parsed) ? fallback : parsed;
}

function pickDefaultDbKey() {
  if (process.env.ORACLE_DEFAULT_DB_KEY) return process.env.ORACLE_DEFAULT_DB_KEY;
  if (process.env.DB_DEFAULT_NAME) return process.env.DB_DEFAULT_NAME;
  if (process.env.DB1_USER && process.env.DB1_PASSWORD) return "db1";
  if (process.env.DB2_USER && process.env.DB2_PASSWORD) return "db2";
  if (process.env.DB3_USER && process.env.DB3_PASSWORD) return "db3";
  return "db1";
}

const DB_CONNECT_STRING = must("DB_CONNECT_STRING");

const oracleProfiles = {
  db1: {
    user: process.env.DB1_USER,
    password: process.env.DB1_PASSWORD,
    connectString: DB_CONNECT_STRING,
  },
  db2: {
    user: process.env.DB2_USER,
    password: process.env.DB2_PASSWORD,
    connectString: DB_CONNECT_STRING,
  },
  db3: {
    user: process.env.DB3_USER,
    password: process.env.DB3_PASSWORD,
    connectString: DB_CONNECT_STRING,
  },
};

const defaultDbKey = pickDefaultDbKey();

const config = {
  nodeEnv: process.env.NODE_ENV || "development",
  port: asInt(process.env.PORT, 5000),
  corsOrigin: process.env.CORS_ORIGIN || "*",
  jwtSecret: must("JWT_SECRET"),
  loginEncryptionKey: must("LOGIN_ENCRYPTION_KEY"),
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || "12h",
  rateLimitWindowMs: asInt(process.env.RATE_LIMIT_WINDOW_MS, 15 * 60 * 1000),
  rateLimitMax: asInt(process.env.RATE_LIMIT_MAX, 500),
  oracle: {
    defaultKey: defaultDbKey,
    user: oracleProfiles[defaultDbKey]?.user,
    password: oracleProfiles[defaultDbKey]?.password,
    connectString: DB_CONNECT_STRING,
    profiles: oracleProfiles,
    poolMin: asInt(process.env.ORACLE_POOL_MIN, 2),
    poolMax: asInt(process.env.ORACLE_POOL_MAX, 20),
    poolIncrement: asInt(process.env.ORACLE_POOL_INCREMENT, 2),
    poolTimeout: asInt(process.env.ORACLE_POOL_TIMEOUT, 60),
  },
};

function validateConfig() {
  const missing = [];
  const profiles = config.oracle.profiles || {};
  const keys = Object.keys(profiles).filter((key) => profiles[key]?.user || profiles[key]?.password);

  if (!config.oracle.connectString) missing.push("DB_CONNECT_STRING");
  if (!config.jwtSecret) missing.push("JWT_SECRET");
  if (!config.loginEncryptionKey) missing.push("LOGIN_ENCRYPTION_KEY");
  if (keys.length === 0) missing.push("DB1_USER/DB1_PASSWORD (or DB2/DB3)");

  for (const key of keys) {
    if (!profiles[key].user) missing.push(`${key.toUpperCase()}_USER`);
    if (!profiles[key].password) missing.push(`${key.toUpperCase()}_PASSWORD`);
  }

  if (!profiles[config.oracle.defaultKey]?.user || !profiles[config.oracle.defaultKey]?.password) {
    missing.push("DB_DEFAULT_NAME or ORACLE_DEFAULT_DB_KEY must point to a configured DB profile");
  }

  if (missing.length > 0) {
    throw new Error(`Missing required configuration: ${missing.join(", ")}`);
  }
}

module.exports = {
  PORT: config.port,
  db1: {
    user: process.env.DB1_USER,
    password: process.env.DB1_PASSWORD,
  },
  db2: {
    user: process.env.DB2_USER,
    password: process.env.DB2_PASSWORD,
  },
  db3: {
    user: process.env.DB3_USER,
    password: process.env.DB3_PASSWORD,
  },
  DB_CONNECT_STRING,
  DB_DEFAULT_NAME: defaultDbKey,
  JWT_SECRET: config.jwtSecret,
  LOGIN_ENCRYPTION_KEY: config.loginEncryptionKey,
  NODE_ENV: config.nodeEnv,
  config,
  validateConfig,
};