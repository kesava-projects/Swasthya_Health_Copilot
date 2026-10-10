import mongoose, { Document as MongooseDoc, Schema, Types } from 'mongoose';
import { VerificationStatus } from '../observations/observation.model.js';

export interface IMedicationRecord extends MongooseDoc {
  userId: Types.ObjectId;
  sourceDocumentId: Types.ObjectId;
  pageNumber: number;
  medicineName: string;
  dosage?: string;
  frequency?: string;
  route?: string;
  duration?: string;
  instructions?: string;
  prescribedDate: Date;
  isCurrent: boolean;
  verificationStatus: VerificationStatus;
  provenance: {
    ocrEngine: string;
    aiModel?: string;
    sourceText?: string;
    confirmedAt?: Date;
    correctedBy?: Types.ObjectId;
  };
  createdAt: Date;
  updatedAt: Date;
}

const medicationSchema = new Schema<IMedicationRecord>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    sourceDocumentId: { type: Schema.Types.ObjectId, ref: 'Document', required: true, index: true },
    pageNumber: { type: Number, default: 1 },
    medicineName: { type: String, required: true, index: true },
    dosage: { type: String },
    frequency: { type: String },
    route: { type: String },
    duration: { type: String },
    instructions: { type: String },
    prescribedDate: { type: Date, required: true, index: true },
    isCurrent: { type: Boolean, default: true, index: true },
    verificationStatus: {
      type: String,
      enum: ['unverified', 'user_confirmed', 'provider_verified'],
      default: 'unverified',
      index: true,
    },
    provenance: {
      ocrEngine: { type: String, default: 'tesseract' },
      aiModel: { type: String },
      sourceText: { type: String },
      confirmedAt: { type: Date },
      correctedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    },
  },
  { timestamps: true }
);

medicationSchema.index({ userId: 1, prescribedDate: -1 });

export const MedicationRecordModel = mongoose.model<IMedicationRecord>('MedicationRecord', medicationSchema);
