import { createApp } from './app.js';
import { env } from './config/env.js';
import { connectDatabase, disconnectDatabase } from './config/database.js';
import { storageService } from './services/storage/storage.adapter.js';
import { logger } from './utils/logger.js';

async function bootstrap() {
  try {
    await connectDatabase();

    // Migrate any legacy upload files from disk into MongoDB GridFS
    if (storageService.migrateLegacyFiles) {
      await storageService.migrateLegacyFiles();
    }

    const app = createApp();
    const server = app.listen(env.PORT, () => {
      logger.info(`🚀 Swasthya Copilot API server is listening on port ${env.PORT} in ${env.NODE_ENV} mode`);
      logger.info(`🔗 Connected to Frontend Client at: ${env.CLIENT_URL}`);
      logger.info(`🔍 OCR Service configured at: ${env.OCR_SERVICE_URL}`);
    });

    const gracefulShutdown = async (signal: string) => {
      logger.info(`Received ${signal}. Gracefully shutting down...`);
      server.close(async () => {
        await disconnectDatabase();
        logger.info('Closed HTTP server and database connection.');
        process.exit(0);
      });
    };

    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));
  } catch (error) {
    logger.error('Fatal error during application startup:', { error });
    process.exit(1);
  }
}

bootstrap();
