import mongoose, { Schema, Document, Types } from 'mongoose';

export type InquiryStatus = 'new' | 'contacted' | 'closed';

export interface IInquiry extends Document {
  propertyId: Types.ObjectId;
  agentId: Types.ObjectId;
  userId?: Types.ObjectId;
  name: string;
  email: string;
  phone: string;
  message: string;
  preferredTime?: string;
  status: InquiryStatus;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const InquirySchema = new Schema<IInquiry>(
  {
    propertyId: { type: Schema.Types.ObjectId, ref: 'Property', required: true, index: true },
    agentId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', index: true },
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, lowercase: true, trim: true },
    phone: { type: String, required: true, trim: true },
    message: { type: String, required: true },
    preferredTime: { type: String, trim: true },
    status: {
      type: String,
      enum: ['new', 'contacted', 'closed'],
      default: 'new',
      index: true,
    },
    notes: { type: String },
  },
  {
    timestamps: true,
  }
);

export const Inquiry = mongoose.model<IInquiry>('Inquiry', InquirySchema);
