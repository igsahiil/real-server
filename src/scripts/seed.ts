import mongoose from 'mongoose';
import { config } from '../config/env.js';
import { User } from '../models/User.js';
import { AgentProfile } from '../models/AgentProfile.js';
import { MasterData } from '../models/MasterData.js';
import { hashPassword } from '../utils/password.js';

async function seed() {
  console.log('Connecting to MongoDB at:', config.mongodbUri);
  await mongoose.connect(config.mongodbUri);

  console.log('Seeding initial data...');

  // 1. Seed Default Admin Users
  const adminEmail = 'admin@realestate.com';
  let admin = await User.findOne({ email: adminEmail });
  if (!admin) {
    const passwordHash = await hashPassword('Admin@123456');
    admin = await User.create({
      name: 'System Admin',
      email: adminEmail,
      phone: '+91 9876543210',
      passwordHash,
      role: 'admin',
      isEmailVerified: true,
      isBlocked: false,
    });
    console.log('✅ Created default admin:', adminEmail);
  } else {
    console.log('ℹ️ Admin already exists:', adminEmail);
  }

  // Also seed admin@sarjanrealty.com
  const sarjanAdminEmail = 'admin@sarjanrealty.com';
  const existingSarjanAdmin = await User.findOne({ email: sarjanAdminEmail });
  if (!existingSarjanAdmin) {
    const passwordHash = await hashPassword('Admin@12345');
    await User.create({
      name: 'Sarjan Realty Admin',
      email: sarjanAdminEmail,
      phone: '+91 9998887776',
      passwordHash,
      role: 'admin',
      isEmailVerified: true,
      isBlocked: false,
    });
    console.log('✅ Created Sarjan admin:', sarjanAdminEmail);
  }

  // 2. Seed Default Verified Agent
  const agentEmail = 'agent@realestate.com';
  let agent = await User.findOne({ email: agentEmail });
  if (!agent) {
    const passwordHash = await hashPassword('Agent@123456');
    agent = await User.create({
      name: 'Sahil Mehta',
      email: agentEmail,
      phone: '+91 9822334455',
      passwordHash,
      role: 'agent',
      isEmailVerified: true,
      isBlocked: false,
    });

    await AgentProfile.create({
      userId: agent._id,
      agencyName: 'Sarjan Realty Associates',
      licenseNo: 'RERA-GJ-2026-00491',
      idProofUrl: 'https://images.unsplash.com/photo-1544717305-2782549b5136',
      address: '104 Galaxy Hub, Satellite, Ahmedabad',
      bio: 'Over 12 years of premier luxury residential and commercial advisory in Ahmedabad.',
      verificationStatus: 'approved',
      verifiedBy: admin._id,
      verifiedAt: new Date(),
    });
    console.log('✅ Created default verified agent:', agentEmail);
  } else {
    console.log('ℹ️ Agent already exists:', agentEmail);
  }

  // 3. Seed Default Regular User
  const userEmail = 'user@realestate.com';
  let regularUser = await User.findOne({ email: userEmail });
  if (!regularUser) {
    const passwordHash = await hashPassword('User@123456');
    regularUser = await User.create({
      name: 'Priya Sharma',
      email: userEmail,
      phone: '+91 9811223344',
      passwordHash,
      role: 'user',
      isEmailVerified: true,
      isBlocked: false,
    });
    console.log('✅ Created default regular user:', userEmail);
  } else {
    console.log('ℹ️ Regular user already exists:', userEmail);
  }

  // 4. Seed Cities
  const cities = [
    { type: 'city', name: 'Ahmedabad', code: 'AMD', isActive: true, order: 1 },
    { type: 'city', name: 'Gandhinagar', code: 'GNR', isActive: true, order: 2 },
    { type: 'city', name: 'Vadodara', code: 'BDQ', isActive: true, order: 3 },
    { type: 'city', name: 'Surat', code: 'ST', isActive: true, order: 4 },
    { type: 'city', name: 'Mumbai', code: 'BOM', isActive: true, order: 5 },
  ];

  for (const c of cities) {
    await MasterData.findOneAndUpdate({ type: 'city', name: c.name }, c, { upsert: true });
  }
  console.log(`✅ Seeded ${cities.length} cities`);

  // 5. Seed Localities in Ahmedabad
  const localities = [
    { type: 'locality', name: 'Satellite', parent: 'Ahmedabad', isActive: true, order: 1 },
    { type: 'locality', name: 'Bodakdev', parent: 'Ahmedabad', isActive: true, order: 2 },
    { type: 'locality', name: 'Vastrapur', parent: 'Ahmedabad', isActive: true, order: 3 },
    { type: 'locality', name: 'Prahlad Nagar', parent: 'Ahmedabad', isActive: true, order: 4 },
    { type: 'locality', name: 'Thaltej', parent: 'Ahmedabad', isActive: true, order: 5 },
    { type: 'locality', name: 'SG Highway', parent: 'Ahmedabad', isActive: true, order: 6 },
    { type: 'locality', name: 'Science City', parent: 'Ahmedabad', isActive: true, order: 7 },
    { type: 'locality', name: 'Shela', parent: 'Ahmedabad', isActive: true, order: 8 },
  ];

  for (const l of localities) {
    await MasterData.findOneAndUpdate({ type: 'locality', name: l.name, parent: l.parent }, l, { upsert: true });
  }
  console.log(`✅ Seeded ${localities.length} localities`);

  // 6. Seed Property Types
  const propertyTypes = [
    { type: 'property_type', name: 'Apartment / Flat', category: 'residential', code: 'apt', isActive: true, order: 1 },
    { type: 'property_type', name: 'Villa / Bungalow', category: 'residential', code: 'villa', isActive: true, order: 2 },
    { type: 'property_type', name: 'Penthouse', category: 'residential', code: 'penthouse', isActive: true, order: 3 },
    { type: 'property_type', name: 'Independent Floor', category: 'residential', code: 'builder_floor', isActive: true, order: 4 },
    { type: 'property_type', name: 'Commercial Office', category: 'commercial', code: 'office', isActive: true, order: 5 },
    { type: 'property_type', name: 'Showroom / Retail', category: 'commercial', code: 'retail', isActive: true, order: 6 },
    { type: 'property_type', name: 'Warehouse / Godown', category: 'commercial', code: 'warehouse', isActive: true, order: 7 },
    { type: 'property_type', name: 'Residential Plot', category: 'plot_land', code: 'res_plot', isActive: true, order: 8 },
    { type: 'property_type', name: 'Agricultural Land', category: 'plot_land', code: 'agri_land', isActive: true, order: 9 },
  ];

  for (const pt of propertyTypes) {
    await MasterData.findOneAndUpdate({ type: 'property_type', name: pt.name }, pt, { upsert: true });
  }
  console.log(`✅ Seeded ${propertyTypes.length} property types`);

  // 7. Seed Amenities
  const amenities = [
    { type: 'amenity', name: 'Swimming Pool', icon: 'pool', isActive: true, order: 1 },
    { type: 'amenity', name: 'Gymnasium & Fitness', icon: 'barbell', isActive: true, order: 2 },
    { type: 'amenity', name: '24/7 Security & CCTV', icon: 'shield-check', isActive: true, order: 3 },
    { type: 'amenity', name: 'Power Backup', icon: 'bolt', isActive: true, order: 4 },
    { type: 'amenity', name: 'Clubhouse', icon: 'building-community', isActive: true, order: 5 },
    { type: 'amenity', name: 'Landscaped Garden', icon: 'trees', isActive: true, order: 6 },
    { type: 'amenity', name: 'Children Play Area', icon: 'mood-kid', isActive: true, order: 7 },
    { type: 'amenity', name: 'Covered Car Parking', icon: 'car', isActive: true, order: 8 },
    { type: 'amenity', name: 'High-Speed Elevators', icon: 'elevator', isActive: true, order: 9 },
    { type: 'amenity', name: 'Gated Community', icon: 'gate', isActive: true, order: 10 },
  ];

  for (const a of amenities) {
    await MasterData.findOneAndUpdate({ type: 'amenity', name: a.name }, a, { upsert: true });
  }
  console.log(`✅ Seeded ${amenities.length} amenities`);

  console.log('🎉 Seeding completed successfully!');
  await mongoose.disconnect();
}

seed().catch((err) => {
  console.error('Seeding failed:', err);
  process.exit(1);
});
