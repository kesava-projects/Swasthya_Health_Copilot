import mongoose from 'mongoose';
import crypto from 'crypto';
import path from 'path';
import fs from 'fs';
import stream from 'stream';
import { env } from '../../config/env.js';
import { logger } from '../../utils/logger.js';

export interface FileStorageResult {
  storedFilename: string;
  sha256Hash: string;
  fileId?: string;
  filePath?: string;
}

export interface IStorageAdapter {
  saveFile(buffer: Buffer, originalFilename: string, mimeType: string, customStoredFilename?: string): Promise<FileStorageResult>;
  getFileStream(storedFilename: string): Promise<stream.Readable>;
  getFileBuffer(storedFilename: string): Promise<Buffer>;
  deleteFile(storedFilename: string): Promise<void>;
  validateFileSignature(buffer: Buffer, mimeType: string): boolean;
  hasFile(storedFilename: string): Promise<boolean>;
  getFilePath?(storedFilename: string): string;
  migrateLegacyFiles?(): Promise<number>;
}

export class MongoGridFSStorageAdapter implements IStorageAdapter {
  private bucketName: string;

  constructor(bucketName: string = 'uploads') {
    this.bucketName = bucketName;
  }

  getBucket(): mongoose.mongo.GridFSBucket {
    if (!mongoose.connection.db) {
      throw new Error('Database is not connected. MongoDB connection required for document storage.');
    }
    return new mongoose.mongo.GridFSBucket(mongoose.connection.db, {
      bucketName: this.bucketName,
    });
  }

  validateFileSignature(buffer: Buffer, mimeType: string): boolean {
    if (buffer.length < 4) return false;

    // PDF signature: %PDF (25 50 44 46)
    if (mimeType === 'application/pdf') {
      return buffer.slice(0, 4).toString() === '%PDF';
    }

    // PNG signature: 89 50 4E 47 0D 0A 1A 0A
    if (mimeType === 'image/png') {
      return (
        buffer[0] === 0x89 &&
        buffer[1] === 0x50 &&
        buffer[2] === 0x4e &&
        buffer[3] === 0x47
      );
    }

    // JPEG signature: FF D8 FF
    if (mimeType === 'image/jpeg' || mimeType === 'image/jpg') {
      return buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
    }

    return false;
  }

  async saveFile(
    buffer: Buffer,
    originalFilename: string,
    mimeType: string,
    customStoredFilename?: string
  ): Promise<FileStorageResult> {
    if (!this.validateFileSignature(buffer, mimeType)) {
      throw new Error('File content signature does not match claimed MIME type');
    }

    const sha256Hash = crypto.createHash('sha256').update(buffer).digest('hex');
    const ext = path.extname(originalFilename).toLowerCase() || (mimeType === 'application/pdf' ? '.pdf' : '.jpg');
    const uniqueId = crypto.randomBytes(16).toString('hex');
    const storedFilename = customStoredFilename ? path.basename(customStoredFilename) : `${Date.now()}-${uniqueId}${ext}`;

    const bucket = this.getBucket();

    // Check if file already exists with same filename and remove to prevent duplicate entries
    const existing = await bucket.find({ filename: storedFilename }).toArray();
    for (const old of existing) {
      await bucket.delete(old._id).catch(() => {});
    }

    const uploadStream = bucket.openUploadStream(storedFilename, {
      contentType: mimeType,
      metadata: {
        originalFilename,
        mimeType,
        sha256Hash,
        sizeBytes: buffer.length,
        createdAt: new Date(),
      },
    });

    await new Promise<void>((resolve, reject) => {
      uploadStream.on('error', reject);
      uploadStream.on('finish', () => resolve());
      uploadStream.end(buffer);
    });

    logger.info(`Securely saved document ${storedFilename} (${buffer.length} bytes) to MongoDB GridFS`);

    return {
      storedFilename,
      sha256Hash,
      fileId: uploadStream.id.toString(),
    };
  }

