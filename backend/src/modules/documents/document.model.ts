import mongoose, { Document as MongooseDoc, Schema, Types } from 'mongoose';

export type DocumentType = 
  | 'prescription' 
  | 'lab_report' 
  | 'diagnostic_report' 
  | 'discharge_summary' 
  | 'other';

export type ProcessingStatus = 
  | 'queued' 
  | 'processing' 
  | 'awaiting_review' 
  | 'completed' 
  | 'failed';

export interface IDocument extends MongooseDoc {
  userId: Types.ObjectId;
  originalName: string;
  storedFilename: string;
  mimeType: string;
  sizeBytes: number;
  pageCount: number;
  documentType: DocumentType;
  documentDate?: Date;
  processingStatus: ProcessingStatus;
  errorMessage?: string;
  sha256Hash?: string;
  createdAt: Date;
  updatedAt: Date;
}

const documentSchema = new Schema<IDocument>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    originalName: { type: String, required: true },
    storedFilename: { type: String, required: true, unique: true },
    mimeType: { type: String, required: true },
    sizeBytes: { type: Number, required: true },
    pageCount: { type: Number, default: 1 },
    documentType: { 
      type: String, 
      enum: ['prescription', 'lab_report', 'diagnostic_report', 'discharge_summary', 'other'], 
      default: 'other',
      index: true 
    },
    documentDate: { type: Date, index: true },
    processingStatus: { 
      type: String, 
      enum: ['queued', 'processing', 'awaiting_review', 'completed', 'failed'], 
      default: 'queued',
      index: true 
    },
    errorMessage: { type: String },
    sha256Hash: { type: String },
  },
  { timestamps: true }
);

documentSchema.index({ userId: 1, createdAt: -1 });

export const DocumentModel = mongoose.model<IDocument>('Document', documentSchema);
