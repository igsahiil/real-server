import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { FastifyInstance } from 'fastify';
import { buildApp } from '../src/app.js';
import { Property } from '../src/models/Property.js';
import { User } from '../src/models/User.js';
import { Inquiry } from '../src/models/Inquiry.js';
import { Favorite } from '../src/models/Favorite.js';

describe('Inquiry Lead Pipeline & User Favorites', () => {
  let app: FastifyInstance;
  let userToken: string;
  let agentToken: string;
  let propertyId: string;
  let inquiryId: string;

  beforeAll(async () => {
    app = await buildApp();
    await app.ready();

    // Login regular user
    const userLogin = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: { email: 'user@realestate.com', password: 'User@123456' },
    });
    userToken = JSON.parse(userLogin.body).data.token;

    // Login agent
    const agentLogin = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: { email: 'agent@realestate.com', password: 'Agent@123456' },
    });
    agentToken = JSON.parse(agentLogin.body).data.token;

    // Create a dedicated property for this test suite
    const agent = await User.findOne({ email: 'agent@realestate.com' });
    if (!agent) throw new Error('Agent not found');

    const prop = await Property.create({
      agentId: agent._id,
      title: 'Inquiry Test Dedicated Apartment',
      slug: 'inquiry-test-dedicated-apartment',
      description: 'Dedicated listing for inquiry and favorite suite.',
      listingType: 'sale',
      category: 'residential',
      propertyType: 'Apartment',
      price: 5000000,
      location: {
        city: 'Ahmedabad',
        locality: 'Satellite',
        pincode: '380015',
        address: 'Satellite Road',
        geo: { type: 'Point', coordinates: [72.5293, 23.0298] },
      },
      images: [{ url: 'https://example.com/inquiry.jpg', isCover: true }],
      status: 'approved',
    });
    propertyId = prop._id.toString();
  });

  afterAll(async () => {
    if (inquiryId) await Inquiry.findByIdAndDelete(inquiryId);
    if (propertyId) await Property.findByIdAndDelete(propertyId);
    await Favorite.deleteMany({});
    await app.close();
  });

  it('submits a new property inquiry', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/inquiries',
      payload: {
        propertyId,
        name: 'Interested Buyer',
        email: 'buyer@example.com',
        phone: '+91 9898001122',
        message: 'Interested in scheduling a site visit this weekend.',
        preferredTime: 'Saturday 11:00 AM',
      },
    });

    expect(res.statusCode).toBe(201);
    const body = JSON.parse(res.body);
    expect(body.data.id).toBeDefined();
    expect(body.data.status).toBe('new');
    inquiryId = body.data.id;
  });

  it('allows agent to view leads and update status to contacted', async () => {
    const listRes = await app.inject({
      method: 'GET',
      url: '/api/v1/agent/inquiries?status=new',
      headers: { authorization: `Bearer ${agentToken}` },
    });

    expect(listRes.statusCode).toBe(200);
    const listBody = JSON.parse(listRes.body);
    expect(Array.isArray(listBody.data)).toBe(true);

    const updateRes = await app.inject({
      method: 'PATCH',
      url: `/api/v1/agent/inquiries/${inquiryId}/status`,
      headers: { authorization: `Bearer ${agentToken}` },
      payload: {
        status: 'contacted',
        notes: 'Called buyer. Scheduled site visit for Saturday morning.',
      },
    });

    expect(updateRes.statusCode).toBe(200);
    const updateBody = JSON.parse(updateRes.body);
    expect(updateBody.data.status).toBe('contacted');
    expect(updateBody.data.notes).toContain('Called buyer');
  });

  it('allows user to favorite and unfavorite a property', async () => {
    // 1. Add to favorites
    const addRes = await app.inject({
      method: 'POST',
      url: `/api/v1/favorites/${propertyId}`,
      headers: { authorization: `Bearer ${userToken}` },
    });
    expect(addRes.statusCode).toBe(201);

    // 2. Check favorites list
    const listRes = await app.inject({
      method: 'GET',
      url: '/api/v1/favorites',
      headers: { authorization: `Bearer ${userToken}` },
    });
    expect(listRes.statusCode).toBe(200);
    const listBody = JSON.parse(listRes.body);
    expect(listBody.data.some((p: any) => p._id === propertyId)).toBe(true);

    // 3. Remove from favorites
    const delRes = await app.inject({
      method: 'DELETE',
      url: `/api/v1/favorites/${propertyId}`,
      headers: { authorization: `Bearer ${userToken}` },
    });
    expect(delRes.statusCode).toBe(200);
  });
});
