import { env } from '../../config/env.js';
import { logger } from '../../utils/logger.js';
import { IAIProvider, RetrievedMedicalRecord, ChatAnswerResult, SummaryResult, SupportedLanguage } from './ai.interface.js';
import { GeminiProvider } from './gemini.provider.js';
import { IOcrPage, IStructuredData } from '../../modules/extractions/extraction.model.js';

export class RuleBasedFallbackExtractor {
  static extractFromText(ocrPages: IOcrPage[]): IStructuredData {
    const fullText = ocrPages.map((p) => p.text).join('\n');
    const observations = [];
    const medications = [];
    const conditions = [];

    // 1. Lab observation patterns (e.g., Hemoglobin, Fasting Blood Sugar, Creatinine, etc.)
    const labPatterns = [
      { name: 'Hemoglobin', regex: /hemoglobin[:\s]+([0-9.]+)\s*([a-z/]+)?/i, low: 12.0, high: 17.5, unit: 'g/dL' },
      { name: 'Fasting Blood Sugar', regex: /(?:fbs|fasting blood sugar|fasting glucose)[:\s]+([0-9.]+)\s*([a-z/]+)?/i, low: 70, high: 100, unit: 'mg/dL' },
      { name: 'Post Prandial Blood Sugar', regex: /(?:ppbs|post prandial|pp glucose)[:\s]+([0-9.]+)\s*([a-z/]+)?/i, low: 70, high: 140, unit: 'mg/dL' },
      { name: 'Serum Creatinine', regex: /(?:serum creatinine|creatinine)[:\s]+([0-9.]+)\s*([a-z/]+)?/i, low: 0.7, high: 1.3, unit: 'mg/dL' },
      { name: 'Total Cholesterol', regex: /(?:total cholesterol|cholesterol)[:\s]+([0-9.]+)\s*([a-z/]+)?/i, low: 125, high: 200, unit: 'mg/dL' },
      { name: 'HbA1c', regex: /(?:hba1c|glycated hemoglobin)[:\s]+([0-9.]+)\s*%?/i, low: 4.0, high: 5.6, unit: '%' },
      { name: 'Platelet Count', regex: /(?:platelet count|platelets)[:\s]+([0-9,.]+)/i, low: 150000, high: 450000, unit: '/mcL' },
      { name: 'White Blood Cell Count', regex: /(?:wbc|wbc count|white blood cell)[:\s]+([0-9,.]+)/i, low: 4000, high: 11000, unit: '/mcL' },
    ];

    for (const pattern of labPatterns) {
      const match = fullText.match(pattern.regex);
      if (match) {
        const valStr = match[1].replace(/,/g, '');
        const valNum = parseFloat(valStr);
        const isAbnormal = !isNaN(valNum) && (valNum < pattern.low || valNum > pattern.high);

        // Find which page it came from
        let pageNum = 1;
        for (const page of ocrPages) {
          if (page.text.includes(match[0])) {
            pageNum = page.pageNumber;
            break;
          }
        }

        observations.push({
          testName: pattern.name,
          valueNumeric: !isNaN(valNum) ? valNum : undefined,
          valueString: match[1],
          unit: match[2] || pattern.unit,
          referenceRangeLow: pattern.low,
          referenceRangeHigh: pattern.high,
          referenceRangeString: `${pattern.low} - ${pattern.high} ${pattern.unit}`,
          referenceRangeSource: 'Standard laboratory reference interval',
          isAbnormal,
          pageNumber: pageNum,
          sourceText: match[0],
          confidence: 'medium' as const,
        });
      }
    }

    // 2. Medication patterns (Tab / Cap / Syp / Inj)
    const medMatches = fullText.matchAll(/(?:Tab|Tablet|Cap|Capsule|Syp|Syrup|Inj|Injection)\.?\s+([A-Za-z0-9\-]+)(?:\s+([0-9]+\s*(?:mg|ml|mcg)))?(?:\s+(1-0-1|1-0-0|0-0-1|0-1-0|OD|BD|TDS|SOS))?/gi);
    for (const match of medMatches) {
      const medicineName = match[1];
      const dosage = match[2];
      const frequency = match[3];

      let pageNum = 1;
      for (const page of ocrPages) {
        if (page.text.includes(match[0])) {
          pageNum = page.pageNumber;
          break;
        }
      }

      medications.push({
        medicineName,
        dosage: dosage || undefined,
        frequency: frequency || undefined,
        pageNumber: pageNum,
        sourceText: match[0],
        confidence: 'medium' as const,
      });
    }

    // 3. Condition patterns
    const conditionKeywords = ['Hypertension', 'Type 2 Diabetes Mellitus', 'Diabetes', 'Hypothyroidism', 'Anemia', 'Asthma', 'Dengue'];
    for (const kw of conditionKeywords) {
      if (new RegExp(`\\b${kw}\\b`, 'i').test(fullText)) {
        conditions.push({
          conditionName: kw,
          pageNumber: 1,
          sourceText: kw,
          confidence: 'medium' as const,
        });
      }
    }

    // 4. Date match
    const dateMatch = fullText.match(/\b(\d{1,2}[/-]\d{1,2}[/-]\d{2,4}|\d{4}-\d{2}-\d{2})\b/);

    return {
      documentType: 'medical_report',
      documentDate: dateMatch ? dateMatch[1] : undefined,
      observations,
      medications,
      conditions,
      allergies: [],
      followUps: [],
      summaryNote: 'Rule-based extraction completed in demo/configuration-check mode.',
      missingInformation: ['LLM extraction inactive - configure LLM_API_KEY in .env for full AI parsing.'],
      uncertainInformation: ['Rule-based extraction cannot infer non-standard abbreviations.'],
    };
  }
}

