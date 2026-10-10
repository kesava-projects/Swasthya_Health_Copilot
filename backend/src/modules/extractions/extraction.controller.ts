import { Response } from 'express';
import { AuthenticatedRequest } from '../../middleware/auth.js';
import { ExtractionModel } from './extraction.model.js';
import { DocumentPipelineService } from '../../services/jobs/pipeline.service.js';
import { logAuditEvent } from '../audit/audit.service.js';

export async function getExtraction(req: AuthenticatedRequest, res: Response): Promise<void> {
  const userId = req.user!.userId;
  const { documentId } = req.params;

  const extraction = await ExtractionModel.findOne({ documentId, userId });
  if (!extraction) {
    res.status(404).json({ success: false, error: 'Extraction not found for this document' });
    return;
  }

  res.json({
    success: true,
    extraction,
  });
}

export async function updateExtraction(req: AuthenticatedRequest, res: Response): Promise<void> {
  const userId = req.user!.userId;
  const { documentId } = req.params;
  const { structuredData } = req.body;

  if (!structuredData) {
    res.status(400).json({ success: false, error: 'structuredData is required' });
    return;
  }

  const extraction = await ExtractionModel.findOne({ documentId, userId });
  if (!extraction) {
    res.status(404).json({ success: false, error: 'Extraction not found' });
    return;
  }

  extraction.structuredData = structuredData;
  extraction.reviewStatus = 'edited';
  extraction.reviewedAt = new Date();
  extraction.reviewedBy = req.user!.userId as any;
  await extraction.save();

  await logAuditEvent(req, 'EDIT_EXTRACTION', 'EXTRACTION', extraction._id.toString(), { documentId });

  res.json({
    success: true,
    message: 'Extraction edits saved successfully',
    extraction,
  });
}

export async function confirmExtraction(req: AuthenticatedRequest, res: Response): Promise<void> {
  const userId = req.user!.userId;
  const { documentId } = req.params;
  const { structuredData } = req.body;

  try {
    await DocumentPipelineService.confirmAndPromoteExtraction(String(documentId), userId, structuredData);
    await logAuditEvent(req, 'CONFIRM_EXTRACTION', 'EXTRACTION', undefined, { documentId: String(documentId) });

    res.json({
      success: true,
      message: 'Extraction confirmed and successfully promoted to your Unified Health Profile!',
    });
  } catch (error: any) {
    res.status(400).json({ success: false, error: error.message });
  }
}
