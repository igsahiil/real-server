import { FastifyPluginAsync } from 'fastify';
import { Property } from '../../models/Property.js';
import { AgentProfile } from '../../models/AgentProfile.js';

interface PublicPropertyQuery {
  page?: string;
  limit?: string;
  listingType?: string;
  category?: string;
  propertyType?: string;
  city?: string;
  locality?: string;
  minPrice?: string;
  maxPrice?: string;
  bedrooms?: string;
  amenities?: string;
  isFeatured?: string;
  q?: string;
  lat?: string;
  lng?: string;
  radiusKm?: string;
  sort?: 'newest' | 'price_asc' | 'price_desc' | 'views';
}

export const publicPropertyRoutes: FastifyPluginAsync = async (fastify) => {
  // GET /api/v1/properties (public faceted search)
  fastify.get<{ Querystring: PublicPropertyQuery }>(
    '/api/v1/properties',
    async (request, reply) => {
      const q = request.query;
      const page = Math.max(1, parseInt(q.page || '1', 10));
      const limit = Math.min(50, Math.max(1, parseInt(q.limit || '12', 10)));
      const skip = (page - 1) * limit;

      // Invariant: Public discovery MUST only return approved properties and public visibility
      const filter: Record<string, any> = {
        status: 'approved',
        visibility: { $ne: 'private' },
      };

      if (q.listingType) filter.listingType = q.listingType;
      if (q.category) filter.category = q.category;
      if (q.propertyType) filter.propertyType = q.propertyType;
      if (q.city) filter['location.city'] = new RegExp(`^${q.city.trim()}$`, 'i');
      if (q.locality) {
        const localities = q.locality.split(',').map((l) => l.trim());
        filter['location.locality'] = { $in: localities.map((l) => new RegExp(l, 'i')) };
      }

      if (q.minPrice || q.maxPrice) {
        filter.price = {};
        if (q.minPrice) filter.price.$gte = Number(q.minPrice);
        if (q.maxPrice) filter.price.$lte = Number(q.maxPrice);
      }

      if (q.bedrooms) {
        const bCount = Number(q.bedrooms);
        filter.$or = [
          { 'details.bedrooms': bCount },
          { 'features.bedrooms': bCount },
        ];
      }

      if (q.amenities) {
        const amenitiesList = q.amenities.split(',').map((a) => a.trim());
        filter.amenities = { $all: amenitiesList };
      }

      if (q.isFeatured !== undefined) {
        filter.isFeatured = q.isFeatured === 'true';
      }

      // Keyword text search
      if (q.q && q.q.trim()) {
        filter.$text = { $search: q.q.trim() };
      }

      // Geospatial radius search (if coordinates provided)
      if (q.lat && q.lng) {
        const lat = parseFloat(q.lat);
        const lng = parseFloat(q.lng);
        const radiusMeters = parseFloat(q.radiusKm || '10') * 1000;

        filter['location.geo'] = {
          $nearSphere: {
            $geometry: {
              type: 'Point',
              coordinates: [lng, lat],
            },
            $maxDistance: radiusMeters,
          },
        };
      }

      // Sorting
      let sortOptions: Record<string, 1 | -1> = { createdAt: -1 };
      if (q.sort === 'price_asc') sortOptions = { price: 1 };
      else if (q.sort === 'price_desc') sortOptions = { price: -1 };
      else if (q.sort === 'views') sortOptions = { views: -1 };

      // Execute query and total count
      const [properties, total] = await Promise.all([
        Property.find(filter)
          .populate('agentId', 'name email phone avatar')
          .sort(filter['location.geo'] ? undefined : sortOptions) // $nearSphere does not support sort
          .skip(skip)
          .limit(limit),
        Property.countDocuments(filter),
      ]);

      return reply.send({
        data: properties,
        meta: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit),
        },
      });
    }
  );

  // GET /api/v1/properties/featured
  fastify.get('/api/v1/properties/featured', async (request, reply) => {
    const featured = await Property.find({
      status: 'approved',
      visibility: { $ne: 'private' },
      isFeatured: true,
    })
      .populate('agentId', 'name email phone avatar')
      .limit(6)
      .sort({ createdAt: -1 });

    return reply.send({ data: featured });
  });

  // GET /api/v1/properties/private/:token (Direct token access for off-market / private listings)
  fastify.get<{ Params: { token: string } }>(
    '/api/v1/properties/private/:token',
    async (request, reply) => {
      const { token } = request.params;
      const property = await Property.findOneAndUpdate(
        { shareToken: token, isShareTokenActive: true },
        { $inc: { views: 1 } },
        { new: true }
      ).populate('agentId', 'name email phone avatar');

      if (!property) {
        return reply.status(404).send({
          error: {
            code: 'NOT_FOUND',
            message: 'Private listing not found or the share link is invalid/revoked',
            requestId: request.id,
          },
        });
      }

      // Check token expiration if set
      if (property.shareTokenExpiresAt && new Date(property.shareTokenExpiresAt) < new Date()) {
        return reply.status(410).send({
          error: {
            code: 'TOKEN_EXPIRED',
            message: 'This private property share link has expired. Please contact the listing agent for an updated link.',
            requestId: request.id,
          },
        });
      }

      // Fetch agent profile
      const agentProfile = await AgentProfile.findOne({ userId: property.agentId });

      // Fetch related public listings
      const related = await Property.find({
        _id: { $ne: property._id },
        status: 'approved',
        visibility: { $ne: 'private' },
        category: property.category,
        'location.city': property.location.city,
      })
        .limit(3)
        .select('title slug price listingType category propertyType location images details');

      return reply.send({
        data: {
          property,
          agentProfile: agentProfile
            ? {
                agencyName: agentProfile.agencyName,
                licenseNo: agentProfile.licenseNo,
                bio: agentProfile.bio,
                verificationStatus: agentProfile.verificationStatus,
              }
            : undefined,
          related,
          isPrivateView: true,
        },
      });
    }
  );

  // GET /api/v1/properties/:slug
  fastify.get<{ Params: { slug: string }; Querystring: { shareToken?: string } }>(
    '/api/v1/properties/:slug',
    async (request, reply) => {
      const { slug } = request.params;
      const { shareToken } = request.query;

      // 1. First check if it's an approved public listing
      let property = await Property.findOneAndUpdate(
        { slug, status: 'approved', visibility: { $ne: 'private' } },
        { $inc: { views: 1 } },
        { new: true }
      ).populate('agentId', 'name email phone avatar');

      // 2. If not found as public, check if accessible via valid shareToken
      if (!property && shareToken) {
        const privateProp = await Property.findOne({
          slug,
          shareToken,
          isShareTokenActive: true,
        }).populate('agentId', 'name email phone avatar');

        if (privateProp) {
          // Verify expiration
          if (privateProp.shareTokenExpiresAt && new Date(privateProp.shareTokenExpiresAt) < new Date()) {
            return reply.status(410).send({
              error: {
                code: 'TOKEN_EXPIRED',
                message: 'This private property share link has expired.',
                requestId: request.id,
              },
            });
          }
          await Property.findByIdAndUpdate(privateProp._id, { $inc: { views: 1 } });
          property = privateProp;
        }
      }

      if (!property) {
        return reply.status(404).send({
          error: {
            code: 'NOT_FOUND',
            message: 'Property listing not found or is no longer publicly available',
            requestId: request.id,
          },
        });
      }

      // Fetch agent's profile details
      const agentProfile = await AgentProfile.findOne({ userId: property.agentId });

      // Fetch related listings in same city/category
      const related = await Property.find({
        _id: { $ne: property._id },
        status: 'approved',
        visibility: { $ne: 'private' },
        category: property.category,
        'location.city': property.location.city,
      })
        .limit(3)
        .select('title slug price listingType category propertyType location images details');

      return reply.send({
        data: {
          property,
          agentProfile: agentProfile
            ? {
                agencyName: agentProfile.agencyName,
                licenseNo: agentProfile.licenseNo,
                bio: agentProfile.bio,
                verificationStatus: agentProfile.verificationStatus,
              }
            : undefined,
          related,
          isPrivateView: property.visibility === 'private',
        },
      });
    }
  );
};
