const { createApp } = require('./src/app');
const { config } = require('./src/config/env');
const { initOraclePool, closeOraclePool } = require('./src/db/oracle');
const { logger } = require('./src/utils/logger');

async function bootstrap() {
  try {
    await initOraclePool();

    const app = createApp();

    // ✅ Detect IIS (iisnode sets IISNODE_VERSION, not just PORT)
    const isIIS = !!process.env.IISNODE_VERSION;

    // ✅ Use IIS port if IIS, else use config.port from .env
    const port = isIIS ? process.env.PORT : config.port;

    const server = app.listen(port, () => {
      logger.info(
        { port, env: config.nodeEnv, mode: isIIS ? 'IIS' : 'LOCAL' },
        'Server started'
      );
    });

    server.on('error', async (error) => {
      if (error.code === 'EADDRINUSE') {
        logger.error({ port }, 'Port already in use.');
      } else {
        logger.error({ err: error }, 'Server failed to start');
      }

      await closeOraclePool();
      process.exit(1);
    });

    const shutdown = async (signal) => {
      logger.info({ signal }, 'Shutting down gracefully');
      server.close(async () => {
        await closeOraclePool();
        process.exit(0);
      });
    };

    process.on('SIGINT', () => shutdown('SIGINT'));
    process.on('SIGTERM', () => shutdown('SIGTERM'));

  } catch (error) {
    logger.error({ err: error }, 'Failed to start server');
    process.exit(1);
  }
}

bootstrap();