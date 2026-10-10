import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/client.js';
import { useAuth } from '../context/AuthContext.js';
import { getT } from '../utils/i18n.js';
import {
  Activity,
  TrendingUp,
  TrendingDown,
  Minus,
  Search,
  Filter,
  CheckCircle,
  AlertTriangle,
  Info,
  Eye,
  Calendar,
  Sparkles,
  BarChart2,
  LineChart as LineChartIcon,
  HelpCircle,
  ShieldAlert,
  ArrowUpRight,
  ArrowDownRight,
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceArea,
  ReferenceLine,
} from 'recharts';
import { Observation, ObservationTrend } from '../types/index.js';

// Clinical Knowledge Base for meaningful patient guidance
const CLINICAL_KNOWLEDGE_BASE: Record<
  string,
  {
    category: string;
    description: string;
    importance: string;
    targetRange: string;
    questionsForDoctor: string[];
  }
> = {
  Hemoglobin: {
    category: 'hematology',
    description: 'An iron-rich protein in red blood cells that transports vital oxygen throughout the body.',
    importance: 'Low levels indicate anemia causing fatigue; elevated levels can signal dehydration or lung/bone marrow conditions.',
    targetRange: '12.0 - 17.5 g/dL (varies by sex and age)',
    questionsForDoctor: [
      'Is my hemoglobin stable or trending lower over time?',
      'Do my iron, ferritin, or vitamin B12 levels need evaluation?',
      'Are dietary iron enhancements or supplements recommended?',
    ],
  },
  'Fasting Blood Sugar': {
    category: 'diabetes',
    description: 'Measures circulating blood glucose concentration after an overnight fast (minimum 8 hours).',
    importance: 'Primary screening tool for prediabetes and type 2 diabetes management.',
    targetRange: '70 - 99 mg/dL (Normal: < 100 mg/dL)',
    questionsForDoctor: [
      'Does my fasting glucose correlate well with my three-month HbA1c average?',
      'What dietary carbohydrate adjustments are recommended for my routine?',
      'Should we track post-meal glucose or fasting insulin?',
    ],
  },
  'Post Prandial Blood Sugar': {
    category: 'diabetes',
    description: 'Blood sugar level measured exactly 2 hours after the start of a meal.',
    importance: 'Evaluates how effectively the body produces and responds to insulin in response to food.',
    targetRange: '70 - 140 mg/dL (< 140 mg/dL is optimal)',
    questionsForDoctor: [
      'Are mealtime carbohydrate spikes affecting my longitudinal glycemic control?',
      'Should medication timing be adjusted relative to meals?',
    ],
  },
  HbA1c: {
    category: 'diabetes',
    description: 'Glycated hemoglobin reflects average blood glucose levels over the prior 2 to 3 months.',
    importance: 'Gold standard for long-term diabetes diagnosis and treatment efficacy.',
    targetRange: 'Below 5.7% (Normal), 5.7 - 6.4% (Prediabetes), ≥ 6.5% (Diabetes)',
    questionsForDoctor: [
      'What is my individualized target HbA1c goal based on my age and medical history?',
      'How frequently should my HbA1c be re-checked?',
    ],
  },
  'Total Cholesterol': {
    category: 'cardio',
    description: 'Total amount of cholesterol circulating in the bloodstream, including HDL, LDL, and VLDL.',
    importance: 'Key component in calculating overall 10-year atherosclerotic cardiovascular disease risk.',
    targetRange: 'Below 200 mg/dL is desirable',
    questionsForDoctor: [
      'What is my ratio of Total Cholesterol to HDL (good cholesterol)?',
      'Does my cardiovascular risk profile warrant statin therapy or dietary adjustment?',
    ],
  },
  Triglycerides: {
    category: 'cardio',
    description: 'A type of fat (lipid) in the blood stored from unused dietary calories.',
    importance: 'High levels contribute to hardening of arteries and acute pancreatitis risk.',
    targetRange: 'Less than 150 mg/dL is optimal',
    questionsForDoctor: [
      'Can lifestyle adjustments like reducing refined sugars and alcohol lower my triglycerides?',
      'Should we check thyroid or liver function if triglycerides remain elevated?',
    ],
  },
  'HDL Cholesterol': {
    category: 'cardio',
    description: 'High-Density Lipoprotein ("good cholesterol") scavenges harmful fats from the arteries back to the liver.',
    importance: 'Higher HDL levels have a protective effect against coronary artery disease.',
    targetRange: 'Above 40 mg/dL (men) or above 50 mg/dL (women)',
    questionsForDoctor: [
      'What physical aerobic exercise routines can help boost my HDL level?',
    ],
  },
  'Serum Creatinine': {
    category: 'renal',
    description: 'A waste product from normal muscle breakdown filtered exclusively by healthy kidneys.',
    importance: 'Critical biomarker used to estimate Glomerular Filtration Rate (eGFR) and kidney health.',
    targetRange: '0.7 - 1.3 mg/dL',
    questionsForDoctor: [
      'Is my creatinine stable compared to my baseline kidney function?',
      'Are my current medications safe for kidney clearance at this creatinine level?',
    ],
  },
  'Platelet Count': {
    category: 'hematology',
    description: 'Colorless blood cell fragments essential for normal blood clotting and wound repair.',
    importance: 'Low count (thrombocytopenia) risks bruising/bleeding; high count risks clotting.',
    targetRange: '150,000 - 450,000 /mcL',
    questionsForDoctor: [
      'Are any medications or viral conditions causing fluctuation in my platelets?',
    ],
  },
  'White Blood Cell Count': {
    category: 'hematology',
    description: 'Cells of the immune system involved in defending the body against infections and inflammation.',
    importance: 'Elevations suggest active infection or inflammation; low levels suggest reduced immunity.',
    targetRange: '4,000 - 11,000 /mcL',
    questionsForDoctor: [
      'Does my WBC count reflect an active immune reaction or medication response?',
    ],
  },
};

