import { Response } from 'express';
import { AuthenticatedRequest } from '../../middleware/auth.js';
import { ConversationModel, MessageModel } from './chat.model.js';
import { ObservationModel } from '../observations/observation.model.js';
import { MedicationRecordModel } from '../medications/medication.model.js';
import { ConditionRecordModel } from '../conditions/condition.model.js';
import { ExtractionModel } from '../extractions/extraction.model.js';
import { DocumentModel } from '../documents/document.model.js';
import { SummaryModel } from '../summaries/summary.model.js';
import { aiService } from '../../services/ai/ai.service.js';
import { RetrievedMedicalRecord } from '../../services/ai/ai.interface.js';
import { logAuditEvent } from '../audit/audit.service.js';
import { logger } from '../../utils/logger.js';

export async function createConversation(req: AuthenticatedRequest, res: Response): Promise<void> {
  const userId = req.user!.userId;
  const { title } = req.body;

  const conversation = await ConversationModel.create({
    userId,
    title: title || 'New Health Discussion',
  });

  res.status(201).json({
    success: true,
    conversation,
  });
}

export async function listConversations(req: AuthenticatedRequest, res: Response): Promise<void> {
  const userId = req.user!.userId;

  const conversations = await ConversationModel.find({ userId }).sort({ updatedAt: -1 });

  res.json({
    success: true,
    conversations,
  });
}

export async function getConversationMessages(req: AuthenticatedRequest, res: Response): Promise<void> {
  const userId = req.user!.userId;
  const { id } = req.params;

  const conv = await ConversationModel.findOne({ _id: id, userId });
  if (!conv) {
    res.status(404).json({ success: false, error: 'Conversation not found' });
    return;
  }

  const messages = await MessageModel.find({ conversationId: conv._id, userId }).sort({ createdAt: 1 });

  res.json({
    success: true,
    conversation: conv,
    messages,
  });
}

