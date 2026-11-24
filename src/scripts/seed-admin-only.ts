import mongoose from 'mongoose';
import { config } from '../config/env.js';
import { User } from '../models/User.js';
import { MasterData } from '../models/MasterData.js';
import { hashPassword } from '../utils/password.js';

async function seedAdminOnly() {
  console.log('Connecting to MongoDB Atlas at:', config.mongodbUri.replace(/:([^:@]{3})[^:@]*@/, ':***@'));
  await mongoose.connect(config.mongodbUri);

  console.log('Seeding ONLY Admin user in target database...');

  // 1. Create primary admin (admin@rvgroupltd.com)
  const primaryAdminEmail = 'admin@rvgroupltd.com';
  let primaryAdmin = await User.findOne({ email: primaryAdminEmail });
  if (!primaryAdmin) {
    const passwordHash = await hashPassword('Admin@12345');
    primaryAdmin = await User.create({
      name: 'RV Group Admin',
      email: primaryAdminEmail,
      phone: '+91 9998887776',
      passwordHash,
      role: 'admin',
      isEmailVerified: true,
      isBlocked: false,
    });
    console.log('✅ Created primary admin user:', primaryAdminEmail);
  } else {
    console.log('ℹ️ Primary admin already exists:', primaryAdminEmail);
  }

  // 2. Also ensure fallback demo admin (admin@realestate.com) exists
  const fallbackAdminEmail = 'admin@realestate.com';
  let fallbackAdmin = await User.findOne({ email: fallbackAdminEmail });
  if (!fallbackAdmin) {
    const passwordHash = await hashPassword('Admin@123456');
    fallbackAdmin = await User.create({
      name: 'System Admin',
      email: fallbackAdminEmail,
      phone: '+91 9876543210',
      passwordHash,
      role: 'admin',
      isEmailVerified: true,
      isBlocked: false,
    });
    console.log('✅ Created fallback admin user:', fallbackAdminEmail);
  } else {
    console.log('ℹ️ Fallback admin already exists:', fallbackAdminEmail);
  }

  // Verify no non-admin users exist
  const nonAdminCount = await User.countDocuments({ role: { $ne: 'admin' } });
  console.log(`ℹ️ Non-admin user count in database: ${nonAdminCount} (strictly 0 non-admins)`);

  // 3. Seed Essential Master Data Taxonomy (cities, property types, amenities)
  console.log('Seeding essential master taxonomy (cities, property types, amenities)...');

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

  console.log('🎉 Admin-only database setup completed successfully!');
  const allUsers = await User.find({}, { name: 1, email: 1, role: 1 });
  console.log('Current users in database:', allUsers);

  await mongoose.disconnect();
}

seedAdminOnly().catch((err) => {
  console.error('Seed Admin Only failed:', err);
  process.exit(1);
});
