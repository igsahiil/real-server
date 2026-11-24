import { FastifyPluginAsync } from 'fastify';
import { AgentProfile } from '../../models/AgentProfile.js';
import { VerifyAgentBodySchema, VerifyAgentBody } from '../auth/schemas.js';

export const adminAgentRoutes: FastifyPluginAsync = async (fastify) => {
  // GET /api/v1/admin/agents (filter by status)
  fastify.get<{ Querystring: { status?: string } }>(
    '/api/v1/admin/agents',
    { preHandler: [fastify.authenticate, fastify.requireRole('admin')] },
    async (request, reply) => {
      const filter: Record<string, any> = {};
      if (request.query.status) {
        filter.verificationStatus = request.query.status;
      }

      const agents = await AgentProfile.find(filter)
        .populate('userId', 'name email phone avatar createdAt')
        .populate('verifiedBy', 'name email')
        .sort({ createdAt: -1 });

      return reply.send({ data: agents });
    }
  );

  // PATCH /api/v1/admin/agents/:id/verify
  fastify.patch<{ Params: { id: string }; Body: VerifyAgentBody }>(
    '/api/v1/admin/agents/:id/verify',
    {
      schema: { body: VerifyAgentBodySchema },
      preHandler: [fastify.authenticate, fastify.requireRole('admin')],
    },
    async (request, reply) => {
      const { id } = request.params;
      const { status, rejectionReason } = request.body;

      if (status === 'rejected' && !rejectionReason) {
        return reply.status(400).send({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'A rejection reason is required when rejecting an agent',
            requestId: request.id,
          },
        });
      }

      const agent = await AgentProfile.findById(id);
      if (!agent) {
        return reply.status(404).send({
          error: {
            code: 'NOT_FOUND',
            message: 'Agent profile not found',
            requestId: request.id,
          },
        });
      }

      agent.verificationStatus = status;
      agent.rejectionReason = status === 'rejected' ? rejectionReason : undefined;
      agent.verifiedBy = request.user.id as any;
      agent.verifiedAt = new Date();
      await agent.save();

      return reply.send({
        data: {
          id: agent._id,
          verificationStatus: agent.verificationStatus,
          rejectionReason: agent.rejectionReason,
          verifiedAt: agent.verifiedAt,
        },
      });
    }
  );
};