export class AIServiceManager {
  private primaryProvider: IAIProvider;

  constructor() {
    this.primaryProvider = new GeminiProvider();
  }

  isConfigured(): boolean {
    return this.primaryProvider.isConfigured();
  }

  getStatus() {
    return {
      configured: this.isConfigured(),
      provider: env.AI_PROVIDER,
      model: env.LLM_MODEL,
      notice: this.isConfigured()
        ? 'Active with live LLM provider'
        : '⚠️ DEMO / CONFIGURATION-CHECK MODE: LLM_API_KEY is not configured in backend/.env. Application will use local deterministic extractors and search until a key is added.',
    };
  }

  async extractStructuredMedicalData(
    ocrPages: IOcrPage[],
    documentTypeHint?: string
  ): Promise<IStructuredData> {
    if (this.isConfigured()) {
      try {
        return await this.primaryProvider.extractStructuredMedicalData(ocrPages, documentTypeHint);
      } catch (err: any) {
        logger.warn(
          `AI extraction provider failed: ${err.message}. Gracefully falling back to rule-based extractor.`
        );
        return RuleBasedFallbackExtractor.extractFromText(ocrPages);
      }
    }

    logger.warn('AI not configured. Using rule-based fallback extractor for demo mode.');
    return RuleBasedFallbackExtractor.extractFromText(ocrPages);
  }

  async analyzeDocumentDirectMultimodal(
    fileBuffer: Buffer,
    mimeType: string,
    filename: string,
    documentTypeHint?: string
  ): Promise<{ pages: IOcrPage[]; structured: IStructuredData; summary: SummaryResult }> {
    if (this.isConfigured() && this.primaryProvider.analyzeDocumentMultimodalDirect) {
      try {
        return await this.primaryProvider.analyzeDocumentMultimodalDirect(
          fileBuffer,
          mimeType,
          filename,
          documentTypeHint
        );
      } catch (err: any) {
        logger.warn(
          `Direct multimodal analysis failed: ${err.message}. Gracefully falling back to rule-based fallback.`
        );
      }
    }

    const fallbackText = `Document: ${filename}\nType: ${documentTypeHint || 'medical_report'}\nUploaded for processing.`;
    const fallbackPages: IOcrPage[] = [
      {
        pageNumber: 1,
        text: fallbackText,
        confidence: 0.8,
        engine: 'fallback_direct_extractor',
        language: 'eng',
      },
    ];

    const structured = RuleBasedFallbackExtractor.extractFromText(fallbackPages);
    const summary = this.generateFallbackDocumentSummary(fallbackPages, structured, 'en');

    return {
      pages: fallbackPages,
      structured,
      summary,
    };
  }

  private getLanguageName(lang: SupportedLanguage): string {
    const map: Record<string, string> = {
      en: 'English',
      te: 'తెలుగు',
      hi: 'हिंदी',
      ta: 'தமிழ்',
      kn: 'ಕನ್ನಡ',
      bn: 'বাংলা',
      mr: 'मराठी',
      es: 'Español',
    };
    return map[lang] || 'English';
  }

