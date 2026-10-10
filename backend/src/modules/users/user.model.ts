import mongoose, { Document, Schema } from 'mongoose';

export interface IUser extends Document {
  name: string;
  email: string;
  passwordHash: string;
  dateOfBirth?: Date;
  gender?: 'male' | 'female' | 'other' | 'prefer_not_to_say';
  bloodGroup?: string;
  mockAbhaId?: string; // Clearly labeled as mock demonstration ABHA ID
  allergies: string[];
  emergencyContact?: {
    name: string;
    relationship: string;
    phone: string;
  };
  preferredLanguage: 'en' | 'te' | 'hi' | 'ta' | 'kn' | 'bn' | 'mr' | 'es';
  createdAt: Date;
  updatedAt: Date;
}

const userSchema = new Schema<IUser>(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    dateOfBirth: { type: Date },
    gender: { type: String, enum: ['male', 'female', 'other', 'prefer_not_to_say'] },
    bloodGroup: { type: String, trim: true },
    mockAbhaId: { 
      type: String, 
      trim: true,
      default: () => `MOCK-${Math.floor(1000 + Math.random() * 9000)}-${Math.floor(1000 + Math.random() * 9000)}-${Math.floor(1000 + Math.random() * 9000)}`
    },
    allergies: { type: [String], default: [] },
    emergencyContact: {
      name: { type: String },
      relationship: { type: String },
      phone: { type: String },
    },
    preferredLanguage: {
      type: String,
      enum: ['en', 'te', 'hi', 'ta', 'kn', 'bn', 'mr', 'es'],
      default: 'en'
    },
  },
  { timestamps: true }
);

export const UserModel = mongoose.model<IUser>('User', userSchema);
