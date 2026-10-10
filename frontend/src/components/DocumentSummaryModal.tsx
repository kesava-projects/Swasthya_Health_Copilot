import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/client.js';
import {
  X,
  Sparkles,
  FileText,
  AlertTriangle,
  CheckCircle,
  HelpCircle,
  Copy,
  Check,
  RefreshCw,
  MessageSquare,
  Globe,
  Info,
  Clock,
  ExternalLink,
} from 'lucide-react';
import { DocumentSummary, Language } from '../types/index.js';

interface DocumentSummaryModalProps {
  documentId: string | null;
  documentTitle?: string;
  isOpen: boolean;
  onClose: () => void;
  initialLanguage?: Language;
}

export const DocumentSummaryModal: React.FC<DocumentSummaryModalProps> = ({
  documentId,
  documentTitle = 'Medical Document',
  isOpen,
  onClose,
  initialLanguage = 'en',
}) => {
  const navigate = useNavigate();
  const [summary, setSummary] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedLang, setSelectedLang] = useState<Language>(initialLanguage);
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);

  const fetchSummary = async (lang: Language = selectedLang) => {
    if (!documentId) return;
    try {
      setLoading(true);
      setError(null);
      const res = await api.get(`/summaries/document/${documentId}`, {
        params: { language: lang },
      });
      if (res.data.success && res.data.summary) {
        setSummary(res.data.summary);
      } else {
        setSummary(null);
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to load summary');
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateSummary = async () => {
    if (!documentId) return;
    try {
      setGenerating(true);
      setError(null);
      const res = await api.post(`/summaries/document/${documentId}/generate`, {
        language: selectedLang,
      });
      if (res.data.success && res.data.summary) {
        setSummary(res.data.summary);
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to generate summary');
    } finally {
      setGenerating(false);
    }
  };

  useEffect(() => {
    if (isOpen && documentId) {
      fetchSummary(selectedLang);
    } else {
      setSummary(null);
      setError(null);
    }
  }, [isOpen, documentId, selectedLang]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const handleCopyQuestion = (text: string, idx: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIdx(idx);
    setTimeout(() => setCopiedIdx(null), 2000);
  };

  const handleAskInChat = (questionText: string) => {
    onClose();
    navigate('/chat', { state: { prefillQuery: questionText } });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in">
      <div
        className="bg-white w-full max-w-3xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh] animate-scale-in"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 bg-gradient-to-r from-emerald-50 via-teal-50/50 to-white flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-md shadow-emerald-600/20 shrink-0">
              <Sparkles className="w-5 h-5 text-emerald-100" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                  AI Medical Intelligence
                </span>
                {summary?.generatedWithModel && (
                  <span className="text-[10px] font-medium text-slate-500 font-mono hidden sm:inline">
                    {summary.generatedWithModel}
                  </span>
                )}
              </div>
              <h2 className="text-base font-bold text-slate-900 truncate mt-0.5" title={documentTitle}>
                {summary?.title || documentTitle}
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {/* Language Selector */}
            <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-lg px-2 py-1 text-xs shadow-2xs">
              <Globe className="w-3.5 h-3.5 text-slate-500" />
              <select
                value={selectedLang}
                onChange={(e) => setSelectedLang(e.target.value as Language)}
                className="bg-transparent text-slate-700 font-medium outline-none cursor-pointer text-xs"
              >
                <option value="en">English (EN)</option>
                <option value="te">తెలుగు (TE)</option>
                <option value="hi">हिंदी (HI)</option>
              </select>
            </div>

            <button
              onClick={handleGenerateSummary}
              disabled={generating}
              className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-600 transition-colors disabled:opacity-50 cursor-pointer"
              title="Regenerate analysis with AI"
            >
              <RefreshCw className={`w-4 h-4 ${generating ? 'animate-spin text-emerald-600' : ''}`} />
            </button>

            <button
              onClick={onClose}
              className="p-1.5 rounded-lg border border-slate-200 hover:bg-rose-50 hover:text-rose-600 text-slate-400 transition-colors cursor-pointer"
              aria-label="Close modal"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {loading && !generating && (
            <div className="py-16 flex flex-col items-center justify-center gap-3 text-slate-500">
              <div className="w-8 h-8 border-3 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
              <p className="text-xs font-medium">Synthesizing clinical document summary...</p>
            </div>
          )}

          {generating && (
            <div className="py-16 flex flex-col items-center justify-center gap-3 text-slate-500">
              <div className="w-8 h-8 border-3 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
              <p className="text-xs font-medium text-emerald-700 animate-pulse">
                Analyzing document with Gemini AI ({selectedLang.toUpperCase()})...
              </p>
            </div>
          )}

          {error && !loading && !generating && (
            <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 flex items-start gap-3 text-rose-800 text-xs">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" />
              <div className="flex-1">
                <p className="font-semibold">Unable to generate summary</p>
                <p className="text-rose-600 mt-0.5">{error}</p>
                <button
                  onClick={handleGenerateSummary}
                  className="mt-2 px-3 py-1 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-semibold"
                >
                  Try Again
                </button>
              </div>
            </div>
          )}

          {!loading && !generating && !summary && !error && (
            <div className="py-12 text-center space-y-3">
              <div className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-600 mx-auto flex items-center justify-center">
                <Sparkles className="w-6 h-6" />
              </div>
              <h3 className="text-sm font-semibold text-slate-800">No summary generated yet</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                Generate an intelligent, patient-friendly medical summary highlighting key findings, abnormal lab values, and doctor questions.
              </p>
              <button
                onClick={handleGenerateSummary}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-xl shadow-sm transition-colors inline-flex items-center gap-1.5"
              >
                <Sparkles className="w-3.5 h-3.5" />
                Analyze Document with AI
              </button>
            </div>
          )}

          {!loading && !generating && summary && (
            <>
              {/* Executive Plain Language Summary */}
              <div className="bg-gradient-to-br from-emerald-50/70 to-teal-50/40 rounded-xl p-4 border border-emerald-200/80 shadow-2xs space-y-2">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-md bg-emerald-600 text-white flex items-center justify-center text-xs">
                    <Info className="w-3.5 h-3.5" />
                  </div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-emerald-950">
                    Patient-Friendly Explanation
                  </h3>
                </div>
                <p className="text-xs text-slate-800 leading-relaxed pl-8">
                  {summary.simpleExplanation}
                </p>
              </div>

              {/* Key Clinical Findings */}
              {summary.keyFindings && summary.keyFindings.length > 0 && (
                <div className="space-y-2.5">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-emerald-600" />
                    Key Clinical Findings ({summary.keyFindings.length})
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {summary.keyFindings.map((finding: string, i: number) => (
                      <div
                        key={i}
                        className="p-3 bg-white border border-slate-200 rounded-xl text-xs text-slate-700 flex items-start gap-2.5 shadow-2xs hover:border-emerald-300 transition-colors"
                      >
                        <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-800 font-bold text-[10px] flex items-center justify-center shrink-0 mt-0.5">
                          {i + 1}
                        </span>
                        <span className="leading-snug">{finding}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Abnormal Values Table / Badges */}
              {summary.abnormalValues && summary.abnormalValues.length > 0 && (
                <div className="space-y-2.5">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-rose-700 flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-rose-600" />
                    Abnormal / Out-of-Range Parameters ({summary.abnormalValues.length})
                  </h3>
                  <div className="border border-rose-200 rounded-xl overflow-hidden bg-rose-50/30">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-rose-100/60 text-rose-950 font-semibold border-b border-rose-200">
                        <tr>
                          <th className="py-2.5 px-3">Investigation</th>
                          <th className="py-2.5 px-3">Recorded Result</th>
                          <th className="py-2.5 px-3">Standard Reference Range</th>
                          <th className="py-2.5 px-3">Flag</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-rose-100 bg-white">
                        {summary.abnormalValues.map((abn: any, idx: number) => (
                          <tr key={idx} className="hover:bg-rose-50/40 transition-colors">
                            <td className="py-2.5 px-3 font-semibold text-slate-900">{abn.testName}</td>
                            <td className="py-2.5 px-3 font-mono font-bold text-rose-700">{abn.value}</td>
                            <td className="py-2.5 px-3 text-slate-500 font-mono text-[11px]">
                              {abn.referenceRange || 'Not printed on report'}
                            </td>
                            <td className="py-2.5 px-3">
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-rose-100 text-rose-800">
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

              {/* Questions for the Doctor */}
              {summary.suggestedQuestionsForDoctor && summary.suggestedQuestionsForDoctor.length > 0 && (
                <div className="space-y-2.5">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-2">
                    <HelpCircle className="w-4 h-4 text-teal-600" />
                    Suggested Questions for Your Next Doctor Visit
                  </h3>
                  <div className="space-y-2">
                    {summary.suggestedQuestionsForDoctor.map((q: string, idx: number) => (
                      <div
                        key={idx}
                        className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs flex items-center justify-between gap-3 hover:bg-teal-50/40 hover:border-teal-200 transition-colors group"
                      >
                        <p className="text-slate-800 font-medium leading-snug">“{q}”</p>
                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            type="button"
                            onClick={() => handleCopyQuestion(q, idx)}
                            className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 text-slate-500 hover:text-slate-800 transition-colors cursor-pointer"
                            title="Copy question text"
                          >
                            {copiedIdx === idx ? (
                              <Check className="w-3.5 h-3.5 text-emerald-600" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                          </button>
                          <button
                            type="button"
                            onClick={() => handleAskInChat(q)}
                            className="p-1.5 rounded-lg border border-teal-200 bg-white hover:bg-teal-600 hover:text-white text-teal-700 transition-colors flex items-center gap-1 text-[11px] font-semibold cursor-pointer"
                            title="Ask AI health assistant"
                          >
                            <MessageSquare className="w-3.5 h-3.5" />
                            <span className="hidden sm:inline">Ask AI</span>
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Missing or Uncertain Information Callout */}
              {summary.missingOrUncertainInfo && summary.missingOrUncertainInfo.length > 0 && (
                <div className="p-3 bg-amber-50/60 border border-amber-200 rounded-xl text-xs text-amber-900 space-y-1">
                  <span className="font-semibold flex items-center gap-1.5 text-amber-800">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    Medical Completeness Note:
                  </span>
                  <ul className="list-disc pl-5 space-y-0.5 text-amber-800/90 text-[11px]">
                    {summary.missingOrUncertainInfo.map((info: string, i: number) => (
                      <li key={i}>{info}</li>
                    ))}
                  </ul>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-200 bg-slate-50 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-[11px] text-slate-500">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-600">Clinical Safety Notice:</span>
            <span>AI summaries are for informational guidance; discuss results with your licensed physician.</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 font-semibold rounded-lg text-xs transition-colors self-end sm:self-auto cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
