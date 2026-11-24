import mongoose, { Schema, Document } from 'mongoose';

export interface IMasterData extends Document {
  type: 'city' | 'locality' | 'property_type' | 'amenity';
  name: string;
  code?: string;
  category?: string; // For property_type: 'residential' | 'commercial' | 'plot_land'
  parent?: string;   // For locality: city name or code
  icon?: string;
  isActive: boolean;
  order: number;
}

const MasterDataSchema = new Schema<IMasterData>(
  {
    type: { type: String, enum: ['city', 'locality', 'property_type', 'amenity'], required: true, index: true },
    name: { type: String, required: true, trim: true },
    code: { type: String, trim: true },
    category: { type: String, trim: true },
    parent: { type: String, trim: true, index: true },
    icon: { type: String },
    isActive: { type: Boolean, default: true, index: true },
    order: { type: Number, default: 0 },
  },
  {
    timestamps: true,
  }
);

MasterDataSchema.index({ type: 1, name: 1 }, { unique: true });

export const MasterData = mongoose.model<IMasterData>('MasterData', MasterDataSchema);
