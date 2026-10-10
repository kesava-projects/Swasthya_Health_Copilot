import mongoose, { Document as MongooseDoc, Schema, Types } from 'mongoose';

export type Interpretation = 'NORMAL' | 'HIGH' | 'LOW' | 'ABNORMAL' | 'UNKNOWN';
export type VerificationStatus = 'unverified' | 'user_confirmed' | 'provider_verified';

export interface IObservation extends MongooseDoc {
  userId: Types.ObjectId;
  sourceDocumentId: Types.ObjectId;
  pageNumber: number;
  testName: string;
  standardizedCode?: string; // LOINC if mapped
  valueNumeric?: number;
  valueString: string;
  unit?: string;
  referenceRangeLow?: number;
  referenceRangeHigh?: number;
  referenceRangeString?: string;
  referenceRangeSource?: string;
  interpretation: Interpretation;
  observationDate: Date;
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

const observationSchema = new Schema<IObservation>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    sourceDocumentId: { type: Schema.Types.ObjectId, ref: 'Document', required: true, index: true },
    pageNumber: { type: Number, default: 1 },
    testName: { type: String, required: true, index: true },
    standardizedCode: { type: String },
    valueNumeric: { type: Number, index: true },
    valueString: { type: String, required: true },
    unit: { type: String },
    referenceRangeLow: { type: Number },
    referenceRangeHigh: { type: Number },
    referenceRangeString: { type: String },
    referenceRangeSource: { type: String },
    interpretation: { 
      type: String, 
      enum: ['NORMAL', 'HIGH', 'LOW', 'ABNORMAL', 'UNKNOWN'], 
      default: 'UNKNOWN',
      index: true 
    },
    observationDate: { type: Date, required: true, index: true },
    verificationStatus: { 
      type: String, 
      enum: ['unverified', 'user_confirmed', 'provider_verified'], 
      default: 'unverified',
      index: true 
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

observationSchema.index({ userId: 1, testName: 1, observationDate: -1 });

export const ObservationModel = mongoose.model<IObservation>('Observation', observationSchema);
