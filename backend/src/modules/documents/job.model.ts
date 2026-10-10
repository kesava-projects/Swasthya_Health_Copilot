import mongoose, { Document as MongooseDoc, Schema, Types } from 'mongoose';

export type JobType = 'ocr' | 'extraction' | 'summary';
export type JobStatus = 'queued' | 'processing' | 'completed' | 'failed';

export interface IDocumentProcessingJob extends MongooseDoc {
  documentId: Types.ObjectId;
  userId: Types.ObjectId;
  jobType: JobType;
  status: JobStatus;
  attemptCount: number;
  maxAttempts: number;
  logs: string[];
  error?: string;
  startedAt?: Date;
  completedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const jobSchema = new Schema<IDocumentProcessingJob>(
  {
    documentId: { type: Schema.Types.ObjectId, ref: 'Document', required: true, index: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    jobType: { type: String, enum: ['ocr', 'extraction', 'summary'], required: true },
    status: { type: String, enum: ['queued', 'processing', 'completed', 'failed'], default: 'queued', index: true },
    attemptCount: { type: Number, default: 0 },
    maxAttempts: { type: Number, default: 3 },
    logs: { type: [String], default: [] },
    error: { type: String },
    startedAt: { type: Date },
    completedAt: { type: Date },
  },
  { timestamps: true }
);

jobSchema.index({ status: 1, createdAt: 1 });

export const DocumentProcessingJobModel = mongoose.model<IDocumentProcessingJob>('DocumentProcessingJob', jobSchema);
