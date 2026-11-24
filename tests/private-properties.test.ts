import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { FastifyInstance } from 'fastify';
import { buildApp } from '../src/app.js';
import { User } from '../src/models/User.js';
import { Property } from '../src/models/Property.js';

describe('Private & Public Property Isolation & Secure Token Sharing', () => {
  let app: FastifyInstance;
  let verifiedAgentToken: string;
  let privatePropertyId: string;
  let privatePropertySlug: string;
  let activeShareToken: string;

  beforeAll(async () => {
    app = await buildApp();
    await app.ready();

    // Login default verified agent
    const agentLogin = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: { email: 'agent@realestate.com', password: 'Agent@123456' },
    });
    verifiedAgentToken = JSON.parse(agentLogin.body).data.token;

    // Create an approved private property
    const agent = await User.findOne({ email: 'agent@realestate.com' });
    if (!agent) throw new Error('Agent not found');

    const privateProp = await Property.create({
      agentId: agent._id,
      title: 'Ultra Exclusive Off-Market Penthouse Bodakdev',
      slug: 'ultra-exclusive-off-market-penthouse-bodakdev-token-test',
      description: 'Private high net worth luxury listing. Excluded from public search.',
      listingType: 'sale',
      category: 'residential',
      propertyType: 'Penthouse',
      price: 35000000,
      location: {
        city: 'Ahmedabad',
        locality: 'Bodakdev',
        pincode: '380054',
        address: 'Secret Garden Road',
        geo: { type: 'Point', coordinates: [72.5122, 23.0416] },
      },
      details: { bedrooms: 4, bathrooms: 5, carpetArea: 4500 },
      amenities: ['Private Pool', 'Concierge Service'],
      images: [{ url: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c', isCover: true }],
      status: 'approved',
      visibility: 'private',
      isFeatured: false,
      views: 0,
    });

    privatePropertyId = privateProp._id.toString();
    privatePropertySlug = privateProp.slug;
  });

  afterAll(async () => {
    await Property.deleteMany({ slug: { $regex: /-token-test$/ } });
    await app.close();
  });

  it('excludes private properties from public faceted search', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/properties',
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    const found = body.data.some((p: any) => p._id === privatePropertyId);
    expect(found).toBe(false);
  });

  it('excludes private properties from public featured properties endpoint', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/properties/featured',
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    const found = body.data.some((p: any) => p._id === privatePropertyId);
    expect(found).toBe(false);
  });

  it('rejects public access to private property by slug without share token', async () => {
    const res = await app.inject({
      method: 'GET',
      url: `/api/v1/properties/${privatePropertySlug}`,
    });

    expect(res.statusCode).toBe(404);
  });

  it('allows agent to generate a share token for the private property', async () => {
    const res = await app.inject({
      method: 'POST',
      url: `/api/v1/agent/properties/${privatePropertyId}/share-token`,
      headers: { authorization: `Bearer ${verifiedAgentToken}` },
      payload: { expiresInDays: 14 },
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.data.shareToken).toBeDefined();
    expect(typeof body.data.shareToken).toBe('string');
    expect(body.data.isShareTokenActive).toBe(true);
    expect(body.data.sharePath).toContain(body.data.shareToken);

    activeShareToken = body.data.shareToken;
  });

  it('allows public visitor to view private property via token link', async () => {
    const res = await app.inject({
      method: 'GET',
      url: `/api/v1/properties/private/${activeShareToken}`,
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.data.property.title).toBe('Ultra Exclusive Off-Market Penthouse Bodakdev');
    expect(body.data.isPrivateView).toBe(true);
    expect(body.data.agentProfile).toBeDefined();
    expect(body.data.property.views).toBeGreaterThanOrEqual(1);
  });

  it('allows viewing private property by slug when valid shareToken query param is passed', async () => {
    const res = await app.inject({
      method: 'GET',
      url: `/api/v1/properties/${privatePropertySlug}?shareToken=${activeShareToken}`,
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.data.property._id).toBe(privatePropertyId);
    expect(body.data.isPrivateView).toBe(true);
  });

  it('allows agent to toggle property visibility', async () => {
    const res = await app.inject({
      method: 'PATCH',
      url: `/api/v1/agent/properties/${privatePropertyId}/visibility`,
      headers: { authorization: `Bearer ${verifiedAgentToken}` },
      payload: { visibility: 'public' },
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.data.visibility).toBe('public');

    // Toggle back to private
    await app.inject({
      method: 'PATCH',
      url: `/api/v1/agent/properties/${privatePropertyId}/visibility`,
      headers: { authorization: `Bearer ${verifiedAgentToken}` },
      payload: { visibility: 'private' },
    });
  });

  it('allows agent to revoke the share token and blocks subsequent access', async () => {
    const revokeRes = await app.inject({
      method: 'DELETE',
      url: `/api/v1/agent/properties/${privatePropertyId}/share-token`,
      headers: { authorization: `Bearer ${verifiedAgentToken}` },
    });

    expect(revokeRes.statusCode).toBe(200);

    // Subsequent access via revoked token must fail with 404
    const accessRes = await app.inject({
      method: 'GET',
      url: `/api/v1/properties/private/${activeShareToken}`,
    });

    expect(accessRes.statusCode).toBe(404);
  });
});
