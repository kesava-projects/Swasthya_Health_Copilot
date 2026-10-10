import { IOcrPage, IStructuredData } from '../../modules/extractions/extraction.model.js';

export interface RetrievedMedicalRecord {
  recordType: 'observation' | 'medication' | 'condition' | 'document_summary' | 'ocr_excerpt';
  title: string;
  date?: string;
  content: string;
  documentId: string;
  documentTitle: string;
  pageNumber: number;
  isVerified: boolean;
}

export interface ChatCitation {
  documentId: string;
  documentTitle: string;
  pageNumber: number;
  excerpt: string;
}

export type SupportedLanguage = 'en' | 'te' | 'hi' | 'ta' | 'kn' | 'bn' | 'mr' | 'es' | string;

export interface ChatAnswerResult {
  answer: string;
  citations: ChatCitation[];
  modelUsed: string;
  language: SupportedLanguage;
  isGrounded: boolean;
  warnings?: string[];
}

export interface SummaryResult {
  title: string;
  keyFindings: string[];
  abnormalValues: {
    testName: string;
    value: string;
    referenceRange?: string;
    flag: string;
    pageNumber?: number;
  }[];
  simpleExplanation: string;
  missingOrUncertainInfo: string[];
  suggestedQuestionsForDoctor: string[];
  sourcePageReferences: number[];
  modelUsed: string;
}

export interface IAIProvider {
  readonly providerName: string;
  isConfigured(): boolean;
  extractStructuredMedicalData(ocrPages: IOcrPage[], documentTypeHint?: string): Promise<IStructuredData>;
  generateDocumentSummary(ocrPages: IOcrPage[], structured: IStructuredData, language: SupportedLanguage): Promise<SummaryResult>;
  generatePatientSummary(records: RetrievedMedicalRecord[], language: SupportedLanguage): Promise<SummaryResult>;
  answerHealthQuery(question: string, contextRecords: RetrievedMedicalRecord[], language: SupportedLanguage): Promise<ChatAnswerResult>;
  analyzeDocumentMultimodalDirect?(
    fileBuffer: Buffer,
    mimeType: string,
    filename: string,
    documentTypeHint?: string
  ): Promise<{ pages: IOcrPage[]; structured: IStructuredData; summary: SummaryResult }>;
}
