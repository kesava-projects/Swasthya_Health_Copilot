import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/client.js';
import { useAuth } from '../context/AuthContext.js';
import { getT } from '../utils/i18n.js';
import {
  Activity,
  TrendingUp,
  Search,
  Filter,
  CheckCircle,
  AlertTriangle,
  Info,
  Eye,
} from 'lucide-react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceArea,
  Dot,
} from 'recharts';
import { Observation, ObservationTrend } from '../types/index.js';

export const ObservationsPage: React.FC = () => {
  const { language } = useAuth();
  const t = getT(language);

  const [observations, setObservations] = useState<Observation[]>([]);
  const [trends, setTrends] = useState<ObservationTrend[]>([]);
  const [selectedTest, setSelectedTest] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [abnormalOnly, setAbnormalOnly] = useState(false);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [obsRes, trendsRes] = await Promise.all([
        api.get('/observations', {
          params: { search, abnormalOnly: abnormalOnly ? 'true' : undefined },
        }),
        api.get('/observations/trends'),
      ]);

      if (obsRes.data.success) {
        setObservations(obsRes.data.observations);
      }
      if (trendsRes.data.success) {
        setTrends(trendsRes.data.trends);
        if (trendsRes.data.trends.length > 0 && !selectedTest) {
          setSelectedTest(trendsRes.data.trends[0].testName);
        }
      }
    } catch (err: any) {
      console.error('Failed to load observations:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [search, abnormalOnly]);

  const currentTrend = trends.find((t) => t.testName === selectedTest);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-slate-900 tracking-tight">Laboratory Observations & Trends</h1>
        <p className="text-xs text-slate-500 mt-0.5">
          Track longitudinal changes across your lab investigations with printed reference intervals.
        </p>
      </div>

      {/* Historical Trend Chart Section */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-emerald-600" />
            <h2 className="text-sm font-semibold text-slate-800">Historical Comparison Chart</h2>
          </div>

          {trends.length > 0 && (
            <div className="flex items-center gap-2">
              <label className="text-xs font-medium text-slate-600">Select Test:</label>
              <select
                value={selectedTest}
                onChange={(e) => setSelectedTest(e.target.value)}
                className="px-3 py-1.5 border border-slate-300 rounded-lg text-xs bg-white font-medium text-slate-800 outline-none focus:border-emerald-500"
              >
                {trends.map((tr) => (
                  <option key={tr.testName} value={tr.testName}>
                    {tr.testName} ({tr.count} records)
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {currentTrend && currentTrend.dataPoints.length > 0 ? (
          <div>
            <div className="flex flex-wrap items-center gap-4 text-xs text-slate-600 bg-slate-50 p-3 rounded-lg mb-4">
              <div>
                <span className="text-slate-400">Latest Value: </span>
                <span className="font-bold text-slate-800">
                  {currentTrend.latestValue} {currentTrend.unit}
                </span>
              </div>
              {currentTrend.referenceRange && (
                <div>
                  <span className="text-slate-400">Reference Interval: </span>
                  <span className="font-mono text-slate-700">{currentTrend.referenceRange}</span>
                </div>
              )}
              <div>
                <span className="text-slate-400">Status: </span>
                <span
                  className={`font-semibold px-1.5 py-0.5 rounded text-[10px] ${
                    currentTrend.latestInterpretation === 'HIGH' || currentTrend.latestInterpretation === 'ABNORMAL'
                      ? 'bg-rose-100 text-rose-800'
                      : 'bg-emerald-100 text-emerald-800'
                  }`}
                >
                  {currentTrend.latestInterpretation}
                </span>
              </div>
            </div>

            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={currentTrend.dataPoints} margin={{ top: 10, right: 30, left: 10, bottom: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} unit={` ${currentTrend.unit}`} />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const pt = payload[0].payload;
                        return (
                          <div className="bg-slate-900 text-white p-3 rounded-lg text-xs shadow-lg space-y-1">
                            <p className="font-bold text-emerald-400">{pt.date}</p>
                            <p className="text-slate-200">
                              Value: <span className="font-bold text-white">{pt.value} {pt.unit}</span>
                            </p>
                            {pt.referenceRange && (
                              <p className="text-slate-400 text-[11px]">Range: {pt.referenceRange}</p>
                            )}
                            <p className="text-slate-400 text-[11px]">Source: {pt.documentName} (p.{pt.pageNumber})</p>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="value"
                    stroke="#059669"
                    strokeWidth={2.5}
                    dot={{ r: 4, fill: '#059669' }}
                    activeDot={{ r: 6 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        ) : (
          <div className="p-8 text-center text-xs text-slate-400">
            No numeric trends recorded yet. Upload lab reports with numeric test values to see charts.
          </div>
        )}
      </div>

      {/* Observations Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3">
          <h2 className="text-sm font-semibold text-slate-800 flex items-center gap-2">
            <Activity className="w-4 h-4 text-emerald-600" />
            All Recorded Laboratory Observations ({observations.length})
          </h2>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            <div className="relative w-full sm:w-60">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Search test names..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 border border-slate-200 rounded-lg text-xs outline-none"
              />
            </div>

            <button
              onClick={() => setAbnormalOnly(!abnormalOnly)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold shrink-0 transition-colors ${
                abnormalOnly
                  ? 'bg-rose-100 text-rose-800 border border-rose-300'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              Abnormal Only
            </button>
          </div>
        </div>

        {loading ? (
          <div className="p-8 text-center text-xs text-slate-500">{t.common.loading}</div>
        ) : observations.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-400">No laboratory observations found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider text-[11px] border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">Test Name</th>
                  <th className="py-3 px-4">Result</th>
                  <th className="py-3 px-4">Reference Range</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">Source Document</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {observations.map((obs) => (
                  <tr key={obs._id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3 px-4 font-semibold text-slate-800">{obs.testName}</td>
                    <td className="py-3 px-4 font-mono font-bold text-slate-900">
                      {obs.valueString} <span className="font-normal text-slate-500 text-[11px]">{obs.unit}</span>
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-600">
                      {obs.referenceRangeString || 'N/A'}
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`inline-block px-2 py-0.5 rounded-full font-semibold text-[10px] ${
                          obs.interpretation === 'HIGH' || obs.interpretation === 'ABNORMAL'
                            ? 'bg-rose-100 text-rose-800'
                            : obs.interpretation === 'LOW'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-emerald-100 text-emerald-800'
                        }`}
                      >
                        {obs.interpretation}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-600">
                      {new Date(obs.observationDate).toLocaleDateString()}
                    </td>
                    <td className="py-3 px-4 text-slate-500 truncate max-w-xs">
                      {obs.sourceDocumentId?._id ? (
                        <Link
                          to={`/documents?preview=${obs.sourceDocumentId._id}&page=${obs.pageNumber || 1}`}
                          className="text-emerald-700 hover:text-emerald-800 hover:underline font-medium inline-flex items-center gap-1 transition-colors"
                          title="Open document preview in Documents"
                        >
                          <Eye className="w-3 h-3 text-emerald-600" />
                          <span>{obs.sourceDocumentId.originalName}</span>
                          <span className="text-slate-400 font-mono text-[10px]">(p.{obs.pageNumber})</span>
                        </Link>
                      ) : (
                        <span>{obs.sourceDocumentId?.originalName || 'Report'} (p.{obs.pageNumber})</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
