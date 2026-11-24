import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { FastifyInstance } from 'fastify';
import { buildApp } from '../src/app.js';
import { User } from '../src/models/User.js';
import { Property } from '../src/models/Property.js';

describe('Public Property Catalog & Faceted Search', () => {
  let app: FastifyInstance;
  let testSlug: string;

  beforeAll(async () => {
    app = await buildApp();
    await app.ready();

    const agent = await User.findOne({ email: 'agent@realestate.com' });
    if (!agent) throw new Error('Default agent not found');

    // Create 1 approved property and 1 pending property
    const approved = await Property.create({
      agentId: agent._id,
      title: 'Modern 2 BHK Apartment Bodakdev',
      slug: 'modern-2-bhk-apartment-bodakdev-search-test',
      description: 'Well ventilated apartment near SG Highway with contemporary fittings.',
      listingType: 'sale',
      category: 'residential',
      propertyType: 'Apartment',
      price: 6500000,
      location: {
        city: 'Ahmedabad',
        locality: 'Bodakdev',
        pincode: '380054',
        address: 'Sindhu Bhavan Road',
        geo: { type: 'Point', coordinates: [72.5122, 23.0416] },
      },
      details: { bedrooms: 2, bathrooms: 2, carpetArea: 1200 },
      amenities: ['Power Backup', 'Covered Car Parking'],
      images: [{ url: 'https://example.com/p1.jpg', isCover: true }],
      status: 'approved',
      isFeatured: true,
      views: 10,
    });
    testSlug = approved.slug;

    // Create 1 pending property that should NOT appear in public catalog
    await Property.create({
      agentId: agent._id,
      title: 'Secret Pending Property',
      slug: 'secret-pending-property-search-test',
      description: 'Unreviewed property listing.',
      listingType: 'sale',
      category: 'residential',
      propertyType: 'Villa',
      price: 15000000,
      location: {
        city: 'Ahmedabad',
        locality: 'Bodakdev',
        pincode: '380054',
        address: 'Sindhu Bhavan Road',
        geo: { type: 'Point', coordinates: [72.5122, 23.0416] },
      },
      images: [{ url: 'https://example.com/p2.jpg', isCover: true }],
      status: 'pending',
    });
  });

  afterAll(async () => {
    await Property.deleteMany({ slug: { $regex: /-search-test$/ } });
    await app.close();
  });

  it('only returns approved properties in public search', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/properties',
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(Array.isArray(body.data)).toBe(true);
    
    // Invariant: No listing with status != 'approved' should ever be returned
    const nonApproved = body.data.filter((p: any) => p.status !== 'approved');
    expect(nonApproved.length).toBe(0);

    const foundApproved = body.data.find((p: any) => p.slug === testSlug);
    expect(foundApproved).toBeDefined();
  });

  it('filters properties by city and price range', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/properties?city=Ahmedabad&minPrice=6000000&maxPrice=7000000',
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.data.length).toBeGreaterThanOrEqual(1);
    expect(body.data[0].price).toBeGreaterThanOrEqual(6000000);
    expect(body.data[0].price).toBeLessThanOrEqual(7000000);
  });

  it('fetches property by slug and increments views atomically', async () => {
    const res1 = await app.inject({
      method: 'GET',
      url: `/api/v1/properties/${testSlug}`,
    });

    expect(res1.statusCode).toBe(200);
    const body1 = JSON.parse(res1.body);
    expect(body1.data.property.slug).toBe(testSlug);
    expect(body1.data.property.views).toBe(11); // Incremented from 10

    const res2 = await app.inject({
      method: 'GET',
      url: `/api/v1/properties/${testSlug}`,
    });

    expect(res2.statusCode).toBe(200);
    const body2 = JSON.parse(res2.body);
    expect(body2.data.property.views).toBe(12); // Incremented to 12
  });

  it('returns master data for cities, property types, and amenities', async () => {
    const citiesRes = await app.inject({ method: 'GET', url: '/api/v1/master/cities' });
    expect(citiesRes.statusCode).toBe(200);
    expect(JSON.parse(citiesRes.body).data.length).toBeGreaterThan(0);

    const amenitiesRes = await app.inject({ method: 'GET', url: '/api/v1/master/amenities' });
    expect(amenitiesRes.statusCode).toBe(200);
    expect(JSON.parse(amenitiesRes.body).data.length).toBeGreaterThan(0);
  });
});