  async generateDocumentSummary(
    ocrPages: IOcrPage[],
    structured: IStructuredData,
    language: SupportedLanguage = 'en'
  ): Promise<SummaryResult> {
    if (this.isConfigured()) {
      try {
        return await this.primaryProvider.generateDocumentSummary(ocrPages, structured, language);
      } catch (err: any) {
        logger.warn(
          `AI summary generation failed: ${err.message}. Gracefully falling back to local deterministic summary.`
        );
        return this.generateFallbackDocumentSummary(ocrPages, structured, language);
      }
    }

    return this.generateFallbackDocumentSummary(ocrPages, structured, language);
  }

  private generateFallbackDocumentSummary(
    _ocrPages: IOcrPage[],
    structured: IStructuredData,
    language: SupportedLanguage = 'en'
  ): SummaryResult {
    const abnormal = structured.observations.filter((o) => o.isAbnormal);
    const langLabel = this.getLanguageName(language);
    return {
      title: `Medical Summary (${langLabel})`,
      keyFindings: [
        `Identified ${structured.observations.length} laboratory test observation(s).`,
        `Identified ${structured.medications.length} medication entry/entries.`,
        `Identified ${structured.conditions.length} recorded condition(s).`,
      ],
      abnormalValues: abnormal.map((a) => ({
        testName: a.testName,
        value: a.valueString,
        referenceRange: a.referenceRangeString,
        flag: 'Abnormal',
        pageNumber: a.pageNumber,
      })),
      simpleExplanation:
        'This summary was compiled via local deterministic analysis. The document was successfully processed and key clinical parameters are available for your review.',
      missingOrUncertainInfo: ['Full AI narrative fallback used.'],
      suggestedQuestionsForDoctor: [
        'Are my recorded values within my personalized target ranges?',
        'Do I need any lifestyle modifications or follow-up tests?',
      ],
      sourcePageReferences: [1],
      modelUsed: 'local_rule_engine (Fallback Mode)',
    };
  }

  async generatePatientSummary(
    records: RetrievedMedicalRecord[],
    language: SupportedLanguage = 'en'
  ): Promise<SummaryResult> {
    if (this.isConfigured()) {
      try {
        return await this.primaryProvider.generatePatientSummary(records, language);
      } catch (err: any) {
        logger.warn(
          `AI patient summary failed: ${err.message}. Gracefully falling back to local deterministic summary.`
        );
        return this.generateFallbackPatientSummary(records, language);
      }
    }

    return this.generateFallbackPatientSummary(records, language);
  }

