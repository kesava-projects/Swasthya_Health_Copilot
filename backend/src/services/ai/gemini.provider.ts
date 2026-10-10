import { GoogleGenerativeAI } from '@google/generative-ai';
import { env } from '../../config/env.js';
import { logger } from '../../utils/logger.js';
import { IOcrPage, IStructuredData } from '../../modules/extractions/extraction.model.js';
import {
  IAIProvider,
  RetrievedMedicalRecord,
  ChatAnswerResult,
  SummaryResult,
  ChatCitation,
} from './ai.interface.js';
import {
  MEDICAL_EXTRACTION_SYSTEM_PROMPT,
  EXTRACTION_SCHEMA_JSON,
  CHATBOT_SYSTEM_PROMPT,
} from './ai.prompts.js';

export class GeminiProvider implements IAIProvider {
  readonly providerName = 'gemini';
  private client: GoogleGenerativeAI | null = null;
  private modelName: string;

  constructor() {
    this.modelName = env.LLM_MODEL || 'gemini-1.5-flash';
    if (env.LLM_API_KEY && env.LLM_API_KEY.trim() !== '') {
      try {
        this.client = new GoogleGenerativeAI(env.LLM_API_KEY.trim());
      } catch (err) {
        logger.error('Failed to initialize GoogleGenerativeAI client', { err });
      }
    }
  }

  isConfigured(): boolean {
    return Boolean(this.client && env.LLM_API_KEY && env.LLM_API_KEY.trim() !== '');
  }

