import React, { useState } from 'react';
import { 
  Search, 
  Filter, 
  Trash2, 
  FileText, 
  Download, 
  ExternalLink, 
  ArrowUpRight,
  RefreshCw,
  Building2,
  Mail,
  CheckCircle,
  AlertTriangle,
  History
} from 'lucide-react';
import { ResearchHistoryItem } from '../types';

interface ResearchHistoryProps {
  history: ResearchHistoryItem[];
  onSelectReport: (item: ResearchHistoryItem) => void;
  onDeleteHistory: (id: string) => void;
  onShowNotification: (message: string, type: 'success' | 'info') => void;
}

export default function ResearchHistory({
  history,
  onSelectReport,
  onDeleteHistory,
  onShowNotification
}: ResearchHistoryProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'All' | 'Completed' | 'Processing' | 'Failed'>('All');

  // Format date beautifully
  const formatDate = (isoString: string) => {
    return new Date(isoString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Filter history based on search & status
  const filteredHistory = history.filter(item => {
    const matchesSearch = 
      item.companyName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.website.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (item.report?.industry && item.report.industry.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesStatus = statusFilter === 'All' ? true : item.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const handleDelete = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm('Are you sure you want to delete this research session from your logs?')) {
      onDeleteHistory(id);
      onShowNotification('Research session removed from database log', 'success');
    }
  };

  return (
    <div className="space-y-8 p-4 md:p-6 max-w-6xl mx-auto overflow-y-auto h-full">
      {/* Header Banner */}
      <div className="border-b border-slate-200 pb-5">
        <h1 className="text-xl font-bold text-slate-800 tracking-tight flex items-center gap-2">
          <History className="text-blue-600" size={24} />
          Account Intelligence logs
        </h1>
        <p className="text-xs text-slate-500 mt-0.5">
          Comprehensive database history of compiled company research and agent telemetry
        </p>
      </div>

      {/* Search & Filters Ribbon */}
      <div className="flex flex-col md:flex-row gap-3 items-center justify-between bg-slate-50 border border-slate-200 p-4 rounded-2xl">
        <div className="relative w-full md:max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
          <input
            type="text"
            placeholder="Search company, website, industry, or recipient email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-white border border-slate-200 rounded-xl py-2.5 pl-10 pr-4 text-xs font-medium placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 transition-all"
          />
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto pb-1 md:pb-0">
          <Filter size={14} className="text-slate-400 shrink-0" />
          {['All', 'Completed', 'Processing', 'Failed'].map((status) => (
            <button
              key={status}
              onClick={() => setStatusFilter(status as any)}
              className={`py-1.5 px-3 rounded-lg text-xs font-semibold whitespace-nowrap transition-all border ${
                statusFilter === status
                  ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                  : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
              }`}
            >
              {status}
            </button>
          ))}
        </div>
      </div>

      {/* History Items Grid/Table */}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
        {filteredHistory.length === 0 ? (
          <div className="p-12 text-center flex flex-col items-center justify-center">
            <div className="bg-slate-100 p-4 rounded-full text-slate-400 mb-3">
              <History size={28} />
            </div>
            <h3 className="text-sm font-bold text-slate-700">No session logs found</h3>
            <p className="text-xs text-slate-400 mt-1 max-w-sm">
              We couldn't locate any items matching your active search query or filter tags.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[700px]">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/50 text-[10px] text-slate-400 uppercase tracking-widest font-bold">
                  <th className="py-4 px-4">Company Profile</th>
                  <th className="py-4 px-4">Monitored Industry</th>
                  <th className="py-4 px-4">Recipient Email</th>
                  <th className="py-4 px-4">Session Date</th>
                  <th className="py-4 px-4">Engine Status</th>
                  <th className="py-4 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredHistory.map((item) => {
                  const isCompleted = item.status === 'Completed';
                  const isFailed = item.status === 'Failed';
                  
                  return (
                    <tr
                      key={item.id}
                      className="hover:bg-slate-50/40 transition-colors text-xs group cursor-pointer"
                      onClick={() => isCompleted && onSelectReport(item)}
                    >
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-3">
                          <div className="h-8 w-8 rounded-lg bg-blue-50 text-blue-600 border border-blue-100 flex items-center justify-center font-bold text-xs select-none">
                            {item.companyName.substring(0, 2).toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <span className="font-bold text-slate-800 block truncate">
                              {item.companyName}
                            </span>
                            <span className="text-[10px] text-slate-400 block truncate font-mono">
                              {item.website}
                            </span>
                          </div>
                        </div>
                      </td>

                      <td className="py-4 px-4">
                        <span className="text-slate-600 font-medium block max-w-[160px] truncate">
                          {item.report?.industry || 'Analyzing...'}
                        </span>
                      </td>

                      <td className="py-4 px-4">
                        <span className="text-slate-500 font-medium flex items-center gap-1.5">
                          <Mail size={12} className="text-slate-400 shrink-0" />
                          {item.email}
                        </span>
                      </td>

                      <td className="py-4 px-4">
                        <span className="text-slate-400 font-mono">
                          {formatDate(item.date)}
                        </span>
                      </td>

                      <td className="py-4 px-4">
                        <span className={`inline-flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded ${
                          isCompleted
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                            : isFailed
                            ? 'bg-rose-50 text-rose-700 border border-rose-100'
                            : 'bg-blue-50 text-blue-700 border border-blue-100'
                        }`}>
                          {isCompleted ? (
                            <CheckCircle size={10} className="stroke-[2.5]" />
                          ) : isFailed ? (
                            <AlertTriangle size={10} />
                          ) : (
                            <RefreshCw size={10} className="animate-spin stroke-[2]" />
                          )}
                          {item.status}
                        </span>
                      </td>

                      <td className="py-4 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1.5 opacity-90 md:opacity-0 group-hover:opacity-100 transition-opacity">
                          {isCompleted && (
                            <button
                              onClick={() => onSelectReport(item)}
                              className="p-2 bg-slate-50 hover:bg-blue-50 border border-slate-200 hover:border-blue-200 rounded-lg text-slate-600 hover:text-blue-600 transition-all flex items-center justify-center"
                              title="Open Report Profile"
                            >
                              <ArrowUpRight size={14} />
                            </button>
                          )}
                          <button
                            onClick={(e) => handleDelete(item.id, e)}
                            className="p-2 bg-slate-50 hover:bg-rose-50 border border-slate-200 hover:border-rose-200 rounded-lg text-slate-400 hover:text-rose-600 transition-all flex items-center justify-center"
                            title="Delete Log"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
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
}
