import mongoose, { Document as MongooseDoc, Schema, Types } from 'mongoose';

export type ReminderType = 'appointment' | 'medication' | 'lab_followup';
export type ReminderStatus = 'pending' | 'snoozed' | 'completed' | 'cancelled';

export interface IReminder extends MongooseDoc {
  userId: Types.ObjectId;
  title: string;
  notes?: string;
  reminderType: ReminderType;
  scheduledTime: Date;
  status: ReminderStatus;
  userConfirmed: boolean;
  sourceDocumentId?: Types.ObjectId;
  dosage?: string;
  frequency?: string;
  delivered: boolean;
  deliveredAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const reminderSchema = new Schema<IReminder>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    title: { type: String, required: true },
    notes: { type: String },
    reminderType: { 
      type: String, 
      enum: ['appointment', 'medication', 'lab_followup'], 
      required: true,
      index: true 
    },
    scheduledTime: { type: Date, required: true, index: true },
    status: { 
      type: String, 
      enum: ['pending', 'snoozed', 'completed', 'cancelled'], 
      default: 'pending',
      index: true 
    },
    userConfirmed: { type: Boolean, default: true },
    sourceDocumentId: { type: Schema.Types.ObjectId, ref: 'Document' },
    dosage: { type: String },
    frequency: { type: String },
    delivered: { type: Boolean, default: false },
    deliveredAt: { type: Date },
  },
  { timestamps: true }
);

reminderSchema.index({ userId: 1, scheduledTime: 1 });

export const ReminderModel = mongoose.model<IReminder>('Reminder', reminderSchema);
