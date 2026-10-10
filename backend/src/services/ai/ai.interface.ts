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

export interface ChatAnswerResult {
  answer: string;
  citations: ChatCitation[];
  modelUsed: string;
  language: 'en' | 'te' | 'hi';
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
  generateDocumentSummary(ocrPages: IOcrPage[], structured: IStructuredData, language: 'en' | 'te' | 'hi'): Promise<SummaryResult>;
  generatePatientSummary(records: RetrievedMedicalRecord[], language: 'en' | 'te' | 'hi'): Promise<SummaryResult>;
  answerHealthQuery(question: string, contextRecords: RetrievedMedicalRecord[], language: 'en' | 'te' | 'hi'): Promise<ChatAnswerResult>;
  analyzeDocumentMultimodalDirect?(
    fileBuffer: Buffer,
    mimeType: string,
    filename: string,
    documentTypeHint?: string
  ): Promise<{ pages: IOcrPage[]; structured: IStructuredData; summary: SummaryResult }>;
}
