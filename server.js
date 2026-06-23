const { createApp } = require('./src/app');
const { config } = require('./src/config/env');
const { initOraclePool, closeOraclePool } = require('./src/db/oracle');
const { logger } = require('./src/utils/logger');

async function bootstrap() {
  try {
    console.log('\n🔌 Connecting to Oracle Database...');
    await initOraclePool();
    console.log('✅ Oracle Database Connected Successfully!\n');

    const app = createApp();
    console.log('🔧 Initializing Express Server...');

    // ✅ Detect IIS (iisnode provides PORT)
    const isIIS = !!process.env.PORT;
    console.log(`🔧 IIS Detected: ${isIIS}`);
    // ✅ Use IIS port if available, else fallback to your env (5000)
    const port = isIIS ? process.env.PORT : config.port;
    console.log(`🔧 Server will listen on port: ${port}`);
    const server = app.listen(port, () => {
      console.log('\n🚀 Server is Running!');
      console.log(`   Port: ${port}`);
      console.log(`   Environment: ${config.nodeEnv}`);
      console.log(`   Mode: ${isIIS ? 'IIS' : 'LOCAL'}\n`);
      logger.info(
        { port, env: config.nodeEnv, mode: isIIS ? 'IIS' : 'LOCAL' },
        'Server started'
      );
    });
    console.log('🔧 Express Server Initialized Successfully!');
    server.on('error', async (error) => {
      console.error('❌ Server Error:', error);
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