  private cleanJsonString(raw: string): string {
    let clean = raw.trim();
    if (clean.includes('```json')) {
      const match = clean.match(/```json\s*([\s\S]*?)\s*```/);
      if (match) return match[1].trim();
    } else if (clean.includes('```')) {
      const match = clean.match(/```\s*([\s\S]*?)\s*```/);
      if (match) return match[1].trim();
    }
    const firstBrace = clean.indexOf('{');
    const lastBrace = clean.lastIndexOf('}');
    if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
      return clean.slice(firstBrace, lastBrace + 1);
    }
    return clean;
  }

  private async executeGenerateContent(
    prompt: string | any[],
    temperature = 0.2
  ): Promise<{ text: string; modelUsed: string }> {
    if (!this.client) {
      throw new Error('GoogleGenerativeAI client is not initialized');
    }

    const candidateModels = [
      this.modelName || 'gemini-flash-lite-latest',
      'gemini-flash-lite-latest',
      'gemini-3.5-flash-lite',
      'gemini-3.1-flash-lite',
      'gemini-flash-latest',
      'gemini-3.8-flash',
    ].filter((m, idx, arr) => m && arr.indexOf(m) === idx);

    const maxRetries = Math.max(env.LLM_MAX_RETRIES || 2, 2);
    let lastError: any = null;

    for (const modelToTry of candidateModels) {
      for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
          const model = this.client.getGenerativeModel({
            model: modelToTry,
            generationConfig: {
              temperature,
              maxOutputTokens: env.LLM_MAX_OUTPUT_TOKENS,
              responseMimeType: 'application/json',
            },
          });

          const response = await model.generateContent(prompt);
          const text = response.response.text();
          return { text, modelUsed: `gemini (${modelToTry})` };
        } catch (error: any) {
          lastError = error;
          const msg = error?.message || '';

          // If daily quota for this specific model is exhausted, don't wait - immediately switch models!
          const isQuotaExhausted =
            msg.includes('quota') ||
            msg.includes('exceeded your current quota') ||
            msg.includes('GenerateRequestsPerDay');

          if (isQuotaExhausted) {
            logger.warn(
              `Model "${modelToTry}" daily quota exhausted. Switching immediately to next fallback model...`
            );
            break;
          }

          const isTransient =
            msg.includes('503') ||
            msg.includes('high demand') ||
            msg.includes('overloaded') ||
            msg.includes('temporarily') ||
            msg.includes('fetch failed') ||
            msg.includes('429');

          if (isTransient && attempt < maxRetries) {
            const delay = Math.pow(2, attempt) * 1000 + Math.random() * 500;
            logger.warn(
              `Gemini API transient spike (503/429) on model "${modelToTry}". Retrying in ${Math.round(delay)}ms (attempt ${attempt + 1}/${maxRetries})...`
            );
            await new Promise((res) => setTimeout(res, delay));
          } else {
            if (candidateModels.length > 1 && modelToTry !== candidateModels[candidateModels.length - 1]) {
              logger.warn(`Model "${modelToTry}" unavailable (${msg.slice(0, 80)}...). Trying next fallback model...`);
            }
            break;
          }
        }
      }
    }

    throw lastError || new Error('Failed to generate content from Gemini API');
  }

  async extractStructuredMedicalData(
    ocrPages: IOcrPage[],
    documentTypeHint?: string
  ): Promise<IStructuredData> {
    if (!this.isConfigured()) {
      throw new Error(
        'AI Provider not configured: LLM_API_KEY is missing. Please set LLM_API_KEY in your backend/.env'
      );
    }

    const pagesText = ocrPages
      .map((p) => `--- PAGE ${p.pageNumber} ---\n${p.text}`)
      .join('\n\n');

    const prompt = `
${MEDICAL_EXTRACTION_SYSTEM_PROMPT}

Document Type Hint: ${documentTypeHint || 'Unknown'}

Document OCR Content:
${pagesText}

Respond ONLY with valid JSON conforming to this schema:
${JSON.stringify(EXTRACTION_SCHEMA_JSON, null, 2)}
`;

    try {
      const { text } = await this.executeGenerateContent(prompt, 0.1);
      const cleaned = this.cleanJsonString(text);
      const parsed: IStructuredData = JSON.parse(cleaned);

      return parsed;
    } catch (error: any) {
      logger.error('Gemini extraction error', { error: error.message });
      throw new Error(`Gemini structured extraction failed: ${error.message}`);
    }
  }

  private getLanguageName(lang: string): string {
    const map: Record<string, string> = {
      en: 'English',
      te: 'Telugu (తెలుగు)',
      hi: 'Hindi (हिंदी)',
      ta: 'Tamil (தமிழ்)',
      kn: 'Kannada (ಕನ್ನಡ)',
      bn: 'Bengali (বাংলা)',
      mr: 'Marathi (मराठी)',
      es: 'Spanish (Español)',
    };
    return map[lang] || 'English';
  }

  async generateDocumentSummary(
    ocrPages: IOcrPage[],
    structured: IStructuredData,
    language: string = 'en'
  ): Promise<SummaryResult> {
    if (!this.isConfigured()) {
      throw new Error(
        'AI Provider not configured: LLM_API_KEY is missing. Please set LLM_API_KEY in your backend/.env'
      );
    }

    const langName = this.getLanguageName(language);
    const pagesText = ocrPages
      .map((p) => `--- PAGE ${p.pageNumber} ---\n${p.text}`)
      .join('\n\n');

    const prompt = `
You are a compassionate healthcare AI assistant. Provide a structured, patient-friendly medical summary of the following medical record.
IMPORTANT INSTRUCTIONS:
- Explain in simple ${langName} that a patient or caregiver can easily understand.
- Preserve medical units (e.g. mg/dL, g/dL, mg) and exact test names intact.
- Separate explicitly documented findings from general educational guidance.
- State clearly if certain crucial data (e.g. baseline or doctor comments) is missing.
- Suggest 2 to 4 sensible questions the patient can ask their doctor.
- DO NOT diagnose the patient or prescribe medication.

OCR Document Text:
${pagesText}

Structured Data Extracted:
${JSON.stringify(structured, null, 2)}

Return strictly valid JSON with this format:
{
  "title": "Clear document summary title in ${langName}",
  "keyFindings": ["Finding 1 in ${langName}", "Finding 2 in ${langName}"],
  "abnormalValues": [
    {
      "testName": "Test name",
      "value": "Result value",
      "referenceRange": "Report range",
      "flag": "High | Low | Abnormal",
      "pageNumber": 1
    }
  ],
  "simpleExplanation": "Plain language summary of the report in ${langName}",
  "missingOrUncertainInfo": ["Item 1", "Item 2"],
  "suggestedQuestionsForDoctor": ["Question 1 in ${langName}", "Question 2 in ${langName}"],
  "sourcePageReferences": [1]
}
`;

    try {
      const { text, modelUsed } = await this.executeGenerateContent(prompt, 0.2);
      const parsed = JSON.parse(this.cleanJsonString(text));

      return {
        ...parsed,
        modelUsed,
      };
    } catch (error: any) {
      logger.error('Gemini summary generation error', { error: error.message });
      throw new Error(`Gemini summary generation failed: ${error.message}`);
    }
  }

  async generatePatientSummary(
    records: RetrievedMedicalRecord[],
    language: string = 'en'
  ): Promise<SummaryResult> {
    if (!this.isConfigured()) {
      throw new Error(
        'AI Provider not configured: LLM_API_KEY is missing. Please set LLM_API_KEY in your backend/.env'
      );
    }

    const langName = this.getLanguageName(language);
    const context = records
      .map(
        (r) =>
          `[${r.recordType.toUpperCase()} - Date: ${r.date || 'Unknown'} - Doc: ${r.documentTitle} (Page ${r.pageNumber})]:\n${r.content}`
      )
      .join('\n\n');

    const prompt = `
You are a compassionate healthcare AI assistant. Provide a structured, longitudinal health profile summary in simple ${langName} across all of the patient's verified clinical records.
IMPORTANT INSTRUCTIONS:
- Explain in simple ${langName} that a patient or caregiver can easily understand.
- Summarize chronological lab trends, active conditions, and active prescriptions.
- Highlight any abnormal values or health improvements over time.
- Suggest 2 to 4 sensible, personalized questions the patient can ask their doctor during their next visit.
- DO NOT prescribe medications or make definitive diagnostic claims.

Clinical Records Context:
${context}

Return strictly valid JSON matching this schema:
{
  "title": "Clear longitudinal health profile summary title in ${langName}",
  "keyFindings": ["Finding 1 in ${langName}", "Finding 2 in ${langName}"],
  "abnormalValues": [
    {
      "testName": "Test name",
      "value": "Result value",
      "referenceRange": "Report range",
      "flag": "High | Low | Abnormal",
      "pageNumber": 1
    }
  ],
  "simpleExplanation": "Comprehensive plain-language longitudinal explanation of overall health in ${langName}",
  "missingOrUncertainInfo": ["Any missing baseline or follow-up note"],
  "suggestedQuestionsForDoctor": ["Question 1 in ${langName}", "Question 2 in ${langName}"],
  "sourcePageReferences": [1]
}
`;

    try {
      const { text, modelUsed } = await this.executeGenerateContent(prompt, 0.2);
      const parsed = JSON.parse(this.cleanJsonString(text));

      return {
        ...parsed,
        modelUsed,
      };
    } catch (error: any) {
      logger.error('Gemini patient summary error', { error: error.message });
      throw new Error(`Gemini patient summary generation failed: ${error.message}`);
    }
  }

  async answerHealthQuery(
    question: string,
    contextRecords: RetrievedMedicalRecord[],
    language: string = 'en'
  ): Promise<ChatAnswerResult> {
    if (!this.isConfigured()) {
      throw new Error(
        'AI Provider not configured: LLM_API_KEY is missing. Please set LLM_API_KEY in your backend/.env'
      );
    }

    const langName = this.getLanguageName(language);
    const contextText = contextRecords.length > 0
      ? contextRecords
          .map(
            (r, idx) =>
              `Record #${idx + 1} [DocId: "${r.documentId}", Type: ${r.recordType}, Doc: "${r.documentTitle}", Page: ${r.pageNumber}, Status: ${
                r.isVerified ? 'VERIFIED' : 'UNCONFIRMED_DRAFT'
              }]:\n${r.content}`
          )
          .join('\n\n')
      : 'NO MATCHING RECORDS FOUND IN USER HEALTH PROFILE.';

    const prompt = `
${CHATBOT_SYSTEM_PROMPT}

Language Preference: ${langName}

CONTEXT OF USER HEALTH RECORDS:
${contextText}

USER QUESTION:
${question}

Format your response as valid JSON:
{
  "answer": "Your comprehensive, grounded response in ${langName}. Include inline citations like [Doc: <Title>, Page: <Num>] when referencing findings.",
  "citations": [
    {
      "documentId": "exact 24-character DocId matching the record if present",
      "documentTitle": "documentTitle",
      "pageNumber": 1,
      "excerpt": "relevant quote or finding"
    }
  ],
  "isGrounded": true,
  "warnings": []
}
`;

    try {
      const { text, modelUsed } = await this.executeGenerateContent(prompt, 0.2);
      const parsed = JSON.parse(this.cleanJsonString(text));

      const isHexId = (val: any) => typeof val === 'string' && /^[0-9a-fA-F]{24}$/.test(val.trim());

      const citations: ChatCitation[] = (parsed.citations || []).map((c: any) => {
        // Find matching context record
        const matched =
          contextRecords.find((r) => isHexId(c.documentId) && r.documentId === c.documentId.trim()) ||
          contextRecords.find((r) => {
            const docTitle = (c.documentTitle || '').toLowerCase();
            const rTitle = (r.documentTitle || '').toLowerCase();
            return docTitle && rTitle && (rTitle === docTitle || rTitle.includes(docTitle) || docTitle.includes(rTitle));
          }) ||
          contextRecords[0];

        // Ensure documentId is only a valid 24-char hex string
        let resolvedDocId = '';
        if (isHexId(c.documentId)) {
          resolvedDocId = c.documentId.trim();
        } else if (matched?.documentId && isHexId(matched.documentId)) {
          resolvedDocId = matched.documentId.trim();
        }

        return {
          documentId: resolvedDocId,
          documentTitle: c.documentTitle || matched?.documentTitle || 'Medical Document',
          pageNumber: Number(c.pageNumber) || matched?.pageNumber || 1,
          excerpt: c.excerpt || '',
        };
      });

      return {
        answer: parsed.answer,
        citations,
        modelUsed,
        language,
        isGrounded: parsed.isGrounded !== false,
        warnings: parsed.warnings || [],
      };
    } catch (error: any) {
      logger.error('Gemini chat answering error', { error: error.message });
      throw new Error(`Gemini chatbot answering failed: ${error.message}`);
    }
  }

  async analyzeDocumentMultimodalDirect(
    fileBuffer: Buffer,
    mimeType: string,
    filename: string,
    documentTypeHint?: string
  ): Promise<{ pages: IOcrPage[]; structured: IStructuredData; summary: SummaryResult }> {
    if (!this.isConfigured()) {
      throw new Error(
        'AI Provider not configured: LLM_API_KEY is missing. Please set LLM_API_KEY in your backend/.env'
      );
    }

    const base64Data = fileBuffer.toString('base64');
    const validMime = mimeType === 'application/pdf'
      ? 'application/pdf'
      : mimeType.startsWith('image/')
      ? mimeType
      : 'image/jpeg';

    const promptText = `
You are an expert clinical medical intelligence system.
Analyze this medical document file: "${filename}" (Type Hint: ${documentTypeHint || 'Clinical Report'}).
Extract text page by page, extract structured clinical data (laboratory observations with units, reference ranges, and abnormality flags, medications with dosage and frequency, diagnosed conditions), and formulate a patient-friendly summary.

CRITICAL MEDICAL EXTRACTION RULES:
- Read all numeric values, units, and ranges precisely as printed.
- Flag any test outside standard ranges as isAbnormal: true.
- Extract all prescribed medicines and dosages.
- Separate proven findings from tentative mentions.
- Formulate 2 to 4 clear, constructive questions the patient can ask their doctor.

Respond strictly with valid JSON with this exact schema:
{
  "pages": [
    {
      "pageNumber": 1,
      "text": "Full extracted text from page 1",
      "confidence": 0.95,
      "language": "eng"
    }
  ],
  "structured": {
    "documentType": "${documentTypeHint || 'lab_report'}",
    "documentDate": "YYYY-MM-DD",
    "patientName": "Patient name if found",
    "observations": [
      {
        "testName": "Exact test name",
        "valueNumeric": 12.5,
        "valueString": "12.5",
        "unit": "g/dL",
        "referenceRangeLow": 12.0,
        "referenceRangeHigh": 17.5,
        "referenceRangeString": "12.0 - 17.5 g/dL",
        "referenceRangeSource": "Laboratory printed reference interval",
        "isAbnormal": false,
        "pageNumber": 1,
        "sourceText": "Exact text from document",
        "confidence": "high"
      }
    ],
    "medications": [
      {
        "medicineName": "Medicine name",
        "dosage": "e.g. 500mg",
        "frequency": "e.g. 1-0-1 or BD",
        "instructions": "e.g. After food",
        "pageNumber": 1,
        "sourceText": "Exact text from document",
        "confidence": "high"
      }
    ],
    "conditions": [
      {
        "conditionName": "Condition name",
        "pageNumber": 1,
        "sourceText": "Exact text from document",
        "confidence": "high"
      }
    ],
    "allergies": [],
    "followUps": [],
    "summaryNote": "Clinical overview note",
    "missingInformation": [],
    "uncertainInformation": []
  },
  "summary": {
    "title": "Clear Medical Report Summary",
    "keyFindings": ["Key finding 1", "Key finding 2"],
    "abnormalValues": [
      {
        "testName": "Test name",
        "value": "Value",
        "referenceRange": "Reference range",
        "flag": "High | Low | Abnormal",
        "pageNumber": 1
      }
    ],
    "simpleExplanation": "Clear, compassionate plain-language explanation of the findings in easy-to-understand language.",
    "missingOrUncertainInfo": [],
    "suggestedQuestionsForDoctor": ["Question 1 to ask physician", "Question 2 to ask physician"],
    "sourcePageReferences": [1]
  }
}
`;

    const contents = [
      {
        inlineData: {
          data: base64Data,
          mimeType: validMime,
        },
      },
      promptText,
    ];

    try {
      const { text, modelUsed } = await this.executeGenerateContent(contents, 0.1);
      const parsed = JSON.parse(this.cleanJsonString(text));

      const pages: IOcrPage[] = (parsed.pages || [
        {
          pageNumber: 1,
          text: (parsed.structured?.observations || []).map((o: any) => `${o.testName}: ${o.valueString}`).join('\n') || 'Document analyzed directly by Gemini multimodal AI.',
          confidence: 0.95,
          language: 'eng',
        },
      ]).map((p: any) => ({
        pageNumber: p.pageNumber || 1,
        text: p.text || '',
        confidence: p.confidence || 0.95,
        engine: `gemini_multimodal (${modelUsed})`,
        language: p.language || 'eng',
        warnings: [],
      }));

      const structured: IStructuredData = parsed.structured || {
        documentType: documentTypeHint || 'medical_report',
        observations: [],
        medications: [],
        conditions: [],
        allergies: [],
        followUps: [],
        missingInformation: [],
        uncertainInformation: [],
      };

      const summary: SummaryResult = {
        title: parsed.summary?.title || `Medical Summary: ${filename}`,
        keyFindings: parsed.summary?.keyFindings || ['Document processed successfully by Multimodal AI.'],
        abnormalValues: parsed.summary?.abnormalValues || [],
        simpleExplanation: parsed.summary?.simpleExplanation || 'Clinical extraction completed.',
        missingOrUncertainInfo: parsed.summary?.missingOrUncertainInfo || [],
        suggestedQuestionsForDoctor: parsed.summary?.suggestedQuestionsForDoctor || [
          'Are my recorded values within normal limits for my profile?',
        ],
        sourcePageReferences: parsed.summary?.sourcePageReferences || [1],
        modelUsed,
      };

      return { pages, structured, summary };
    } catch (error: any) {
      logger.error('Gemini multimodal direct analysis error:', { error: error.message });
      throw new Error(`Direct multimodal document analysis failed: ${error.message}`);
    }
  }
}
