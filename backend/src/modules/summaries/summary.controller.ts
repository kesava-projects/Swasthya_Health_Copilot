import { Response } from 'express';
import { AuthenticatedRequest } from '../../middleware/auth.js';
import { SummaryModel } from './summary.model.js';
import { DocumentModel } from '../documents/document.model.js';
import { ExtractionModel } from '../extractions/extraction.model.js';
import { ObservationModel } from '../observations/observation.model.js';
import { MedicationRecordModel } from '../medications/medication.model.js';
import { ConditionRecordModel } from '../conditions/condition.model.js';
import { aiService } from '../../services/ai/ai.service.js';
import { RetrievedMedicalRecord } from '../../services/ai/ai.interface.js';

export async function getDocumentSummary(req: AuthenticatedRequest, res: Response): Promise<void> {
  const userId = req.user!.userId;
  const { documentId } = req.params;
  const language = (req.query.language as string) || 'en';

  let summary = await SummaryModel.findOne({ documentId, userId, language });
  if (!summary && language !== 'en') {
    // Check fallback 'en'
    summary = await SummaryModel.findOne({ documentId, userId, language: 'en' });
  }

  // If still no summary, check if extraction exists and auto-generate
  if (!summary) {
    const extraction = await ExtractionModel.findOne({ documentId, userId });
    if (extraction) {
      try {
        const result = await aiService.generateDocumentSummary(
          extraction.pages,
          extraction.structuredData,
          language
        );
        summary = await SummaryModel.findOneAndUpdate(
          { documentId, userId, language },
          {
            userId,
            documentId,
            summaryType: 'document',
            language,
            title: result.title,
            keyFindings: result.keyFindings,
            abnormalValues: result.abnormalValues,
            simpleExplanation: result.simpleExplanation,
            missingOrUncertainInfo: result.missingOrUncertainInfo,
            suggestedQuestionsForDoctor: result.suggestedQuestionsForDoctor,
            sourcePageReferences: result.sourcePageReferences,
            generatedWithModel: result.modelUsed,
          },
          { upsert: true, new: true }
        );
      } catch (err: any) {
        // Fall back gracefully
      }
    }
  }

  res.json({
    success: true,
    summary: summary || null,
  });
}

export async function generateDocumentSummary(req: AuthenticatedRequest, res: Response): Promise<void> {
  const userId = req.user!.userId;
  const { documentId } = req.params;
  const language = (req.body.language as string) || 'en';

  const doc = await DocumentModel.findOne({ _id: documentId, userId });
  if (!doc) {
    res.status(404).json({ success: false, error: 'Document not found' });
    return;
  }

  const extraction = await ExtractionModel.findOne({ documentId, userId });
  if (!extraction) {
    res.status(400).json({ success: false, error: 'Document has not completed OCR extraction yet' });
    return;
  }

  const result = await aiService.generateDocumentSummary(
    extraction.pages,
    extraction.structuredData,
    language
  );

  const summary = await SummaryModel.findOneAndUpdate(
    { documentId: doc._id, userId, language },
    {
      userId,
      documentId: doc._id,
      summaryType: 'document',
      language,
      title: result.title,
      keyFindings: result.keyFindings,
      abnormalValues: result.abnormalValues,
      simpleExplanation: result.simpleExplanation,
      missingOrUncertainInfo: result.missingOrUncertainInfo,
      suggestedQuestionsForDoctor: result.suggestedQuestionsForDoctor,
      sourcePageReferences: result.sourcePageReferences,
      generatedWithModel: result.modelUsed,
    },
    { upsert: true, new: true }
  );

  res.json({
    success: true,
    summary,
  });
}

