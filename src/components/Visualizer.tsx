import React, { useState, useMemo } from 'react';
import { ColumnAnalysis } from '../types';
import { aggregateData } from '../lib/sheets';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  LineChart,
  Line,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';
import { BarChart2, TrendingUp, PieChart as PieIcon, Layers, Settings, RefreshCw, Download } from 'lucide-react';

interface VisualizerProps {
  rows: Record<string, any>[];
  analyses: ColumnAnalysis[];
}

const PALETTE = [
  '#4f46e5', // indigo-600
  '#10b981', // emerald-500
  '#f59e0b', // amber-500
  '#ef4444', // red-500
  '#8b5cf6', // violet-500
  '#06b6d4', // cyan-500
  '#ec4899', // pink-500
];

export default function Visualizer({ rows, analyses }: VisualizerProps) {
  const numericColumns = useMemo(() => analyses.filter(a => a.type === 'numeric'), [analyses]);
  const categoryAndDateColumns = useMemo(
    () => analyses.filter(a => a.type === 'category' || a.type === 'date' || a.type === 'text'),
    [analyses]
  );

  // States for chart configuration
  const [chartType, setChartType] = useState<'bar' | 'line' | 'area' | 'pie'>('bar');
  const [xAxisCol, setXAxisCol] = useState<string>(() => {
    const defaultCol = categoryAndDateColumns.find(c => c.type === 'category' || c.type === 'date');
    return defaultCol ? defaultCol.name : (analyses[0]?.name || '');
  });
  const [yAxisCol, setYAxisCol] = useState<string>(() => {
    return numericColumns[0]?.name || (analyses[1]?.name || '');
  });
  const [aggregate, setAggregate] = useState<'sum' | 'avg' | 'count' | 'none'>(() => {
    const hasCategory = categoryAndDateColumns.some(c => c.type === 'category');
    return hasCategory ? 'sum' : 'none';
  });

  // Calculate aggregated data
  const chartData = useMemo(() => {
    if (!xAxisCol || !yAxisCol || rows.length === 0) return [];
    return aggregateData(rows, xAxisCol, yAxisCol, aggregate);
  }, [rows, xAxisCol, yAxisCol, aggregate]);

  // Export current chart data as CSV
  const handleExportCSV = () => {
    if (chartData.length === 0) return;
    const csvContent = [
      [xAxisCol, yAxisCol],
      ...chartData.map(d => [d.x, d.y]),
    ]
      .map(e => e.map(val => `"${String(val).replace(/"/g, '""')}"`).join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `chart_data_${xAxisCol}_vs_${yAxisCol}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-slate-900/95 text-white p-3 rounded-xl shadow-lg border border-slate-800 text-xs font-sans">
          <p className="font-semibold mb-1 text-slate-200">{label}</p>
          <p className="text-indigo-400">
            {yAxisCol}: <span className="font-mono text-white font-medium">{payload[0].value.toLocaleString()}</span>
          </p>
        </div>
      );
    }
    return null;
  };

  if (rows.length === 0) {
    return (
      <div className="bg-white p-8 rounded-2xl border border-slate-200 flex flex-col items-center justify-center min-h-[400px]">
        <RefreshCw className="w-8 h-8 text-slate-300 animate-spin mb-3" />
        <p className="text-sm text-slate-500">No data available to visualize.</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden" id="dashboard-visualizer">
      {/* Header Controls */}
      <div className="border-b border-slate-200 p-5 bg-slate-50/50 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-bold font-display text-slate-900 flex items-center gap-2">
            <BarChart2 className="w-5 h-5 text-indigo-600" />
            Interactive Data Visualizer
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">Configure dimensions, metrics, and aggregation below</p>
        </div>

        {/* Quick chart selectors */}
        <div className="flex items-center gap-1.5 bg-slate-100/80 p-1 rounded-xl self-start lg:self-auto">
          <button
            onClick={() => setChartType('bar')}
            className={`p-2 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
              chartType === 'bar' ? 'bg-white text-indigo-600 shadow-xs' : 'text-slate-600 hover:text-slate-950'
            }`}
          >
            <BarChart2 className="w-3.5 h-3.5" />
            Bar
          </button>
          <button
            onClick={() => setChartType('line')}
            className={`p-2 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
              chartType === 'line' ? 'bg-white text-indigo-600 shadow-xs' : 'text-slate-600 hover:text-slate-950'
            }`}
          >
            <TrendingUp className="w-3.5 h-3.5" />
            Line
          </button>
          <button
            onClick={() => setChartType('area')}
            className={`p-2 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
              chartType === 'area' ? 'bg-white text-indigo-600 shadow-xs' : 'text-slate-600 hover:text-slate-950'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            Area
          </button>
          <button
            onClick={() => setChartType('pie')}
            className={`p-2 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
              chartType === 'pie' ? 'bg-white text-indigo-600 shadow-xs' : 'text-slate-600 hover:text-slate-950'
            }`}
          >
            <PieIcon className="w-3.5 h-3.5" />
            Pie
          </button>
        </div>
      </div>

      {/* Selector Options Panel */}
      <div className="p-5 border-b border-slate-200 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 bg-white">
        {/* X Axis */}
        <div className="space-y-1.5">
          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block font-display">X-Axis (Dimension)</label>
          <select
            value={xAxisCol}
            onChange={(e) => setXAxisCol(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 hover:border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-700 font-sans focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all cursor-pointer"
          >
            {categoryAndDateColumns.map(col => (
              <option key={col.name} value={col.name}>
                {col.name} ({col.type})
              </option>
            ))}
            {/* Fallback to show other columns in case */}
            {analyses
              .filter(col => !categoryAndDateColumns.some(c => c.name === col.name))
              .map(col => (
                <option key={col.name} value={col.name}>
                  {col.name} (raw)
                </option>
              ))}
          </select>
        </div>

        {/* Y Axis */}
        <div className="space-y-1.5">
          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block font-display">Y-Axis (Metric)</label>
          <select
            value={yAxisCol}
            onChange={(e) => setYAxisCol(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 hover:border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-700 font-sans focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all cursor-pointer"
          >
            {numericColumns.map(col => (
              <option key={col.name} value={col.name}>
                {col.name}
              </option>
            ))}
            {analyses
              .filter(col => !numericColumns.some(c => c.name === col.name))
              .map(col => (
                <option key={col.name} value={col.name}>
                  {col.name} (non-numeric)
                </option>
              ))}
          </select>
        </div>

        {/* Aggregation */}
        <div className="space-y-1.5">
          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block font-display">Aggregation Method</label>
          <select
            value={aggregate}
            onChange={(e) => setAggregate(e.target.value as any)}
            className="w-full bg-slate-50 border border-slate-200 hover:border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-700 font-sans focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all cursor-pointer"
          >
            <option value="none">No Aggregation (Raw Rows)</option>
            <option value="sum">Sum of Y Values</option>
            <option value="avg">Average of Y Values</option>
            <option value="count">Count of Records</option>
          </select>
        </div>

        {/* Export Data Button */}
        <div className="flex items-end">
          <button
            onClick={handleExportCSV}
            className="w-full py-2 border border-slate-200 hover:border-indigo-200 hover:bg-indigo-50/20 text-slate-700 hover:text-indigo-600 font-semibold text-xs rounded-xl flex items-center justify-center gap-2 transition-all cursor-pointer"
          >
            <Download className="w-4 h-4" />
            Export CSV
          </button>
        </div>
      </div>

      {/* Main Chart Area */}
      <div className="p-6 bg-white min-h-[380px] flex items-center justify-center">
        {chartData.length === 0 ? (
          <div className="text-center text-slate-400 py-10">
            <p className="text-sm">Please select a valid Dimension and Metric to generate the visualization.</p>
          </div>
        ) : (
          <div className="w-full h-[350px]">
            <ResponsiveContainer width="100%" height="100%">
              {chartType === 'bar' ? (
                <BarChart data={chartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                  <XAxis 
                    dataKey="x" 
                    stroke="#94a3b8" 
                    fontSize={11} 
                    tickLine={false} 
                    axisLine={false}
                    dy={8}
                  />
                  <YAxis 
                    stroke="#94a3b8" 
                    fontSize={11} 
                    tickLine={false} 
                    axisLine={false}
                    dx={-4}
                  />
                  <Tooltip content={<CustomTooltip />} cursor={{ fill: '#f8fafc' }} />
                  <Bar dataKey="y" fill="#4f46e5" radius={[6, 6, 0, 0]} maxBarSize={50}>
                    {chartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={PALETTE[index % PALETTE.length]} />
                    ))}
                  </Bar>
                </BarChart>
              ) : chartType === 'line' ? (
                <LineChart data={chartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                  <XAxis 
                    dataKey="x" 
                    stroke="#94a3b8" 
                    fontSize={11} 
                    tickLine={false} 
                    axisLine={false}
                    dy={8}
                  />
                  <YAxis 
                    stroke="#94a3b8" 
                    fontSize={11} 
                    tickLine={false} 
                    axisLine={false}
                    dx={-4}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Line 
                    type="monotone" 
                    dataKey="y" 
                    stroke="#4f46e5" 
                    strokeWidth={2.5} 
                    dot={{ stroke: '#4f46e5', strokeWidth: 2, r: 4, fill: '#fff' }}
                    activeDot={{ r: 6 }}
                  />
                </LineChart>
              ) : chartType === 'area' ? (
                <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorArea" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.2}/>
                      <stop offset="95%" stopColor="#4f46e5" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                  <XAxis 
                    dataKey="x" 
                    stroke="#94a3b8" 
                    fontSize={11} 
                    tickLine={false} 
                    axisLine={false}
                    dy={8}
                  />
                  <YAxis 
                    stroke="#94a3b8" 
                    fontSize={11} 
                    tickLine={false} 
                    axisLine={false}
                    dx={-4}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Area 
                    type="monotone" 
                    dataKey="y" 
                    stroke="#4f46e5" 
                    strokeWidth={2} 
                    fillOpacity={1} 
                    fill="url(#colorArea)" 
                  />
                </AreaChart>
              ) : (
                <PieChart>
                  <Pie
                    data={chartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={3}
                    dataKey="y"
                    nameKey="x"
                    label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                  >
                    {chartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={PALETTE[index % PALETTE.length]} />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                </PieChart>
              )}
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </div>
  );
}
