import fp from 'fastify-plugin';
import mongoose from 'mongoose';
import { FastifyPluginAsync } from 'fastify';
import { config } from '../config/env.js';

const mongoosePluginAsync: FastifyPluginAsync = async (fastify) => {
  try {
    mongoose.set('strictQuery', true);
    
    await mongoose.connect(config.mongodbUri, {
      autoIndex: config.isDev,
      serverSelectionTimeoutMS: 5000,
    });

    fastify.log.info({ uri: config.mongodbUri }, 'Connected to MongoDB successfully');

    mongoose.connection.on('error', (err) => {
      fastify.log.error(err, 'MongoDB connection error:');
    });

    mongoose.connection.on('disconnected', () => {
      fastify.log.warn('MongoDB connection lost. Reconnecting...');
    });

    fastify.addHook('onClose', async () => {
      await mongoose.disconnect();
      fastify.log.info('Disconnected from MongoDB');
    });
  } catch (error) {
    fastify.log.error(error, 'Failed to connect to MongoDB');
    throw error;
  }
};

export const mongoosePlugin = fp(mongoosePluginAsync, {
  name: 'mongoose-plugin',
});
