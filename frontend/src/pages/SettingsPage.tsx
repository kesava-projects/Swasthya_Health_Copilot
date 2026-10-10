import React, { useState, useEffect } from 'react';
import api from '../api/client.js';
import { useAuth } from '../context/AuthContext.js';
import { getT } from '../utils/i18n.js';
import {
  Settings,
  Globe,
  Cpu,
  ShieldCheck,
  History,
  Lock,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import { Language } from '../types/index.js';

export const SettingsPage: React.FC = () => {
  const { user, language, setLanguage } = useAuth();
  const t = getT(language);

  const [aiStatus, setAiStatus] = useState<any>(null);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStatusAndLogs = async () => {
      try {
        setLoading(true);
        const [aiRes, auditRes] = await Promise.all([
          api.get('/ai/status'),
          api.get('/audit/logs'),
        ]);

        if (aiRes.data.success) {
          setAiStatus(aiRes.data);
        }
        if (auditRes.data.success) {
          setAuditLogs(auditRes.data.logs);
        }
      } catch (err) {
        console.error('Failed to load settings data:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchStatusAndLogs();
  }, []);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-slate-900 tracking-tight">System Settings & Privacy</h1>
        <p className="text-xs text-slate-500 mt-0.5">
          Configure preferred language, inspect AI provider status, and monitor record access audit logs.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 1. Language Preference */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm space-y-4">
          <div className="flex items-center gap-2 text-slate-900 font-bold text-sm">
            <Globe className="w-4 h-4 text-emerald-600" />
            <h3>Interface & Explanation Language</h3>
          </div>

          <p className="text-xs text-slate-500">
            Select your preferred language. AI explanations and chatbot summaries will adapt while preserving original medical measurements, units, and medicine names.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {[
              { code: 'en', name: 'English', desc: 'Standard English', flag: '🇬🇧' },
              { code: 'hi', name: 'हिन्दी (Hindi)', desc: 'हिंदी अनुवाद और व्याख्याएं', flag: '🇮🇳' },
              { code: 'te', name: 'తెలుగు (Telugu)', desc: 'తెలుగు అనువాదాలు మరియు వివరణలు', flag: '🇮🇳' },
              { code: 'ta', name: 'தமிழ் (Tamil)', desc: 'தமிழ் மொழிபெயர்ப்புகள்', flag: '🇮🇳' },
              { code: 'kn', name: 'ಕನ್ನಡ (Kannada)', desc: 'ಕನ್ನಡ ಅನುವಾದಗಳು ಮತ್ತು ವಿವರಣೆಗಳು', flag: '🇮🇳' },
              { code: 'bn', name: 'বাংলা (Bengali)', desc: 'বাংলা অনুবাদ ও ব্যাখ্যা', flag: '🇮🇳' },
              { code: 'mr', name: 'मराठी (Marathi)', desc: 'मराठी भाषांतर आणि स्पष्टीकरण', flag: '🇮🇳' },
              { code: 'es', name: 'Español (Spanish)', desc: 'Traducciones y resúmenes clínicos', flag: '🇪🇸' },
            ].map((lang) => (
              <label
                key={lang.code}
                className={`p-3 rounded-xl border flex items-center justify-between cursor-pointer transition-all text-xs ${
                  language === lang.code
                    ? 'border-emerald-500 bg-emerald-50/70 text-emerald-950 font-bold shadow-2xs'
                    : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <span className="text-lg">{lang.flag}</span>
                  <div>
                    <p className="font-bold leading-tight">{lang.name}</p>
                    <p className="text-[10px] text-slate-400 font-normal leading-tight">{lang.desc}</p>
                  </div>
                </div>
                <input
                  type="radio"
                  name="language"
                  value={lang.code}
                  checked={language === lang.code}
                  onChange={() => setLanguage(lang.code as Language)}
                  className="text-emerald-600 focus:ring-emerald-500"
                />
              </label>
            ))}
          </div>
        </div>

        {/* 2. AI & OCR Service Architecture Status */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm space-y-4">
          <div className="flex items-center gap-2 text-slate-900 font-bold text-sm">
            <Cpu className="w-4 h-4 text-emerald-600" />
            <h3>AI Provider & OCR Engine Diagnostics</h3>
          </div>

          <div className="space-y-3 text-xs">
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-slate-700">AI Provider</span>
                <span className="font-mono text-emerald-700 font-bold uppercase">
                  {aiStatus?.ai?.provider || 'gemini'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="font-semibold text-slate-700">Model Configuration</span>
                <span className="font-mono text-slate-600">{aiStatus?.ai?.model || 'gemini-1.5-flash'}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="font-semibold text-slate-700">API Key Status</span>
                <span
                  className={`font-semibold px-2 py-0.5 rounded text-[10px] ${
                    aiStatus?.ai?.configured
                      ? 'bg-emerald-100 text-emerald-800'
                      : 'bg-amber-100 text-amber-800'
                  }`}
                >
                  {aiStatus?.ai?.configured ? 'Active (Live LLM)' : 'Demo / Config-Check Mode'}
                </span>
              </div>
            </div>

            <p className="text-[11px] text-slate-500 leading-relaxed bg-slate-50 p-2.5 rounded-lg border border-slate-100">
              {aiStatus?.ai?.notice}
            </p>

            <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-slate-700">OCR Service Engine</span>
                <span className="font-mono text-slate-800 font-semibold">Tesseract Engine 5.x</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="font-semibold text-slate-700">OCR Languages</span>
                <span className="font-mono text-emerald-700 font-medium">eng + hin + tel (Multilingual)</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="font-semibold text-slate-700">Microservice Status</span>
                <span className="text-emerald-700 font-semibold">Operational</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Security Audit Logs Viewer */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-slate-900 font-bold text-sm">
            <History className="w-4 h-4 text-emerald-600" />
            <h3>Security & Medical Access Audit Trail</h3>
          </div>
          <span className="text-[11px] text-slate-400 font-mono">Immutable audit records</span>
        </div>

        <p className="text-xs text-slate-500">
          Every sensitive action (document download, extraction edit, confirmation, RAG query) is recorded with timestamp and resource metadata for privacy traceability.
        </p>

        <div className="overflow-x-auto max-h-60 border border-slate-100 rounded-lg">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider text-[10px] border-b border-slate-200 sticky top-0">
              <tr>
                <th className="py-2.5 px-3">Action</th>
                <th className="py-2.5 px-3">Resource</th>
                <th className="py-2.5 px-3">Timestamp</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-[11px]">
              {auditLogs.map((log) => (
                <tr key={log._id} className="hover:bg-slate-50/70">
                  <td className="py-2 px-3 font-semibold text-emerald-800 font-mono">{log.action}</td>
                  <td className="py-2 px-3 text-slate-600">{log.resourceType}</td>
                  <td className="py-2 px-3 text-slate-500">{new Date(log.timestamp).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
