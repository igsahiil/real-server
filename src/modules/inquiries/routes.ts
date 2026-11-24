import { FastifyPluginAsync } from 'fastify';
import { Inquiry } from '../../models/Inquiry.js';
import { Property } from '../../models/Property.js';
import {
  CreateInquiryBodySchema,
  UpdateInquiryStatusBodySchema,
  CreateInquiryBody,
  UpdateInquiryStatusBody,
} from './schemas.js';

export const inquiryRoutes: FastifyPluginAsync = async (fastify) => {
  // POST /api/v1/inquiries (submit inquiry on property)
  fastify.post<{ Body: CreateInquiryBody }>(
    '/api/v1/inquiries',
    { schema: { body: CreateInquiryBodySchema } },
    async (request, reply) => {
      const { propertyId, name, email, phone, message, preferredTime } = request.body;

      const property = await Property.findById(propertyId);
      if (!property) {
        return reply.status(404).send({
          error: {
            code: 'NOT_FOUND',
            message: 'Property listing not found',
            requestId: request.id,
          },
        });
      }

      // Check if user is authenticated optionally
      let userId: string | undefined;
      const token = request.cookies.token || request.headers.authorization?.replace(/^Bearer\s+/i, '');
      if (token) {
        try {
          const decoded: any = fastify.jwt.verify(token);
          userId = decoded.id;
        } catch {
          // Guest user, ignore JWT error
        }
      }

      const inquiry = await Inquiry.create({
        propertyId: property._id,
        agentId: property.agentId,
        userId,
        name,
        email,
        phone,
        message,
        preferredTime,
        status: 'new',
      });

      return reply.status(201).send({
        data: {
          id: inquiry._id,
          message: 'Inquiry sent successfully to the listing agent',
          status: inquiry.status,
        },
      });
    }
  );

  // GET /api/v1/inquiries/my (user's own submitted inquiries)
  fastify.get(
    '/api/v1/inquiries/my',
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const inquiries = await Inquiry.find({
        $or: [{ userId: request.user.id }, { email: request.user.email }],
      })
        .populate('propertyId', 'title slug price location images')
        .populate('agentId', 'name email phone avatar')
        .sort({ createdAt: -1 });

      return reply.send({ data: inquiries });
    }
  );

  // GET /api/v1/agent/inquiries (leads for the agent)
  fastify.get<{ Querystring: { status?: string } }>(
    '/api/v1/agent/inquiries',
    { preHandler: [fastify.authenticate, fastify.requireVerifiedAgent] },
    async (request, reply) => {
      const filter: Record<string, any> = { agentId: request.user.id };
      if (request.query.status && request.query.status !== 'all') {
        filter.status = request.query.status;
      }

      const inquiries = await Inquiry.find(filter)
        .populate('propertyId', 'title slug price location images')
        .sort({ createdAt: -1 });

      return reply.send({ data: inquiries });
    }
  );

  // PATCH /api/v1/agent/inquiries/:id/status (agent updates lead pipeline status)
  fastify.patch<{ Params: { id: string }; Body: UpdateInquiryStatusBody }>(
    '/api/v1/agent/inquiries/:id/status',
    {
      schema: { body: UpdateInquiryStatusBodySchema },
      preHandler: [fastify.authenticate, fastify.requireVerifiedAgent],
    },
    async (request, reply) => {
      const { id } = request.params;
      const { status, notes } = request.body;

      const inquiry = await Inquiry.findOne({
        _id: id,
        agentId: request.user.id,
      });

      if (!inquiry) {
        return reply.status(404).send({
          error: {
            code: 'NOT_FOUND',
            message: 'Inquiry not found or not assigned to you',
            requestId: request.id,
          },
        });
      }

      inquiry.status = status;
      if (notes !== undefined) inquiry.notes = notes;
      await inquiry.save();

      return reply.send({ data: inquiry });
    }
  );
};
