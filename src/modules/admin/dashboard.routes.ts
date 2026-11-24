import { FastifyPluginAsync } from 'fastify';
import { User } from '../../models/User.js';
import { AgentProfile } from '../../models/AgentProfile.js';
import { Property } from '../../models/Property.js';
import { Inquiry } from '../../models/Inquiry.js';
import { MasterData } from '../../models/MasterData.js';

export const adminDashboardRoutes: FastifyPluginAsync = async (fastify) => {
  // GET /api/v1/admin/stats (Platform KPI Analytics)
  fastify.get(
    '/api/v1/admin/stats',
    { preHandler: [fastify.authenticate, fastify.requireRole('admin')] },
    async (request, reply) => {
      const [
        totalUsers,
        totalAgents,
        pendingAgents,
        totalProperties,
        approvedProperties,
        pendingProperties,
        totalInquiries,
        recentProperties,
      ] = await Promise.all([
        User.countDocuments({ role: 'user' }),
        User.countDocuments({ role: 'agent' }),
        AgentProfile.countDocuments({ verificationStatus: 'pending' }),
        Property.countDocuments(),
        Property.countDocuments({ status: 'approved' }),
        Property.countDocuments({ status: 'pending' }),
        Inquiry.countDocuments(),
        Property.find().sort({ createdAt: -1 }).limit(5).select('title price status location createdAt'),
      ]);

      return reply.send({
        data: {
          metrics: {
            totalUsers,
            totalAgents,
            pendingAgents,
            totalProperties,
            approvedProperties,
            pendingProperties,
            totalInquiries,
          },
          recentProperties,
        },
      });
    }
  );

  // GET /api/v1/admin/users (Manage users and agents)
  fastify.get<{ Querystring: { role?: string; search?: string } }>(
    '/api/v1/admin/users',
    { preHandler: [fastify.authenticate, fastify.requireRole('admin')] },
    async (request, reply) => {
      const filter: Record<string, any> = {};
      if (request.query.role && request.query.role !== 'all') {
        filter.role = request.query.role;
      }
      if (request.query.search) {
        filter.$or = [
          { name: new RegExp(request.query.search, 'i') },
          { email: new RegExp(request.query.search, 'i') },
        ];
      }

      const users = await User.find(filter)
        .select('-passwordHash')
        .sort({ createdAt: -1 });

      return reply.send({ data: users });
    }
  );

  // PATCH /api/v1/admin/users/:id/block (Deactivate / Activate user)
  fastify.patch<{ Params: { id: string }; Body: { isBlocked: boolean } }>(
    '/api/v1/admin/users/:id/block',
    { preHandler: [fastify.authenticate, fastify.requireRole('admin')] },
    async (request, reply) => {
      const user = await User.findById(request.params.id);
      if (!user) {
        return reply.status(404).send({
          error: { code: 'NOT_FOUND', message: 'User not found', requestId: request.id },
        });
      }

      // Safeguard: Do not block fellow admins
      if (user.role === 'admin' && request.body.isBlocked) {
        return reply.status(403).send({
          error: { code: 'FORBIDDEN', message: 'Platform Administrator accounts cannot be blocked', requestId: request.id },
        });
      }

      user.isBlocked = request.body.isBlocked;
      await user.save();

      return reply.send({ data: { id: user._id, isBlocked: user.isBlocked } });
    }
  );

  // POST /api/v1/admin/master (Add city, locality, property type, or amenity)
  fastify.post<{
    Body: { type: 'city' | 'locality' | 'property_type' | 'amenity'; name: string; category?: string; parent?: string };
  }>(
    '/api/v1/admin/master',
    { preHandler: [fastify.authenticate, fastify.requireRole('admin')] },
    async (request, reply) => {
      const { type, name, category, parent } = request.body;

      const item = await MasterData.create({
        type,
        name,
        category,
        parent,
        isActive: true,
      });

      return reply.status(201).send({ data: item });
    }
  );

  // DELETE /api/v1/admin/master/:id
  fastify.delete<{ Params: { id: string } }>(
    '/api/v1/admin/master/:id',
    { preHandler: [fastify.authenticate, fastify.requireRole('admin')] },
    async (request, reply) => {
      await MasterData.findByIdAndDelete(request.params.id);
      return reply.send({ data: { message: 'Master item deleted' } });
    }
  );
};
