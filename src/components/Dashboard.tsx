import React, { useState, useEffect } from 'react';
import { 
  BarChart3, 
  Clock, 
  ArrowUpRight, 
  CheckCircle,
  AlertCircle,
  Calendar,
  RefreshCw,
  Target,
  Search,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { DashboardStats, ResearchHistoryItem, ResearchReport } from '../types';

interface DashboardProps {
  stats: DashboardStats;
  onSelectReport: (item: ResearchHistoryItem) => void;
}

interface TalkingPointsProps {
  report: ResearchReport;
}

function TalkingPoints({ report }: TalkingPointsProps) {
  const points: string[] = [];

  // 1. Most recent news item
  if (report.recentNews && report.recentNews.length > 0 && report.recentNews[0].title) {
    points.push(`Recent News: "${report.recentNews[0].title}"`);
  }

  // 2. One strategic initiative
  if (report.strategicInitiatives && report.strategicInitiatives.length > 0 && report.strategicInitiatives[0].title) {
    points.push(`Strategic Initiative: Focus on "${report.strategicInitiatives[0].title}"`);
  }

  // 3. Most recently added leadership member
  if (report.leadership && report.leadership.length > 0) {
    const latestLeader = report.leadership[report.leadership.length - 1];
    if (latestLeader.name) {
      points.push(`New ${latestLeader.role || 'Leadership Member'}: ${latestLeader.name}`);
    }
  }

  if (points.length === 0) {
    return (
      <div className="text-[11px] text-slate-400 italic">
        No specific talking points found.
      </div>
    );
  }

  return (
    <div className="bg-slate-50 border border-slate-200/60 rounded-xl p-3.5 space-y-2 shadow-inner animate-fadeIn">
      <span className="text-[9px] font-bold text-blue-600 uppercase tracking-widest block">Suggested Talking Points</span>
      <ul className="space-y-1.5 text-[11px] text-slate-600 list-disc list-inside">
        {points.map((pt, i) => (
          <li key={i} className="leading-relaxed">
            <span className="font-semibold text-slate-700">{pt.split(': ')[0]}:</span>
            <span className="text-slate-600"> {pt.split(': ').slice(1).join(': ')}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function Dashboard({ stats, onSelectReport }: DashboardProps) {
  const [activeSection, setActiveSection] = useState<'prep' | 'analytics'>('prep');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedRows, setExpandedRows] = useState<Record<string, boolean>>({});

  // Format Date beautifully
  const formatDate = (isoString: string) => {
    return new Date(isoString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  // Filter items client-side by company name or industry
  const filteredItems = stats.recentResearch.filter(item => {
    const companyMatches = item.companyName.toLowerCase().includes(searchQuery.toLowerCase());
    const industryMatches = (item.report?.industry || '').toLowerCase().includes(searchQuery.toLowerCase());
    return companyMatches || industryMatches;
  });

  // Sort: meetingDate ascending (soonest first), fallback to date descending
  const sortedItems = [...filteredItems].sort((a, b) => {
    if (a.meetingDate && b.meetingDate) {
      return new Date(a.meetingDate).getTime() - new Date(b.meetingDate).getTime();
    }
    if (a.meetingDate) return -1;
    if (b.meetingDate) return 1;
    return new Date(b.date).getTime() - new Date(a.date).getTime();
  });

  // Pre-expand the top 2 upcoming-meeting rows by default
  useEffect(() => {
    const upcomingMeetings = sortedItems.filter(item => {
      if (!item.meetingDate) return false;
      const meetDate = new Date(item.meetingDate);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      return meetDate >= today;
    }).slice(0, 2);

    const initialExpanded: Record<string, boolean> = {};
    upcomingMeetings.forEach(item => {
      initialExpanded[item.id] = true;
    });
    setExpandedRows(initialExpanded);
  }, [stats.recentResearch, searchQuery]);

  const toggleRow = (id: string) => {
    setExpandedRows(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  // Determine dynamic Next Step badges
  const getNextStepInfo = (item: ResearchHistoryItem) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    if (item.meetingDate) {
      const meetDate = new Date(item.meetingDate);
      if (meetDate > today) {
        const diffTime = meetDate.getTime() - today.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        return {
          text: `Meeting in ${diffDays} day${diffDays === 1 ? '' : 's'}`,
          style: 'text-blue-600 bg-blue-50/50 border-blue-100 font-bold'
        };
      }
    }
    
    const refDateStr = item.lastRefreshed || item.date;
    if (refDateStr) {
      const refDate = new Date(refDateStr);
      const diffTime = today.getTime() - refDate.getTime();
      const diffDays = diffTime / (1000 * 60 * 60 * 24);
      if (diffDays > 7) {
        return {
          text: "⚠ Refresh before meeting",
          style: "text-amber-700 bg-amber-50 border-amber-100 font-bold animate-pulse"
        };
      }
    }
    
    return { text: "—", style: "text-slate-400 bg-slate-50 border-slate-100" };
  };

  // Get dynamic Hook text
  const getHookText = (item: ResearchHistoryItem) => {
    const report = item.report;
    if (!report) return "No recent signal";
    
    if (report.recentNews && report.recentNews.length > 0 && report.recentNews[0].title) {
      const title = report.recentNews[0].title;
      return title.length > 40 ? `${title.substring(0, 40)}...` : title;
    }
    
    if (report.strategicInitiatives && report.strategicInitiatives.length > 0 && report.strategicInitiatives[0].title) {
      const title = report.strategicInitiatives[0].title;
      return title.length > 40 ? `${title.substring(0, 40)}...` : title;
    }
    
    return "No recent signal";
  };

  // Render ICP Fit Badge next to Company Name
  const renderFitBadge = (fitScore?: number) => {
    if (fitScore === undefined) return null;
    if (fitScore >= 70) {
      return (
        <span className="inline-flex items-center text-[9px] font-extrabold px-1.5 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-100 shrink-0">
          High Fit
        </span>
      );
    }
    if (fitScore >= 40) {
      return (
        <span className="inline-flex items-center text-[9px] font-extrabold px-1.5 py-0.5 rounded-md bg-amber-50 text-amber-700 border border-amber-100 shrink-0">
          Medium Fit
        </span>
      );
    }
    return (
      <span className="inline-flex items-center text-[9px] font-extrabold px-1.5 py-0.5 rounded-md bg-slate-50 text-slate-500 border border-slate-200 shrink-0">
        Low Fit
      </span>
    );
  };

  return (
    <div className="space-y-8 p-4 md:p-6 max-w-6xl mx-auto overflow-y-auto h-full">
      {/* Header Banner */}
      <div className="border-b border-slate-200 pb-5">
        <h1 className="text-xl font-bold text-slate-800 tracking-tight flex items-center gap-2">
          <BarChart3 className="text-blue-600" size={24} />
          Sales Prep Dashboard
        </h1>
        <p className="text-xs text-slate-500 mt-0.5">
          Real-time account research and meeting preparation tracker
        </p>
      </div>

      {/* Stats Cards Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Meetings This Week */}
        <div className="bg-white border border-slate-200 rounded-2xl p-4 md:p-5 shadow-sm flex items-center gap-4 hover:shadow-md transition-shadow">
          <div className="bg-blue-50 text-blue-600 p-3 rounded-xl shrink-0">
            <Calendar size={20} className="stroke-[2.5]" />
          </div>
          <div>
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest block">Meetings This Week</span>
            <span className="text-xl font-extrabold text-slate-800 mt-0.5 block">{stats.meetingsThisWeek ?? 0}</span>
          </div>
        </div>

        {/* Card 2: Reports Needing Refresh */}
        <div className="bg-white border border-slate-200 rounded-2xl p-4 md:p-5 shadow-sm flex items-center gap-4 hover:shadow-md transition-shadow">
          <div className="bg-amber-50 text-amber-600 p-3 rounded-xl shrink-0">
            <RefreshCw size={20} className="stroke-[2.5]" />
          </div>
          <div>
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest block">Reports Needing Refresh</span>
            <span className="text-xl font-extrabold text-slate-800 mt-0.5 block">{stats.reportsNeedingRefresh ?? 0}</span>
          </div>
        </div>

        {/* Card 3: High-Fit Leads */}
        <div className="bg-white border border-slate-200 rounded-2xl p-4 md:p-5 shadow-sm flex items-center gap-4 hover:shadow-md transition-shadow">
          <div className="bg-emerald-50 text-emerald-600 p-3 rounded-xl shrink-0">
            <Target size={20} className="stroke-[2.5]" />
          </div>
          <div>
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest block">High-Fit Leads</span>
            <span className="text-xl font-extrabold text-slate-800 mt-0.5 block">{stats.highFitLeads ?? 0}</span>
          </div>
        </div>

        {/* Card 4: Follow-ups Due */}
        <div className="bg-white border border-slate-200 rounded-2xl p-4 md:p-5 shadow-sm flex items-center gap-4 hover:shadow-md transition-shadow">
          <div className="bg-indigo-50 text-indigo-600 p-3 rounded-xl shrink-0">
            <Clock size={20} className="stroke-[2.5]" />
          </div>
          <div>
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest block">Follow-ups Due</span>
            <span className="text-xl font-extrabold text-slate-800 mt-0.5 block">{stats.followUpsDue ?? 0}</span>
          </div>
        </div>
      </div>

      {/* Toggle View Tabs */}
      <div className="flex justify-start border-b border-slate-200/80 pb-px">
        <button
          onClick={() => setActiveSection('prep')}
          className={`pb-2.5 px-6 text-[10px] font-bold uppercase tracking-wider border-b-2 transition-all duration-200 ${
            activeSection === 'prep'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-400 hover:text-slate-600'
          }`}
        >
          My Prep
        </button>
        <button
          onClick={() => setActiveSection('analytics')}
          className={`pb-2.5 px-6 text-[10px] font-bold uppercase tracking-wider border-b-2 transition-all duration-200 flex items-center gap-1.5 ${
            activeSection === 'analytics'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-400 hover:text-slate-600'
          }`}
        >
          Team Analytics
          <span className="bg-slate-100 text-slate-500 text-[8px] font-bold px-1.5 py-0.5 rounded-full">Manager</span>
        </button>
      </div>

      {/* Collapsible Analytics Charts */}
      {activeSection === 'analytics' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-fadeIn">
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
      )}

      {/* Recent Research Runs */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 md:p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4 mb-4">
          <div>
            <h3 className="text-sm font-bold text-slate-800 uppercase tracking-widest">
              Recent Research Sessions
            </h3>
            <p className="text-[10px] text-slate-400 mt-0.5">Click a row to expand suggested sales hooks & notes</p>
          </div>
          
          {/* Search Input */}
          <div className="relative max-w-xs w-full">
            <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-slate-400">
              <Search size={14} />
            </span>
            <input
              type="text"
              placeholder="Search company or industry..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-1.5 text-xs text-slate-700 placeholder-slate-400 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 transition-all shadow-inner"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[750px]">
            <thead>
              <tr className="border-b border-slate-100 text-[10px] text-slate-400 uppercase tracking-widest font-bold">
                <th className="py-3 px-2 w-[8px]"></th>
                <th className="py-3 px-2">Company</th>
                <th className="py-3 px-2">Focus Sector</th>
                <th className="py-3 px-2">Conversation Hook</th>
                <th className="py-3 px-2">Date</th>
                <th className="py-3 px-2">Next Step</th>
                <th className="py-3 px-2">Status</th>
                <th className="py-3 px-2 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {sortedItems.map((item) => {
                const nextStep = getNextStepInfo(item);
                const hook = getHookText(item);
                const isExpanded = !!expandedRows[item.id];
                
                return (
                  <React.Fragment key={item.id}>
                    <tr 
                      className={`hover:bg-slate-50/50 transition-colors text-xs cursor-pointer ${isExpanded ? 'bg-slate-50/20' : ''}`}
                      onClick={() => toggleRow(item.id)}
                    >
                      <td className="py-3 px-2">
                        <button className="text-slate-400 hover:text-slate-600 transition-colors shrink-0">
                          {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                        </button>
                      </td>
                      <td className="py-3 px-2 font-bold text-slate-800">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-xs shrink-0">
                            {item.companyName.substring(0, 2).toUpperCase()}
                          </div>
                          <div className="flex flex-col min-w-0">
                            <span className="truncate flex items-center gap-1.5">
                              {item.companyName}
                              {renderFitBadge(item.fitScore)}
                            </span>
                            <span className="text-[10px] text-slate-400 font-normal truncate">{item.website}</span>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-2 text-slate-600 max-w-[120px] truncate">
                        {item.report?.industry || 'Uncategorized'}
                      </td>
                      <td className="py-3 px-2 text-slate-500 max-w-[160px] truncate font-medium" title={hook}>
                        {hook}
                      </td>
                      <td className="py-3 px-2 text-slate-500 whitespace-nowrap">
                        {item.meetingDate ? formatDate(item.meetingDate) : formatDate(item.date)}
                      </td>
                      <td className="py-3 px-2">
                        <span className={`inline-flex items-center text-[10px] px-2.5 py-0.5 rounded-md border ${nextStep.style}`}>
                          {nextStep.text}
                        </span>
                      </td>
                      <td className="py-3 px-2 whitespace-nowrap">
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
                      <td className="py-3 px-2 text-right" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => onSelectReport(item)}
                          className="inline-flex items-center gap-1 bg-slate-50 hover:bg-blue-50 hover:text-blue-600 border border-slate-200 hover:border-blue-200 transition-colors py-1.5 px-3 rounded-lg text-[11px] font-bold text-slate-600 shadow-sm"
                        >
                          Open Report
                          <ArrowUpRight size={12} />
                        </button>
                      </td>
                    </tr>
                    
                    {/* Collapsible Panel for Talking Points and Rep Notes */}
                    {isExpanded && item.report && (
                      <tr className="bg-slate-50/30">
                        <td colSpan={8} className="py-4 px-4 border-b border-slate-100 select-text">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 animate-fadeIn">
                            {/* Suggested Conversation Starters */}
                            <TalkingPoints report={item.report} />
                            
                            {/* Notes & Actions */}
                            <div className="bg-white border border-slate-200/60 rounded-xl p-4 flex flex-col justify-between shadow-sm">
                              <div>
                                <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest block mb-2">Rep Meeting Notes</span>
                                <p className="text-xs text-slate-600 leading-relaxed italic bg-slate-50/50 p-2.5 rounded-lg border border-dashed border-slate-200">
                                  {item.notes ? `"${item.notes}"` : "No custom notes recorded for this lead yet."}
                                </p>
                              </div>
                              <div className="flex justify-between items-center mt-4 pt-3 border-t border-slate-100">
                                <span className="text-[10px] text-slate-400">
                                  Last refreshed: {item.lastRefreshed ? formatDate(item.lastRefreshed) : 'Never'}
                                </span>
                                <button
                                  onClick={() => onSelectReport(item)}
                                  className="inline-flex items-center gap-1 text-[11px] font-bold text-blue-600 hover:text-blue-700 transition-colors"
                                >
                                  View Full Analysis &rarr;
                                </button>
                              </div>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
              {sortedItems.length === 0 && (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-xs text-slate-400 italic">
                    No sessions match your search query.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
