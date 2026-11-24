import fp from 'fastify-plugin';
import { FastifyPluginAsync, FastifyRequest, FastifyReply } from 'fastify';
import { AgentProfile } from '../models/AgentProfile.js';

export interface TokenPayload {
  id: string;
  email: string;
  role: 'admin' | 'agent' | 'user';
}

declare module '@fastify/jwt' {
  interface FastifyJWT {
    payload: TokenPayload;
    user: TokenPayload;
  }
}

declare module 'fastify' {
  interface FastifyInstance {
    authenticate: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
    requireRole: (...roles: Array<'admin' | 'agent' | 'user'>) => (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
    requireVerifiedAgent: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
  }
}

const authGuardsPluginAsync: FastifyPluginAsync = async (fastify) => {
  fastify.decorate('authenticate', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const token = request.cookies.token || request.headers.authorization?.replace(/^Bearer\s+/i, '');
      if (!token) {
        reply.status(401).send({
          error: {
            code: 'UNAUTHORIZED',
            message: 'Authentication token is required',
            requestId: request.id,
          },
        });
        return;
      }

      const decoded = fastify.jwt.verify<TokenPayload>(token);
      request.user = decoded;
    } catch (err: any) {
      reply.status(401).send({
        error: {
          code: 'UNAUTHORIZED',
          message: err.message || 'Invalid or expired session token',
          requestId: request.id,
        },
      });
    }
  });

  fastify.decorate('requireRole', (...roles: Array<'admin' | 'agent' | 'user'>) => {
    return async (request: FastifyRequest, reply: FastifyReply) => {
      if (!request.user || !roles.includes(request.user.role)) {
        reply.status(403).send({
          error: {
            code: 'FORBIDDEN',
            message: `Access denied. Requires one of roles: [${roles.join(', ')}]`,
            requestId: request.id,
          },
        });
      }
    };
  });

  fastify.decorate('requireVerifiedAgent', async (request: FastifyRequest, reply: FastifyReply) => {
    if (!request.user) {
      reply.status(401).send({
        error: {
          code: 'UNAUTHORIZED',
          message: 'Authentication required',
          requestId: request.id,
        },
      });
      return;
    }

    // Admins bypass agent KYC verification
    if (request.user.role === 'admin') {
      return;
    }

    if (request.user.role !== 'agent') {
      reply.status(403).send({
        error: {
          code: 'FORBIDDEN',
          message: 'Only registered agents or administrators can perform this action',
          requestId: request.id,
        },
      });
      return;
    }

    const profile = await AgentProfile.findOne({ userId: request.user.id });
    if (!profile || profile.verificationStatus !== 'approved') {
      reply.status(403).send({
        error: {
          code: 'AGENT_NOT_VERIFIED',
          message: 'Your agent account is currently pending verification or has been restricted by administrators.',
          requestId: request.id,
          details: {
            status: profile?.verificationStatus || 'unregistered',
            rejectionReason: profile?.rejectionReason,
          },
        },
      });
    }
  });
};

export const authGuardsPlugin = fp(authGuardsPluginAsync, {
  name: 'auth-guards-plugin',
  dependencies: ['@fastify/jwt', '@fastify/cookie'],
});
