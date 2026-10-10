import React, { useEffect, useState, useMemo } from 'react';
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
  Volume2,
  VolumeX,
  TrendingUp,
  ShieldCheck,
  Heart,
  ArrowUpRight,
  Layers,
} from 'lucide-react';
import { DocumentPreviewModal } from '../components/DocumentPreviewModal.js';
import { DocumentSummaryModal } from '../components/DocumentSummaryModal.js';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  Tooltip,
} from 'recharts';

export const DashboardPage: React.FC = () => {
  const { user, language } = useAuth();
  const t = getT(language);

  const [data, setData] = useState<any>(null);
  const [patientSummary, setPatientSummary] = useState<any>(null);
  const [trends, setTrends] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [previewDoc, setPreviewDoc] = useState<any>(null);
  const [summaryModalDoc, setSummaryModalDoc] = useState<any | null>(null);
  const [isSpeakingSummary, setIsSpeakingSummary] = useState(false);

  const fetchDashboard = async () => {
    try {
      setLoading(true);
      const [dashRes, summaryRes, trendsRes] = await Promise.all([
        api.get('/profile/dashboard'),
        api
          .get('/summaries/patient', { params: { language } })
          .catch(() => ({ data: { success: false, summary: null } })),
        api
          .get('/observations/trends')
          .catch(() => ({ data: { success: false, trends: [] } })),
      ]);

      if (dashRes.data.success) {
        setData(dashRes.data.data);
      }
      if (summaryRes.data?.success && summaryRes.data.summary) {
        setPatientSummary(summaryRes.data.summary);
      }
      if (trendsRes.data?.success && trendsRes.data.trends) {
        setTrends(trendsRes.data.trends);
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

  // Voice narration for AI summary
  const toggleSummaryAudio = () => {
    if (!('speechSynthesis' in window) || !patientSummary) return;

    if (isSpeakingSummary) {
      window.speechSynthesis.cancel();
      setIsSpeakingSummary(false);
      return;
    }

    window.speechSynthesis.cancel();
    const textToRead = `${patientSummary.title}. ${patientSummary.simpleExplanation}`;
    const utterance = new SpeechSynthesisUtterance(textToRead);

    const voiceLangMap: Record<string, string> = {
      en: 'en-US',
      hi: 'hi-IN',
      te: 'te-IN',
      ta: 'ta-IN',
      kn: 'kn-IN',
      bn: 'bn-IN',
      mr: 'mr-IN',
      es: 'es-ES',
    };
    utterance.lang = voiceLangMap[language] || 'en-US';
    utterance.rate = 0.95;

    utterance.onend = () => setIsSpeakingSummary(false);
    utterance.onerror = () => setIsSpeakingSummary(false);

    setIsSpeakingSummary(true);
    window.speechSynthesis.speak(utterance);
  };

  useEffect(() => {
    return () => {
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] gap-3">
        <div className="w-9 h-9 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-sm text-slate-500 font-semibold">{t.common.loading}</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-sm font-medium">
        {error}
      </div>
    );
  }

  const metrics = data?.metrics || {};
  const topTrend = trends.length > 0 ? trends[0] : null;

  return (
    <div className="space-y-6">
      {/* Hero Welcome Banner */}
      <div className="relative overflow-hidden bg-gradient-to-r from-emerald-800 via-teal-800 to-slate-900 rounded-3xl p-6 sm:p-8 text-white shadow-md shadow-emerald-900/10">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-extrabold px-2.5 py-0.5 rounded-full bg-emerald-500/30 text-emerald-300 border border-emerald-400/30 uppercase tracking-wider">
                Personal Health Portal
              </span>
              {user?.mockAbhaId && (
                <span className="text-xs font-mono font-semibold text-emerald-200 bg-black/20 px-2 py-0.5 rounded-md">
                  ABHA: {user.mockAbhaId}
                </span>
              )}
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
              {t.dashboard.welcome}, {user?.name}!
            </h1>
            <p className="text-emerald-100/90 text-xs sm:text-sm leading-relaxed">
              Longitudinal personal health record management with multi-lingual OCR intelligence, verifiable lab trends, and clinical safety guardrails.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 shrink-0">
            <Link
              to="/documents"
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white text-emerald-950 font-bold text-xs shadow-md hover:bg-emerald-50 transition-all cursor-pointer hover:scale-[1.02]"
            >
              <Upload className="w-4 h-4 text-emerald-700" />
              <span>{t.common.upload}</span>
            </Link>
            <Link
              to="/chat"
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600/90 hover:bg-emerald-600 text-white font-bold text-xs transition-all border border-emerald-400/40 shadow-sm cursor-pointer hover:scale-[1.02]"
            >
              <MessageSquare className="w-4 h-4" />
              <span>{t.dashboard.askAi}</span>
            </Link>
          </div>
        </div>

        {/* Subtle Decorative Glow Circles */}
        <div className="absolute -top-12 -right-12 w-48 h-48 bg-emerald-500/20 rounded-full blur-2xl pointer-events-none" />
        <div className="absolute -bottom-12 -left-12 w-48 h-48 bg-teal-500/20 rounded-full blur-2xl pointer-events-none" />
      </div>

      {/* Awaiting Review Warning Banner */}
      {metrics.awaitingReviewCount > 0 && (
        <div className="bg-amber-50/90 border border-amber-200/90 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-amber-950 shadow-2xs">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
              <AlertTriangle className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <p className="text-sm font-bold">
                {metrics.awaitingReviewCount} medical document(s) awaiting verification
              </p>
              <p className="text-xs text-amber-800/90">
                Review extracted biomarker numbers and prescriptions against original scans before promoting to your official health profile.
              </p>
            </div>
          </div>
          <Link
            to="/documents"
            className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-xl transition-all shadow-xs shrink-0 self-start sm:self-auto"
          >
            Review Now
          </Link>
        </div>
      )}

      {/* Key Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-xs hover:border-slate-300 transition-all group">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-semibold text-slate-500">{t.dashboard.totalDocs}</span>
            <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center group-hover:scale-110 transition-transform">
              <FileText className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-black text-slate-900 tracking-tight">{metrics.totalDocuments || 0}</p>
          <span className="text-[10px] text-slate-400 mt-1 block">Prescriptions, labs & scans</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-xs hover:border-slate-300 transition-all group">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-semibold text-slate-500">{t.dashboard.awaitingReview}</span>
            <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center group-hover:scale-110 transition-transform">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-black text-slate-900 tracking-tight">{metrics.awaitingReviewCount || 0}</p>
          <span className="text-[10px] text-slate-400 mt-1 block">Requires user review</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-xs hover:border-slate-300 transition-all group">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-semibold text-slate-500">{t.dashboard.activeMeds}</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center group-hover:scale-110 transition-transform">
              <Pill className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-black text-slate-900 tracking-tight">{metrics.activeMedicationsCount || 0}</p>
          <span className="text-[10px] text-slate-400 mt-1 block">Active pharmaceutical regimens</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-xs hover:border-slate-300 transition-all group">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-semibold text-slate-500">{t.dashboard.activeConditions}</span>
            <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center group-hover:scale-110 transition-transform">
              <Activity className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-black text-slate-900 tracking-tight">{metrics.activeConditionsCount || 0}</p>
          <span className="text-[10px] text-slate-400 mt-1 block">Documented clinical diagnoses</span>
        </div>
      </div>

      {/* AI Longitudinal Health Overview Card with Audio Voice Playback */}
      {patientSummary && (
        <div className="bg-gradient-to-br from-emerald-50/80 via-teal-50/60 to-slate-50/80 rounded-2xl border border-emerald-200/90 p-5 shadow-xs space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-emerald-100 pb-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-xs">
                <Sparkles className="w-4 h-4" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-extrabold text-emerald-950">
                    {t.dashboard.healthSummary}
                  </h3>
                  <span className="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-200/70 text-emerald-900">
                    Grounded AI
                  </span>
                </div>
                <p className="text-[11px] text-emerald-800 font-medium">{patientSummary.title}</p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={toggleSummaryAudio}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all shadow-2xs cursor-pointer ${
                  isSpeakingSummary
                    ? 'bg-rose-600 text-white'
                    : 'bg-white hover:bg-emerald-100 text-emerald-900 border border-emerald-200'
                }`}
                title="Listen to AI health overview"
              >
                {isSpeakingSummary ? (
                  <>
                    <VolumeX className="w-3.5 h-3.5" />
                    <span>{t.dashboard.stopAudio}</span>
                  </>
                ) : (
                  <>
                    <Volume2 className="w-3.5 h-3.5 text-emerald-700" />
                    <span>{t.dashboard.listen}</span>
                  </>
                )}
              </button>

              <Link
                to="/chat"
                className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold transition-all shadow-2xs cursor-pointer"
              >
                <span>{t.dashboard.askAi}</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>

          <p className="text-xs text-slate-700 leading-relaxed">
            {patientSummary.simpleExplanation}
          </p>

          {/* Key abnormal values or findings */}
          {patientSummary.keyFindings && patientSummary.keyFindings.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2 pt-1">
              {patientSummary.keyFindings.slice(0, 3).map((f: string, idx: number) => (
                <div key={idx} className="bg-white/80 p-2.5 rounded-xl border border-emerald-100/90 text-[11px] text-slate-700 flex items-start gap-2 shadow-2xs">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                  <span className="leading-snug">{f}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Mini Top Biomarker Trend Card Preview (if trends exist) */}
      {topTrend && topTrend.dataPoints.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold">
                <TrendingUp className="w-4 h-4" />
              </div>
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  Featured Biomarker Trend
                </span>
                <h3 className="font-extrabold text-slate-900 text-sm">
                  {topTrend.testName}: {topTrend.latestValue} {topTrend.unit}
                </h3>
              </div>
            </div>

            <Link
              to="/observations"
              className="text-xs font-bold text-emerald-700 hover:text-emerald-800 flex items-center gap-1 self-start sm:self-auto"
            >
              <span>Explore All {trends.length} Trends</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="h-28 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={topTrend.dataPoints} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="dashColor" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const pt = payload[0].payload;
                      return (
                        <div className="bg-slate-900 text-white px-2.5 py-1.5 rounded-lg text-xs font-semibold shadow-md">
                          <p className="text-emerald-400">{pt.date}</p>
                          <p>{pt.value} {pt.unit}</p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="value"
                  stroke="#10b981"
                  strokeWidth={2.5}
                  fillOpacity={1}
                  fill="url(#dashColor)"
                  dot={{ r: 3, fill: '#10b981' }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Main Content Grid: Recent Documents & Recent Labs */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Medical Documents */}
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden flex flex-col">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
            <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
              <FileText className="w-4 h-4 text-emerald-600" />
              {t.dashboard.recentRecords}
            </h3>
            <Link to="/documents" className="text-xs font-bold text-emerald-700 hover:text-emerald-800 flex items-center">
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
                    className="p-3 rounded-xl border border-slate-100 hover:border-slate-200 bg-slate-50/50 flex items-center justify-between gap-3 transition-colors"
                  >
                    <div className="min-w-0">
                      <button
                        type="button"
                        onClick={() => setPreviewDoc(doc)}
                        className="text-left text-xs font-bold text-slate-800 hover:text-emerald-700 hover:underline truncate block max-w-[200px] sm:max-w-xs transition-colors cursor-pointer"
                        title="Click to preview document"
                      >
                        {doc.originalName}
                      </button>
                      <p className="text-[11px] text-slate-400 capitalize">
                        {doc.documentType.replace('_', ' ')} • {new Date(doc.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => setSummaryModalDoc(doc)}
                        className="px-2.5 py-1 text-xs font-bold rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 flex items-center gap-1 transition-colors cursor-pointer shadow-2xs"
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
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full capitalize ${
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
                          className="px-2.5 py-1 text-xs font-bold rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 transition-colors shadow-2xs"
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
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden flex flex-col">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
            <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
              <Activity className="w-4 h-4 text-emerald-600" />
              {t.dashboard.recentLabs}
            </h3>
            <Link to="/observations" className="text-xs font-bold text-emerald-700 hover:text-emerald-800 flex items-center">
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
                    className="p-3 rounded-xl border border-slate-100 hover:border-slate-200 bg-slate-50/50 flex items-center justify-between gap-3 text-xs"
                  >
                    <div>
                      <p className="font-bold text-slate-800">{obs.testName}</p>
                      <p className="text-[11px] text-slate-400">
                        {new Date(obs.observationDate).toLocaleDateString()} • {obs.sourceDocumentId?.originalName || 'Report'}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="font-black text-slate-900 text-sm">
                        {obs.valueString} <span className="text-xs font-normal text-slate-500">{obs.unit}</span>
                      </p>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          obs.interpretation === 'HIGH' || obs.interpretation === 'ABNORMAL'
                            ? 'bg-rose-100 text-rose-800 border border-rose-200'
                            : obs.interpretation === 'LOW'
                            ? 'bg-amber-100 text-amber-800 border border-amber-200'
                            : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
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
      <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-xs">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
            <Calendar className="w-4 h-4 text-emerald-600" />
            {t.dashboard.upcomingReminders}
          </h3>
          <Link to="/reminders" className="text-xs font-bold text-emerald-700 hover:text-emerald-800">
            Manage Reminders
          </Link>
        </div>

        {data?.upcomingReminders?.length === 0 ? (
          <p className="text-xs text-slate-400 text-center py-4">No upcoming reminders scheduled.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {data.upcomingReminders.map((rem: any) => (
              <div key={rem._id} className="p-3 bg-slate-50/80 border border-slate-200/80 rounded-xl flex items-start gap-3">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 mt-0.5 shrink-0" />
                <div className="min-w-0">
                  <p className="text-xs font-bold text-slate-800">{rem.title}</p>
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