  async getFileStream(storedFilename: string): Promise<stream.Readable> {
    const safeName = path.basename(storedFilename);
    const bucket = this.getBucket();
    const files = await bucket.find({ filename: safeName }).sort({ uploadDate: -1 }).limit(1).toArray();

    if (files && files.length > 0) {
      return bucket.openDownloadStream(files[0]._id);
    }

    // Fallback: check legacy upload directory on disk and migrate automatically
    const legacyBase = path.resolve(env.UPLOAD_DIR || './uploads');
    const legacyPath = path.join(legacyBase, safeName);
    if (fs.existsSync(legacyPath)) {
      try {
        const buffer = await fs.promises.readFile(legacyPath);
        const ext = path.extname(safeName).toLowerCase();
        const mimeType = ext === '.pdf' ? 'application/pdf' : ext === '.png' ? 'image/png' : 'image/jpeg';
        await this.saveFile(buffer, safeName, mimeType, safeName);
        await fs.promises.unlink(legacyPath).catch(() => {});
        logger.info(`Migrated legacy file ${safeName} from disk to MongoDB GridFS`);
        return this.getFileStream(safeName);
      } catch (err) {
        logger.warn(`Could not migrate legacy file ${safeName}:`, { err });
      }
    }

    throw new Error(`Document file "${safeName}" not found in database`);
  }

  async getFileBuffer(storedFilename: string): Promise<Buffer> {
    const downloadStream = await this.getFileStream(storedFilename);
    return new Promise((resolve, reject) => {
      const chunks: Buffer[] = [];
      downloadStream.on('data', (chunk) => {
        chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
      });
      downloadStream.on('error', (err) => reject(err));
      downloadStream.on('end', () => resolve(Buffer.concat(chunks)));
    });
  }

  async deleteFile(storedFilename: string): Promise<void> {
    const safeName = path.basename(storedFilename);
    try {
      const bucket = this.getBucket();
      const files = await bucket.find({ filename: safeName }).toArray();
      for (const f of files) {
        await bucket.delete(f._id);
      }
      logger.info(`Deleted file ${safeName} from MongoDB GridFS`);
    } catch (error) {
      logger.warn(`Could not delete file ${safeName} from database:`, { error });
    }

    // Clean up any remaining legacy file on disk
    try {
      const legacyPath = path.join(path.resolve(env.UPLOAD_DIR || './uploads'), safeName);
      if (fs.existsSync(legacyPath)) {
        await fs.promises.unlink(legacyPath);
      }
    } catch {
      // Ignore
    }
  }

  async hasFile(storedFilename: string): Promise<boolean> {
    const safeName = path.basename(storedFilename);
    try {
      const bucket = this.getBucket();
      const files = await bucket.find({ filename: safeName }).limit(1).toArray();
      if (files.length > 0) return true;
      const legacyPath = path.join(path.resolve(env.UPLOAD_DIR || './uploads'), safeName);
      return fs.existsSync(legacyPath);
    } catch {
      return false;
    }
  }

  getFilePath(storedFilename: string): string {
    throw new Error(
      `getFilePath is not supported for database storage: Document "${storedFilename}" is stored directly in MongoDB GridFS, not on local disk. Use getFileStream or getFileBuffer.`
    );
  }

  async migrateLegacyFiles(): Promise<number> {
    const legacyDir = path.resolve(env.UPLOAD_DIR || './uploads');
    if (!fs.existsSync(legacyDir)) return 0;

    let migratedCount = 0;
    try {
      const entries = await fs.promises.readdir(legacyDir);
      for (const entry of entries) {
        if (entry.startsWith('.')) continue;
        const fullPath = path.join(legacyDir, entry);
        const stat = await fs.promises.stat(fullPath);
        if (!stat.isFile()) continue;

        const buffer = await fs.promises.readFile(fullPath);
        const ext = path.extname(entry).toLowerCase();
        const mimeType = ext === '.pdf' ? 'application/pdf' : ext === '.png' ? 'image/png' : 'image/jpeg';

        if (!(await this.hasFile(entry))) {
          await this.saveFile(buffer, entry, mimeType, entry);
        }
        await fs.promises.unlink(fullPath).catch(() => {});
        migratedCount++;
      }
      if (migratedCount > 0) {
        logger.info(`Migrated ${migratedCount} legacy files into MongoDB GridFS and removed disk copies.`);
      }
    } catch (error) {
      logger.warn('Legacy files migration check error:', { error });
    }
    return migratedCount;
  }
}

export const storageService = new MongoGridFSStorageAdapter();
