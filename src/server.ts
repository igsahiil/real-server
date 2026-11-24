import { buildApp } from './app.js';
import { config } from './config/env.js';

// Connected to MongoDB Atlas cluster0
async function startServer() {
  const app = await buildApp();

  try {
    await app.listen({ port: config.port, host: config.host });
    app.log.info(`🚀 Real Estate Portal Server running at http://${config.host}:${config.port}`);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }

  // Graceful shutdown
  const signals: NodeJS.Signals[] = ['SIGINT', 'SIGTERM'];
  for (const signal of signals) {
    process.on(signal, async () => {
      app.log.info(`Received ${signal}, closing server gracefully...`);
      await app.close();
      process.exit(0);
    });
  }
}

startServer();
