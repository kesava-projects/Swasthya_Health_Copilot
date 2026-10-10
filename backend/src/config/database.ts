import mongoose from 'mongoose';
import { env } from './env.js';
import { logger } from '../utils/logger.js';

export async function connectDatabase(): Promise<void> {
  try {
    mongoose.set('strictQuery', true);
    await mongoose.connect(env.MONGODB_URI, {
      serverSelectionTimeoutMS: 15000,
      connectTimeoutMS: 15000,
    });
    const sanitizedUri = env.MONGODB_URI.replace(/\/\/[^:]+:[^@]+@/, '//***:***@');
    logger.info(`✅ Connected to MongoDB at ${sanitizedUri}`);
  } catch (error: any) {
    logger.error('❌ Failed to connect to MongoDB', { error: error.message });
    if (env.MONGODB_URI.includes('mongodb+srv://') || env.MONGODB_URI.includes('.mongodb.net')) {
      logger.error(
        '💡 MongoDB Atlas Deployment Hint: In MongoDB Atlas -> Network Access, ensure you have added IP Address "0.0.0.0/0" (Allow access from anywhere), because cloud hosts like Render use dynamic IP addresses.'
      );
    }
    throw error;
  }
}

export async function disconnectDatabase(): Promise<void> {
  try {
    await mongoose.disconnect();
    logger.info('Disconnected from MongoDB');
  } catch (error) {
    logger.error('Error disconnecting from MongoDB', { error });
  }
}
