import mongoose from 'mongoose';
import { Property } from '../models/Property.js';
import { User } from '../models/User.js';
import { AgentProfile } from '../models/AgentProfile.js';
import { Favorite } from '../models/Favorite.js';
import { Inquiry } from '../models/Inquiry.js';
import { config } from '../config/env.js';

async function verifyIndexes() {
  await mongoose.connect(config.mongodbUri);

  console.log('--- Database Index Sync & Audit ---');

  await Promise.all([
    Property.createIndexes(),
    User.createIndexes(),
    AgentProfile.createIndexes(),
    Favorite.createIndexes(),
    Inquiry.createIndexes(),
  ]);

  const propertyIndexes = await Property.collection.indexes();
  console.log('\nProperty Collection Indexes:');
  for (const idx of propertyIndexes) {
    console.log(` - ${idx.name}:`, JSON.stringify(idx.key));
  }

  const userIndexes = await User.collection.indexes();
  console.log('\nUser Collection Indexes:');
  for (const idx of userIndexes) {
    console.log(` - ${idx.name}:`, JSON.stringify(idx.key));
  }

  const favoriteIndexes = await Favorite.collection.indexes();
  console.log('\nFavorite Collection Indexes:');
  for (const idx of favoriteIndexes) {
    console.log(` - ${idx.name}:`, JSON.stringify(idx.key));
  }

  const inquiryIndexes = await Inquiry.collection.indexes();
  console.log('\nInquiry Collection Indexes:');
  for (const idx of inquiryIndexes) {
    console.log(` - ${idx.name}:`, JSON.stringify(idx.key));
  }

  await mongoose.disconnect();
}

verifyIndexes().catch(console.error);
