import fp from 'fastify-plugin';
import { FastifyPluginAsync, FastifyError, FastifyRequest, FastifyReply } from 'fastify';

const errorHandlerPluginAsync: FastifyPluginAsync = async (fastify) => {
  fastify.setErrorHandler((error: FastifyError, request: FastifyRequest, reply: FastifyReply) => {
    const requestId = request.id || 'unknown';
    const statusCode = error.statusCode || 500;

    // Handle TypeBox validation errors
    if (error.validation) {
      reply.status(400).send({
        error: {
          code: 'VALIDATION_ERROR',
          message: error.message || 'Request validation failed',
          requestId,
          details: error.validation,
        },
      });
      return;
    }

    // Handle JWT errors
    if (error.code === 'FST_JWT_NO_AUTHORIZATION_IN_HEADER' || error.code === 'FST_JWT_AUTHORIZATION_TOKEN_EXPIRED') {
      reply.status(401).send({
        error: {
          code: 'UNAUTHORIZED',
          message: error.message,
          requestId,
        },
      });
      return;
    }

    // Default error response
    request.log.error(error, 'Unhandled error occurred');
    
    reply.status(statusCode).send({
      error: {
        code: error.code || 'INTERNAL_SERVER_ERROR',
        message: statusCode === 500 && process.env.NODE_ENV === 'production' 
          ? 'An internal server error occurred' 
          : error.message,
        requestId,
      },
    });
  });
};

export const errorHandlerPlugin = fp(errorHandlerPluginAsync, {
  name: 'error-handler-plugin',
});
