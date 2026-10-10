import axios from 'axios';
import fs from 'fs';
import { env } from '../../config/env.js';
import { logger } from '../../utils/logger.js';
import { IOcrPage } from '../../modules/extractions/extraction.model.js';

export interface OcrServiceResult {
  pageCount: number;
  engine: string;
  version: string;
  pages: IOcrPage[];
  totalCharacters: number;
  processingTimeMs: number;
  warnings: string[];
}

export class OcrClient {
  private baseUrl: string;

  constructor() {
    this.baseUrl = (env.OCR_SERVICE_URL || '').trim().replace(/\/+$/, '');
  }

  async isServiceAvailable(): Promise<boolean> {
    if (!this.baseUrl) {
      return false;
    }
    try {
      const response = await axios.get(`${this.baseUrl}/health`, { timeout: 3000 });
      return response.status === 200;
    } catch {
      return false;
    }
  }

  async processDocumentFile(
    filePath: string,
    mimeType: string,
    documentId: string,
    languages: string = 'eng+hin+tel'
  ): Promise<OcrServiceResult> {
    const fileBuffer = await fs.promises.readFile(filePath);
    return this.processDocumentBuffer(fileBuffer, filePath, mimeType, documentId, languages);
  }

  async processDocumentBuffer(
    buffer: Buffer,
    filename: string,
    mimeType: string,
    documentId: string,
    languages: string = 'eng+hin+tel'
  ): Promise<OcrServiceResult> {
    try {
      // Use standard FormData from Node or FormData/Blob
      const blob = new Blob([buffer], { type: mimeType });
      const formData = new FormData();
      formData.append('file', blob, filename);
      formData.append('languages', languages);
      formData.append('document_id', documentId);

      const response = await axios.post(`${this.baseUrl}/ocr/process`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        timeout: 60000, // 60 seconds for multi-page documents
      });

      const data = response.data;
      const pages: IOcrPage[] = data.pages.map((p: any) => ({
        pageNumber: p.page_number,
        text: p.text,
        confidence: p.confidence,
        engine: p.engine || data.engine,
        language: p.language,
        warnings: p.warnings || [],
      }));

      return {
        pageCount: data.page_count,
        engine: data.engine,
        version: data.version,
        pages,
        totalCharacters: data.total_characters,
        processingTimeMs: data.processing_time_ms,
        warnings: data.warnings || [],
      };
    } catch (error: any) {
      logger.error('OCR Service processing failure:', {
        message: error.message,
        response: error.response?.data,
        documentId,
      });
      throw new Error(`OCR processing failed: ${error.response?.data?.detail || error.message}`);
    }
  }
}

export const ocrClient = new OcrClient();
