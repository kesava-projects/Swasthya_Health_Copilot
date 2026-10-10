import mongoose, { Document as MongooseDoc, Schema, Types } from 'mongoose';

export type TimelineEventType = 
  | 'document_uploaded' 
  | 'lab_tested' 
  | 'prescription_issued' 
  | 'condition_noted' 
  | 'appointment'
  | 'summary_generated';

export type TimelineCategory = 'lab' | 'medication' | 'condition' | 'document' | 'other';

export interface IHealthTimelineEvent extends MongooseDoc {
  userId: Types.ObjectId;
  eventType: TimelineEventType;
  category: TimelineCategory;
  title: string;
  description: string;
  eventDate: Date; // Clinical/Medical date of the event
  uploadDate: Date; // Date document was uploaded to system
  sourceDocumentId?: Types.ObjectId;
  pageNumber?: number;
  relatedRecordId?: Types.ObjectId;
  isVerified: boolean;
  metadata?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

const timelineSchema = new Schema<IHealthTimelineEvent>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    eventType: { 
      type: String, 
      enum: ['document_uploaded', 'lab_tested', 'prescription_issued', 'condition_noted', 'appointment', 'summary_generated'], 
      required: true,
      index: true 
    },
    category: { 
      type: String, 
      enum: ['lab', 'medication', 'condition', 'document', 'other'], 
      required: true,
      index: true 
    },
    title: { type: String, required: true },
    description: { type: String, required: true },
    eventDate: { type: Date, required: true, index: true },
    uploadDate: { type: Date, default: Date.now },
    sourceDocumentId: { type: Schema.Types.ObjectId, ref: 'Document', index: true },
    pageNumber: { type: Number },
    relatedRecordId: { type: Schema.Types.ObjectId },
    isVerified: { type: Boolean, default: false, index: true },
    metadata: { type: Schema.Types.Mixed },
  },
  { timestamps: true }
);

timelineSchema.index({ userId: 1, eventDate: -1 });

export const HealthTimelineEventModel = mongoose.model<IHealthTimelineEvent>('HealthTimelineEvent', timelineSchema);
