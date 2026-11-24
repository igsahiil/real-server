import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { FastifyInstance } from 'fastify';
import { buildApp } from '../src/app.js';
import { User } from '../src/models/User.js';
import { AgentProfile } from '../src/models/AgentProfile.js';

describe('Authentication & Agent KYC Moderation', () => {
  let app: FastifyInstance;
  let adminToken: string;
  let agentId: string;
  let agentProfileId: string;

  beforeAll(async () => {
    app = await buildApp();
    await app.ready();
  });

  afterAll(async () => {
    // Cleanup created test users
    await User.deleteMany({ email: { $regex: /@test\.com$/ } });
    await app.close();
  });

  it('allows public user registration', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/register',
      payload: {
        name: 'Test Regular User',
        email: 'user1@test.com',
        password: 'Password@123',
        phone: '+91 9998887771',
      },
    });

    expect(res.statusCode).toBe(201);
    const body = JSON.parse(res.body);
    expect(body.data.user.email).toBe('user1@test.com');
    expect(body.data.user.role).toBe('user');
    expect(body.data.token).toBeDefined();
  });

  it('allows agent registration with KYC status pending', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/register-agent',
      payload: {
        name: 'Test Agent One',
        email: 'agent1@test.com',
        password: 'Password@123',
        agencyName: 'Acme Properties',
        licenseNo: 'RERA-TEST-001',
        idProofUrl: 'https://example.com/id.pdf',
        bio: 'Professional broker',
      },
    });

    expect(res.statusCode).toBe(201);
    const body = JSON.parse(res.body);
    expect(body.data.user.role).toBe('agent');
    expect(body.data.agentProfile.verificationStatus).toBe('pending');
    agentId = body.data.user.id;
    agentProfileId = body.data.agentProfile.id;
  });

  it('authenticates admin login', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: {
        email: 'admin@realestate.com',
        password: 'Admin@123456',
      },
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.data.user.role).toBe('admin');
    adminToken = body.data.token;
  });

  it('allows admin to list agents and approve KYC', async () => {
    const listRes = await app.inject({
      method: 'GET',
      url: '/api/v1/admin/agents?status=pending',
      headers: {
        authorization: `Bearer ${adminToken}`,
      },
    });

    expect(listRes.statusCode).toBe(200);
    const listBody = JSON.parse(listRes.body);
    expect(Array.isArray(listBody.data)).toBe(true);

    // Approve the test agent
    const verifyRes = await app.inject({
      method: 'PATCH',
      url: `/api/v1/admin/agents/${agentProfileId}/verify`,
      headers: {
        authorization: `Bearer ${adminToken}`,
      },
      payload: {
        status: 'approved',
      },
    });

    expect(verifyRes.statusCode).toBe(200);
    const verifyBody = JSON.parse(verifyRes.body);
    expect(verifyBody.data.verificationStatus).toBe('approved');
  });

  it('allows authenticated me fetch with profile', async () => {
    // Login as the approved agent
    const loginRes = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: {
        email: 'agent1@test.com',
        password: 'Password@123',
      },
    });

    const token = JSON.parse(loginRes.body).data.token;

    const meRes = await app.inject({
      method: 'GET',
      url: '/api/v1/auth/me',
      headers: {
        authorization: `Bearer ${token}`,
      },
    });

    expect(meRes.statusCode).toBe(200);
    const meBody = JSON.parse(meRes.body);
    expect(meBody.data.user.email).toBe('agent1@test.com');
    expect(meBody.data.agentProfile.verificationStatus).toBe('approved');
  });
});
