import mongoose, { Document as MongooseDoc, Schema, Types } from 'mongoose';

export type ReviewStatus = 'unreviewed' | 'edited' | 'confirmed';

export interface IOcrPage {
  pageNumber: number;
  text: string;
  confidence?: number;
  engine: string;
  language?: string;
  warnings?: string[];
}

export interface IExtractedObservation {
  testName: string;
  standardizedCode?: string;
  valueNumeric?: number;
  valueString: string;
  unit?: string;
  referenceRangeLow?: number;
  referenceRangeHigh?: number;
  referenceRangeString?: string;
  referenceRangeSource?: string;
  isAbnormal?: boolean;
  pageNumber: number;
  sourceText?: string;
  confidence?: 'high' | 'medium' | 'low';
}

export interface IExtractedMedication {
  medicineName: string;
  dosage?: string;
  frequency?: string;
  route?: string;
  duration?: string;
  instructions?: string;
  pageNumber: number;
  sourceText?: string;
  confidence?: 'high' | 'medium' | 'low';
}

export interface IExtractedCondition {
  conditionName: string;
  icd10Code?: string;
  diagnosedDate?: string;
  notes?: string;
  pageNumber: number;
  sourceText?: string;
  confidence?: 'high' | 'medium' | 'low';
}

export interface IExtractedFollowUp {
  instruction: string;
  targetDate?: string;
  pageNumber: number;
}

export interface IStructuredData {
  documentType?: string;
  documentDate?: string;
  patientName?: string;
  patientAge?: string;
  patientGender?: string;
  providerName?: string;
  facilityName?: string;
  observations: IExtractedObservation[];
  medications: IExtractedMedication[];
  conditions: IExtractedCondition[];
  allergies: string[];
  followUps: IExtractedFollowUp[];
  summaryNote?: string;
  missingInformation: string[];
  uncertainInformation: string[];
}

export interface IExtraction extends MongooseDoc {
  documentId: Types.ObjectId;
  userId: Types.ObjectId;
  pages: IOcrPage[];
  ocrEngine: string;
  ocrVersion: string;
  structuredData: IStructuredData;
  reviewStatus: ReviewStatus;
  reviewedAt?: Date;
  reviewedBy?: Types.ObjectId;
  correctedFields?: string[];
  createdAt: Date;
  updatedAt: Date;
}

const extractionSchema = new Schema<IExtraction>(
  {
    documentId: { type: Schema.Types.ObjectId, ref: 'Document', required: true, unique: true, index: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    pages: [
      {
        pageNumber: { type: Number, required: true },
        text: { type: String, required: true },
        confidence: { type: Number },
        engine: { type: String, required: true },
        language: { type: String },
        warnings: { type: [String], default: [] },
      },
    ],
    ocrEngine: { type: String, default: 'tesseract' },
    ocrVersion: { type: String, default: '5.x' },
    structuredData: {
      documentType: { type: String },
      documentDate: { type: String },
      patientName: { type: String },
      patientAge: { type: String },
      patientGender: { type: String },
      providerName: { type: String },
      facilityName: { type: String },
      observations: [
        {
          testName: { type: String, required: true },
          standardizedCode: { type: String },
          valueNumeric: { type: Number },
          valueString: { type: String, required: true },
          unit: { type: String },
          referenceRangeLow: { type: Number },
          referenceRangeHigh: { type: Number },
          referenceRangeString: { type: String },
          referenceRangeSource: { type: String },
          isAbnormal: { type: Boolean, default: false },
          pageNumber: { type: Number, default: 1 },
          sourceText: { type: String },
          confidence: { type: String, enum: ['high', 'medium', 'low'], default: 'high' },
        },
      ],
      medications: [
        {
          medicineName: { type: String, required: true },
          dosage: { type: String },
          frequency: { type: String },
          route: { type: String },
          duration: { type: String },
          instructions: { type: String },
          pageNumber: { type: Number, default: 1 },
          sourceText: { type: String },
          confidence: { type: String, enum: ['high', 'medium', 'low'], default: 'high' },
        },
      ],
      conditions: [
        {
          conditionName: { type: String, required: true },
          icd10Code: { type: String },
          diagnosedDate: { type: String },
          notes: { type: String },
          pageNumber: { type: Number, default: 1 },
          sourceText: { type: String },
          confidence: { type: String, enum: ['high', 'medium', 'low'], default: 'high' },
        },
      ],
      allergies: { type: [String], default: [] },
      followUps: [
        {
          instruction: { type: String, required: true },
          targetDate: { type: String },
          pageNumber: { type: Number, default: 1 },
        },
      ],
      summaryNote: { type: String },
      missingInformation: { type: [String], default: [] },
      uncertainInformation: { type: [String], default: [] },
    },
    reviewStatus: { 
      type: String, 
      enum: ['unreviewed', 'edited', 'confirmed'], 
      default: 'unreviewed', 
      index: true 
    },
    reviewedAt: { type: Date },
    reviewedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    correctedFields: { type: [String], default: [] },
  },
  { timestamps: true }
);

export const ExtractionModel = mongoose.model<IExtraction>('Extraction', extractionSchema);
