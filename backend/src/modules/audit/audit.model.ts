import mongoose, { Document as MongooseDoc, Schema, Types } from 'mongoose';

export type AuditAction = 
  | 'REGISTER'
  | 'LOGIN'
  | 'LOGOUT'
  | 'VIEW_PROFILE'
  | 'UPDATE_PROFILE'
  | 'UPLOAD_DOCUMENT'
  | 'VIEW_DOCUMENT'
  | 'DOWNLOAD_DOCUMENT'
  | 'DELETE_DOCUMENT'
  | 'EDIT_EXTRACTION'
  | 'CONFIRM_EXTRACTION'
  | 'VIEW_OBSERVATIONS'
  | 'UPDATE_OBSERVATION'
  | 'CHAT_QUERY'
  | 'CREATE_REMINDER'
  | 'UPDATE_REMINDER'
  | 'UNAUTHORIZED_ACCESS_ATTEMPT';

export interface IAuditLog extends MongooseDoc {
  userId?: Types.ObjectId;
  action: AuditAction;
  resourceType: string;
  resourceId?: string;
  ipAddress?: string;
  userAgent?: string;
  details?: Record<string, unknown>;
  timestamp: Date;
}

const auditLogSchema = new Schema<IAuditLog>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', index: true },
    action: { type: String, required: true, index: true },
    resourceType: { type: String, required: true, index: true },
    resourceId: { type: String },
    ipAddress: { type: String },
    userAgent: { type: String },
    details: { type: Schema.Types.Mixed },
    timestamp: { type: Date, default: Date.now, index: true },
  },
  { timestamps: false }
);

auditLogSchema.index({ userId: 1, timestamp: -1 });

export const AuditLogModel = mongoose.model<IAuditLog>('AuditLog', auditLogSchema);
