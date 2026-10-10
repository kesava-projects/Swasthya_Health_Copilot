import mongoose, { Document as MongooseDoc, Schema, Types } from 'mongoose';

export interface ICitation {
  documentId?: Types.ObjectId | null;
  documentTitle: string;
  pageNumber: number;
  excerpt: string;
}

export interface IMessage extends MongooseDoc {
  conversationId: Types.ObjectId;
  userId: Types.ObjectId;
  sender: 'user' | 'assistant' | 'system';
  text: string;
  citations: ICitation[];
  language?: 'en' | 'te' | 'hi';
  createdAt: Date;
}

export interface IConversation extends MongooseDoc {
  userId: Types.ObjectId;
  title: string;
  createdAt: Date;
  updatedAt: Date;
}

const citationSchema = new Schema<ICitation>(
  {
    documentId: {
      type: Schema.Types.ObjectId,
      ref: 'Document',
      required: false,
      default: null,
      set: (val: any) => {
        if (!val) return null;
        if (val instanceof Types.ObjectId) return val;
        if (typeof val === 'string' && /^[0-9a-fA-F]{24}$/.test(val)) {
          return new Types.ObjectId(val);
        }
        return null;
      },
    },
    documentTitle: { type: String, required: true },
    pageNumber: { type: Number, required: true, default: 1 },
    excerpt: { type: String, default: '' },
  },
  { _id: false }
);

const messageSchema = new Schema<IMessage>(
  {
    conversationId: { type: Schema.Types.ObjectId, ref: 'Conversation', required: true, index: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    sender: { type: String, enum: ['user', 'assistant', 'system'], required: true },
    text: { type: String, required: true },
    citations: { type: [citationSchema], default: [] },
    language: { type: String, enum: ['en', 'te', 'hi'], default: 'en' },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

const conversationSchema = new Schema<IConversation>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    title: { type: String, required: true, default: 'Medical Q&A Session' },
  },
  { timestamps: true }
);

conversationSchema.index({ userId: 1, updatedAt: -1 });

export const MessageModel = mongoose.model<IMessage>('Message', messageSchema);
export const ConversationModel = mongoose.model<IConversation>('Conversation', conversationSchema);
