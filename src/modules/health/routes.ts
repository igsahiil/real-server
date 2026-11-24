import { FastifyPluginAsync } from 'fastify';
import mongoose from 'mongoose';

export const healthRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get('/health', async () => {
    const dbState = mongoose.connection.readyState;
    const dbStatusMap: Record<number, string> = {
      0: 'disconnected',
      1: 'connected',
      2: 'connecting',
      3: 'disconnecting',
    };

    return {
      status: dbState === 1 ? 'ok' : 'degraded',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      database: {
        status: dbStatusMap[dbState] || 'unknown',
        connected: dbState === 1,
      },
      environment: process.env.NODE_ENV || 'development',
    };
  });
};
