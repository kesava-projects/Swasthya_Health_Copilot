import { DocumentModel } from '../../modules/documents/document.model.js';
import { DocumentProcessingJobModel } from '../../modules/documents/job.model.js';
import { ExtractionModel } from '../../modules/extractions/extraction.model.js';
import { ObservationModel } from '../../modules/observations/observation.model.js';
import { MedicationRecordModel } from '../../modules/medications/medication.model.js';
import { ConditionRecordModel } from '../../modules/conditions/condition.model.js';
import { HealthTimelineEventModel } from '../../modules/timeline/timeline.model.js';
import { SummaryModel } from '../../modules/summaries/summary.model.js';
import { storageService } from '../storage/storage.adapter.js';
import { ocrClient } from '../ocr/ocr.client.js';
import { aiService } from '../ai/ai.service.js';
import { logger } from '../../utils/logger.js';

export class DocumentPipelineService {
  /**
   * Runs the full automated ingestion pipeline for an uploaded document:
   * 1. Run OCR (via Python microservice)
   * 2. Run Structured Medical Extraction (via LLM / configured AI)
   * 3. Run AI Document Summary
   * 4. Update status to awaiting_review
   */
  static async processDocument(documentId: string, userId: string): Promise<void> {
    const doc = await DocumentModel.findOne({ _id: documentId, userId });
    if (!doc) {
      logger.error(`Document ${documentId} not found for pipeline processing`);
      return;
    }

    try {
      doc.processingStatus = 'processing';
      await doc.save();

      // 1. OCR Job
      const ocrJob = await DocumentProcessingJobModel.create({
        documentId: doc._id,
        userId: doc.userId,
        jobType: 'ocr',
        status: 'processing',
        startedAt: new Date(),
      });

      const fileBuffer = await storageService.getFileBuffer(doc.storedFilename);
      let ocrPages: any[] = [];
      let engineName = 'ocr_service';
      let engineVersion = '1.0';
      let structured: any = null;
      let summaryResult: any = null;

      // Check if OCR microservice is available
      const isOcrOnline = await ocrClient.isServiceAvailable();
      if (isOcrOnline) {
        try {
          const ocrResult = await ocrClient.processDocumentBuffer(
            fileBuffer,
            doc.originalName,
            doc.mimeType,
            doc._id.toString()
          );
          ocrPages = ocrResult.pages;
          engineName = ocrResult.engine;
          engineVersion = ocrResult.version;
          doc.pageCount = ocrResult.pageCount;
          await doc.save();

          ocrJob.status = 'completed';
          ocrJob.completedAt = new Date();
          ocrJob.logs.push(`OCR completed in ${ocrResult.processingTimeMs}ms with engine: ${ocrResult.engine}`);
          await ocrJob.save();
        } catch (ocrErr: any) {
          logger.warn(`OCR microservice execution failed: ${ocrErr.message}. Falling back to AI multimodal direct analysis.`);
        }
      }

      // If OCR microservice was offline or failed to produce pages, use Gemini Multimodal Direct Intelligence
      if (ocrPages.length === 0) {
        logger.info(`Running Gemini direct multimodal document analysis for ${doc.originalName}...`);
        ocrJob.logs.push('OCR microservice bypassed/unavailable. Executing direct multimodal clinical extraction.');
        const multiResult = await aiService.analyzeDocumentDirectMultimodal(
          fileBuffer,
          doc.mimeType,
          doc.originalName,
          doc.documentType
        );

        ocrPages = multiResult.pages;
        structured = multiResult.structured;
        summaryResult = multiResult.summary;
        engineName = 'gemini_multimodal_vision';
        engineVersion = '2.0';
        doc.pageCount = ocrPages.length || 1;
        await doc.save();

        ocrJob.status = 'completed';
        ocrJob.completedAt = new Date();
        ocrJob.logs.push(`AI Multimodal analysis completed successfully (${ocrPages.length} pages)`);
        await ocrJob.save();
      }

      // 2. Structured Extraction Job (if not already extracted by direct multimodal)
      if (!structured) {
        const extractJob = await DocumentProcessingJobModel.create({
          documentId: doc._id,
          userId: doc.userId,
          jobType: 'extraction',
          status: 'processing',
          startedAt: new Date(),
        });

        structured = await aiService.extractStructuredMedicalData(ocrPages, doc.documentType);

        extractJob.status = 'completed';
        extractJob.completedAt = new Date();
        extractJob.logs.push(`Extracted ${structured.observations.length} observations, ${structured.medications.length} medications`);
        await extractJob.save();
      }

      // Save or update extraction record
      await ExtractionModel.findOneAndUpdate(
        { documentId: doc._id },
        {
          userId: doc.userId,
          pages: ocrPages,
          ocrEngine: engineName,
          ocrVersion: engineVersion,
          structuredData: structured,
          reviewStatus: 'unreviewed',
        },
        { upsert: true, new: true }
      );

      // 3. Summary Job (if not already generated)
      if (!summaryResult) {
        summaryResult = await aiService.generateDocumentSummary(ocrPages, structured, 'en');
      }

      await SummaryModel.findOneAndUpdate(
        { documentId: doc._id, language: 'en' },
        {
          userId: doc.userId,
          documentId: doc._id,
          summaryType: 'document',
          language: 'en',
          title: summaryResult.title,
          keyFindings: summaryResult.keyFindings,
          abnormalValues: summaryResult.abnormalValues,
          simpleExplanation: summaryResult.simpleExplanation,
          missingOrUncertainInfo: summaryResult.missingOrUncertainInfo,
          suggestedQuestionsForDoctor: summaryResult.suggestedQuestionsForDoctor,
          sourcePageReferences: summaryResult.sourcePageReferences,
          generatedWithModel: summaryResult.modelUsed,
        },
        { upsert: true }
      );

      // 4. Update Document Status to awaiting_review
      doc.processingStatus = 'awaiting_review';
      if (structured.documentDate) {
        const parsedDate = new Date(structured.documentDate);
        if (!isNaN(parsedDate.getTime())) {
          doc.documentDate = parsedDate;
        }
      }
      await doc.save();

      // Create an initial timeline event for the document upload
      await HealthTimelineEventModel.create({
        userId: doc.userId,
        eventType: 'document_uploaded',
        category: 'document',
        title: `Uploaded ${doc.originalName}`,
        description: `Medical document of type "${doc.documentType}" uploaded and ready for review.`,
        eventDate: doc.documentDate || doc.createdAt,
        uploadDate: doc.createdAt,
        sourceDocumentId: doc._id,
        isVerified: false,
      });

      logger.info(`✅ Pipeline processing finished successfully for document ${doc._id}`);
    } catch (error: any) {
      logger.error(`❌ Pipeline processing failed for document ${doc._id}:`, { error: error.message });
      doc.processingStatus = 'failed';
      doc.errorMessage = error.message;
      await doc.save();

      await DocumentProcessingJobModel.create({
        documentId: doc._id,
        userId: doc.userId,
        jobType: 'ocr',
        status: 'failed',
        error: error.message,
      });
    }
  }

