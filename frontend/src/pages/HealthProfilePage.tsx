import React, { useState, useEffect } from 'react';
import api from '../api/client.js';
import { useAuth } from '../context/AuthContext.js';
import { getT } from '../utils/i18n.js';
import {
  User,
  Shield,
  Heart,
  Pill,
  Activity,
  AlertCircle,
  Download,
  Sparkles,
  FileCode,
  CheckCircle,
  RefreshCw,
} from 'lucide-react';
import { MedicationRecord, ConditionRecord } from '../types/index.js';

export const HealthProfilePage: React.FC = () => {
  const { user, language } = useAuth();
  const t = getT(language);

  const [medications, setMedications] = useState<MedicationRecord[]>([]);
  const [conditions, setConditions] = useState<ConditionRecord[]>([]);
  const [patientSummary, setPatientSummary] = useState<any>(null);
  const [generatingSummary, setGeneratingSummary] = useState(false);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [medsRes, condsRes, summaryRes] = await Promise.all([
        api.get('/medications'),
        api.get('/conditions'),
        api.get('/summaries/patient', { params: { language } }).catch(() => ({ data: { success: false, summary: null } })),
      ]);

      if (medsRes.data.success) setMedications(medsRes.data.medications);
      if (condsRes.data.success) setConditions(condsRes.data.conditions);
      if (summaryRes.data.success && summaryRes.data.summary) {
        setPatientSummary(summaryRes.data.summary);
      }
    } catch (err: any) {
      console.error('Failed to load profile records:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [language]);

  const handleToggleMedStatus = async (id: string) => {
    try {
      const res = await api.patch(`/medications/${id}/toggle-current`);
      if (res.data.success) {
        fetchData();
      }
    } catch {
      alert('Failed to update medication status');
    }
  };

  const handleExportFhir = async () => {
    try {
      const res = await api.get('/fhir/export');
      const blob = new Blob([JSON.stringify(res.data, null, 2)], { type: 'application/fhir+json' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `fhir_patient_bundle_${user?.name?.replace(/\s+/g, '_')}.json`;
      a.click();
    } catch {
      alert('Failed to export FHIR bundle');
    }
  };

  const handleGenerateSummary = async () => {
    setGeneratingSummary(true);
    try {
      const res = await api.post('/summaries/patient/generate', { language });
      if (res.data.success) {
        setPatientSummary(res.data.summary);
      }
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to generate patient summary');
    } finally {
      setGeneratingSummary(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header with FHIR Export button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">Unified Health Profile</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Verified patient demographics, active medication list, diagnosed conditions, and FHIR interoperability export.
          </p>
        </div>

        <button
          onClick={handleExportFhir}
          className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold flex items-center gap-2 transition-colors self-start sm:self-auto shadow-sm"
        >
          <FileCode className="w-4 h-4 text-emerald-400" />
          Export FHIR R4 Bundle
        </button>
      </div>

      {/* Patient Demographic Card & Mock ABHA ID */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-emerald-100 text-emerald-800 font-bold text-lg flex items-center justify-center">
              {user?.name?.charAt(0)}
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">{user?.name}</h2>
              <p className="text-xs text-slate-500">{user?.email}</p>
            </div>
          </div>

          <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3 text-left md:text-right">
            <p className="text-[10px] uppercase font-bold text-emerald-800 tracking-wider">
              ABHA ID (Ayushman Bharat Health Account)
            </p>
            <p className="text-sm font-mono font-bold text-emerald-950 mt-0.5">{user?.mockAbhaId}</p>
            <p className="text-[10px] text-emerald-600 italic">Mock ABHA ID for ABDM Architecture Demonstration</p>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
          <div>
            <span className="text-slate-400 block mb-0.5">Blood Group</span>
            <span className="font-semibold text-slate-800">{user?.bloodGroup || 'Not specified'}</span>
          </div>
          <div>
            <span className="text-slate-400 block mb-0.5">Gender</span>
            <span className="font-semibold text-slate-800 capitalize">{user?.gender || 'Not specified'}</span>
          </div>
          <div>
            <span className="text-slate-400 block mb-0.5">Preferred Language</span>
            <span className="font-semibold text-slate-800 uppercase">{user?.preferredLanguage || 'EN'}</span>
          </div>
          <div>
            <span className="text-slate-400 block mb-0.5">Allergies</span>
            <span className="font-semibold text-slate-800">
              {user?.allergies && user.allergies.length > 0 ? user.allergies.join(', ') : 'No known allergies'}
            </span>
          </div>
        </div>
      </div>

      {/* AI Longitudinal Summary Section */}
      <div className="bg-gradient-to-r from-emerald-50 via-teal-50 to-emerald-50 rounded-xl border border-emerald-200 p-5 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
              <Sparkles className="w-4 h-4 text-emerald-600" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-emerald-950">Longitudinal Health Overview</h3>
              <p className="text-[11px] text-emerald-700">Unified clinical synthesis across your diagnostic timeline and prescriptions</p>
            </div>
          </div>
          <button
            onClick={handleGenerateSummary}
            disabled={generatingSummary}
            className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors disabled:opacity-50 cursor-pointer shadow-2xs self-start sm:self-auto"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${generatingSummary ? 'animate-spin' : ''}`} />
            {generatingSummary ? 'Synthesizing...' : patientSummary ? 'Regenerate AI Summary' : 'Generate AI Summary'}
          </button>
        </div>

        {generatingSummary && !patientSummary ? (
          <div className="bg-white/80 p-6 rounded-xl border border-emerald-200 text-center space-y-2 animate-pulse">
            <div className="w-6 h-6 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-xs font-semibold text-emerald-900">Synthesizing Longitudinal Health Profile...</p>
            <p className="text-[11px] text-slate-500">Aggregating historical lab trends, verified observations, and active medications.</p>
          </div>
        ) : patientSummary ? (
          <div className="bg-white p-5 rounded-xl border border-emerald-200 shadow-2xs text-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100">
              <h4 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                {patientSummary.title}
              </h4>
              {patientSummary.generatedWithModel && (
                <span className="text-[10px] font-mono text-slate-400 bg-slate-50 px-2 py-0.5 rounded border border-slate-200 self-start sm:self-auto">
                  Engine: {patientSummary.generatedWithModel}
                </span>
              )}
            </div>

            {/* Plain language explanation */}
            <p className="text-slate-700 leading-relaxed text-xs sm:text-[13px] bg-emerald-50/40 p-3.5 rounded-lg border border-emerald-100/70">
              {patientSummary.simpleExplanation}
            </p>

            {/* Key Clinical Findings */}
            {patientSummary.keyFindings?.length > 0 && (
              <div className="space-y-1.5">
                <p className="font-bold text-slate-800 text-[11px] uppercase tracking-wider">Key Longitudinal Findings:</p>
                <ul className="space-y-1.5 text-slate-700">
                  {patientSummary.keyFindings.map((finding: string, idx: number) => (
                    <li key={idx} className="flex items-start gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-1.5 shrink-0" />
                      <span>{finding}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Flagged / Abnormal Values if any */}
            {patientSummary.abnormalValues?.length > 0 && (
              <div className="space-y-1.5 pt-2 border-t border-slate-100">
                <p className="font-bold text-amber-900 text-[11px] uppercase tracking-wider flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
                  Parameters to Monitor:
                </p>
                <div className="flex flex-wrap gap-2">
                  {patientSummary.abnormalValues.map((ab: any, idx: number) => (
                    <div key={idx} className="px-2.5 py-1 bg-amber-50 border border-amber-200 rounded-lg text-[11px] flex items-center gap-1.5">
                      <span className="font-semibold text-slate-800">{ab.testName}:</span>
                      <span className="font-mono font-bold text-amber-900">{ab.value}</span>
                      {ab.referenceRange && <span className="text-slate-500">({ab.referenceRange})</span>}
                      <span className="px-1.5 py-0.2 bg-amber-200/80 text-amber-900 rounded font-semibold text-[10px]">{ab.flag}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Questions for Doctor */}
            {patientSummary.suggestedQuestionsForDoctor?.length > 0 && (
              <div className="pt-2 border-t border-slate-100 space-y-1.5">
                <p className="font-bold text-slate-800 text-[11px] uppercase tracking-wider">Recommended Consultation Questions:</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {patientSummary.suggestedQuestionsForDoctor.map((q: string, idx: number) => (
                    <div key={idx} className="p-2.5 bg-slate-50 rounded-lg border border-slate-200 text-slate-700 flex items-start gap-2">
                      <span className="text-emerald-600 font-bold">Q{idx + 1}:</span>
                      <span>{q}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="bg-white/60 p-4 rounded-lg border border-emerald-100/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-slate-600">
            <p>
              Synthesize an overarching clinical overview across your verified laboratory tests, active prescriptions, and diagnosis timeline.
            </p>
            <button
              onClick={handleGenerateSummary}
              disabled={generatingSummary}
              className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold shrink-0 cursor-pointer shadow-2xs"
            >
              Generate AI Summary
            </button>
          </div>
        )}
      </div>

      {/* Current Medications & Diagnosed Conditions Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Active Medications List */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm space-y-3">
          <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
            <Pill className="w-4 h-4 text-emerald-600" />
            Active Prescriptions & Medications ({medications.length})
          </h3>

          {medications.length === 0 ? (
            <p className="text-xs text-slate-400 py-4 text-center">No medications recorded.</p>
          ) : (
            <div className="space-y-2.5">
              {medications.map((m) => (
                <div
                  key={m._id}
                  className={`p-3 rounded-lg border flex items-center justify-between gap-3 text-xs ${
                    m.isCurrent ? 'bg-slate-50 border-slate-200' : 'bg-slate-100/50 border-slate-200 opacity-60'
                  }`}
                >
                  <div>
                    <p className="font-bold text-slate-900">
                      {m.medicineName} <span className="font-normal text-slate-500">{m.dosage}</span>
                    </p>
                    <p className="text-[11px] text-slate-500">
                      Frequency: {m.frequency || 'As advised'} • {m.instructions || 'Oral'}
                    </p>
                  </div>
                  <button
                    onClick={() => handleToggleMedStatus(m._id)}
                    className={`px-2.5 py-1 rounded text-[11px] font-semibold transition-colors ${
                      m.isCurrent
                        ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'
                        : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
                    }`}
                  >
                    {m.isCurrent ? 'Current' : 'Discontinued'}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Diagnosed Conditions List */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm space-y-3">
          <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
            <Activity className="w-4 h-4 text-emerald-600" />
            Diagnosed Clinical Conditions ({conditions.length})
          </h3>

          {conditions.length === 0 ? (
            <p className="text-xs text-slate-400 py-4 text-center">No conditions recorded.</p>
          ) : (
            <div className="space-y-2.5">
              {conditions.map((c) => (
                <div key={c._id} className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-xs space-y-1">
                  <div className="flex items-center justify-between">
                    <p className="font-bold text-slate-900">{c.conditionName}</p>
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-purple-100 text-purple-800 capitalize">
                      {c.status}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500">
                    Diagnosed: {new Date(c.diagnosedDate).toLocaleDateString()}
                    {c.icd10Code && ` • ICD-10: ${c.icd10Code}`}
                  </p>
                  {c.notes && <p className="text-[11px] text-slate-600 italic">{c.notes}</p>}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