export const ObservationsPage: React.FC = () => {
  const { language } = useAuth();
  const t = getT(language);

  const [observations, setObservations] = useState<Observation[]>([]);
  const [trends, setTrends] = useState<ObservationTrend[]>([]);
  const [selectedTest, setSelectedTest] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [chartType, setChartType] = useState<'area' | 'line' | 'bar'>('area');
  const [timeRange, setTimeRange] = useState<'all' | '1y' | '6m'>('all');
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

  // Filter trends by category
  const filteredTrends = useMemo(() => {
    if (selectedCategory === 'all') return trends;
    return trends.filter((tr) => {
      const info = CLINICAL_KNOWLEDGE_BASE[tr.testName];
      if (!info) return false;
      return info.category === selectedCategory;
    });
  }, [trends, selectedCategory]);

  // Ensure selected test is valid for active category
  useEffect(() => {
    if (filteredTrends.length > 0 && !filteredTrends.some((t) => t.testName === selectedTest)) {
      setSelectedTest(filteredTrends[0].testName);
    }
  }, [filteredTrends, selectedTest]);

  const currentTrend = trends.find((t) => t.testName === selectedTest);

  // Time-filtered data points
  const chartDataPoints = useMemo(() => {
    if (!currentTrend || !currentTrend.dataPoints) return [];
    let points = [...currentTrend.dataPoints];

    if (timeRange !== 'all') {
      const now = Date.now();
      const cutoff = timeRange === '1y' ? now - 365 * 24 * 60 * 60 * 1000 : now - 180 * 24 * 60 * 60 * 1000;
      points = points.filter((p) => p.timestamp >= cutoff);
    }

    return points;
  }, [currentTrend, timeRange]);

  // Statistics calculation
  const stats = useMemo(() => {
    if (!currentTrend || currentTrend.dataPoints.length === 0) return null;
    const values = currentTrend.dataPoints.map((p) => p.value);
    const minVal = Math.min(...values);
    const maxVal = Math.max(...values);
    const avgVal = values.reduce((a, b) => a + b, 0) / values.length;
    const latest = currentTrend.dataPoints[currentTrend.dataPoints.length - 1];
    const previous = currentTrend.dataPoints.length > 1 ? currentTrend.dataPoints[currentTrend.dataPoints.length - 2] : null;

    let delta: number | null = null;
    let deltaPct: number | null = null;
    if (previous) {
      delta = Number((latest.value - previous.value).toFixed(2));
      deltaPct = previous.value !== 0 ? Number(((delta / previous.value) * 100).toFixed(1)) : null;
    }

    return {
      min: minVal,
      max: maxVal,
      avg: Number(avgVal.toFixed(2)),
      latest: latest.value,
      latestStr: latest.valueString,
      unit: latest.unit,
      delta,
      deltaPct,
      count: values.length,
      refLow: currentTrend.refLow ?? latest.refLow,
      refHigh: currentTrend.refHigh ?? latest.refHigh,
      referenceRange: currentTrend.referenceRange || latest.referenceRange,
      interpretation: latest.interpretation,
    };
  }, [currentTrend]);

  // Clinical knowledge for current test
  const clinicalInfo = selectedTest ? CLINICAL_KNOWLEDGE_BASE[selectedTest] : null;

  // Custom Dot for high visual impact
  const renderCustomDot = (props: any) => {
    const { cx, cy, payload } = props;
    if (!cx || !cy) return <g key="empty" />;
    const isAbnormal =
      payload.interpretation === 'HIGH' ||
      payload.interpretation === 'ABNORMAL' ||
      payload.interpretation === 'LOW';
    const isHigh = payload.interpretation === 'HIGH';

    return (
      <g key={`dot-${payload.date}-${cx}`}>
        <circle
          cx={cx}
          cy={cy}
          r={isAbnormal ? 6 : 4.5}
          fill={isHigh ? '#f43f5e' : isAbnormal ? '#f59e0b' : '#10b981'}
          stroke="#ffffff"
          strokeWidth={2}
          className="transition-all duration-200"
        />
        {isAbnormal && (
          <circle
            cx={cx}
            cy={cy}
            r={9}
            fill="none"
            stroke={isHigh ? '#f43f5e' : '#f59e0b'}
            strokeWidth={1.5}
            strokeOpacity={0.4}
            className="animate-ping"
          />
        )}
      </g>
    );
  };

  const categories = [
    { id: 'all', label: 'All Biomarkers', icon: Activity },
    { id: 'diabetes', label: 'Diabetes & Glucose', icon: Sparkles },
    { id: 'cardio', label: 'Cardio & Lipids', icon: Activity },
    { id: 'renal', label: 'Kidney / Renal', icon: Filter },
    { id: 'hematology', label: 'Blood Count (CBC)', icon: CheckCircle },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gradient-to-r from-emerald-900 via-teal-900 to-slate-900 p-6 rounded-2xl text-white shadow-sm">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="text-[10px] font-bold tracking-wider uppercase px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
              Longitudinal Biomarkers
            </span>
            <span className="text-xs text-slate-300 font-medium">
              {trends.length} Tracked Tests
            </span>
          </div>
          <h1 className="text-2xl font-extrabold tracking-tight">
            {t.observations.title}
          </h1>
          <p className="text-xs text-slate-300 mt-1 max-w-2xl leading-relaxed">
            {t.observations.subtitle}
          </p>
        </div>

        {/* Category Pills */}
        <div className="flex flex-wrap gap-1.5 self-start sm:self-center">
          {categories.map((cat) => {
            const Icon = cat.icon;
            return (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                  selectedCategory === cat.id
                    ? 'bg-emerald-500 text-white shadow-md shadow-emerald-500/30 ring-1 ring-emerald-300/40'
                    : 'bg-white/10 text-slate-200 hover:bg-white/20'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{cat.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Interactive Chart Section */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-6 shadow-xs space-y-6">
        {/* Top Controls: Test Selector & View Options */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-100">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold">
                <TrendingUp className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-slate-900">
                  {currentTrend ? currentTrend.testName : 'Select Biomarker'}
                </h2>
                <p className="text-[11px] text-slate-500">
                  {chartDataPoints.length} chronological clinical records
                </p>
              </div>
            </div>

            {filteredTrends.length > 0 && (
              <div className="flex items-center gap-2 pl-2 border-l border-slate-200">
                <select
                  value={selectedTest}
                  onChange={(e) => setSelectedTest(e.target.value)}
                  className="px-3 py-1.5 border border-slate-300 rounded-xl text-xs bg-slate-50/80 font-bold text-slate-800 outline-none focus:border-emerald-500 focus:bg-white transition-colors cursor-pointer shadow-2xs"
                >
                  {filteredTrends.map((tr) => (
                    <option key={tr.testName} value={tr.testName}>
                      {tr.testName} ({tr.count} records)
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* Chart Controls: Style & Time Filter */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Chart Type Toggle */}
            <div className="flex items-center bg-slate-100 p-0.5 rounded-xl border border-slate-200 text-xs">
              <button
                onClick={() => setChartType('area')}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-lg font-semibold transition-all ${
                  chartType === 'area' ? 'bg-white text-emerald-800 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                }`}
                title="Gradient Area View"
              >
                <Activity className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Area</span>
              </button>
              <button
                onClick={() => setChartType('line')}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-lg font-semibold transition-all ${
                  chartType === 'line' ? 'bg-white text-emerald-800 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                }`}
                title="Clean Line View"
              >
                <LineChartIcon className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Line</span>
              </button>
              <button
                onClick={() => setChartType('bar')}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-lg font-semibold transition-all ${
                  chartType === 'bar' ? 'bg-white text-emerald-800 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                }`}
                title="Discrete Bar View"
              >
                <BarChart2 className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Bars</span>
              </button>
            </div>

            {/* Time Filter */}
            <div className="flex items-center bg-slate-100 p-0.5 rounded-xl border border-slate-200 text-xs font-semibold">
              <button
                onClick={() => setTimeRange('all')}
                className={`px-2.5 py-1 rounded-lg transition-all ${
                  timeRange === 'all' ? 'bg-white text-emerald-800 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                All
              </button>
              <button
                onClick={() => setTimeRange('1y')}
                className={`px-2.5 py-1 rounded-lg transition-all ${
                  timeRange === '1y' ? 'bg-white text-emerald-800 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                1Y
              </button>
              <button
                onClick={() => setTimeRange('6m')}
                className={`px-2.5 py-1 rounded-lg transition-all ${
                  timeRange === '6m' ? 'bg-white text-emerald-800 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                6M
              </button>
            </div>
          </div>
        </div>

        {/* Current Metric KPI & Normal Range Visual Gauge */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 bg-slate-50/70 p-4 rounded-xl border border-slate-200/80">
            {/* Latest Value */}
            <div className="space-y-1">
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                {t.observations.latestValue}
              </span>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-black text-slate-900 tracking-tight">
                  {stats.latest}
                </span>
                <span className="text-xs font-bold text-slate-500">{stats.unit}</span>
                <span
                  className={`ml-auto text-[10px] font-extrabold px-2 py-0.5 rounded-full ${
                    stats.interpretation === 'HIGH' || stats.interpretation === 'ABNORMAL'
                      ? 'bg-rose-100 text-rose-800 border border-rose-300'
                      : stats.interpretation === 'LOW'
                      ? 'bg-amber-100 text-amber-800 border border-amber-300'
                      : 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                  }`}
                >
                  {stats.interpretation}
                </span>
              </div>
            </div>

            {/* Delta vs Previous Test */}
            <div className="space-y-1">
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                Trajectory & Change
              </span>
              <div className="flex items-center gap-1.5 pt-0.5">
                {stats.delta !== null ? (
                  <>
                    {stats.delta > 0 ? (
                      <span className="flex items-center gap-1 font-bold text-xs text-rose-700 bg-rose-50 px-2 py-1 rounded-lg border border-rose-200">
                        <ArrowUpRight className="w-3.5 h-3.5" />
                        +{stats.delta} {stats.unit} ({stats.deltaPct}%)
                      </span>
                    ) : stats.delta < 0 ? (
                      <span className="flex items-center gap-1 font-bold text-xs text-emerald-700 bg-emerald-50 px-2 py-1 rounded-lg border border-emerald-200">
                        <ArrowDownRight className="w-3.5 h-3.5" />
                        {stats.delta} {stats.unit} ({stats.deltaPct}%)
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 font-bold text-xs text-slate-700 bg-slate-100 px-2 py-1 rounded-lg">
                        <Minus className="w-3.5 h-3.5" />
                        {t.observations.trendStable}
                      </span>
                    )}
                    <span className="text-[10px] text-slate-400">vs previous</span>
                  </>
                ) : (
                  <span className="text-xs text-slate-400 italic">Baseline record</span>
                )}
              </div>
            </div>

            {/* Target Reference Interval */}
            <div className="space-y-1">
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                {t.observations.refInterval}
              </span>
              <div className="font-mono text-xs font-bold text-slate-800 pt-0.5">
                {stats.referenceRange || (stats.refLow !== undefined && stats.refHigh !== undefined ? `${stats.refLow} - ${stats.refHigh} ${stats.unit}` : 'Standard lab interval')}
              </div>
              <span className="text-[10px] text-emerald-700 font-medium flex items-center gap-1">
                <CheckCircle className="w-3 h-3 text-emerald-600" />
                Target healthy safe band
              </span>
            </div>

            {/* Range Gauge Bar */}
            <div className="space-y-1">
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                Biomarker Zone Gauge
              </span>
              <div className="pt-1.5 space-y-1">
                <div className="relative h-2.5 bg-slate-200 rounded-full overflow-hidden flex">
                  {/* Low Zone */}
                  <div className="w-1/4 bg-amber-300" title="Low zone" />
                  {/* Normal Zone */}
                  <div className="w-2/4 bg-emerald-500" title="Normal healthy zone" />
                  {/* High Zone */}
                  <div className="w-1/4 bg-rose-400" title="High / Abnormal zone" />
                </div>
                <div className="flex justify-between text-[9px] font-mono text-slate-400">
                  <span>Low</span>
                  <span className="text-emerald-700 font-bold">Optimal Range</span>
                  <span>High</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* The Graphical Chart */}
        {currentTrend && chartDataPoints.length > 0 ? (
          <div className="space-y-2">
            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                {chartType === 'area' ? (
                  <AreaChart data={chartDataPoints} margin={{ top: 20, right: 30, left: 10, bottom: 20 }}>
                    <defs>
                      <linearGradient id="colorObs" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#059669" stopOpacity={0.4} />
                        <stop offset="95%" stopColor="#059669" stopOpacity={0.0} />
                      </linearGradient>
                      <linearGradient id="normalBand" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#10b981" stopOpacity={0.12} />
                        <stop offset="100%" stopColor="#10b981" stopOpacity={0.08} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                    <XAxis
                      dataKey="date"
                      tick={{ fontSize: 11, fill: '#64748b' }}
                      tickLine={false}
                      axisLine={{ stroke: '#e2e8f0' }}
                    />
                    <YAxis
                      tick={{ fontSize: 11, fill: '#64748b' }}
                      tickLine={false}
                      axisLine={{ stroke: '#e2e8f0' }}
                      unit={` ${currentTrend.unit}`}
                      domain={['auto', 'auto']}
                    />
                    {/* Normal Safe Range Shaded Area */}
                    {stats?.refLow !== undefined && stats?.refHigh !== undefined && (
                      <ReferenceArea
                        y1={stats.refLow}
                        y2={stats.refHigh}
                        fill="url(#normalBand)"
                        stroke="#10b981"
                        strokeDasharray="2 2"
                        strokeOpacity={0.3}
                      />
                    )}
                    {stats?.refHigh !== undefined && (
                      <ReferenceLine
                        y={stats.refHigh}
                        stroke="#f43f5e"
                        strokeDasharray="3 3"
                        strokeWidth={1.5}
                        label={{
                          value: `Max: ${stats.refHigh}`,
                          position: 'top',
                          fill: '#f43f5e',
                          fontSize: 10,
                        }}
                      />
                    )}
                    {stats?.refLow !== undefined && (
                      <ReferenceLine
                        y={stats.refLow}
                        stroke="#f59e0b"
                        strokeDasharray="3 3"
                        strokeWidth={1.5}
                        label={{
                          value: `Min: ${stats.refLow}`,
                          position: 'bottom',
                          fill: '#f59e0b',
                          fontSize: 10,
                        }}
                      />
                    )}
                    <Tooltip
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          const pt = payload[0].payload;
                          const isHigh = pt.interpretation === 'HIGH';
                          const isAbnormal = pt.interpretation === 'ABNORMAL' || isHigh;
                          return (
                            <div className="bg-slate-900/95 backdrop-blur-md text-white p-3.5 rounded-xl text-xs shadow-xl space-y-1.5 border border-slate-800 max-w-xs animate-scale-in">
                              <div className="flex items-center justify-between gap-2 border-b border-slate-800 pb-1.5">
                                <span className="font-bold text-emerald-400 flex items-center gap-1">
                                  <Calendar className="w-3 h-3" />
                                  {pt.date}
                                </span>
                                <span
                                  className={`text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded ${
                                    isHigh
                                      ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                                      : isAbnormal
                                      ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                                      : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                                  }`}
                                >
                                  {pt.interpretation}
                                </span>
                              </div>
                              <div className="text-slate-200 flex items-baseline justify-between pt-1">
                                <span className="text-slate-400">Measurement:</span>
                                <span className="font-extrabold text-white text-sm">
                                  {pt.value} {pt.unit}
                                </span>
                              </div>
                              {pt.referenceRange && (
                                <div className="text-slate-400 text-[11px] flex items-center justify-between">
                                  <span>Safe Range:</span>
                                  <span className="font-mono text-slate-300">{pt.referenceRange}</span>
                                </div>
                              )}
                              <div className="text-[10px] text-slate-400 pt-1 border-t border-slate-800 flex items-center justify-between">
                                <span className="truncate max-w-[160px]">Source: {pt.documentName}</span>
                                <span className="font-mono text-emerald-400">Page {pt.pageNumber}</span>
                              </div>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <Area
                      type="monotone"
                      dataKey="value"
                      stroke="#059669"
                      strokeWidth={3}
                      fillOpacity={1}
                      fill="url(#colorObs)"
                      dot={renderCustomDot}
                      activeDot={{ r: 7, fill: '#059669', stroke: '#ffffff', strokeWidth: 2 }}
                    />
                  </AreaChart>
                ) : chartType === 'line' ? (
                  <LineChart data={chartDataPoints} margin={{ top: 20, right: 30, left: 10, bottom: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                    <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} unit={` ${currentTrend.unit}`} />
                    <Tooltip />
                    {stats?.refHigh !== undefined && (
                      <ReferenceLine y={stats.refHigh} stroke="#f43f5e" strokeDasharray="3 3" />
                    )}
                    {stats?.refLow !== undefined && (
                      <ReferenceLine y={stats.refLow} stroke="#f59e0b" strokeDasharray="3 3" />
                    )}
                    <Line
                      type="monotone"
                      dataKey="value"
                      stroke="#059669"
                      strokeWidth={3}
                      dot={renderCustomDot}
                    />
                  </LineChart>
                ) : (
                  <BarChart data={chartDataPoints} margin={{ top: 20, right: 30, left: 10, bottom: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                    <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} unit={` ${currentTrend.unit}`} />
                    <Tooltip />
                    <Bar dataKey="value" fill="#059669" radius={[6, 6, 0, 0]} />
                  </BarChart>
                )}
              </ResponsiveContainer>
            </div>

            <div className="flex flex-wrap items-center justify-between text-[11px] text-slate-500 pt-2 px-1 border-t border-slate-100">
              <div className="flex items-center gap-4">
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span> Normal Reading
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-rose-500"></span> High / Flagged Reading
                </span>
                {stats?.refLow !== undefined && stats?.refHigh !== undefined && (
                  <span className="flex items-center gap-1.5">
                    <span className="w-3 h-2 bg-emerald-500/20 border border-emerald-500/50 rounded-xs"></span> Target Healthy Band
                  </span>
                )}
              </div>
              <span className="text-[10px] text-slate-400">
                Click any dot to see source report details
              </span>
            </div>
          </div>
        ) : (
          <div className="p-12 text-center text-xs text-slate-400 space-y-2">
            <Activity className="w-8 h-8 text-slate-300 mx-auto" />
            <p className="font-semibold text-slate-600">No numeric longitudinal trends recorded yet.</p>
            <p className="text-[11px] text-slate-400">
              Upload bloodwork, lipid panels, or metabolic reports to automatically populate historical trends.
            </p>
          </div>
        )}
      </div>

      {/* Clinical Meaning & Educational Guidance Card */}
      {clinicalInfo && (
        <div className="bg-gradient-to-br from-teal-50/60 to-emerald-50/60 border border-emerald-200/80 rounded-2xl p-5 shadow-xs">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-xs">
              <HelpCircle className="w-5 h-5" />
            </div>
            <div className="space-y-3 flex-1">
              <div>
                <h3 className="text-sm font-bold text-emerald-950 flex items-center gap-2">
                  Clinical Meaning: {selectedTest}
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-200/80 text-emerald-900 uppercase">
                    Educational Guidance
                  </span>
                </h3>
                <p className="text-xs text-emerald-900/90 mt-1 leading-relaxed">
                  {clinicalInfo.description}
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs bg-white/70 p-3.5 rounded-xl border border-emerald-100">
                <div>
                  <span className="font-bold text-emerald-950 block mb-0.5">Why it matters:</span>
                  <p className="text-slate-600 leading-relaxed text-[11px]">{clinicalInfo.importance}</p>
                </div>
                <div>
                  <span className="font-bold text-emerald-950 block mb-0.5">Standard Target Range:</span>
                  <p className="text-emerald-800 font-mono text-[11px] font-semibold">{clinicalInfo.targetRange}</p>
                </div>
              </div>

              {/* Questions for Doctor */}
              <div>
                <span className="text-xs font-bold text-emerald-950 block mb-1.5">
                  Suggested Questions for Your Doctor Regarding This Biomarker:
                </span>
                <div className="space-y-1.5">
                  {clinicalInfo.questionsForDoctor.map((q, idx) => (
                    <div key={idx} className="flex items-center gap-2 text-xs text-emerald-900 bg-white/50 p-2 rounded-lg border border-emerald-100">
                      <Sparkles className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      <span>{q}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Observations Table */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-50/50">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-emerald-600" />
            <h2 className="text-sm font-bold text-slate-800">
              {t.observations.allObservations} ({observations.length})
            </h2>
          </div>

          <div className="flex items-center gap-2.5 w-full sm:w-auto">
            <div className="relative w-full sm:w-64">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder={t.observations.searchPlaceholder}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 border border-slate-200 rounded-xl text-xs bg-white outline-none focus:border-emerald-500 shadow-2xs"
              />
            </div>

            <button
              onClick={() => setAbnormalOnly(!abnormalOnly)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold shrink-0 transition-all ${
                abnormalOnly
                  ? 'bg-rose-100 text-rose-800 border border-rose-300 shadow-2xs'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              {t.observations.abnormalOnly}
            </button>
          </div>
        </div>

        {loading ? (
          <div className="p-10 text-center text-xs text-slate-500">{t.common.loading}</div>
        ) : observations.length === 0 ? (
          <div className="p-10 text-center text-xs text-slate-400">
            No laboratory observations found matching your search.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/80 text-slate-500 uppercase tracking-wider text-[10px] font-bold border-b border-slate-200">
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
                {observations.map((obs) => {
                  const isHigh = obs.interpretation === 'HIGH';
                  const isAbnormal = obs.interpretation === 'ABNORMAL' || isHigh;
                  const isLow = obs.interpretation === 'LOW';

                  return (
                    <tr
                      key={obs._id}
                      className="hover:bg-slate-50/80 transition-colors cursor-pointer"
                      onClick={() => setSelectedTest(obs.testName)}
                    >
                      <td className="py-3 px-4 font-bold text-slate-900 flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                        {obs.testName}
                      </td>
                      <td className="py-3 px-4 font-mono font-black text-slate-900">
                        {obs.valueString}{' '}
                        <span className="font-normal text-slate-500 text-[11px]">{obs.unit}</span>
                      </td>
                      <td className="py-3 px-4 font-mono text-slate-600">
                        {obs.referenceRangeString || 'N/A'}
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full font-bold text-[10px] ${
                            isHigh
                              ? 'bg-rose-100 text-rose-800 border border-rose-200'
                              : isLow
                              ? 'bg-amber-100 text-amber-800 border border-amber-200'
                              : isAbnormal
                              ? 'bg-rose-100 text-rose-800 border border-rose-200'
                              : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                          }`}
                        >
                          {isHigh ? (
                            <ArrowUpRight className="w-3 h-3 text-rose-600" />
                          ) : isLow ? (
                            <ArrowDownRight className="w-3 h-3 text-amber-600" />
                          ) : (
                            <CheckCircle className="w-3 h-3 text-emerald-600" />
                          )}
                          {obs.interpretation}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-slate-600 font-medium">
                        {new Date(obs.observationDate).toLocaleDateString()}
                      </td>
                      <td className="py-3 px-4 text-slate-500 truncate max-w-xs">
                        {obs.sourceDocumentId?._id ? (
                          <Link
                            to={`/documents?preview=${obs.sourceDocumentId._id}&page=${obs.pageNumber || 1}`}
                            onClick={(e) => e.stopPropagation()}
                            className="text-emerald-700 hover:text-emerald-800 hover:underline font-semibold inline-flex items-center gap-1.5 transition-colors"
                            title="Open original scan"
                          >
                            <Eye className="w-3.5 h-3.5 text-emerald-600" />
                            <span>{obs.sourceDocumentId.originalName}</span>
                            <span className="text-slate-400 font-mono text-[10px]">(p.{obs.pageNumber})</span>
                          </Link>
                        ) : (
                          <span>{obs.sourceDocumentId?.originalName || 'Report'} (p.{obs.pageNumber})</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
