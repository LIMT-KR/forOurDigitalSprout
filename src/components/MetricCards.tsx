import React from 'react';
import { ColumnAnalysis } from '../types';
import { Sigma, Percent, Landmark, Activity, Layers } from 'lucide-react';

interface MetricCardsProps {
  rows: Record<string, any>[];
  analyses: ColumnAnalysis[];
}

export default function MetricCards({ rows, analyses }: MetricCardsProps) {
  const numericColumns = analyses.filter(a => a.type === 'numeric');

  // If there are no numeric columns, show general info
  if (numericColumns.length === 0) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6" id="dashboard-metric-cards">
        <div className="bg-white p-6 rounded-2xl shadow-xs border border-slate-200 flex items-center space-x-4">
          <div className="p-3 bg-slate-50 rounded-xl text-indigo-600">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs font-bold text-slate-400 uppercase tracking-wider font-display">Total Rows</div>
            <div className="text-2xl font-bold font-display text-slate-900 mt-1">{rows.length}</div>
          </div>
        </div>
        <div className="bg-white p-6 rounded-2xl shadow-xs border border-slate-200 flex items-center space-x-4">
          <div className="p-3 bg-slate-50 rounded-xl text-amber-600">
            <Activity className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs font-bold text-slate-400 uppercase tracking-wider font-display">Total Columns</div>
            <div className="text-2xl font-bold font-display text-slate-900 mt-1">{analyses.length}</div>
          </div>
        </div>
        <div className="bg-white p-6 rounded-2xl shadow-xs border border-slate-200 flex items-center space-x-4">
          <div className="p-3 bg-slate-50 rounded-xl text-emerald-600">
            <Percent className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs font-bold text-slate-400 uppercase tracking-wider font-display">Detected Metrics</div>
            <div className="text-2xl font-bold font-display text-slate-900 mt-1">None</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6" id="dashboard-metric-cards">
      {/* Total Rows Card */}
      <div className="bg-white p-5 rounded-2xl shadow-xs border border-slate-200 hover:border-slate-300 transition-all flex items-center space-x-4">
        <div className="p-3 bg-slate-50 rounded-xl text-slate-600 shrink-0">
          <Layers className="w-5 h-5" />
        </div>
        <div className="min-w-0">
          <div className="text-xs font-bold text-slate-400 uppercase tracking-wider truncate font-display">Total Rows</div>
          <div className="text-2xl font-bold font-display text-slate-900 mt-0.5">{rows.length}</div>
        </div>
      </div>

      {/* Top Numeric Metrics */}
      {numericColumns.slice(0, 3).map((col, idx) => {
        const values = rows.map(r => r[col.name]).filter(v => typeof v === 'number') as number[];
        const sum = values.reduce((a, b) => a + b, 0);
        const avg = values.length > 0 ? sum / values.length : 0;
        
        // Pick colors for variety
        const colors = [
          { bg: 'bg-emerald-50/50', text: 'text-emerald-600', icon: Sigma },
          { bg: 'bg-indigo-50/50', text: 'text-indigo-600', icon: Landmark },
          { bg: 'bg-amber-50/50', text: 'text-amber-600', icon: Activity },
        ];
        const style = colors[idx % colors.length];
        const IconComponent = style.icon;

        return (
          <div 
            key={col.name} 
            className="bg-white p-5 rounded-2xl shadow-xs border border-slate-200 hover:border-slate-300 transition-all flex items-center space-x-4"
          >
            <div className={`p-3 ${style.bg} ${style.text} rounded-xl shrink-0`}>
              <IconComponent className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="text-xs font-bold text-slate-400 uppercase tracking-wider truncate font-display" title={col.name}>
                Sum: {col.name}
              </div>
              <div className="text-2xl font-bold font-display text-slate-900 mt-0.5 truncate">
                {sum >= 1000000 ? `${(sum / 1000000).toFixed(1)}M` : sum.toLocaleString(undefined, { maximumFractionDigits: 1 })}
              </div>
              <div className="text-[10px] text-slate-400 truncate mt-0.5 font-medium">
                Avg: {avg.toLocaleString(undefined, { maximumFractionDigits: 1 })}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
