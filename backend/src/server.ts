import 'dotenv/config';
import { app } from './app';
import { env } from './config/env';
import { logger } from './config/logger';
import { prisma } from './lib/prisma';

const server = app.listen(env.PORT, () => {
  logger.info({ port: env.PORT }, 'MMK backend API is running');
});

const shutdown = async (signal: string) => {
  logger.info({ signal }, 'Shutting down API server');
  server.close(async () => {
    await prisma.$disconnect();
    process.exit(0);
  });
};

process.on('SIGINT', () => {
  void shutdown('SIGINT');
});

process.on('SIGTERM', () => {
  void shutdown('SIGTERM');
});
