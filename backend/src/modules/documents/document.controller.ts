import { Response } from 'express';
import { AuthenticatedRequest } from '../../middleware/auth.js';
import { DocumentModel } from './document.model.js';
import { ExtractionModel } from '../extractions/extraction.model.js';
import { ObservationModel } from '../observations/observation.model.js';
import { MedicationRecordModel } from '../medications/medication.model.js';
import { ConditionRecordModel } from '../conditions/condition.model.js';
import { HealthTimelineEventModel } from '../timeline/timeline.model.js';
import { SummaryModel } from '../summaries/summary.model.js';
import { storageService } from '../../services/storage/storage.adapter.js';
import { DocumentPipelineService } from '../../services/jobs/pipeline.service.js';
import { logAuditEvent } from '../audit/audit.service.js';
import { logger } from '../../utils/logger.js';

export async function uploadDocument(req: AuthenticatedRequest, res: Response): Promise<void> {
  const file = req.file;
  if (!file) {
    res.status(400).json({ success: false, error: 'No file uploaded' });
    return;
  }

  const { documentType, documentDate } = req.body;
  const userId = req.user!.userId;

  // Validate file signature and save securely
  let storageResult;
  try {
    storageResult = await storageService.saveFile(file.buffer, file.originalname, file.mimetype);
  } catch (error: any) {
    res.status(400).json({ success: false, error: error.message });
    return;
  }

  const doc = await DocumentModel.create({
    userId,
    originalName: file.originalname,
    storedFilename: storageResult.storedFilename,
    mimeType: file.mimetype,
    sizeBytes: file.size,
    documentType: documentType || 'other',
    documentDate: documentDate ? new Date(documentDate) : undefined,
    processingStatus: 'queued',
    sha256Hash: storageResult.sha256Hash,
  });

  await logAuditEvent(req, 'UPLOAD_DOCUMENT', 'DOCUMENT', doc._id.toString(), {
    filename: file.originalname,
    size: file.size,
    type: doc.documentType,
  });

  // Run processing pipeline asynchronously
  setImmediate(async () => {
    try {
      await DocumentPipelineService.processDocument(doc._id.toString(), userId);
    } catch (err) {
      logger.error('Background pipeline invocation failed', { err });
    }
  });

  res.status(201).json({
    success: true,
    document: {
      id: doc._id,
      originalName: doc.originalName,
      documentType: doc.documentType,
      mimeType: doc.mimeType,
      processingStatus: doc.processingStatus,
      createdAt: doc.createdAt,
    },
    message: 'Document uploaded successfully and queued for OCR processing',
  });
}

export async function listDocuments(req: AuthenticatedRequest, res: Response): Promise<void> {
  const userId = req.user!.userId;
  const { type, status, search } = req.query;

  const query: any = { userId };
  if (type) query.documentType = type;
  if (status) query.processingStatus = status;
  if (search) {
    query.originalName = { $regex: String(search), $options: 'i' };
  }

  const documents = await DocumentModel.find(query).sort({ createdAt: -1 });

  res.json({
    success: true,
    count: documents.length,
    documents: documents.map((d) => ({
      id: d._id,
      originalName: d.originalName,
      documentType: d.documentType,
      documentDate: d.documentDate,
      pageCount: d.pageCount,
      sizeBytes: d.sizeBytes,
      mimeType: d.mimeType,
      processingStatus: d.processingStatus,
      errorMessage: d.errorMessage,
      createdAt: d.createdAt,
    })),
  });
}

