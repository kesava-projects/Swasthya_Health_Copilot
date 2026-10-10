import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/client.js';
import { useAuth } from '../context/AuthContext.js';
import { getT } from '../utils/i18n.js';
import {
  Calendar,
  Filter,
  FileText,
  Activity,
  Pill,
  CheckCircle,
  Clock,
  ArrowRight,
  Eye,
} from 'lucide-react';
import { TimelineEvent } from '../types/index.js';

export const TimelinePage: React.FC = () => {
  const { language } = useAuth();
  const t = getT(language);

  const [events, setEvents] = useState<TimelineEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string>('');

  const fetchTimeline = async () => {
    try {
      setLoading(true);
      const res = await api.get('/timeline', {
        params: { category: selectedCategory || undefined },
      });
      if (res.data.success) {
        setEvents(res.data.events);
      }
    } catch (err: any) {
      console.error('Failed to load timeline:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTimeline();
  }, [selectedCategory]);

  const categories = [
    { id: '', label: 'All Events' },
    { id: 'lab', label: 'Labs' },
    { id: 'medication', label: 'Prescriptions' },
    { id: 'condition', label: 'Conditions' },
    { id: 'document', label: 'Document Uploads' },
  ];

  const getEventIcon = (category: string) => {
    switch (category) {
      case 'lab':
        return <Activity className="w-4 h-4 text-emerald-600" />;
      case 'medication':
        return <Pill className="w-4 h-4 text-blue-600" />;
      case 'document':
        return <FileText className="w-4 h-4 text-purple-600" />;
      default:
        return <Calendar className="w-4 h-4 text-slate-600" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-slate-900 tracking-tight">Chronological Medical Timeline</h1>
        <p className="text-xs text-slate-500 mt-0.5">
          Unified longitudinal view of medical tests, diagnoses, and prescriptions with explicit clinical event date distinction.
        </p>
      </div>

      {/* Category Pills */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2">
        {categories.map((cat) => (
          <button
            key={cat.id}
            onClick={() => setSelectedCategory(cat.id)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
              selectedCategory === cat.id
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Timeline Stream */}
      {loading ? (
        <div className="p-12 text-center text-xs text-slate-500">{t.common.loading}</div>
      ) : events.length === 0 ? (
        <div className="p-12 text-center text-xs text-slate-400 bg-white rounded-xl border border-slate-200">
          No timeline events recorded in this category yet.
        </div>
      ) : (
        <div className="relative pl-6 sm:pl-8 border-l-2 border-emerald-200 space-y-6 my-4 ml-4">
          {events.map((evt) => (
            <div key={evt._id} className="relative group">
              {/* Event node dot */}
              <div className="absolute -left-[31px] sm:-left-[39px] top-1.5 w-6 h-6 rounded-full bg-white border-2 border-emerald-500 flex items-center justify-center shadow-sm">
                {getEventIcon(evt.category)}
              </div>

              {/* Event Card */}
              <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm hover:border-emerald-300 transition-colors space-y-2">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-xs">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-900 text-sm">{evt.title}</span>
                    <span
                      className={`text-[10px] font-semibold px-2 py-0.5 rounded-full capitalize ${
                        evt.category === 'lab'
                          ? 'bg-emerald-100 text-emerald-800'
                          : evt.category === 'medication'
                          ? 'bg-blue-100 text-blue-800'
                          : evt.category === 'condition'
                          ? 'bg-purple-100 text-purple-800'
                          : 'bg-slate-100 text-slate-800'
                      }`}
                    >
                      {evt.category}
                    </span>
                  </div>

                  {/* Explicit Clinical Event Date vs Upload Date */}
                  <div className="flex items-center gap-3 text-[11px] text-slate-500">
                    <span className="font-semibold text-emerald-700">
                      Medical Event Date: {new Date(evt.eventDate).toLocaleDateString()}
                    </span>
                    <span className="text-slate-400">
                      (Uploaded: {new Date(evt.uploadDate).toLocaleDateString()})
                    </span>
                  </div>
                </div>

                <p className="text-xs text-slate-600 leading-relaxed">{evt.description}</p>

                {evt.sourceDocumentId && (() => {
                  const docId = typeof evt.sourceDocumentId === 'object' && evt.sourceDocumentId !== null
                    ? (evt.sourceDocumentId._id || evt.sourceDocumentId.id)
                    : evt.sourceDocumentId;
                  const docName = typeof evt.sourceDocumentId === 'object' && evt.sourceDocumentId !== null
                    ? evt.sourceDocumentId.originalName
                    : 'Medical Report';
                  const targetUrl = docId
                    ? `/documents?preview=${docId}${evt.pageNumber ? `&page=${evt.pageNumber}` : ''}`
                    : '/documents';

                  return (
                    <div className="pt-2 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 text-[11px]">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <FileText className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        <span className="text-slate-500 font-medium">Source:</span>
                        <Link
                          to={targetUrl}
                          className="font-semibold text-slate-800 hover:text-emerald-700 hover:underline truncate max-w-[200px] sm:max-w-xs transition-colors"
                          title="Open document preview in Documents"
                        >
                          {docName}
                        </Link>
                        {evt.pageNumber && (
                          <span className="text-slate-400 font-mono text-[10px] shrink-0">
                            (p.{evt.pageNumber})
                          </span>
                        )}
                      </div>

                      <Link
                        to={targetUrl}
                        className="inline-flex items-center gap-1 text-emerald-600 font-semibold hover:text-emerald-700 hover:underline transition-colors self-end sm:self-auto shrink-0"
                        title="Go to documents and open preview"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        View Source <ArrowRight className="w-3 h-3" />
                      </Link>
                    </div>
                  );
                })()}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
