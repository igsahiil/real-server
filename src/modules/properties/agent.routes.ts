import crypto from 'crypto';
import { FastifyPluginAsync } from 'fastify';
import { Property, IProperty } from '../../models/Property.js';
import { generatePropertySlug } from '../../utils/slug.js';
import {
  CreatePropertyBodySchema,
  UpdatePropertyBodySchema,
  GenerateShareTokenBodySchema,
  UpdateVisibilityBodySchema,
  CreatePropertyBody,
  UpdatePropertyBody,
  GenerateShareTokenBody,
  UpdateVisibilityBody,
} from './schemas.js';

export const agentPropertyRoutes: FastifyPluginAsync = async (fastify) => {
  // POST /api/v1/agent/properties (creates listing in pending status)
  fastify.post<{ Body: CreatePropertyBody }>(
    '/api/v1/agent/properties',
    {
      schema: { body: CreatePropertyBodySchema },
      preHandler: [fastify.authenticate, fastify.requireVerifiedAgent],
    },
    async (request, reply) => {
      const body = request.body;
      const slug = generatePropertySlug(body.title, body.location.city, body.location.locality);

      // Admin listings are auto-approved; Agent listings require moderation
      const initialStatus = request.user.role === 'admin' ? 'approved' : 'pending';

      const property = await Property.create({
        agentId: request.user.id,
        title: body.title,
        slug,
        description: body.description,
        listingType: body.listingType,
        category: body.category,
        propertyType: body.propertyType,
        price: body.price,
        priceNegotiable: body.priceNegotiable ?? false,
        maintenance: body.maintenance,
        securityDeposit: body.securityDeposit,
        location: {
          country: body.location.country || 'India',
          state: body.location.state || 'Gujarat',
          city: body.location.city,
          locality: body.location.locality,
          society: body.location.society,
          pincode: body.location.pincode,
          address: body.location.address,
          geo: {
            type: 'Point',
            coordinates: body.location.coordinates,
          },
          boundary: body.location.boundary,
        },
        details: body.details || {},
        amenities: body.amenities || [],
        images: body.images,
        videoUrl: body.videoUrl,
        floorPlanUrl: body.floorPlanUrl,
        visibility: body.visibility || 'public',
        status: initialStatus,
        approvedAt: initialStatus === 'approved' ? new Date() : undefined,
        approvedBy: initialStatus === 'approved' ? request.user.id : undefined,
      });

      return reply.status(201).send({ data: property });
    }
  );

  // GET /api/v1/agent/properties (fetch own properties with filter)
  fastify.get<{ Querystring: { status?: string } }>(
    '/api/v1/agent/properties',
    { preHandler: [fastify.authenticate, fastify.requireVerifiedAgent] },
    async (request, reply) => {
      const filter: Record<string, any> = { agentId: request.user.id };
      if (request.query.status && request.query.status !== 'all') {
        filter.status = request.query.status;
      }

      const properties = await Property.find(filter).sort({ createdAt: -1 });
      return reply.send({ data: properties });
    }
  );

  // PUT /api/v1/agent/properties/:id (edit own property with re-moderation guard)
  fastify.put<{ Params: { id: string }; Body: UpdatePropertyBody }>(
    '/api/v1/agent/properties/:id',
    {
      schema: { body: UpdatePropertyBodySchema },
      preHandler: [fastify.authenticate, fastify.requireVerifiedAgent],
    },
    async (request, reply) => {
      const property = await Property.findOne({
        _id: request.params.id,
        agentId: request.user.id,
      });

      if (!property) {
        return reply.status(404).send({
          error: {
            code: 'NOT_FOUND',
            message: 'Property listing not found or not owned by you',
            requestId: request.id,
          },
        });
      }

      const updates = request.body;

      // Check if critical fields were updated (price, location, details, images)
      const criticalFieldsChanged =
        (updates.price !== undefined && updates.price !== property.price) ||
        updates.location !== undefined ||
        updates.details !== undefined ||
        updates.images !== undefined;

      // Re-trigger pending status if critical fields changed on an already-approved listing
      if (property.status === 'approved' && criticalFieldsChanged && request.user.role !== 'admin') {
        property.status = 'pending';
        property.rejectionReason = undefined;
      }

      // Apply updates
      if (updates.title) property.title = updates.title;
      if (updates.description) property.description = updates.description;
      if (updates.listingType) property.listingType = updates.listingType;
      if (updates.category) property.category = updates.category;
      if (updates.propertyType) property.propertyType = updates.propertyType;
      if (updates.price !== undefined) property.price = updates.price;
      if (updates.priceNegotiable !== undefined) property.priceNegotiable = updates.priceNegotiable;
      if (updates.maintenance !== undefined) property.maintenance = updates.maintenance;
      if (updates.securityDeposit !== undefined) property.securityDeposit = updates.securityDeposit;
      if (updates.details) property.details = { ...property.details, ...updates.details };
      if (updates.amenities) property.amenities = updates.amenities;
      if (updates.images) property.images = updates.images;
      if (updates.videoUrl !== undefined) property.videoUrl = updates.videoUrl;
      if (updates.floorPlanUrl !== undefined) property.floorPlanUrl = updates.floorPlanUrl;
      if (updates.visibility) property.visibility = updates.visibility;

      if (updates.location) {
        property.location = {
          country: updates.location.country || property.location.country,
          state: updates.location.state || property.location.state,
          city: updates.location.city || property.location.city,
          locality: updates.location.locality || property.location.locality,
          society: updates.location.society || property.location.society,
          pincode: updates.location.pincode || property.location.pincode,
          address: updates.location.address || property.location.address,
          geo: updates.location.coordinates
            ? { type: 'Point', coordinates: updates.location.coordinates }
            : property.location.geo,
          boundary: updates.location.boundary !== undefined
            ? updates.location.boundary
            : property.location.boundary,
        };
      }

      await property.save();

      return reply.send({ data: property });
    }
  );

  // PATCH /api/v1/agent/properties/:id/visibility (toggle public / private)
  fastify.patch<{ Params: { id: string }; Body: UpdateVisibilityBody }>(
    '/api/v1/agent/properties/:id/visibility',
    {
      schema: { body: UpdateVisibilityBodySchema },
      preHandler: [fastify.authenticate, fastify.requireVerifiedAgent],
    },
    async (request, reply) => {
      const property = await Property.findOne({
        _id: request.params.id,
        agentId: request.user.id,
      });

      if (!property) {
        return reply.status(404).send({
          error: {
            code: 'NOT_FOUND',
            message: 'Property listing not found or not owned by you',
            requestId: request.id,
          },
        });
      }

      property.visibility = request.body.visibility;
      await property.save();

      return reply.send({ data: property });
    }
  );

  // POST /api/v1/agent/properties/:id/share-token (generate or refresh a secure share token)
  fastify.post<{ Params: { id: string }; Body: GenerateShareTokenBody }>(
    '/api/v1/agent/properties/:id/share-token',
    {
      schema: { body: GenerateShareTokenBodySchema },
      preHandler: [fastify.authenticate, fastify.requireVerifiedAgent],
    },
    async (request, reply) => {
      const property = await Property.findOne({
        _id: request.params.id,
        agentId: request.user.id,
      });

      if (!property) {
        return reply.status(404).send({
          error: {
            code: 'NOT_FOUND',
            message: 'Property listing not found or not owned by you',
            requestId: request.id,
          },
        });
      }

      const token = crypto.randomBytes(16).toString('hex');
      const expiresInDays = request.body?.expiresInDays ?? 30;
      const expiresAt = new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000);

      property.shareToken = token;
      property.shareTokenExpiresAt = expiresAt;
      property.isShareTokenActive = true;
      await property.save();

      return reply.send({
        data: {
          shareToken: token,
          sharePath: `/properties/private/${token}`,
          expiresAt,
          isShareTokenActive: true,
        },
      });
    }
  );

  // DELETE /api/v1/agent/properties/:id/share-token (revoke active share token)
  fastify.delete<{ Params: { id: string } }>(
    '/api/v1/agent/properties/:id/share-token',
    { preHandler: [fastify.authenticate, fastify.requireVerifiedAgent] },
    async (request, reply) => {
      const property = await Property.findOne({
        _id: request.params.id,
        agentId: request.user.id,
      });

      if (!property) {
        return reply.status(404).send({
          error: {
            code: 'NOT_FOUND',
            message: 'Property listing not found or not owned by you',
            requestId: request.id,
          },
        });
      }

      property.isShareTokenActive = false;
      property.shareToken = undefined;
      property.shareTokenExpiresAt = undefined;
      await property.save();

      return reply.send({
        data: {
          message: 'Share token has been revoked successfully',
        },
      });
    }
  );

  // DELETE /api/v1/agent/properties/:id
  fastify.delete<{ Params: { id: string } }>(
    '/api/v1/agent/properties/:id',
    { preHandler: [fastify.authenticate, fastify.requireVerifiedAgent] },
    async (request, reply) => {
      const property = await Property.findOneAndDelete({
        _id: request.params.id,
        agentId: request.user.id,
      });

      if (!property) {
        return reply.status(404).send({
          error: {
            code: 'NOT_FOUND',
            message: 'Property listing not found or not owned by you',
            requestId: request.id,
          },
        });
      }

      return reply.send({ data: { message: 'Property listing deleted successfully' } });
    }
  );
};
