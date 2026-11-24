import mongoose, { Schema, Document, Types } from 'mongoose';

export type PropertyListingType = 'sale' | 'rent' | 'lease';
export type PropertyCategory = 'residential' | 'commercial' | 'plot_land';
export type PropertyStatus =
  | 'draft'
  | 'pending'
  | 'approved'
  | 'rejected'
  | 'sold'
  | 'rented'
  | 'expired'
  | 'paused';

export interface IPropertyImage {
  url: string;
  publicId?: string;
  isCover: boolean;
}

export interface IPropertyLocation {
  country: string;
  state: string;
  city: string;
  locality: string;
  society?: string;
  pincode: string;
  address: string;
  geo: {
    type: 'Point';
    coordinates: [number, number]; // [longitude, latitude]
  };
  boundary?: {
    type: 'Polygon';
    coordinates: [number, number][][]; // [[[longitude, latitude], ...]]
  };
}

export interface IProperty extends Document {
  agentId: Types.ObjectId;
  title: string;
  slug: string;
  description: string;
  listingType: PropertyListingType;
  category: PropertyCategory;
  propertyType: string;
  price: number;
  priceNegotiable: boolean;
  maintenance?: number;
  securityDeposit?: number;
  location: IPropertyLocation;
  details: Record<string, any>;
  amenities: string[];
  images: IPropertyImage[];
  videoUrl?: string;
  floorPlanUrl?: string;
  status: PropertyStatus;
  rejectionReason?: string;
  approvedBy?: Types.ObjectId;
  approvedAt?: Date;
  isFeatured: boolean;
  views: number;
  createdAt: Date;
  updatedAt: Date;
  expiresAt?: Date;
}

const PropertySchema = new Schema<IProperty>(
  {
    agentId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    title: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, index: true, lowercase: true },
    description: { type: String, required: true },
    listingType: { type: String, enum: ['sale', 'rent', 'lease'], required: true, index: true },
    category: { type: String, enum: ['residential', 'commercial', 'plot_land'], required: true, index: true },
    propertyType: { type: String, required: true, index: true },
    price: { type: Number, required: true, index: true },
    priceNegotiable: { type: Boolean, default: false },
    maintenance: { type: Number },
    securityDeposit: { type: Number },
    location: {
      country: { type: String, default: 'India' },
      state: { type: String, default: 'Gujarat' },
      city: { type: String, required: true, index: true },
      locality: { type: String, required: true, index: true },
      society: { type: String },
      pincode: { type: String, required: true },
      address: { type: String, required: true },
      geo: {
        type: { type: String, enum: ['Point'], default: 'Point' },
        coordinates: { type: [Number], required: true }, // [lng, lat]
      },
      boundary: {
        type: { type: String, enum: ['Polygon'] },
        coordinates: { type: [[[Number]]] },
      },
    },
    details: { type: Schema.Types.Mixed, default: {} },
    amenities: [{ type: String, trim: true }],
    images: [
      {
        url: { type: String, required: true },
        publicId: { type: String },
        isCover: { type: Boolean, default: false },
      },
    ],
    videoUrl: { type: String },
    floorPlanUrl: { type: String },
    status: {
      type: String,
      enum: ['draft', 'pending', 'approved', 'rejected', 'sold', 'rented', 'expired', 'paused'],
      default: 'pending',
      index: true,
    },
    rejectionReason: { type: String, trim: true },
    approvedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    approvedAt: { type: Date },
    isFeatured: { type: Boolean, default: false, index: true },
    views: { type: Number, default: 0 },
    expiresAt: { type: Date },
  },
  {
    timestamps: true,
  }
);

// Geospatial 2dsphere index for radius/near-me queries
PropertySchema.index({ 'location.geo': '2dsphere' });

// Fast multi-facet search compound index
PropertySchema.index({ status: 1, listingType: 1, 'location.city': 1, price: 1 });

// Full text index for keywords
PropertySchema.index({
  title: 'text',
  description: 'text',
  'location.locality': 'text',
  'location.society': 'text',
});

export const Property = mongoose.model<IProperty>('Property', PropertySchema);
