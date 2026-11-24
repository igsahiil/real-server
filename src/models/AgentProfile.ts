import mongoose, { Schema, Document, Types } from 'mongoose';

export type AgentVerificationStatus = 'pending' | 'approved' | 'rejected' | 'suspended';

export interface IAgentProfile extends Document {
  userId: Types.ObjectId;
  agencyName?: string;
  licenseNo?: string;
  idProofUrl?: string;
  address?: string;
  bio?: string;
  verificationStatus: AgentVerificationStatus;
  rejectionReason?: string;
  verifiedBy?: Types.ObjectId;
  verifiedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const AgentProfileSchema = new Schema<IAgentProfile>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true, index: true },
    agencyName: { type: String, trim: true },
    licenseNo: { type: String, trim: true },
    idProofUrl: { type: String },
    address: { type: String, trim: true },
    bio: { type: String, trim: true },
    verificationStatus: {
      type: String,
      enum: ['pending', 'approved', 'rejected', 'suspended'],
      default: 'pending',
      index: true,
    },
    rejectionReason: { type: String, trim: true },
    verifiedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    verifiedAt: { type: Date },
  },
  {
    timestamps: true,
  }
);

export const AgentProfile = mongoose.model<IAgentProfile>('AgentProfile', AgentProfileSchema);