export async function buildAndSavePatientOverallSummary(
  userId: string,
  language: string = 'en'
): Promise<any> {
  const [obs, meds, conds] = await Promise.all([
    ObservationModel.find({ userId }).populate('sourceDocumentId', 'originalName'),
    MedicationRecordModel.find({ userId, isCurrent: true }).populate('sourceDocumentId', 'originalName'),
    ConditionRecordModel.find({ userId }).populate('sourceDocumentId', 'originalName'),
  ]);

  const retrievedRecords: RetrievedMedicalRecord[] = [];

  obs.forEach((o) => {
    retrievedRecords.push({
      recordType: 'observation',
      title: o.testName,
      date: o.observationDate ? o.observationDate.toISOString().split('T')[0] : 'Unknown',
      content: `Result: ${o.valueString} ${o.unit || ''} (Ref: ${o.referenceRangeString || 'N/A'}, Flag: ${o.interpretation})`,
      documentId: (o.sourceDocumentId as any)?._id?.toString() || '',
      documentTitle: (o.sourceDocumentId as any)?.originalName || 'Lab Report',
      pageNumber: o.pageNumber || 1,
      isVerified: o.verificationStatus === 'user_confirmed',
    });
  });

  meds.forEach((m) => {
    retrievedRecords.push({
      recordType: 'medication',
      title: m.medicineName,
      date: m.prescribedDate ? m.prescribedDate.toISOString().split('T')[0] : 'Unknown',
      content: `Dosage: ${m.dosage || 'N/A'}, Frequency: ${m.frequency || 'N/A'}, Instructions: ${m.instructions || 'N/A'}`,
      documentId: (m.sourceDocumentId as any)?._id?.toString() || '',
      documentTitle: (m.sourceDocumentId as any)?.originalName || 'Prescription',
      pageNumber: 1,
      isVerified: m.verificationStatus === 'user_confirmed',
    });
  });

  conds.forEach((c) => {
    retrievedRecords.push({
      recordType: 'condition',
      title: c.conditionName,
      date: c.diagnosedDate ? c.diagnosedDate.toISOString().split('T')[0] : 'Unknown',
      content: `Status: ${c.status}. Notes: ${c.notes || 'N/A'}`,
      documentId: (c.sourceDocumentId as any)?._id?.toString() || '',
      documentTitle: (c.sourceDocumentId as any)?.originalName || 'Report',
      pageNumber: 1,
      isVerified: c.verificationStatus === 'user_confirmed',
    });
  });

  const result = await aiService.generatePatientSummary(retrievedRecords, language);

  const summary = await SummaryModel.findOneAndUpdate(
    { userId, summaryType: 'patient_overall', language },
    {
      userId,
      summaryType: 'patient_overall',
      language,
      title: result.title,
      keyFindings: result.keyFindings,
      abnormalValues: result.abnormalValues,
      simpleExplanation: result.simpleExplanation,
      missingOrUncertainInfo: result.missingOrUncertainInfo,
      suggestedQuestionsForDoctor: result.suggestedQuestionsForDoctor,
      sourcePageReferences: result.sourcePageReferences,
      generatedWithModel: result.modelUsed,
    },
    { upsert: true, new: true }
  );

  return summary;
}

export async function getPatientOverallSummary(req: AuthenticatedRequest, res: Response): Promise<void> {
  const userId = req.user!.userId;
  const language = (req.query.language as string) || 'en';

  let summary = await SummaryModel.findOne({ userId, summaryType: 'patient_overall', language }).sort({ updatedAt: -1 });
  if (!summary) {
    summary = await SummaryModel.findOne({ userId, summaryType: 'patient_overall' }).sort({ updatedAt: -1 });
  }

  // If no summary exists yet, check if user has clinical data and auto-generate
  if (!summary) {
    const [obsCount, medsCount, condsCount] = await Promise.all([
      ObservationModel.countDocuments({ userId }),
      MedicationRecordModel.countDocuments({ userId }),
      ConditionRecordModel.countDocuments({ userId }),
    ]);

    if (obsCount > 0 || medsCount > 0 || condsCount > 0) {
      try {
        summary = await buildAndSavePatientOverallSummary(userId, language);
      } catch (err) {
        // Fall back gracefully
      }
    }
  }

  res.json({
    success: true,
    summary: summary || null,
  });
}

export async function generatePatientOverallSummary(req: AuthenticatedRequest, res: Response): Promise<void> {
  const userId = req.user!.userId;
  const language = (req.body.language as 'en' | 'te' | 'hi') || 'en';

  const summary = await buildAndSavePatientOverallSummary(userId, language);

  res.json({
    success: true,
    summary,
  });
}
