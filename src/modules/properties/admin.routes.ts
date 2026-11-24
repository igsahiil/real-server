import { FastifyPluginAsync } from 'fastify';
import { Property } from '../../models/Property.js';
import { VerifyPropertyBodySchema, VerifyPropertyBody } from './schemas.js';

export const adminPropertyRoutes: FastifyPluginAsync = async (fastify) => {
  // GET /api/v1/admin/properties (view moderation queue)
  fastify.get<{ Querystring: { status?: string } }>(
    '/api/v1/admin/properties',
    { preHandler: [fastify.authenticate, fastify.requireRole('admin')] },
    async (request, reply) => {
      const filter: Record<string, any> = {};
      if (request.query.status && request.query.status !== 'all') {
        filter.status = request.query.status;
      }

      const properties = await Property.find(filter)
        .populate('agentId', 'name email phone avatar')
        .sort({ createdAt: -1 });

      return reply.send({ data: properties });
    }
  );

  // PATCH /api/v1/admin/properties/:id/verify (approve or reject listing)
  fastify.patch<{ Params: { id: string }; Body: VerifyPropertyBody }>(
    '/api/v1/admin/properties/:id/verify',
    {
      schema: { body: VerifyPropertyBodySchema },
      preHandler: [fastify.authenticate, fastify.requireRole('admin')],
    },
    async (request, reply) => {
      const { id } = request.params;
      const { status, rejectionReason } = request.body;

      if (status === 'rejected' && !rejectionReason) {
        return reply.status(400).send({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'A rejection reason is required when rejecting a listing',
            requestId: request.id,
          },
        });
      }

      const property = await Property.findById(id);
      if (!property) {
        return reply.status(404).send({
          error: {
            code: 'NOT_FOUND',
            message: 'Property not found',
            requestId: request.id,
          },
        });
      }

      property.status = status;
      property.rejectionReason = status === 'rejected' ? rejectionReason : undefined;
      property.approvedBy = status === 'approved' ? (request.user.id as any) : undefined;
      property.approvedAt = status === 'approved' ? new Date() : undefined;

      await property.save();

      return reply.send({ data: property });
    }
  );

  // PATCH /api/v1/admin/properties/:id/feature
  fastify.patch<{ Params: { id: string }; Body: { isFeatured: boolean } }>(
    '/api/v1/admin/properties/:id/feature',
    { preHandler: [fastify.authenticate, fastify.requireRole('admin')] },
    async (request, reply) => {
      const { id } = request.params;
      const property = await Property.findByIdAndUpdate(
        id,
        { isFeatured: request.body.isFeatured },
        { new: true }
      );

      if (!property) {
        return reply.status(404).send({
          error: {
            code: 'NOT_FOUND',
            message: 'Property not found',
            requestId: request.id,
          },
        });
      }

      return reply.send({ data: property });
    }
  );
};
