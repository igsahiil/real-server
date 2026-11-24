import { FastifyPluginAsync } from 'fastify';
import { Favorite } from '../../models/Favorite.js';
import { Property } from '../../models/Property.js';

export const favoriteRoutes: FastifyPluginAsync = async (fastify) => {
  // POST /api/v1/favorites/:propertyId
  fastify.post<{ Params: { propertyId: string } }>(
    '/api/v1/favorites/:propertyId',
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const { propertyId } = request.params;

      const property = await Property.findById(propertyId);
      if (!property) {
        return reply.status(404).send({
          error: { code: 'NOT_FOUND', message: 'Property not found', requestId: request.id },
        });
      }

      await Favorite.findOneAndUpdate(
        { userId: request.user.id, propertyId },
        { userId: request.user.id, propertyId },
        { upsert: true }
      );

      return reply.status(201).send({ data: { message: 'Property added to favorites', isFavorited: true } });
    }
  );

  // DELETE /api/v1/favorites/:propertyId
  fastify.delete<{ Params: { propertyId: string } }>(
    '/api/v1/favorites/:propertyId',
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const { propertyId } = request.params;

      await Favorite.findOneAndDelete({ userId: request.user.id, propertyId });

      return reply.send({ data: { message: 'Property removed from favorites', isFavorited: false } });
    }
  );

  // GET /api/v1/favorites
  fastify.get(
    '/api/v1/favorites',
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const favorites = await Favorite.find({ userId: request.user.id })
        .populate('propertyId')
        .sort({ createdAt: -1 });

      const properties = favorites.map((f) => f.propertyId).filter(Boolean);

      return reply.send({ data: properties });
    }
  );

  // GET /api/v1/favorites/check/:propertyId
  fastify.get<{ Params: { propertyId: string } }>(
    '/api/v1/favorites/check/:propertyId',
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const fav = await Favorite.findOne({
        userId: request.user.id,
        propertyId: request.params.propertyId,
      });

      return reply.send({ data: { isFavorited: !!fav } });
    }
  );
};
