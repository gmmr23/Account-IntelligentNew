import React from 'react';
import { 
  BarChart3, 
  TrendingUp, 
  Clock, 
  Send, 
  Sparkles, 
  ArrowUpRight, 
  Building2, 
  CheckCircle,
  AlertCircle
} from 'lucide-react';
import { DashboardStats, ResearchHistoryItem } from '../types';

interface DashboardProps {
  stats: DashboardStats;
  onSelectReport: (item: ResearchHistoryItem) => void;
}

export default function Dashboard({ stats, onSelectReport }: DashboardProps) {
  // Format Date beautifully
  const formatDate = (isoString: string) => {
    return new Date(isoString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  return (
    <div className="space-y-8 p-4 md:p-6 max-w-6xl mx-auto overflow-y-auto h-full">
      {/* Header Banner */}
      <div className="border-b border-slate-200 pb-5">
        <h1 className="text-xl font-bold text-slate-800 tracking-tight flex items-center gap-2">
          <BarChart3 className="text-blue-600" size={24} />
          Executive Analytics Dashboard
        </h1>
        <p className="text-xs text-slate-500 mt-0.5">
          Real-time computational footprint of active company research modules
        </p>
      </div>

      {/* Stats Cards Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1 */}
        <div className="bg-white border border-slate-200 rounded-2xl p-4 md:p-5 shadow-sm flex items-center gap-4 hover:shadow-md transition-shadow">
          <div className="bg-blue-50 text-blue-600 p-3 rounded-xl">
            <TrendingUp size={20} className="stroke-[2.5]" />
          </div>
          <div>
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest block">Total Reports</span>
            <span className="text-xl font-extrabold text-slate-800 mt-0.5 block">{stats.totalReports}</span>
          </div>
        </div>

        {/* Card 2 */}
        <div className="bg-white border border-slate-200 rounded-2xl p-4 md:p-5 shadow-sm flex items-center gap-4 hover:shadow-md transition-shadow">
          <div className="bg-amber-50 text-amber-600 p-3 rounded-xl">
            <Sparkles size={20} className="stroke-[2.5]" />
          </div>
          <div>
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest block">Research Today</span>
            <span className="text-xl font-extrabold text-slate-800 mt-0.5 block">{stats.researchToday}</span>
          </div>
        </div>

        {/* Card 3 */}
        <div className="bg-white border border-slate-200 rounded-2xl p-4 md:p-5 shadow-sm flex items-center gap-4 hover:shadow-md transition-shadow">
          <div className="bg-indigo-50 text-indigo-600 p-3 rounded-xl">
            <Clock size={20} className="stroke-[2.5]" />
          </div>
          <div>
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest block">Avg Engine Speed</span>
            <span className="text-xl font-extrabold text-slate-800 mt-0.5 block">{stats.avgProcessingTime}s</span>
          </div>
        </div>

        {/* Card 4 */}
        <div className="bg-white border border-slate-200 rounded-2xl p-4 md:p-5 shadow-sm flex items-center gap-4 hover:shadow-md transition-shadow">
          <div className="bg-emerald-50 text-emerald-600 p-3 rounded-xl">
            <Send size={20} className="stroke-[2.5]" />
          </div>
          <div>
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest block">Reports Sent</span>
            <span className="text-xl font-extrabold text-slate-800 mt-0.5 block">{stats.reportsSent}</span>
          </div>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Industry Pie Chart View */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 md:p-6 shadow-sm">
          <h3 className="text-sm font-bold text-slate-800 uppercase tracking-widest mb-4">
            Top Researched Industries
          </h3>
          
          {(() => {
            // Palette of colors used for pie sectors and legend dots
            const COLORS = ['#2563eb', '#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];
            
            // Check if stats.topIndustries has items and total count is greater than 0
            const hasRealIndustries = stats.topIndustries && stats.topIndustries.length > 0;
            const totalCount = hasRealIndustries 
              ? stats.topIndustries.reduce((sum, ind) => sum + (ind.count || 0), 0) 
              : 0;

            const industries = (hasRealIndustries && totalCount > 0)
              ? stats.topIndustries.map(ind => ({
                  name: ind.name,
                  pct: Math.round(((ind.count || 0) / totalCount) * 100),
                  count: ind.count
                }))
              : [
                  { name: 'Technology / Cloud', pct: 50, count: 0 }, 
                  { name: 'SaaS / Enterprise', pct: 30, count: 0 }, 
                  { name: 'Other / Services', pct: 20, count: 0 }
                ];

            const dominant = industries[0]?.name?.split(' ')[0] ?? 'N/A';

            // Build SVG sectors: cumulative offset as we go
            let cumulativeOffset = 0;
            const sectors = industries.map((ind, i) => {
              const dash = ind.pct;
              const gap = 100 - dash;
              const offset = -cumulativeOffset;
              cumulativeOffset += dash;
              return { ...ind, dash, gap, offset, color: COLORS[i % COLORS.length] };
            });

            return (
              <div className="flex flex-col sm:flex-row items-center gap-6">
                {/* SVG Donut */}
                <div className="relative h-32 w-32 shrink-0">
                  <svg className="w-full h-full transform -rotate-90" viewBox="0 0 42 42">
                    <circle cx="21" cy="21" r="15.915" fill="transparent" stroke="#f1f5f9" strokeWidth="6" />
                    {sectors.map((s, i) => (
                      <circle key={i} cx="21" cy="21" r="15.915" fill="transparent"
                        stroke={s.color} strokeWidth="6"
                        strokeDasharray={`${s.dash} ${s.gap}`}
                        strokeDashoffset={s.offset}
                      />
                    ))}
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-xs text-slate-400 font-sans uppercase">Dominant</span>
                    <span className="text-xs font-extrabold text-slate-800">{dominant}</span>
                  </div>
                </div>

                {/* Industry Legends */}
                <div className="space-y-2 flex-1 w-full">
                  {sectors.map((s, i) => (
                    <div key={i} className="flex items-center justify-between text-xs font-medium">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: s.color }} />
                        <span className="text-slate-600 truncate max-w-[130px]" title={s.name}>{s.name}</span>
                      </div>
                      <span className="font-extrabold text-slate-800 ml-2">
                        {s.pct}% {s.count > 0 ? `(${s.count})` : ''}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })()}
        </div>

        {/* Volume Over Time Bar Chart */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 md:p-6 shadow-sm">
          <h3 className="text-sm font-bold text-slate-800 uppercase tracking-widest mb-4">
            Research Volume Analytics
          </h3>
          
          {(() => {
            const volumeData = (stats.volumeHistory && stats.volumeHistory.length > 0)
              ? stats.volumeHistory
              : [
                  { day: 'Mon', count: 0 }, { day: 'Tue', count: 0 }, { day: 'Wed', count: 0 },
                  { day: 'Thu', count: 0 }, { day: 'Fri', count: 0 }, { day: 'Sat', count: 0 }, { day: 'Sun', count: 0 }
                ];
            const maxCount = Math.max(...volumeData.map(d => d.count), 1);
            return (
              <div className="h-32 flex items-end gap-3.5 pt-4">
                {volumeData.map((d, idx) => {
                  const heightPct = Math.round((d.count / maxCount) * 100);
                  return (
                    <div key={idx} className="flex-1 flex flex-col items-center gap-2 h-full justify-end" title={`${d.count} reports`}>
                      <div className="w-full bg-slate-50 rounded-md relative h-full flex items-end overflow-hidden">
                        <div
                          className="bg-blue-600 hover:bg-blue-700 transition-all rounded-md w-full"
                          style={{ height: `${heightPct || 4}%` }}
                        />
                      </div>
                      <span className="text-[10px] font-sans text-slate-400 font-medium">{d.day}</span>
                    </div>
                  );
                })}
              </div>
            );
          })()}
        </div>
      </div>

      {/* Recent Research Runs */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 md:p-6 shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
          <h3 className="text-sm font-bold text-slate-800 uppercase tracking-widest">
            Recent Research Sessions
          </h3>
          <span className="text-[11px] font-bold text-blue-600">System Logs</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[500px]">
            <thead>
              <tr className="border-b border-slate-100 text-[10px] text-slate-400 uppercase tracking-widest font-bold">
                <th className="py-3 px-2">Company</th>
                <th className="py-3 px-2">Focus Sector</th>
                <th className="py-3 px-2">Date</th>
                <th className="py-3 px-2">Status</th>
                <th className="py-3 px-2 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {stats.recentResearch.map((item) => (
                <tr key={item.id} className="hover:bg-slate-50/50 transition-colors text-xs">
                  <td className="py-3 px-2 font-bold text-slate-800">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-xs">
                        {item.companyName.substring(0, 2).toUpperCase()}
                      </div>
                      <div className="flex flex-col">
                        <span>{item.companyName}</span>
                        <span className="text-[10px] text-slate-400 font-normal">{item.website}</span>
                      </div>
                    </div>
                  </td>
                  <td className="py-3 px-2 text-slate-600">{item.report?.industry || 'Uncategorized'}</td>
                  <td className="py-3 px-2 text-slate-500">{formatDate(item.date)}</td>
                  <td className="py-3 px-2">
                    <span className={`inline-flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded ${
                      item.status === 'Completed'
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                        : item.status === 'Processing'
                        ? 'bg-blue-50 text-blue-700 border border-blue-100'
                        : 'bg-rose-50 text-rose-700 border border-rose-100'
                    }`}>
                      {item.status === 'Completed' ? (
                        <CheckCircle size={10} className="stroke-[2.5]" />
                      ) : (
                        <AlertCircle size={10} className="stroke-[2.5]" />
                      )}
                      {item.status}
                    </span>
                  </td>
                  <td className="py-3 px-2 text-right">
                    <button
                      onClick={() => onSelectReport(item)}
                      className="inline-flex items-center gap-1 bg-slate-50 hover:bg-blue-50 hover:text-blue-600 border border-slate-200 hover:border-blue-200 transition-colors py-1.5 px-3 rounded-lg text-[11px] font-bold text-slate-600"
                    >
                      Open Report
                      <ArrowUpRight size={12} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
