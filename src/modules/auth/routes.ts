import { FastifyPluginAsync } from 'fastify';
import { AuthService } from './service.js';
import {
  RegisterBodySchema,
  RegisterAgentBodySchema,
  LoginBodySchema,
  RegisterBody,
  RegisterAgentBody,
  LoginBody,
} from './schemas.js';

export const authRoutes: FastifyPluginAsync = async (fastify) => {
  const isProd = process.env.NODE_ENV === 'production';
  const cookieOptions = {
    path: '/',
    httpOnly: true,
    secure: isProd,
    sameSite: (isProd ? 'none' : 'lax') as 'none' | 'lax',
    maxAge: 7 * 24 * 60 * 60, // 7 days
  };

  // POST /api/v1/auth/register (User)
  fastify.post<{ Body: RegisterBody }>(
    '/api/v1/auth/register',
    { schema: { body: RegisterBodySchema } },
    async (request, reply) => {
      const { user } = await AuthService.registerUser(request.body);

      const token = fastify.jwt.sign(
        { id: user._id.toString(), email: user.email, role: user.role },
        { expiresIn: '7d' }
      );

      reply.setCookie('token', token, cookieOptions);

      return reply.status(201).send({
        data: {
          user: {
            id: user._id,
            name: user.name,
            email: user.email,
            phone: user.phone,
            role: user.role,
            isEmailVerified: user.isEmailVerified,
          },
          token,
        },
      });
    }
  );

  // POST /api/v1/auth/register-agent
  fastify.post<{ Body: RegisterAgentBody }>(
    '/api/v1/auth/register-agent',
    { schema: { body: RegisterAgentBodySchema } },
    async (request, reply) => {
      const { user, profile } = await AuthService.registerAgent(request.body);

      const token = fastify.jwt.sign(
        { id: user._id.toString(), email: user.email, role: user.role },
        { expiresIn: '7d' }
      );

      reply.setCookie('token', token, cookieOptions);

      return reply.status(201).send({
        data: {
          user: {
            id: user._id,
            name: user.name,
            email: user.email,
            phone: user.phone,
            role: user.role,
            isEmailVerified: user.isEmailVerified,
          },
          agentProfile: {
            id: profile._id,
            agencyName: profile.agencyName,
            licenseNo: profile.licenseNo,
            verificationStatus: profile.verificationStatus,
          },
          token,
        },
      });
    }
  );

  // POST /api/v1/auth/login
  fastify.post<{ Body: LoginBody }>(
    '/api/v1/auth/login',
    { schema: { body: LoginBodySchema } },
    async (request, reply) => {
      const { user, profile } = await AuthService.login(request.body);

      const token = fastify.jwt.sign(
        { id: user._id.toString(), email: user.email, role: user.role },
        { expiresIn: '7d' }
      );

      reply.setCookie('token', token, cookieOptions);

      return reply.send({
        data: {
          user: {
            id: user._id,
            name: user.name,
            email: user.email,
            phone: user.phone,
            role: user.role,
            isEmailVerified: user.isEmailVerified,
          },
          agentProfile: profile
            ? {
                id: profile._id,
                agencyName: profile.agencyName,
                licenseNo: profile.licenseNo,
                verificationStatus: profile.verificationStatus,
                rejectionReason: profile.rejectionReason,
              }
            : undefined,
          token,
        },
      });
    }
  );

  // POST /api/v1/auth/logout
  fastify.post('/api/v1/auth/logout', async (request, reply) => {
    reply.clearCookie('token', {
      path: '/',
      secure: isProd,
      sameSite: (isProd ? 'none' : 'lax') as 'none' | 'lax',
    });
    return reply.send({ data: { message: 'Logged out successfully' } });
  });

  // GET /api/v1/auth/me
  fastify.get(
    '/api/v1/auth/me',
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const { user, profile } = await AuthService.getMe(request.user.id);

      return reply.send({
        data: {
          user: {
            id: user._id,
            name: user.name,
            email: user.email,
            phone: user.phone,
            role: user.role,
            isEmailVerified: user.isEmailVerified,
            avatar: user.avatar,
          },
          agentProfile: profile
            ? {
                id: profile._id,
                agencyName: profile.agencyName,
                licenseNo: profile.licenseNo,
                idProofUrl: profile.idProofUrl,
                address: profile.address,
                bio: profile.bio,
                verificationStatus: profile.verificationStatus,
                rejectionReason: profile.rejectionReason,
              }
            : undefined,
        },
      });
    }
  );
};