export async function getDocumentById(req: AuthenticatedRequest, res: Response): Promise<void> {
  const userId = req.user!.userId;
  const { id } = req.params;

  const doc = await DocumentModel.findOne({ _id: id, userId });
  if (!doc) {
    res.status(404).json({ success: false, error: 'Document not found' });
    return;
  }

  const extraction = await ExtractionModel.findOne({ documentId: doc._id, userId });
  const summary = await SummaryModel.findOne({ documentId: doc._id });

  await logAuditEvent(req, 'VIEW_DOCUMENT', 'DOCUMENT', doc._id.toString());

  res.json({
    success: true,
    document: {
      id: doc._id,
      originalName: doc.originalName,
      documentType: doc.documentType,
      documentDate: doc.documentDate,
      pageCount: doc.pageCount,
      sizeBytes: doc.sizeBytes,
      mimeType: doc.mimeType,
      processingStatus: doc.processingStatus,
      errorMessage: doc.errorMessage,
      createdAt: doc.createdAt,
    },
    extraction: extraction
      ? {
          reviewStatus: extraction.reviewStatus,
          ocrEngine: extraction.ocrEngine,
          pages: extraction.pages,
          structuredData: extraction.structuredData,
        }
      : null,
    summary: summary
      ? {
          title: summary.title,
          keyFindings: summary.keyFindings,
          abnormalValues: summary.abnormalValues,
          simpleExplanation: summary.simpleExplanation,
          missingOrUncertainInfo: summary.missingOrUncertainInfo,
          suggestedQuestionsForDoctor: summary.suggestedQuestionsForDoctor,
        }
      : null,
  });
}

export async function downloadDocument(req: AuthenticatedRequest, res: Response): Promise<void> {
  const userId = req.user!.userId;
  const { id } = req.params;

  const doc = await DocumentModel.findOne({ _id: id, userId });
  if (!doc) {
    res.status(404).json({ success: false, error: 'Document not found' });
    return;
  }

  const isAttachment = req.query.download === 'true';

  await logAuditEvent(
    req,
    isAttachment ? 'DOWNLOAD_DOCUMENT' : 'VIEW_DOCUMENT',
    'DOCUMENT',
    doc._id.toString()
  );

  try {
    const fileStream = await storageService.getFileStream(doc.storedFilename);
    const mimeType = doc.mimeType || 'application/octet-stream';
    res.setHeader('Content-Type', mimeType);
    const disposition = isAttachment ? 'attachment' : 'inline';
    res.setHeader('Content-Disposition', `${disposition}; filename="${encodeURIComponent(doc.originalName)}"`);
    res.setHeader('Cache-Control', 'private, max-age=3600');
    fileStream.on('error', (streamErr) => {
      logger.error('Error streaming document file:', { streamErr });
      if (!res.headersSent) {
        res.status(500).json({ success: false, error: 'Failed to read document stream' });
      }
    });
    fileStream.pipe(res);
  } catch (error: any) {
    res.status(404).json({ success: false, error: error.message });
  }
}

export async function deleteDocument(req: AuthenticatedRequest, res: Response): Promise<void> {
  const userId = req.user!.userId;
  const { id } = req.params;

  const doc = await DocumentModel.findOne({ _id: id, userId });
  if (!doc) {
    res.status(404).json({ success: false, error: 'Document not found' });
    return;
  }

  // Delete physical file
  await storageService.deleteFile(doc.storedFilename);

  // Cascade delete database records associated with this document
  await Promise.all([
    DocumentModel.deleteOne({ _id: doc._id }),
    ExtractionModel.deleteMany({ documentId: doc._id }),
    ObservationModel.deleteMany({ sourceDocumentId: doc._id }),
    MedicationRecordModel.deleteMany({ sourceDocumentId: doc._id }),
    ConditionRecordModel.deleteMany({ sourceDocumentId: doc._id }),
    HealthTimelineEventModel.deleteMany({ sourceDocumentId: doc._id }),
    SummaryModel.deleteMany({ documentId: doc._id }),
  ]);

  await logAuditEvent(req, 'DELETE_DOCUMENT', 'DOCUMENT', doc._id.toString(), {
    filename: doc.originalName,
  });

  res.json({ success: true, message: 'Document and all associated clinical records permanently deleted' });
}

export async function reprocessDocument(req: AuthenticatedRequest, res: Response): Promise<void> {
  const userId = req.user!.userId;
  const { id } = req.params;

  const doc = await DocumentModel.findOne({ _id: id, userId });
  if (!doc) {
    res.status(404).json({ success: false, error: 'Document not found' });
    return;
  }

  doc.processingStatus = 'queued';
  doc.errorMessage = undefined;
  await doc.save();

  setImmediate(async () => {
    try {
      await DocumentPipelineService.processDocument(doc._id.toString(), userId);
    } catch (err) {
      logger.error('Reprocess failed', { err });
    }
  });

  res.json({ success: true, message: 'Document queued for reprocessing' });
}
