export type Language = 'en' | 'te' | 'hi' | 'ta' | 'kn' | 'bn' | 'mr' | 'es';

export interface User {
  id: string;
  name: string;
  email: string;
  dateOfBirth?: string;
  gender?: 'male' | 'female' | 'other' | 'prefer_not_to_say';
  bloodGroup?: string;
  mockAbhaId?: string;
  allergies?: string[];
  preferredLanguage: Language;
  emergencyContact?: {
    name: string;
    relationship: string;
    phone: string;
  };
}

export type DocumentType = 
  | 'prescription' 
  | 'lab_report' 
  | 'diagnostic_report' 
  | 'discharge_summary' 
  | 'other';

export type ProcessingStatus = 
  | 'queued' 
  | 'processing' 
  | 'awaiting_review' 
  | 'completed' 
  | 'failed';

export interface MedicalDocument {
  id: string;
  originalName: string;
  documentType: DocumentType;
  documentDate?: string;
  pageCount: number;
  sizeBytes: number;
  mimeType?: string;
  processingStatus: ProcessingStatus;
  errorMessage?: string;
  createdAt: string;
}

export interface ExtractedObservation {
  testName: string;
  standardizedCode?: string;
  valueNumeric?: number;
  valueString: string;
  unit?: string;
  referenceRangeLow?: number;
  referenceRangeHigh?: number;
  referenceRangeString?: string;
  referenceRangeSource?: string;
  isAbnormal?: boolean;
  pageNumber: number;
  sourceText?: string;
  confidence?: 'high' | 'medium' | 'low';
}

export interface ExtractedMedication {
  medicineName: string;
  dosage?: string;
  frequency?: string;
  route?: string;
  duration?: string;
  instructions?: string;
  pageNumber: number;
  sourceText?: string;
  confidence?: 'high' | 'medium' | 'low';
}

export interface ExtractedCondition {
  conditionName: string;
  icd10Code?: string;
  diagnosedDate?: string;
  notes?: string;
  pageNumber: number;
  sourceText?: string;
  confidence?: 'high' | 'medium' | 'low';
}

export interface StructuredData {
  documentType?: string;
  documentDate?: string;
  patientName?: string;
  patientAge?: string;
  patientGender?: string;
  providerName?: string;
  facilityName?: string;
  observations: ExtractedObservation[];
  medications: ExtractedMedication[];
  conditions: ExtractedCondition[];
  allergies: string[];
  followUps: { instruction: string; targetDate?: string; pageNumber: number }[];
  summaryNote?: string;
  missingInformation: string[];
  uncertainInformation: string[];
}

export interface OcrPage {
  pageNumber: number;
  text: string;
  confidence?: number;
  engine: string;
  language?: string;
  warnings?: string[];
}

export interface Extraction {
  documentId: string;
  reviewStatus: 'unreviewed' | 'edited' | 'confirmed';
  ocrEngine: string;
  pages: OcrPage[];
  structuredData: StructuredData;
}

export interface Observation {
  _id: string;
  testName: string;
  valueNumeric?: number;
  valueString: string;
  unit?: string;
  referenceRangeString?: string;
  interpretation: 'NORMAL' | 'HIGH' | 'LOW' | 'ABNORMAL' | 'UNKNOWN';
  observationDate: string;
  verificationStatus: 'unverified' | 'user_confirmed' | 'provider_verified';
  pageNumber: number;
  sourceDocumentId?: {
    _id: string;
    originalName: string;
    documentType: string;
  };
}

export interface TrendPoint {
  id: string;
  date: string;
  timestamp: number;
  value: number;
  valueString: string;
  unit: string;
  refLow?: number;
  refHigh?: number;
  referenceRange?: string;
  interpretation: string;
  documentId: string;
  documentName: string;
  pageNumber: number;
}

export interface ObservationTrend {
  testName: string;
  unit: string;
  count: number;
  latestValue: number;
  latestInterpretation: string;
  referenceRange?: string;
  refLow?: number;
  refHigh?: number;
  dataPoints: TrendPoint[];
}

export interface MedicationRecord {
  _id: string;
  medicineName: string;
  dosage?: string;
  frequency?: string;
  route?: string;
  duration?: string;
  instructions?: string;
  prescribedDate: string;
  isCurrent: boolean;
  verificationStatus: string;
  sourceDocumentId?: {
    _id: string;
    originalName: string;
  };
}

export interface ConditionRecord {
  _id: string;
  conditionName: string;
  icd10Code?: string;
  diagnosedDate: string;
  status: 'active' | 'resolved' | 'chronic' | 'unknown';
  notes?: string;
  verificationStatus: string;
  sourceDocumentId?: {
    _id: string;
    originalName: string;
  };
}

export interface TimelineEvent {
  _id: string;
  eventType: string;
  category: 'lab' | 'medication' | 'condition' | 'document' | 'other';
  title: string;
  description: string;
  eventDate: string;
  uploadDate: string;
  sourceDocumentId?: {
    _id: string;
    id?: string;
    originalName: string;
    documentType?: DocumentType;
    mimeType?: string;
    sizeBytes?: number;
    pageCount?: number;
    documentDate?: string;
    processingStatus?: string;
  };
  pageNumber?: number;
  isVerified: boolean;
}

export interface Citation {
  documentId: string;
  documentTitle: string;
  pageNumber: number;
  excerpt: string;
}

export interface ChatMessage {
  _id?: string;
  sender: 'user' | 'assistant' | 'system';
  text: string;
  citations?: Citation[];
  createdAt?: string;
}

export interface Conversation {
  _id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
}

export interface Reminder {
  _id: string;
  title: string;
  notes?: string;
  reminderType: 'appointment' | 'medication' | 'lab_followup';
  scheduledTime: string;
  status: 'pending' | 'snoozed' | 'completed' | 'cancelled';
  userConfirmed: boolean;
  dosage?: string;
  frequency?: string;
}

export interface DocumentSummary {
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
}