  /**
   * Promotes human-reviewed and confirmed medical fields into official Health Profile records.
   */
  static async confirmAndPromoteExtraction(
    documentId: string,
    userId: string,
    correctedData?: any
  ): Promise<void> {
    const doc = await DocumentModel.findOne({ _id: documentId, userId });
    if (!doc) throw new Error('Document not found');

    const extraction = await ExtractionModel.findOne({ documentId, userId });
    if (!extraction) throw new Error('Extraction record not found');

    if (correctedData) {
      extraction.structuredData = correctedData;
      extraction.reviewStatus = 'edited';
    } else {
      extraction.reviewStatus = 'confirmed';
    }

    extraction.reviewedAt = new Date();
    extraction.reviewedBy = doc.userId;
    await extraction.save();

    const data = extraction.structuredData;
    const docEventDate = doc.documentDate || new Date();

    // 1. Promote Observations (Labs)
    for (const obs of data.observations || []) {
      const createdObs = await ObservationModel.create({
        userId: doc.userId,
        sourceDocumentId: doc._id,
        pageNumber: obs.pageNumber || 1,
        testName: obs.testName,
        standardizedCode: obs.standardizedCode,
        valueNumeric: obs.valueNumeric,
        valueString: obs.valueString,
        unit: obs.unit,
        referenceRangeLow: obs.referenceRangeLow,
        referenceRangeHigh: obs.referenceRangeHigh,
        referenceRangeString: obs.referenceRangeString,
        referenceRangeSource: obs.referenceRangeSource,
        interpretation: obs.isAbnormal ? 'ABNORMAL' : 'NORMAL',
        observationDate: docEventDate,
        verificationStatus: 'user_confirmed',
        provenance: {
          ocrEngine: extraction.ocrEngine,
          sourceText: obs.sourceText,
          confirmedAt: new Date(),
          correctedBy: doc.userId,
        },
      });

      await HealthTimelineEventModel.create({
        userId: doc.userId,
        eventType: 'lab_tested',
        category: 'lab',
        title: `${obs.testName}: ${obs.valueString} ${obs.unit || ''}`,
        description: `Verified laboratory result. ${obs.isAbnormal ? 'Flagged as abnormal.' : 'Within normal limits.'}`,
        eventDate: docEventDate,
        uploadDate: doc.createdAt,
        sourceDocumentId: doc._id,
        pageNumber: obs.pageNumber,
        relatedRecordId: createdObs._id,
        isVerified: true,
      });
    }

    // 2. Promote Medications
    for (const med of data.medications || []) {
      const createdMed = await MedicationRecordModel.create({
        userId: doc.userId,
        sourceDocumentId: doc._id,
        pageNumber: med.pageNumber || 1,
        medicineName: med.medicineName,
        dosage: med.dosage,
        frequency: med.frequency,
        route: med.route,
        duration: med.duration,
        instructions: med.instructions,
        prescribedDate: docEventDate,
        isCurrent: true,
        verificationStatus: 'user_confirmed',
        provenance: {
          ocrEngine: extraction.ocrEngine,
          sourceText: med.sourceText,
          confirmedAt: new Date(),
          correctedBy: doc.userId,
        },
      });

      await HealthTimelineEventModel.create({
        userId: doc.userId,
        eventType: 'prescription_issued',
        category: 'medication',
        title: `Prescribed ${med.medicineName} ${med.dosage || ''}`,
        description: `Frequency: ${med.frequency || 'As advised'}. Instructions: ${med.instructions || 'N/A'}`,
        eventDate: docEventDate,
        uploadDate: doc.createdAt,
        sourceDocumentId: doc._id,
        pageNumber: med.pageNumber,
        relatedRecordId: createdMed._id,
        isVerified: true,
      });
    }

    // 3. Promote Conditions
    for (const cond of data.conditions || []) {
      const createdCond = await ConditionRecordModel.create({
        userId: doc.userId,
        sourceDocumentId: doc._id,
        pageNumber: cond.pageNumber || 1,
        conditionName: cond.conditionName,
        icd10Code: cond.icd10Code,
        diagnosedDate: docEventDate,
        status: 'active',
        notes: cond.notes,
        verificationStatus: 'user_confirmed',
        provenance: {
          ocrEngine: extraction.ocrEngine,
          sourceText: cond.sourceText,
          confirmedAt: new Date(),
          correctedBy: doc.userId,
        },
      });

      await HealthTimelineEventModel.create({
        userId: doc.userId,
        eventType: 'condition_noted',
        category: 'condition',
        title: `Condition: ${cond.conditionName}`,
        description: `Verified clinical condition diagnosed/recorded on ${docEventDate.toLocaleDateString()}.`,
        eventDate: docEventDate,
        uploadDate: doc.createdAt,
        sourceDocumentId: doc._id,
        pageNumber: cond.pageNumber,
        relatedRecordId: createdCond._id,
        isVerified: true,
      });
    }

    doc.processingStatus = 'completed';
    await doc.save();
    logger.info(`User confirmed extraction for document ${doc._id}. All records promoted to Health Profile.`);
  }
}
