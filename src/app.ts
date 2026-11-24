import fastify, { FastifyInstance, FastifyServerOptions } from 'fastify';
import fastifyCookie from '@fastify/cookie';
import fastifyCors from '@fastify/cors';
import fastifyHelmet from '@fastify/helmet';
import fastifyJwt from '@fastify/jwt';
import fastifyMultipart from '@fastify/multipart';
import fastifyRateLimit from '@fastify/rate-limit';
import { config } from './config/env.js';
import { mongoosePlugin } from './plugins/mongoose.js';
import { errorHandlerPlugin } from './plugins/errorHandler.js';
import { authGuardsPlugin } from './plugins/authGuards.js';
import { healthRoutes } from './modules/health/routes.js';
import { authRoutes } from './modules/auth/routes.js';
import { adminAgentRoutes } from './modules/admin/agents.routes.js';
import { agentPropertyRoutes } from './modules/properties/agent.routes.js';
import { adminPropertyRoutes } from './modules/properties/admin.routes.js';
import { publicPropertyRoutes } from './modules/properties/public.routes.js';
import { masterDataRoutes } from './modules/master/routes.js';
import { inquiryRoutes } from './modules/inquiries/routes.js';
import { favoriteRoutes } from './modules/favorites/routes.js';
import { adminDashboardRoutes } from './modules/admin/dashboard.routes.js';

export interface AppOptions extends FastifyServerOptions {
  skipDatabase?: boolean;
}

export async function buildApp(opts: AppOptions = {}): Promise<FastifyInstance> {
  const app = fastify({
    logger: config.isDev
      ? {
        transport: {
          target: 'pino-pretty',
          options: {
            colorize: true,
            translateTime: 'HH:MM:ss Z',
            ignore: 'pid,hostname',
          },
        },
      }
      : true,
    ...opts,
  });

  // Centralized Error Handler
  await app.register(errorHandlerPlugin);

  // Security Plugins
  await app.register(fastifyHelmet, {
    contentSecurityPolicy: config.isProd,
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  });

  await app.register(fastifyCors, {
    origin: [config.clientUrl, 'http://localhost:3001', 'https://www.rvgroupltd.in'],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  });

  await app.register(fastifyCookie, {
    secret: config.cookieSecret,
    parseOptions: {},
  });

  await app.register(fastifyJwt, {
    secret: config.jwtSecret,
    cookie: {
      cookieName: 'token',
      signed: false,
    },
  });

  // Auth Guards Decorators
  await app.register(authGuardsPlugin);

  // await app.register(fastifyRateLimit, {
  //   max: 200,
  //   timeWindow: '1 minute',
  //   allowList: ['127.0.0.1', 'localhost'],
  // });

  await app.register(fastifyMultipart, {
    limits: {
      fileSize: 10 * 1024 * 1024,
      files: 20,
    },
  });

  // Database Connection
  if (!opts.skipDatabase) {
    await app.register(mongoosePlugin);
  }

  // Routes
  await app.register(healthRoutes);
  await app.register(authRoutes);
  await app.register(adminAgentRoutes);
  await app.register(adminDashboardRoutes);
  await app.register(agentPropertyRoutes);
  await app.register(adminPropertyRoutes);
  await app.register(publicPropertyRoutes);
  await app.register(masterDataRoutes);
  await app.register(inquiryRoutes);
  await app.register(favoriteRoutes);

  return app;
}
