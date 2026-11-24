import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { FastifyInstance } from 'fastify';
import { buildApp } from '../src/app.js';
import { User } from '../src/models/User.js';
import { AgentProfile } from '../src/models/AgentProfile.js';
import { Property } from '../src/models/Property.js';

describe('Property Moderation Lifecycle & Re-Moderation Guard', () => {
  let app: FastifyInstance;
  let adminToken: string;
  let verifiedAgentToken: string;
  let pendingAgentToken: string;
  let propertyId: string;

  beforeAll(async () => {
    app = await buildApp();
    await app.ready();

    // 1. Login default verified agent
    const agentLogin = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: { email: 'agent@realestate.com', password: 'Agent@123456' },
    });
    verifiedAgentToken = JSON.parse(agentLogin.body).data.token;

    // 2. Login admin
    const adminLogin = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: { email: 'admin@realestate.com', password: 'Admin@123456' },
    });
    adminToken = JSON.parse(adminLogin.body).data.token;

    // 3. Register a new agent with pending status
    const pendingAgentRes = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/register-agent',
      payload: {
        name: 'Pending Agent',
        email: 'pending_agent@test.com',
        password: 'Password@123',
        agencyName: 'Pending Realty',
      },
    });
    pendingAgentToken = JSON.parse(pendingAgentRes.body).data.token;
  });

  afterAll(async () => {
    await Property.deleteMany({ title: { $regex: /Luxury 3 BHK Penthouse/i } });
    await User.deleteMany({ email: 'pending_agent@test.com' });
    await AgentProfile.deleteMany({ agencyName: 'Pending Realty' });
    await app.close();
  });

  it('blocks unverified agents from creating property listings', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/agent/properties',
      headers: { authorization: `Bearer ${pendingAgentToken}` },
      payload: {
        title: 'Unverified Agent Listing',
        description: 'This listing should be rejected by the KYC guard',
        listingType: 'sale',
        category: 'residential',
        propertyType: 'Apartment',
        price: 7500000,
        location: {
          city: 'Ahmedabad',
          locality: 'Satellite',
          pincode: '380015',
          address: 'Main road',
          coordinates: [72.5293, 23.0298],
        },
        images: [{ url: 'https://example.com/photo.jpg', isCover: true }],
      },
    });

    expect(res.statusCode).toBe(403);
    const body = JSON.parse(res.body);
    expect(body.error.code).toBe('AGENT_NOT_VERIFIED');
  });

  it('allows verified agent to create listing in pending status', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/agent/properties',
      headers: { authorization: `Bearer ${verifiedAgentToken}` },
      payload: {
        title: 'Luxury 3 BHK Penthouse Satellite',
        description: 'Exquisite penthouse with sprawling private terrace and panoramic sunset views.',
        listingType: 'sale',
        category: 'residential',
        propertyType: 'Apartment',
        price: 18500000,
        priceNegotiable: true,
        location: {
          country: 'India',
          state: 'Gujarat',
          city: 'Ahmedabad',
          locality: 'Satellite',
          society: 'Iscon Platinum',
          pincode: '380015',
          address: 'B-1402, Iscon Platinum, Satellite',
          coordinates: [72.5293, 23.0298],
        },
        details: {
          bedrooms: 3,
          bathrooms: 4,
          carpetArea: 2450,
          furnishing: 'fully',
        },
        amenities: ['Swimming Pool', 'Gymnasium & Fitness', '24/7 Security & CCTV'],
        images: [
          { url: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c', isCover: true },
          { url: 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9', isCover: false },
        ],
      },
    });

    expect(res.statusCode).toBe(201);
    const body = JSON.parse(res.body);
    expect(body.data.status).toBe('pending');
    expect(body.data.slug).toContain('luxury-3-bhk-penthouse-satellite');
    propertyId = body.data._id;
  });

  it('allows admin to approve pending property listing', async () => {
    const res = await app.inject({
      method: 'PATCH',
      url: `/api/v1/admin/properties/${propertyId}/verify`,
      headers: { authorization: `Bearer ${adminToken}` },
      payload: { status: 'approved' },
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.data.status).toBe('approved');
  });

  it('automatically resets status to pending when critical field (price) is updated by agent', async () => {
    const res = await app.inject({
      method: 'PUT',
      url: `/api/v1/agent/properties/${propertyId}`,
      headers: { authorization: `Bearer ${verifiedAgentToken}` },
      payload: {
        price: 19500000, // Price updated
      },
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    // Verified invariant: critical modification reset status to pending
    expect(body.data.status).toBe('pending');
    expect(body.data.price).toBe(19500000);
  });
});
