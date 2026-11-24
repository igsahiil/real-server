import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { FastifyInstance } from 'fastify';
import { buildApp } from '../src/app.js';
import { User } from '../src/models/User.js';

describe('Admin Analytics, User Management & Master Data', () => {
  let app: FastifyInstance;
  let adminToken: string;
  let userToken: string;
  let regularUserId: string;

  beforeAll(async () => {
    app = await buildApp();
    await app.ready();

    // Login Admin
    const adminLogin = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: { email: 'admin@realestate.com', password: 'Admin@123456' },
    });
    adminToken = JSON.parse(adminLogin.body).data.token;

    // Login User
    const userLogin = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: { email: 'user@realestate.com', password: 'User@123456' },
    });
    const userBody = JSON.parse(userLogin.body);
    userToken = userBody.data.token;
    regularUserId = userBody.data.user.id;
  });

  afterAll(async () => {
    // Unblock test user if blocked
    await User.findByIdAndUpdate(regularUserId, { isBlocked: false });
    await app.close();
  });

  it('rejects non-admin access to admin dashboard stats', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/admin/stats',
      headers: { authorization: `Bearer ${userToken}` },
    });
    expect(res.statusCode).toBe(403);
  });

  it('returns platform analytics KPI metrics for admin', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/admin/stats',
      headers: { authorization: `Bearer ${adminToken}` },
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.data.metrics.totalUsers).toBeGreaterThanOrEqual(1);
    expect(body.data.metrics.totalAgents).toBeGreaterThanOrEqual(1);
    expect(body.data.metrics.totalProperties).toBeGreaterThanOrEqual(1);
    expect(Array.isArray(body.data.recentProperties)).toBe(true);
  });

  it('allows admin to list and block/unblock a user', async () => {
    // 1. List users
    const listRes = await app.inject({
      method: 'GET',
      url: '/api/v1/admin/users?role=user',
      headers: { authorization: `Bearer ${adminToken}` },
    });
    expect(listRes.statusCode).toBe(200);
    expect(JSON.parse(listRes.body).data.length).toBeGreaterThanOrEqual(1);

    // 2. Block user
    const blockRes = await app.inject({
      method: 'PATCH',
      url: `/api/v1/admin/users/${regularUserId}/block`,
      headers: { authorization: `Bearer ${adminToken}` },
      payload: { isBlocked: true },
    });
    expect(blockRes.statusCode).toBe(200);
    expect(JSON.parse(blockRes.body).data.isBlocked).toBe(true);

    // 3. Unblock user
    const unblockRes = await app.inject({
      method: 'PATCH',
      url: `/api/v1/admin/users/${regularUserId}/block`,
      headers: { authorization: `Bearer ${adminToken}` },
      payload: { isBlocked: false },
    });
    expect(unblockRes.statusCode).toBe(200);
    expect(JSON.parse(unblockRes.body).data.isBlocked).toBe(false);
  });
});
