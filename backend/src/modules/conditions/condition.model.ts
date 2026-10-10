import mongoose, { Document as MongooseDoc, Schema, Types } from 'mongoose';
import { VerificationStatus } from '../observations/observation.model.js';

export type ConditionStatus = 'active' | 'resolved' | 'chronic' | 'unknown';

export interface IConditionRecord extends MongooseDoc {
  userId: Types.ObjectId;
  sourceDocumentId: Types.ObjectId;
  pageNumber: number;
  conditionName: string;
  icd10Code?: string;
  diagnosedDate: Date;
  status: ConditionStatus;
  notes?: string;
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

const conditionSchema = new Schema<IConditionRecord>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    sourceDocumentId: { type: Schema.Types.ObjectId, ref: 'Document', required: true, index: true },
    pageNumber: { type: Number, default: 1 },
    conditionName: { type: String, required: true, index: true },
    icd10Code: { type: String },
    diagnosedDate: { type: Date, required: true, index: true },
    status: {
      type: String,
      enum: ['active', 'resolved', 'chronic', 'unknown'],
      default: 'unknown',
      index: true,
    },
    notes: { type: String },
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

conditionSchema.index({ userId: 1, diagnosedDate: -1 });

export const ConditionRecordModel = mongoose.model<IConditionRecord>('ConditionRecord', conditionSchema);