export async function sendMessage(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const userId = req.user!.userId;
    const { id } = req.params;
    const { text, language = 'en' } = req.body;

    if (!text || text.trim() === '') {
      res.status(400).json({ success: false, error: 'Message text is required' });
      return;
    }

    const conv = await ConversationModel.findOne({ _id: id, userId });
    if (!conv) {
      res.status(404).json({ success: false, error: 'Conversation not found' });
      return;
    }

    // Save User message
    const userMsg = await MessageModel.create({
      conversationId: conv._id,
      userId,
      sender: 'user',
      text: text.trim(),
      language,
    });

    // --- RAG RETRIEVAL PIPELINE (Strictly user-scoped) ---
    const queryTerms = text
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, '')
      .split(/\s+/)
      .filter((w: string) => w.length > 2);

    const termRegexes = queryTerms.map((t: string) => new RegExp(t, 'i'));

    // 1. Retrieve matching observations for user
    const matchingObs = await ObservationModel.find({
      userId,
      ...(termRegexes.length > 0 ? { testName: { $in: termRegexes } } : {}),
    })
      .sort({ observationDate: -1 })
      .limit(10)
      .populate('sourceDocumentId', 'originalName');

    // 2. Retrieve matching medications for user
    const matchingMeds = await MedicationRecordModel.find({
      userId,
      ...(termRegexes.length > 0 ? { medicineName: { $in: termRegexes } } : {}),
    })
      .sort({ prescribedDate: -1 })
      .limit(8)
      .populate('sourceDocumentId', 'originalName');

    // 3. Retrieve matching conditions for user
    const matchingConds = await ConditionRecordModel.find({
      userId,
      ...(termRegexes.length > 0 ? { conditionName: { $in: termRegexes } } : {}),
    })
      .sort({ diagnosedDate: -1 })
      .limit(5)
      .populate('sourceDocumentId', 'originalName');

    // 4. Retrieve matching OCR page excerpts
    const matchingExtractions = await ExtractionModel.find({
      userId,
      ...(termRegexes.length > 0 ? { 'pages.text': { $in: termRegexes } } : {}),
    }).limit(4);

    const contextRecords: RetrievedMedicalRecord[] = [];

    // Assemble observations
    matchingObs.forEach((o) => {
      contextRecords.push({
        recordType: 'observation',
        title: o.testName,
        date: o.observationDate.toISOString().split('T')[0],
        content: `Test: ${o.testName}, Result: ${o.valueString} ${o.unit || ''}, Reference Range: ${
          o.referenceRangeString || 'N/A'
        }, Interpretation: ${o.interpretation}`,
        documentId: (o.sourceDocumentId as any)?._id?.toString() || '',
        documentTitle: (o.sourceDocumentId as any)?.originalName || 'Lab Report',
        pageNumber: o.pageNumber,
        isVerified: o.verificationStatus === 'user_confirmed',
      });
    });

    // Assemble medications
    matchingMeds.forEach((m) => {
      contextRecords.push({
        recordType: 'medication',
        title: m.medicineName,
        date: m.prescribedDate.toISOString().split('T')[0],
        content: `Medicine: ${m.medicineName}, Dosage: ${m.dosage || 'N/A'}, Frequency: ${m.frequency || 'N/A'}, Instructions: ${
          m.instructions || 'N/A'
        }, Current: ${m.isCurrent}`,
        documentId: (m.sourceDocumentId as any)?._id?.toString() || '',
        documentTitle: (m.sourceDocumentId as any)?.originalName || 'Prescription',
        pageNumber: m.pageNumber,
        isVerified: m.verificationStatus === 'user_confirmed',
      });
    });

    // Assemble conditions
    matchingConds.forEach((c) => {
      contextRecords.push({
        recordType: 'condition',
        title: c.conditionName,
        date: c.diagnosedDate.toISOString().split('T')[0],
        content: `Condition: ${c.conditionName}, Status: ${c.status}, Notes: ${c.notes || 'None'}`,
        documentId: (c.sourceDocumentId as any)?._id?.toString() || '',
        documentTitle: (c.sourceDocumentId as any)?.originalName || 'Medical Report',
        pageNumber: c.pageNumber,
        isVerified: c.verificationStatus === 'user_confirmed',
      });
    });

    // Assemble raw OCR excerpts if specific term matched
    for (const ext of matchingExtractions) {
      const doc = await DocumentModel.findById(ext.documentId);
      if (!doc) continue;

      for (const page of ext.pages) {
        const containsTerm = queryTerms.some((t: string) => page.text.toLowerCase().includes(t));
        if (containsTerm) {
          contextRecords.push({
            recordType: 'ocr_excerpt',
            title: `Document excerpt from ${doc.originalName}`,
            date: doc.documentDate?.toISOString().split('T')[0] || doc.createdAt.toISOString().split('T')[0],
            content: page.text.slice(0, 300),
            documentId: doc._id.toString(),
            documentTitle: doc.originalName,
            pageNumber: page.pageNumber,
            isVerified: ext.reviewStatus === 'confirmed',
          });
        }
      }
    }

    // 5. Retrieve Document Summaries (both matching and recent)
    const recentSummaries = await SummaryModel.find({ userId })
      .sort({ updatedAt: -1 })
      .limit(3)
      .populate('documentId', 'originalName');

    recentSummaries.forEach((s) => {
      const docTitle = (s.documentId as any)?.originalName || 'Medical Document';
      const abnormalStr = s.abnormalValues && s.abnormalValues.length > 0
        ? `Abnormal values: ${s.abnormalValues.map((a: any) => `${a.testName}: ${a.value} (${a.referenceRange || 'N/A'}, Flag: ${a.flag})`).join('; ')}`
        : 'All reported parameters within reference limits';

      contextRecords.push({
        recordType: 'document_summary',
        title: s.title || `Summary of ${docTitle}`,
        content: `Document Summary: ${s.simpleExplanation}. Key Findings: ${(s.keyFindings || []).join('; ')}. ${abnormalStr}. Suggested Doctor Questions: ${(s.suggestedQuestionsForDoctor || []).join('; ')}`,
        documentId: (s.documentId as any)?._id?.toString() || s.documentId?.toString() || '',
        documentTitle: docTitle,
        pageNumber: 1,
        isVerified: true,
      });
    });

    // 6. Include Recent Extractions (covers freshly uploaded documents even before confirmation)
    const recentExtractions = await ExtractionModel.find({ userId })
      .sort({ updatedAt: -1 })
      .limit(3);

    for (const ext of recentExtractions) {
      const doc = await DocumentModel.findById(ext.documentId);
      const docTitle = doc?.originalName || 'Medical Document';
      const docId = ext.documentId?.toString() || '';
      const data = ext.structuredData;

      if (data?.observations && data.observations.length > 0) {
        data.observations.slice(0, 10).forEach((obs: any) => {
          const already = contextRecords.some((r) => r.title === obs.testName && r.documentId === docId);
          if (!already) {
            contextRecords.push({
              recordType: 'observation',
              title: obs.testName,
              content: `Test: ${obs.testName}, Result: ${obs.valueString} ${obs.unit || ''}, Reference: ${obs.referenceRangeString || 'N/A'}, Interpretation: ${obs.isAbnormal ? 'ABNORMAL' : 'NORMAL'}`,
              documentId: docId,
              documentTitle: docTitle,
              pageNumber: obs.pageNumber || 1,
              isVerified: ext.reviewStatus === 'confirmed',
            });
          }
        });
      }

      if (data?.medications && data.medications.length > 0) {
        data.medications.forEach((med: any) => {
          const already = contextRecords.some((r) => r.title === med.medicineName && r.documentId === docId);
          if (!already) {
            contextRecords.push({
              recordType: 'medication',
              title: med.medicineName,
              content: `Medicine: ${med.medicineName}, Dosage: ${med.dosage || 'N/A'}, Frequency: ${med.frequency || 'N/A'}, Instructions: ${med.instructions || 'N/A'}`,
              documentId: docId,
              documentTitle: docTitle,
              pageNumber: med.pageNumber || 1,
              isVerified: ext.reviewStatus === 'confirmed',
            });
          }
        });
      }
    }

    // 7. If still sparse, load user's top recent confirmed records as baseline context
    if (contextRecords.length === 0) {
      const recentObs = await ObservationModel.find({ userId })
        .sort({ observationDate: -1 })
        .limit(8)
        .populate('sourceDocumentId', 'originalName');

      recentObs.forEach((o) => {
        contextRecords.push({
          recordType: 'observation',
          title: o.testName,
          date: o.observationDate.toISOString().split('T')[0],
          content: `Test: ${o.testName}, Result: ${o.valueString} ${o.unit || ''}, Status: ${o.interpretation}`,
          documentId: (o.sourceDocumentId as any)?._id?.toString() || '',
          documentTitle: (o.sourceDocumentId as any)?.originalName || 'Lab Report',
          pageNumber: o.pageNumber,
          isVerified: o.verificationStatus === 'user_confirmed',
        });
      });
    }

    // Generate answer through AI Service
    const answerResult = await aiService.answerHealthQuery(text, contextRecords, language);

    // Sanitize citations: ensure documentId is valid 24-char ObjectId hex or null
    const sanitizedCitations = (answerResult.citations || []).map((c) => {
      const isValidHex = typeof c.documentId === 'string' && /^[0-9a-fA-F]{24}$/.test(c.documentId.trim());
      return {
        documentId: isValidHex ? (c.documentId.trim() as any) : null,
        documentTitle: c.documentTitle || 'Medical Document',
        pageNumber: Number(c.pageNumber) || 1,
        excerpt: c.excerpt || '',
      };
    });

    // Save Assistant Message
    const assistantMsg = await MessageModel.create({
      conversationId: conv._id,
      userId,
      sender: 'assistant',
      text: answerResult.answer,
      citations: sanitizedCitations,
      language,
    });

    conv.updatedAt = new Date();
    if (conv.title === 'New Health Discussion') {
      conv.title = text.slice(0, 40) + '...';
    }
    await conv.save();

    await logAuditEvent(req, 'CHAT_QUERY', 'CHAT', conv._id.toString(), {
      queryLength: text.length,
      citationCount: answerResult.citations.length,
    });

    res.json({
      success: true,
      userMessage: userMsg,
      assistantMessage: assistantMsg,
    });
  } catch (error: any) {
    logger.error('Failed to process and send chat message:', { error: error.message, stack: error.stack });
    res.status(500).json({
      success: false,
      error: 'Failed to process chat query: ' + (error.message || 'Internal error'),
    });
  }
}

export async function deleteConversation(req: AuthenticatedRequest, res: Response): Promise<void> {
  const userId = req.user!.userId;
  const { id } = req.params;

  const conv = await ConversationModel.findOne({ _id: id, userId });
  if (!conv) {
    res.status(404).json({ success: false, error: 'Conversation not found' });
    return;
  }

  await Promise.all([
    ConversationModel.deleteOne({ _id: conv._id }),
    MessageModel.deleteMany({ conversationId: conv._id }),
  ]);

  res.json({ success: true, message: 'Conversation deleted' });
}
