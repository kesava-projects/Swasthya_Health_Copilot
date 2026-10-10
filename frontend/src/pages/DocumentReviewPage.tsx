import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../api/client.js';
import { useAuth } from '../context/AuthContext.js';
import { getT } from '../utils/i18n.js';
import {
  FileText,
  CheckCircle,
  Save,
  AlertTriangle,
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Plus,
  Trash2,
  Maximize2,
  Sparkles,
  Globe,
  RefreshCw,
  Copy,
  Check,
  MessageSquare,
  Info,
  HelpCircle,
} from 'lucide-react';
import { Extraction, ExtractedObservation, ExtractedMedication, ExtractedCondition, Language } from '../types/index.js';
import { DocumentPreviewModal } from '../components/DocumentPreviewModal.js';

export const DocumentReviewPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { language, token } = useAuth();
  const t = getT(language);

  const [document, setDocument] = useState<any>(null);
  const [extraction, setExtraction] = useState<Extraction | null>(null);
  const [activePage, setActivePage] = useState<number>(1);
  const [activeTab, setActiveTab] = useState<'fields' | 'summary' | 'raw_ocr'>('fields');
  const [loading, setLoading] = useState(true);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  // AI Summary State
  const [summary, setSummary] = useState<any | null>(null);
  const [loadingSummary, setLoadingSummary] = useState(false);
  const [generatingSummary, setGeneratingSummary] = useState(false);
  const [summaryLang, setSummaryLang] = useState<Language>(language);
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);

  const fetchSummary = async (lang: Language = summaryLang) => {
    try {
      setLoadingSummary(true);
      const res = await api.get(`/summaries/document/${id}`, { params: { language: lang } });
      if (res.data.success && res.data.summary) {
        setSummary(res.data.summary);
      }
    } catch (err) {
      console.error('Failed to load summary:', err);
    } finally {
      setLoadingSummary(false);
    }
  };

  const handleGenerateSummary = async (lang: Language = summaryLang) => {
    try {
      setGeneratingSummary(true);
      const res = await api.post(`/summaries/document/${id}/generate`, { language: lang });
      if (res.data.success && res.data.summary) {
        setSummary(res.data.summary);
        setActiveTab('summary');
      }
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to generate AI summary');
    } finally {
      setGeneratingSummary(false);
    }
  };

  const fetchDocumentAndExtraction = async () => {
    try {
      setLoading(true);
      const [docRes, extRes] = await Promise.all([
        api.get(`/documents/${id}`),
        api.get(`/extractions/${id}`),
      ]);

      if (docRes.data.success) {
        setDocument(docRes.data.document);
      }
      if (extRes.data.success) {
        setExtraction(extRes.data.extraction);
      }
      fetchSummary(summaryLang);
    } catch (err: any) {
      console.error('Failed to load document or extraction:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDocumentAndExtraction();
  }, [id]);

  const handleObservationChange = (index: number, field: keyof ExtractedObservation, val: any) => {
    if (!extraction) return;
    const updated = [...extraction.structuredData.observations];
    updated[index] = { ...updated[index], [field]: val };
    setExtraction({
      ...extraction,
      structuredData: { ...extraction.structuredData, observations: updated },
    });
  };

  const handleMedicationChange = (index: number, field: keyof ExtractedMedication, val: any) => {
    if (!extraction) return;
    const updated = [...extraction.structuredData.medications];
    updated[index] = { ...updated[index], [field]: val };
    setExtraction({
      ...extraction,
      structuredData: { ...extraction.structuredData, medications: updated },
    });
  };

  const handleConditionChange = (index: number, field: keyof ExtractedCondition, val: any) => {
    if (!extraction) return;
    const updated = [...extraction.structuredData.conditions];
    updated[index] = { ...updated[index], [field]: val };
    setExtraction({
      ...extraction,
      structuredData: { ...extraction.structuredData, conditions: updated },
    });
  };

  const handleSaveCorrections = async () => {
    if (!extraction) return;
    setSaving(true);
    setMessage(null);
    try {
      await api.put(`/extractions/${id}`, {
        structuredData: extraction.structuredData,
      });
      setMessage('Corrections saved successfully as draft.');
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to save corrections');
    } finally {
      setSaving(false);
    }
  };

  const handleConfirmAndPromote = async () => {
    if (!extraction) return;
    setSaving(true);
    setMessage(null);
    try {
      await api.post(`/extractions/${id}/confirm`, {
        structuredData: extraction.structuredData,
      });
      alert('Success! Medical fields confirmed and promoted to your Unified Health Profile.');
      navigate('/profile');
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to confirm extraction');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] gap-3">
        <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-xs text-slate-500 font-medium">Loading document and OCR extraction...</p>
      </div>
    );
  }

  if (!document || !extraction) {
    return (
      <div className="p-6 text-center text-slate-500 text-sm">
        Extraction data not available for this document yet. Please ensure OCR processing has finished.
      </div>
    );
  }

  const structured = extraction.structuredData;
  const pages = extraction.pages || [];
  const currentPageData = pages.find((p) => p.pageNumber === activePage) || pages[0];

  return (
    <div className="space-y-4">
      {/* Top Bar Navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/documents')}
            className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-600"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <h1 className="text-base font-bold text-slate-900 flex items-center gap-2">
              {document.originalName}
              <span
                className={`text-[10px] uppercase font-semibold px-2 py-0.5 rounded-full ${
                  extraction.reviewStatus === 'confirmed'
                    ? 'bg-emerald-100 text-emerald-800'
                    : 'bg-amber-100 text-amber-800'
                }`}
              >
                {extraction.reviewStatus}
              </span>
            </h1>
            <p className="text-xs text-slate-400 capitalize">
              {document.documentType.replace('_', ' ')} • Engine: {extraction.ocrEngine}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              setActiveTab('summary');
              if (!summary) handleGenerateSummary(summaryLang);
            }}
            className="px-3 py-1.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all shadow-xs cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-200" />
            <span>AI Summary</span>
          </button>
          <button
            onClick={handleSaveCorrections}
            disabled={saving}
            className="px-3 py-1.5 border border-slate-300 hover:bg-slate-100 text-slate-700 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors disabled:opacity-50 cursor-pointer"
          >
            <Save className="w-3.5 h-3.5" />
            Save Draft
          </button>
          <button
            onClick={handleConfirmAndPromote}
            disabled={saving}
            className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-sm disabled:opacity-50 cursor-pointer"
          >
            <CheckCircle className="w-3.5 h-3.5" />
            Confirm & Promote
          </button>
        </div>
      </div>

      {message && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-xs text-emerald-800 flex items-center gap-2">
          <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{message}</span>
        </div>
      )}

      {/* Side-by-Side Review Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        {/* Left Column: Original Document Viewer & Page Navigator */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col h-[700px]">
          <div className="p-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between text-xs">
            <span className="font-semibold text-slate-700 flex items-center gap-1.5">
              <FileText className="w-4 h-4 text-emerald-600" />
              {t.review.originalDoc}
            </span>

            {/* Page Navigation */}
            <div className="flex items-center gap-2">
              <button
                disabled={activePage <= 1}
                onClick={() => setActivePage((p) => Math.max(1, p - 1))}
                className="p-1 rounded hover:bg-slate-200 disabled:opacity-30"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-[11px] font-mono text-slate-600">
                Page {activePage} of {document.pageCount || 1}
              </span>
              <button
                disabled={activePage >= (document.pageCount || 1)}
                onClick={() => setActivePage((p) => Math.min(document.pageCount || 1, p + 1))}
                className="p-1 rounded hover:bg-slate-200 disabled:opacity-30"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
              <button
                onClick={() => setIsPreviewOpen(true)}
                className="p-1 rounded text-slate-600 hover:text-emerald-700 hover:bg-slate-200 transition-colors"
                title="Open Fullscreen Preview"
              >
                <Maximize2 className="w-3.5 h-3.5" />
              </button>
              <a
                href={`/api/documents/${id}/download${token ? `?token=${encodeURIComponent(token)}` : ''}`}
                target="_blank"
                rel="noreferrer"
                className="ml-1 text-emerald-600 hover:text-emerald-700 p-1 rounded hover:bg-slate-200 transition-colors"
                title="Open in new window"
              >
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>

          {/* Secure Document Stream View (Image / PDF) */}
          <div className="flex-1 bg-slate-900/5 relative flex items-center justify-center overflow-auto p-2">
            {(() => {
              const mime = (document?.mimeType || '').toLowerCase();
              const name = (document?.originalName || '').toLowerCase();
              const isImage = mime.startsWith('image/') || /\.(png|jpe?g|webp|bmp|gif)$/i.test(name);
              const previewUrl = `/api/documents/${id}/preview${token ? `?token=${encodeURIComponent(token)}` : ''}`;

              if (isImage) {
                return (
                  <div className="relative w-full h-full flex flex-col items-center justify-center group">
                    <img
                      src={previewUrl}
                      alt={document?.originalName || 'Medical Document'}
                      className="max-w-full max-h-full object-contain rounded shadow-sm border border-slate-200 cursor-pointer"
                      onClick={() => setIsPreviewOpen(true)}
                      title="Click to view full preview"
                    />
                    <div className="absolute bottom-3 bg-black/60 text-white text-[11px] px-3 py-1 rounded-full backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                      Click image or maximize for zoom & rotate
                    </div>
                  </div>
                );
              }

              return (
                <iframe
                  src={`${previewUrl}#page=${activePage}`}
                  title="Original Medical Document"
                  className="w-full h-full border-none"
                />
              );
            })()}
          </div>
        </div>

        {/* Right Column: Editable Extracted Structured Fields & Raw OCR */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col h-[700px]">
          {/* Tabs */}
          <div className="flex items-center border-b border-slate-200 bg-slate-50 px-3 pt-2 text-xs font-semibold gap-1">
            <button
              onClick={() => setActiveTab('fields')}
              className={`pb-2 px-3 border-b-2 transition-colors cursor-pointer ${
                activeTab === 'fields'
                  ? 'border-emerald-600 text-emerald-800'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              Structured Fields ({structured.observations.length + structured.medications.length + structured.conditions.length})
            </button>
            <button
              onClick={() => {
                setActiveTab('summary');
                if (!summary) fetchSummary(summaryLang);
              }}
              className={`pb-2 px-3 border-b-2 transition-colors flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'summary'
                  ? 'border-emerald-600 text-emerald-800'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              <span>AI Clinical Summary</span>
              {summary?.abnormalValues?.length > 0 && (
                <span className="w-2 h-2 rounded-full bg-rose-500 inline-block animate-pulse"></span>
              )}
            </button>
            <button
              onClick={() => setActiveTab('raw_ocr')}
              className={`pb-2 px-3 border-b-2 transition-colors cursor-pointer ${
                activeTab === 'raw_ocr'
                  ? 'border-emerald-600 text-emerald-800'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              Raw OCR Text (Page {activePage})
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-5 text-xs">
            {activeTab === 'fields' ? (
              <>
                {/* 1. Laboratory Observations */}
                <div>
                  <h3 className="font-bold text-slate-800 text-xs mb-2 uppercase tracking-wider flex items-center justify-between">
                    <span>Laboratory Tests & Observations ({structured.observations.length})</span>
                  </h3>

                  {structured.observations.length === 0 ? (
                    <p className="text-slate-400 italic">No lab observations detected.</p>
                  ) : (
                    <div className="space-y-3">
                      {structured.observations.map((obs, idx) => (
                        <div key={idx} className="p-3 border border-slate-200 rounded-lg bg-slate-50/50 space-y-2">
                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <label className="text-[10px] font-semibold text-slate-500 block mb-0.5">Test Name</label>
                              <input
                                type="text"
                                value={obs.testName}
                                onChange={(e) => handleObservationChange(idx, 'testName', e.target.value)}
                                className="w-full p-1.5 border border-slate-300 rounded text-xs bg-white"
                              />
                            </div>
                            <div>
                              <label className="text-[10px] font-semibold text-slate-500 block mb-0.5">Result Value</label>
                              <input
                                type="text"
                                value={obs.valueString}
                                onChange={(e) => handleObservationChange(idx, 'valueString', e.target.value)}
                                className="w-full p-1.5 border border-slate-300 rounded text-xs bg-white font-mono"
                              />
                            </div>
                          </div>

                          <div className="grid grid-cols-3 gap-2">
                            <div>
                              <label className="text-[10px] font-semibold text-slate-500 block mb-0.5">Unit</label>
                              <input
                                type="text"
                                value={obs.unit || ''}
                                onChange={(e) => handleObservationChange(idx, 'unit', e.target.value)}
                                className="w-full p-1.5 border border-slate-300 rounded text-xs bg-white"
                              />
                            </div>
                            <div>
                              <label className="text-[10px] font-semibold text-slate-500 block mb-0.5">Reference Range</label>
                              <input
                                type="text"
                                value={obs.referenceRangeString || ''}
                                onChange={(e) => handleObservationChange(idx, 'referenceRangeString', e.target.value)}
                                className="w-full p-1.5 border border-slate-300 rounded text-xs bg-white font-mono"
                              />
                            </div>
                            <div className="flex items-center gap-1.5 pt-4">
                              <input
                                type="checkbox"
                                id={`abnormal-${idx}`}
                                checked={obs.isAbnormal || false}
                                onChange={(e) => handleObservationChange(idx, 'isAbnormal', e.target.checked)}
                                className="rounded text-emerald-600"
                              />
                              <label htmlFor={`abnormal-${idx}`} className="text-[11px] font-semibold text-rose-700">
                                Abnormal Flag
                              </label>
                            </div>
                          </div>

                          {obs.sourceText && (
                            <p className="text-[10px] text-slate-500 bg-white p-1 rounded border border-slate-100">
                              <span className="font-semibold text-slate-600">Source:</span> "{obs.sourceText}" (Page {obs.pageNumber})
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* 2. Medications */}
                <div className="pt-3 border-t border-slate-200">
                  <h3 className="font-bold text-slate-800 text-xs mb-2 uppercase tracking-wider">
                    Prescriptions & Medications ({structured.medications.length})
                  </h3>

                  {structured.medications.length === 0 ? (
                    <p className="text-slate-400 italic">No medication entries detected.</p>
                  ) : (
                    <div className="space-y-3">
                      {structured.medications.map((med, idx) => (
                        <div key={idx} className="p-3 border border-slate-200 rounded-lg bg-slate-50/50 space-y-2">
                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <label className="text-[10px] font-semibold text-slate-500 block mb-0.5">Medicine Name</label>
                              <input
                                type="text"
                                value={med.medicineName}
                                onChange={(e) => handleMedicationChange(idx, 'medicineName', e.target.value)}
                                className="w-full p-1.5 border border-slate-300 rounded text-xs bg-white font-medium"
                              />
                            </div>
                            <div>
                              <label className="text-[10px] font-semibold text-slate-500 block mb-0.5">Dosage</label>
                              <input
                                type="text"
                                value={med.dosage || ''}
                                onChange={(e) => handleMedicationChange(idx, 'dosage', e.target.value)}
                                className="w-full p-1.5 border border-slate-300 rounded text-xs bg-white"
                              />
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <label className="text-[10px] font-semibold text-slate-500 block mb-0.5">Frequency</label>
                              <input
                                type="text"
                                value={med.frequency || ''}
                                onChange={(e) => handleMedicationChange(idx, 'frequency', e.target.value)}
                                className="w-full p-1.5 border border-slate-300 rounded text-xs bg-white"
                                placeholder="OD / BD / TDS / 1-0-1"
                              />
                            </div>
                            <div>
                              <label className="text-[10px] font-semibold text-slate-500 block mb-0.5">Instructions</label>
                              <input
                                type="text"
                                value={med.instructions || ''}
                                onChange={(e) => handleMedicationChange(idx, 'instructions', e.target.value)}
                                className="w-full p-1.5 border border-slate-300 rounded text-xs bg-white"
                                placeholder="After food, at bedtime, etc."
                              />
                            </div>
                          </div>

                          {med.sourceText && (
                            <p className="text-[10px] text-slate-500 bg-white p-1 rounded border border-slate-100">
                              <span className="font-semibold text-slate-600">Source:</span> "{med.sourceText}" (Page {med.pageNumber})
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* 3. Conditions */}
                <div className="pt-3 border-t border-slate-200">
                  <h3 className="font-bold text-slate-800 text-xs mb-2 uppercase tracking-wider">
                    Documented Clinical Conditions ({structured.conditions.length})
                  </h3>

                  {structured.conditions.length === 0 ? (
                    <p className="text-slate-400 italic">No clinical conditions recorded.</p>
                  ) : (
                    <div className="space-y-3">
                      {structured.conditions.map((cond, idx) => (
                        <div key={idx} className="p-3 border border-slate-200 rounded-lg bg-slate-50/50 space-y-2">
                          <div>
                            <label className="text-[10px] font-semibold text-slate-500 block mb-0.5">Condition Name</label>
                            <input
                              type="text"
                              value={cond.conditionName}
                              onChange={(e) => handleConditionChange(idx, 'conditionName', e.target.value)}
                              className="w-full p-1.5 border border-slate-300 rounded text-xs bg-white"
                            />
                          </div>
                          {cond.sourceText && (
                            <p className="text-[10px] text-slate-500 bg-white p-1 rounded border border-slate-100">
                              <span className="font-semibold text-slate-600">Source:</span> "{cond.sourceText}"
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </>
            ) : activeTab === 'summary' ? (
              /* AI Clinical Summary Tab */
              <div className="space-y-4">
                {/* Language Toolbar & Regenerate */}
                <div className="flex items-center justify-between gap-2 p-2.5 bg-slate-50 border border-slate-200 rounded-xl">
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-semibold text-slate-600 flex items-center gap-1">
                      <Globe className="w-3.5 h-3.5 text-slate-500" />
                      Language:
                    </span>
                    <select
                      value={summaryLang}
                      onChange={(e) => {
                        const newL = e.target.value as Language;
                        setSummaryLang(newL);
                        fetchSummary(newL);
                      }}
                      className="text-xs bg-white border border-slate-200 rounded-md px-2 py-1 font-medium text-slate-700 outline-none"
                    >
                      <option value="en">English (EN)</option>
                      <option value="te">తెలుగు (TE)</option>
                      <option value="hi">हिंदी (HI)</option>
                    </select>
                  </div>

                  <button
                    onClick={() => handleGenerateSummary(summaryLang)}
                    disabled={generatingSummary}
                    className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors disabled:opacity-50 cursor-pointer shadow-2xs"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${generatingSummary ? 'animate-spin' : ''}`} />
                    <span>{generatingSummary ? 'Analyzing...' : 'Regenerate Analysis'}</span>
                  </button>
                </div>

                {loadingSummary && !generatingSummary && (
                  <div className="py-12 flex flex-col items-center justify-center gap-2 text-slate-500">
                    <div className="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
                    <p className="text-xs">Loading AI summary...</p>
                  </div>
                )}

                {generatingSummary && (
                  <div className="py-12 flex flex-col items-center justify-center gap-2 text-slate-500">
                    <div className="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
                    <p className="text-xs text-emerald-700 font-medium animate-pulse">
                      Analyzing with Gemini AI ({summaryLang.toUpperCase()})...
                    </p>
                  </div>
                )}

                {!loadingSummary && !generatingSummary && !summary && (
                  <div className="py-8 text-center space-y-3">
                    <Sparkles className="w-8 h-8 text-emerald-600 mx-auto" />
                    <p className="text-xs text-slate-500">No summary has been generated for this document yet.</p>
                    <button
                      onClick={() => handleGenerateSummary(summaryLang)}
                      className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      Generate AI Summary
                    </button>
                  </div>
                )}

                {!loadingSummary && !generatingSummary && summary && (
                  <div className="space-y-4">
                    {/* Patient-Friendly Explanation */}
                    <div className="p-3.5 bg-gradient-to-br from-emerald-50/70 to-teal-50/30 border border-emerald-200/80 rounded-xl space-y-1.5">
                      <h4 className="text-[11px] font-bold uppercase tracking-wider text-emerald-950 flex items-center gap-1.5">
                        <Info className="w-3.5 h-3.5 text-emerald-700" />
                        Patient-Friendly Overview
                      </h4>
                      <p className="text-xs text-slate-800 leading-relaxed">
                        {summary.simpleExplanation}
                      </p>
                    </div>

                    {/* Key Findings */}
                    {summary.keyFindings && summary.keyFindings.length > 0 && (
                      <div className="space-y-2">
                        <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                          <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                          Key Clinical Findings ({summary.keyFindings.length})
                        </h4>
                        <div className="space-y-1.5">
                          {summary.keyFindings.map((f: string, i: number) => (
                            <div
                              key={i}
                              className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 flex items-start gap-2"
                            >
                              <span className="w-4 h-4 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">
                                {i + 1}
                              </span>
                              <span>{f}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Abnormal Values */}
                    {summary.abnormalValues && summary.abnormalValues.length > 0 && (
                      <div className="space-y-2">
                        <h4 className="text-[11px] font-bold uppercase tracking-wider text-rose-700 flex items-center gap-1.5">
                          <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
                          Flagged Abnormal Values ({summary.abnormalValues.length})
                        </h4>
                        <div className="border border-rose-200 rounded-xl overflow-hidden">
                          <table className="w-full text-left text-xs">
                            <thead className="bg-rose-100/60 text-rose-950 font-semibold border-b border-rose-200">
                              <tr>
                                <th className="py-2 px-3">Test</th>
                                <th className="py-2 px-3">Result</th>
                                <th className="py-2 px-3">Ref Range</th>
                                <th className="py-2 px-3">Flag</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-rose-100 bg-white">
                              {summary.abnormalValues.map((abn: any, idx: number) => (
                                <tr key={idx} className="hover:bg-rose-50/30">
                                  <td className="py-2 px-3 font-medium text-slate-900">{abn.testName}</td>
                                  <td className="py-2 px-3 font-mono font-bold text-rose-700">{abn.value}</td>
                                  <td className="py-2 px-3 text-slate-500 font-mono text-[11px]">{abn.referenceRange || 'N/A'}</td>
                                  <td className="py-2 px-3">
                                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-rose-100 text-rose-800">
                                      {abn.flag || 'Abnormal'}
                                    </span>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}

                    {/* Doctor Discussion Questions */}
                    {summary.suggestedQuestionsForDoctor && summary.suggestedQuestionsForDoctor.length > 0 && (
                      <div className="space-y-2">
                        <h4 className="text-[11px] font-bold uppercase tracking-wider text-teal-800 flex items-center gap-1.5">
                          <HelpCircle className="w-3.5 h-3.5 text-teal-600" />
                          Suggested Questions for Your Doctor
                        </h4>
                        <div className="space-y-2">
                          {summary.suggestedQuestionsForDoctor.map((q: string, idx: number) => (
                            <div
                              key={idx}
                              className="p-2.5 bg-teal-50/50 border border-teal-200/80 rounded-lg text-xs flex items-center justify-between gap-2"
                            >
                              <span className="text-slate-800 italic">“{q}”</span>
                              <div className="flex items-center gap-1 shrink-0">
                                <button
                                  type="button"
                                  onClick={() => {
                                    navigator.clipboard.writeText(q);
                                    setCopiedIdx(idx);
                                    setTimeout(() => setCopiedIdx(null), 2000);
                                  }}
                                  className="p-1 rounded border border-slate-200 bg-white hover:bg-slate-100 text-slate-600 cursor-pointer"
                                  title="Copy question text"
                                >
                                  {copiedIdx === idx ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => navigate('/chat', { state: { prefillQuery: q } })}
                                  className="p-1 px-2 rounded border border-teal-300 bg-white hover:bg-teal-600 hover:text-white text-teal-700 text-[10px] font-semibold flex items-center gap-1 cursor-pointer transition-colors"
                                  title="Ask AI health assistant"
                                >
                                  <MessageSquare className="w-3 h-3" />
                                  <span>Ask AI</span>
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {summary.generatedWithModel && (
                      <div className="pt-2 border-t border-slate-100 text-[10px] text-slate-400 font-mono">
                        Model: {summary.generatedWithModel}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ) : (
              /* Raw OCR Text Viewer */
              <div className="space-y-3">
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
                  <p className="text-[11px] font-mono text-slate-500">
                    Engine: {currentPageData?.engine} • Language: {currentPageData?.language || 'mixed'}
                  </p>
                </div>
                <pre className="p-4 bg-slate-900 text-emerald-400 rounded-xl font-mono text-xs whitespace-pre-wrap leading-relaxed max-h-[500px] overflow-y-auto">
                  {currentPageData?.text || 'No text extracted on this page.'}
                </pre>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Full Document Preview Modal */}
      <DocumentPreviewModal
        isOpen={isPreviewOpen}
        onClose={() => setIsPreviewOpen(false)}
        document={document}
        initialPage={activePage}
      />
    </div>
  );
};