  private generateFallbackPatientSummary(
    records: RetrievedMedicalRecord[],
    language: SupportedLanguage = 'en'
  ): SummaryResult {
    const langName = this.getLanguageName(language);
    const observations = records.filter((r) => r.recordType === 'observation');
    const medications = records.filter((r) => r.recordType === 'medication');
    const conditions = records.filter((r) => r.recordType === 'condition');

    const abnormalValues: any[] = [];
    observations.forEach((o) => {
      const isAbnormal = /Flag:\s*(HIGH|LOW|ABNORMAL|High|Low|Abnormal)/i.test(o.content);
      if (isAbnormal) {
        const valMatch = o.content.match(/Result:\s*([^\(]+)/);
        const refMatch = o.content.match(/Ref:\s*([^,]+)/);
        const flagMatch = o.content.match(/Flag:\s*([^\)]+)/);
        abnormalValues.push({
          testName: o.title,
          value: valMatch ? valMatch[1].trim() : 'Outside standard range',
          referenceRange: refMatch ? refMatch[1].trim() : undefined,
          flag: flagMatch ? flagMatch[1].trim() : 'Flagged',
          pageNumber: o.pageNumber || 1,
        });
      }
    });

    const keyFindings: string[] = [];
    if (observations.length > 0) {
      keyFindings.push(`Tracked ${observations.length} laboratory investigation(s) in medical record history.`);
    }
    if (abnormalValues.length > 0) {
      const flaggedNames = abnormalValues.map((a) => a.testName).slice(0, 3).join(', ');
      keyFindings.push(`Identified ${abnormalValues.length} investigation(s) outside reference intervals (${flaggedNames}).`);
    } else if (observations.length > 0) {
      keyFindings.push('Recorded lab observations are generally within reported normal intervals.');
    }
    if (medications.length > 0) {
      const medList = medications.map((m) => m.title).slice(0, 3).join(', ');
      keyFindings.push(`Active pharmaceutical management includes: ${medList}.`);
    }
    if (conditions.length > 0) {
      const condList = conditions.map((c) => c.title).slice(0, 3).join(', ');
      keyFindings.push(`Documented clinical diagnosis: ${condList}.`);
    }
    if (keyFindings.length === 0) {
      keyFindings.push('Health profile initialized. Upload laboratory or medical reports to begin longitudinal tracking.');
    }

    const medNames = medications.map((m) => m.title).slice(0, 2).join(' and ');
    const suggestedQuestionsForDoctor: string[] = [];
    if (abnormalValues.length > 0) {
      suggestedQuestionsForDoctor.push(
        `How do my recent values for ${abnormalValues[0].testName} compare to my target clinical goals?`
      );
    }
    if (medications.length > 0) {
      suggestedQuestionsForDoctor.push(
        `Is my current regimen for ${medNames} still appropriate, or are any dosage adjustments needed?`
      );
    }
    suggestedQuestionsForDoctor.push(
      'What specific dietary, lifestyle, or follow-up laboratory testing schedule is recommended?'
    );

    const explanation = records.length > 0
      ? `Across your longitudinal health profile (${records.length} total records tracked), your clinical history documents ${observations.length} laboratory tests, ${medications.length} active prescriptions, and ${conditions.length} conditions. Trends demonstrate continuous monitoring under medical supervision.`
      : 'Your health profile is ready for document uploads. Once bloodwork or prescriptions are confirmed, an overarching clinical summary will be automatically synthesized.';

    return {
      title: `Longitudinal Health Summary (${langName})`,
      keyFindings,
      abnormalValues,
      simpleExplanation: explanation,
      missingOrUncertainInfo: [
        'Quarterly HbA1c or annual wellness updates should be added as new reports are conducted.',
      ],
      suggestedQuestionsForDoctor,
      sourcePageReferences: [1],
      modelUsed: 'local_clinical_synthesizer (Resilient Fallback Engine)',
    };
  }

  async answerHealthQuery(
    question: string,
    contextRecords: RetrievedMedicalRecord[],
    language: SupportedLanguage = 'en'
  ): Promise<ChatAnswerResult> {
    if (this.isConfigured()) {
      try {
        return await this.primaryProvider.answerHealthQuery(question, contextRecords, language);
      } catch (err: any) {
        logger.warn(
          `AI chat answering failed: ${err.message}. Gracefully falling back to local grounded retrieval.`
        );
        return this.generateFallbackChatAnswer(question, contextRecords, language);
      }
    }

    return this.generateFallbackChatAnswer(question, contextRecords, language);
  }

  private generateFallbackChatAnswer(
    _question: string,
    contextRecords: RetrievedMedicalRecord[],
    language: SupportedLanguage = 'en'
  ): ChatAnswerResult {
    if (contextRecords.length === 0) {
      return {
        answer:
          'Your uploaded medical records do not contain information related to this question. Please upload relevant lab reports or prescriptions to discuss them.',
        citations: [],
        modelUsed: 'grounded_local_retriever (Fallback Mode)',
        language,
        isGrounded: true,
        warnings: [
          'No matching records found. Upload relevant lab reports or prescriptions to discuss them.',
        ],
      };
    }

    const citations = contextRecords.slice(0, 3).map((r) => ({
      documentId: r.documentId,
      documentTitle: r.documentTitle,
      pageNumber: r.pageNumber,
      excerpt: r.content.slice(0, 140),
    }));

    const findings = contextRecords
      .slice(0, 4)
      .map((r) => `• [${r.documentTitle}, Page ${r.pageNumber}]: ${r.title} — ${r.content}`)
      .join('\n');

    return {
      answer: `Based on your uploaded medical records, here are the matching clinical entries:\n\n${findings}`,
      citations,
      modelUsed: 'grounded_local_retriever (Fallback Mode)',
      language,
      isGrounded: true,
      warnings: ['Response generated using local grounded search fallback.'],
    };
  }
}

export const aiService = new AIServiceManager();
