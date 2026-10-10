import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/client.js';
import { useAuth } from '../context/AuthContext.js';
import { getT } from '../utils/i18n.js';
import {
  FileText,
  Clock,
  Pill,
  Activity,
  AlertTriangle,
  Upload,
  MessageSquare,
  ChevronRight,
  Calendar,
  CheckCircle2,
  Eye,
  Sparkles,
} from 'lucide-react';
import { DocumentPreviewModal } from '../components/DocumentPreviewModal.js';
import { DocumentSummaryModal } from '../components/DocumentSummaryModal.js';

export const DashboardPage: React.FC = () => {
  const { user, language } = useAuth();
  const t = getT(language);

  const [data, setData] = useState<any>(null);
  const [patientSummary, setPatientSummary] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [previewDoc, setPreviewDoc] = useState<any>(null);
  const [summaryModalDoc, setSummaryModalDoc] = useState<any | null>(null);

  const fetchDashboard = async () => {
    try {
      setLoading(true);
      const [dashRes, summaryRes] = await Promise.all([
        api.get('/profile/dashboard'),
        api.get('/summaries/patient', { params: { language } }).catch(() => ({ data: { success: false, summary: null } })),
      ]);

      if (dashRes.data.success) {
        setData(dashRes.data.data);
      }
      if (summaryRes.data?.success && summaryRes.data.summary) {
        setPatientSummary(summaryRes.data.summary);
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
  }, [language]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] gap-3">
        <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-sm text-slate-500 font-medium">{t.common.loading}</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-sm">
        {error}
      </div>
    );
  }

  const metrics = data?.metrics || {};

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-emerald-700 to-teal-800 rounded-2xl p-6 text-white shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-semibold px-2 py-0.5 rounded bg-emerald-600/60 uppercase tracking-wider">
              Patient Portal
            </span>
            {user?.mockAbhaId && (
              <span className="text-xs font-mono font-medium text-emerald-200">
                ABHA ID: {user.mockAbhaId}
              </span>
            )}
          </div>
          <h1 className="text-2xl font-bold tracking-tight">
            {t.dashboard.welcome}, {user?.name}!
          </h1>
          <p className="text-emerald-100 text-sm mt-1">
            Track your diagnostic history, verify lab observations, and explore grounded AI insights.
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <Link
            to="/documents"
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-white text-emerald-900 font-semibold text-xs shadow hover:bg-emerald-50 transition-colors"
          >
            <Upload className="w-4 h-4 text-emerald-700" />
            {t.common.upload}
          </Link>
          <Link
            to="/chat"
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-emerald-600/80 hover:bg-emerald-600 text-white font-semibold text-xs transition-colors border border-emerald-500/50"
          >
            <MessageSquare className="w-4 h-4" />
            {t.dashboard.askAi}
          </Link>
        </div>
      </div>

      {/* Awaiting Review Warning Banner (if documents pending confirmation) */}
      {metrics.awaitingReviewCount > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-center justify-between gap-4 text-amber-900">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
            <div>
              <p className="text-sm font-semibold">
                {metrics.awaitingReviewCount} medical document(s) waiting for human review
              </p>
              <p className="text-xs text-amber-700">
                Review OCR extracted tests and medications to confirm them into your official health record.
              </p>
            </div>
          </div>
          <Link
            to="/documents"
            className="px-3 py-1.5 bg-amber-600 text-white text-xs font-semibold rounded-lg hover:bg-amber-700 transition-colors shrink-0"
          >
            Review Now
          </Link>
        </div>
      )}

      {/* Key Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
            <FileText className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs font-medium text-slate-500">{t.dashboard.totalDocs}</p>
            <p className="text-xl font-bold text-slate-900">{metrics.totalDocuments || 0}</p>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs font-medium text-slate-500">{t.dashboard.awaitingReview}</p>
            <p className="text-xl font-bold text-slate-900">{metrics.awaitingReviewCount || 0}</p>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
            <Pill className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs font-medium text-slate-500">{t.dashboard.activeMeds}</p>
            <p className="text-xl font-bold text-slate-900">{metrics.activeMedicationsCount || 0}</p>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center shrink-0">
            <Activity className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs font-medium text-slate-500">{t.dashboard.activeConditions}</p>
            <p className="text-xl font-bold text-slate-900">{metrics.activeConditionsCount || 0}</p>
          </div>
        </div>
      </div>

      {/* Longitudinal Health Overview Banner */}
      {patientSummary && (
        <div className="bg-gradient-to-r from-emerald-50 via-teal-50 to-emerald-50 rounded-2xl border border-emerald-200 p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1.5 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-emerald-200/60 text-emerald-900 flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-emerald-700" />
                Longitudinal Health Overview
              </span>
              <span className="text-xs font-semibold text-emerald-950 truncate">{patientSummary.title}</span>
            </div>
            <p className="text-xs text-slate-700 leading-relaxed line-clamp-2">
              {patientSummary.simpleExplanation}
            </p>
          </div>
          <Link
            to="/profile"
            className="px-3.5 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-semibold text-xs transition-colors shrink-0 flex items-center gap-1 shadow-2xs self-start md:self-auto cursor-pointer"
          >
            <span>View Full Health Profile</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      )}

      {/* Main Content Grid: Recent Documents & Recent Labs */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Medical Documents */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between">
            <h3 className="font-semibold text-slate-900 text-sm flex items-center gap-2">
              <FileText className="w-4 h-4 text-emerald-600" />
              {t.dashboard.recentRecords}
            </h3>
            <Link to="/documents" className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 flex items-center">
              View All <ChevronRight className="w-3.5 h-3.5 ml-0.5" />
            </Link>
          </div>

          <div className="p-4 flex-1">
            {data?.recentDocuments?.length === 0 ? (
              <div className="text-center py-8 text-slate-400 text-xs">
                {t.dashboard.noRecords}
              </div>
            ) : (
              <div className="space-y-3">
                {data.recentDocuments.map((doc: any) => (
                  <div
                    key={doc.id}
                    className="p-3 rounded-lg border border-slate-100 hover:border-slate-200 bg-slate-50/50 flex items-center justify-between gap-3 transition-colors"
                  >
                    <div className="min-w-0">
                      <button
                        type="button"
                        onClick={() => setPreviewDoc(doc)}
                        className="text-left text-sm font-medium text-slate-800 hover:text-emerald-700 hover:underline truncate block max-w-[200px] sm:max-w-xs transition-colors cursor-pointer"
                        title="Click to preview document"
                      >
                        {doc.originalName}
                      </button>
                      <p className="text-xs text-slate-400 capitalize">
                        {doc.documentType.replace('_', ' ')} • {new Date(doc.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => setSummaryModalDoc(doc)}
                        className="px-2 py-1 text-xs font-semibold rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 flex items-center gap-1 transition-colors cursor-pointer shadow-2xs"
                        title="View AI Clinical Summary"
                      >
                        <Sparkles className="w-3 h-3 text-amber-600" />
                        <span>Summary</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setPreviewDoc(doc)}
                        className="p-1.5 text-slate-500 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition-colors cursor-pointer"
                        title="Preview document"
                      >
                        <Eye className="w-3.5 h-3.5 text-emerald-600" />
                      </button>
                      <span
                        className={`text-[10px] font-semibold px-2 py-0.5 rounded-full capitalize ${
                          doc.processingStatus === 'completed'
                            ? 'bg-emerald-100 text-emerald-800'
                            : doc.processingStatus === 'awaiting_review'
                            ? 'bg-amber-100 text-amber-800'
                            : doc.processingStatus === 'processing'
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-rose-100 text-rose-800'
                        }`}
                      >
                        {doc.processingStatus.replace('_', ' ')}
                      </span>
                      {doc.processingStatus === 'awaiting_review' && (
                        <Link
                          to={`/documents/review/${doc.id}`}
                          className="px-2.5 py-1 text-xs font-medium rounded bg-emerald-600 text-white hover:bg-emerald-700"
                        >
                          Review
                        </Link>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Recent Laboratory Observations */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between">
            <h3 className="font-semibold text-slate-900 text-sm flex items-center gap-2">
              <Activity className="w-4 h-4 text-emerald-600" />
              {t.dashboard.recentLabs}
            </h3>
            <Link to="/observations" className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 flex items-center">
              Trends & Charts <ChevronRight className="w-3.5 h-3.5 ml-0.5" />
            </Link>
          </div>

          <div className="p-4 flex-1">
            {data?.recentObservations?.length === 0 ? (
              <div className="text-center py-8 text-slate-400 text-xs">
                No verified lab observations recorded yet.
              </div>
            ) : (
              <div className="space-y-2.5">
                {data.recentObservations.map((obs: any) => (
                  <div
                    key={obs._id}
                    className="p-2.5 rounded-lg border border-slate-100 flex items-center justify-between gap-3 text-xs"
                  >
                    <div>
                      <p className="font-semibold text-slate-800">{obs.testName}</p>
                      <p className="text-[11px] text-slate-400">
                        {new Date(obs.observationDate).toLocaleDateString()} • {obs.sourceDocumentId?.originalName || 'Report'}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="font-bold text-slate-900 text-sm">
                        {obs.valueString} <span className="text-xs font-normal text-slate-500">{obs.unit}</span>
                      </p>
                      <span
                        className={`text-[10px] font-semibold px-1.5 py-0.2 rounded ${
                          obs.interpretation === 'HIGH' || obs.interpretation === 'ABNORMAL'
                            ? 'bg-rose-100 text-rose-700'
                            : obs.interpretation === 'LOW'
                            ? 'bg-amber-100 text-amber-700'
                            : 'bg-emerald-100 text-emerald-700'
                        }`}
                      >
                        {obs.interpretation}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Upcoming Reminders Section */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-slate-900 text-sm flex items-center gap-2">
            <Calendar className="w-4 h-4 text-emerald-600" />
            {t.dashboard.upcomingReminders}
          </h3>
          <Link to="/reminders" className="text-xs font-semibold text-emerald-600 hover:text-emerald-700">
            Manage Reminders
          </Link>
        </div>

        {data?.upcomingReminders?.length === 0 ? (
          <p className="text-xs text-slate-400 text-center py-3">No upcoming reminders scheduled.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {data.upcomingReminders.map((rem: any) => (
              <div key={rem._id} className="p-3 bg-slate-50 border border-slate-200 rounded-lg flex items-start gap-3">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 mt-0.5 shrink-0" />
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-slate-800">{rem.title}</p>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    {new Date(rem.scheduledTime).toLocaleDateString()} at{' '}
                    {new Date(rem.scheduledTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                  {rem.notes && <p className="text-[11px] text-slate-400 italic mt-0.5">{rem.notes}</p>}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Document Preview Modal */}
      <DocumentPreviewModal
        isOpen={Boolean(previewDoc)}
        onClose={() => setPreviewDoc(null)}
        document={previewDoc}
      />

      {/* Document AI Summary Modal */}
      <DocumentSummaryModal
        isOpen={Boolean(summaryModalDoc)}
        onClose={() => setSummaryModalDoc(null)}
        documentId={summaryModalDoc ? (summaryModalDoc.id || summaryModalDoc._id) : null}
        documentTitle={summaryModalDoc?.originalName || 'Medical Document'}
        initialLanguage={language}
      />
    </div>
  );
};
