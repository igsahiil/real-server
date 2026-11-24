import { FastifyPluginAsync } from 'fastify';
import { MasterData } from '../../models/MasterData.js';

export const masterDataRoutes: FastifyPluginAsync = async (fastify) => {
  // GET /api/v1/master/cities
  fastify.get('/api/v1/master/cities', async () => {
    const cities = await MasterData.find({ type: 'city', isActive: true }).sort({ order: 1, name: 1 });
    return { data: cities };
  });

  // GET /api/v1/master/localities
  fastify.get<{ Querystring: { city?: string } }>('/api/v1/master/localities', async (request) => {
    const filter: Record<string, any> = { type: 'locality', isActive: true };
    if (request.query.city) {
      filter.parent = new RegExp(`^${request.query.city.trim()}$`, 'i');
    }
    const localities = await MasterData.find(filter).sort({ order: 1, name: 1 });
    return { data: localities };
  });

  // GET /api/v1/master/property-types
  fastify.get<{ Querystring: { category?: string } }>('/api/v1/master/property-types', async (request) => {
    const filter: Record<string, any> = { type: 'property_type', isActive: true };
    if (request.query.category) {
      filter.category = request.query.category;
    }
    const types = await MasterData.find(filter).sort({ order: 1, name: 1 });
    return { data: types };
  });

  // GET /api/v1/master/amenities
  fastify.get('/api/v1/master/amenities', async () => {
    const amenities = await MasterData.find({ type: 'amenity', isActive: true }).sort({ order: 1, name: 1 });
    return { data: amenities };
  });
};
