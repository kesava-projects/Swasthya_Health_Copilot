import mongoose, { Document as MongooseDoc, Schema, Types } from 'mongoose';

export interface ISummary extends MongooseDoc {
  userId: Types.ObjectId;
  documentId?: Types.ObjectId; // null for overall patient summary
  summaryType: 'document' | 'patient_overall';
  language: 'en' | 'te' | 'hi';
  title: string;
  keyFindings: string[];
  abnormalValues: {
    testName: string;
    value: string;
    referenceRange?: string;
    flag: string;
    pageNumber?: number;
  }[];
  simpleExplanation: string;
  missingOrUncertainInfo: string[];
  suggestedQuestionsForDoctor: string[];
  sourcePageReferences: number[];
  generatedWithModel: string;
  createdAt: Date;
  updatedAt: Date;
}

const summarySchema = new Schema<ISummary>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    documentId: { type: Schema.Types.ObjectId, ref: 'Document', index: true },
    summaryType: { type: String, enum: ['document', 'patient_overall'], required: true },
    language: { type: String, enum: ['en', 'te', 'hi'], default: 'en' },
    title: { type: String, required: true },
    keyFindings: { type: [String], default: [] },
    abnormalValues: [
      {
        testName: { type: String, required: true },
        value: { type: String, required: true },
        referenceRange: { type: String },
        flag: { type: String, required: true },
        pageNumber: { type: Number },
      },
    ],
    simpleExplanation: { type: String, required: true },
    missingOrUncertainInfo: { type: [String], default: [] },
    suggestedQuestionsForDoctor: { type: [String], default: [] },
    sourcePageReferences: { type: [Number], default: [] },
    generatedWithModel: { type: String, required: true },
  },
  { timestamps: true }
);

summarySchema.index({ userId: 1, documentId: 1, language: 1 });

export const SummaryModel = mongoose.model<ISummary>('Summary', summarySchema);
