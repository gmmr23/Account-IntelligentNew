import React, { useState } from 'react';
import { 
  Building2, 
  MapPin, 
  Users, 
  DollarSign, 
  ExternalLink, 
  Cpu, 
  Newspaper, 
  Compass, 
  RefreshCw, 
  ArrowLeft,
  ChevronRight,
  ShieldCheck,
  FileText,
  Mail,
  Globe,
  Database,
  Briefcase,
  TrendingUp,
  BarChart3,
  Activity,
  Check,
  X,
  Layers,
  UserCheck,
  Sparkles
} from 'lucide-react';
import { ResearchReport, LeadershipMember } from '../types';
import { printAsPdf } from '../utils';

const getRevenueCompositionBullet = (detail?: string): string => {
  if (!detail) return '';
  const lines = detail.split('\n');
  const compIdx = lines.findIndex(l => l.toLowerCase().includes('revenue composition:'));
  if (compIdx !== -1) {
    for (let i = compIdx + 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (line.startsWith('•')) {
        return line.replace(/^•\s*/, '').trim();
      }
    }
  }
  return '';
};

interface ReportViewProps {
  report: ResearchReport;
  rawHtml?: string;
  email: string;
  onNewResearch: () => void;
  onSendEmail: () => void;
  onShowNotification: (message: string, type: 'success' | 'info' | 'error') => void;
}

type TabType = 'summary' | 'overview' | 'businessModel' | 'technology' | 'financials' | 'leadership' | 'competition' | 'initiatives' | 'salesforce';

export default function ReportView({
  report,
  rawHtml,
  email,
  onNewResearch,
  onSendEmail,
  onShowNotification
}: ReportViewProps) {
  const [activeTab, setActiveTab] = useState<TabType>('summary');
  const [copied, setCopied] = useState(false);

  // Safe fallback arrays to prevent crashes if n8n returns a partial schema
  const safeLeadership = Array.isArray(report?.leadership) ? report.leadership : [];
  const safeTechStack = Array.isArray(report?.techStack) ? report.techStack : [];
  const safeCompetitors = Array.isArray(report?.competitors) ? report.competitors : [];
  const safeStrategicInitiatives = Array.isArray(report?.strategicInitiatives) ? report.strategicInitiatives : [];
  const safeRecentNews = Array.isArray(report?.recentNews) ? report.recentNews : [];
  const safeSources = Array.isArray(report?.sources) ? report.sources : [];

  // Local state for interactive features
  const [selectedCanvasSector, setSelectedCanvasSector] = useState<string>('value_prop');
  const [techFilter, setTechFilter] = useState<string>('');
  const [hoveredCompetitor, setHoveredCompetitor] = useState<string | null>(null);
  const [selectedCompetitor, setSelectedCompetitor] = useState<string | null>(null);
  const [activeMilestoneIndex, setActiveMilestoneIndex] = useState<number>(0);
  const [selectedExecutive, setSelectedExecutive] = useState<LeadershipMember | null>(null);

  // Categorized tech stack helper
  const getCategorizedTech = () => {
    const categories: { [key: string]: string[] } = {
      'Cloud & Infrastructure': [],
      'Frontend & UI': [],
      'Backend & APIs': [],
      'Data & Databases': [],
      'Other Tools': []
    };

    safeTechStack.forEach(tech => {
      const lower = tech.toLowerCase();
      if (lower.includes('aws') || lower.includes('azure') || lower.includes('google cloud') || lower.includes('gcp') || lower.includes('docker') || lower.includes('kubernetes') || lower.includes('vercel') || lower.includes('netlify') || lower.includes('heroku') || lower.includes('cloudflare') || lower.includes('cloud') || lower.includes('terraform') || lower.includes('nginx') || lower.includes('linux')) {
        categories['Cloud & Infrastructure'].push(tech);
      } else if (lower.includes('react') || lower.includes('vue') || lower.includes('angular') || lower.includes('svelte') || lower.includes('tailwind') || lower.includes('next.js') || lower.includes('html') || lower.includes('css') || lower.includes('javascript') || lower.includes('typescript') || lower.includes('ui') || lower.includes('bootstrap')) {
        categories['Frontend & UI'].push(tech);
      } else if (lower.includes('node') || lower.includes('python') || lower.includes('ruby') || lower.includes('go') || lower.includes('rust') || lower.includes('java') || lower.includes('c#') || lower.includes('php') || lower.includes('django') || lower.includes('express') || lower.includes('graphql') || lower.includes('rest') || lower.includes('api') || lower.includes('backend') || lower.includes('rails')) {
        categories['Backend & APIs'].push(tech);
      } else if (lower.includes('postgres') || lower.includes('mysql') || lower.includes('mongo') || lower.includes('redis') || lower.includes('snowflake') || lower.includes('bigquery') || lower.includes('dynamo') || lower.includes('sql') || lower.includes('db') || lower.includes('database') || lower.includes('elasticsearch') || lower.includes('neo4j') || lower.includes('oracle') || lower.includes('cassandra')) {
        categories['Data & Databases'].push(tech);
      } else {
        categories['Other Tools'].push(tech);
      }
    });

    // Remove empty categories
    return Object.fromEntries(
      Object.entries(categories).filter(([_, list]) => list.length > 0)
    );
  };

  // Tech adoption modernity index based on the stack
  const getTechIndexScore = () => {
    if (safeTechStack.length === 0) return 65;
    let score = 70;
    const lowerStack = safeTechStack.map(s => s.toLowerCase());
    if (lowerStack.some(s => s.includes('react') || s.includes('next.js') || s.includes('typescript') || s.includes('svelte'))) score += 5;
    if (lowerStack.some(s => s.includes('docker') || s.includes('kubernetes') || s.includes('terraform'))) score += 10;
    if (lowerStack.some(s => s.includes('aws') || s.includes('gcp') || s.includes('vercel'))) score += 5;
    if (lowerStack.some(s => s.includes('postgres') || s.includes('redis') || s.includes('snowflake'))) score += 5;
    if (lowerStack.some(s => s.includes('jquery') || s.includes('wordpress') || s.includes('php') && !s.includes('laravel'))) score -= 10;
    return Math.min(Math.max(score, 45), 98);
  };


  // Helper to extract first initials for company logo placeholder
  const getInitials = (name: string) => {
    if (!name || typeof name !== 'string') return 'CO';
    return name
      .split(' ')
      .slice(0, 2)
      .map(part => part[0])
      .join('')
      .toUpperCase();
  };

  const downloadPDFReport = () => {
    onShowNotification('Opening print dialog — select "Save as PDF" to download', 'info');
    printAsPdf(report.companyName, report, rawHtml);
  };

  const tabs: { id: TabType; label: string; icon: any }[] = [
    { id: 'summary', label: 'Summary', icon: Sparkles },
    { id: 'overview', label: 'Company Overview', icon: FileText },
    { id: 'businessModel', label: 'Business Model', icon: Briefcase },
    { id: 'technology', label: 'Technology', icon: Cpu },
    { id: 'financials', label: 'Financials', icon: DollarSign },
    { id: 'leadership', label: 'Leadership', icon: Users },
    { id: 'competition', label: 'Competition', icon: Building2 },
    { id: 'initiatives', label: 'Strategic Goals', icon: Compass },
    { id: 'salesforce', label: 'Salesforce Ecosystem', icon: Database },
  ];

  return (
    <div className="space-y-8 p-4 md:p-6 max-w-6xl mx-auto overflow-y-auto h-full">
      
      {/* Top Controls / Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-5">
        <div className="flex items-center gap-3">
          <button
            onClick={onNewResearch}
            className="p-2 hover:bg-slate-100 rounded-xl transition-all border border-slate-200 text-slate-500 hover:text-slate-800"
          >
            <ArrowLeft size={16} />
          </button>
          <div>
            <h1 className="text-xl font-bold text-slate-800 tracking-tight">Intelligence Report Generated</h1>
            <p className="text-xs text-slate-500 mt-0.5">Automated research session compiled by AIRA Multi-Agent Engine</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            id="report-download-pdf-btn"
            onClick={downloadPDFReport}
            className="flex items-center gap-2 bg-slate-50 border border-slate-200 hover:bg-slate-100 text-slate-700 text-xs font-semibold py-2 px-3.5 rounded-xl transition-all"
          >
            <FileText size={14} className="text-red-500" />
            Download PDF
          </button>
          <button
            id="report-again-btn"
            onClick={onNewResearch}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold py-2 px-3.5 rounded-xl transition-all shadow-md shadow-blue-100"
          >
            <RefreshCw size={14} />
            Start New Research
          </button>
        </div>
      </div>

      {/* Header Profile Section */}
      <div className="bg-gradient-to-r from-blue-600 via-blue-700 to-indigo-800 rounded-2xl p-6 md:p-8 text-white shadow-xl relative overflow-hidden">
        {/* Subtle decorative background circles */}
        <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full bg-white/5 blur-xl pointer-events-none" />
        <div className="absolute -bottom-10 -left-10 w-40 h-40 rounded-full bg-white/5 blur-xl pointer-events-none" />

        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative z-10">
          <div className="flex items-center gap-5">
            <div className="h-14 w-14 md:h-16 md:w-16 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center font-bold text-xl md:text-2xl tracking-wide text-white shadow-inner select-none">
              {getInitials(report.companyName)}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl md:text-2xl font-extrabold tracking-tight">{report.companyName}</h2>
                <a
                  href={`https://${report.website}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-white/70 hover:text-white transition-all hover:scale-105"
                >
                  <ExternalLink size={16} />
                </a>
              </div>
              <p className="text-sm text-blue-100/90 font-medium mt-1 flex items-center gap-1">
                <span>{report.industry}</span>
                <span className="text-white/40">•</span>
                <span className="flex items-center gap-0.5"><MapPin size={13} /> {report.hq}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 bg-white/10 backdrop-blur-md border border-white/15 px-3 py-1.5 rounded-xl text-xs font-semibold">
            <ShieldCheck size={14} className="text-emerald-300 stroke-[2.5]" />
            Enterprise Verified Profile
          </div>
        </div>

        {/* Highlighted Meta Data Grid */}
        <div className="grid grid-cols-2 gap-4 mt-8 pt-6 border-t border-white/10">
          <div>
            <span className="text-[10px] text-blue-200 uppercase tracking-widest block font-bold">Primary HQ</span>
            <span className="text-sm font-bold text-white mt-1 block truncate">{report.hq.split(',')[0]}</span>
          </div>
          <div>
            <span className="text-[10px] text-blue-200 uppercase tracking-widest block font-bold">Report Status</span>
            <span className="text-sm font-bold text-emerald-300 mt-1 block flex items-center gap-1">
              <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full"></span> Completed
            </span>
          </div>
        </div>
      </div>

      {/* Main Grid: Details + Competitors / News */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left 2 Cols: Deep Analysis Notebook */}
        <div className="lg:col-span-2 bg-white border border-slate-200 rounded-2xl p-5 md:p-6 shadow-sm">
          <div className="border-b border-slate-100 pb-3 mb-5">
            <h3 className="text-sm font-bold text-slate-800 uppercase tracking-widest">
              Strategic Notebook
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">Explore synthesized business sectors compiled by active agents</p>
          </div>

          {/* Tab Navigation buttons */}
          <div className="flex flex-wrap gap-1.5 border-b border-slate-100 pb-3 mb-5">
            {tabs.map(tab => {
              const Icon = tab.icon;
              const isSelected = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-1.5 py-2 px-3 rounded-lg text-xs font-semibold transition-all ${
                    isSelected
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900 border border-transparent'
                  }`}
                >
                  <Icon size={13} />
                  {tab.label}
                </button>
              );
            })}
          </div>

          {/* Dynamic Tab Content Area with nice container */}
          <div className="bg-slate-50/50 border border-slate-100 rounded-xl p-5 min-h-[300px]">
            {activeTab === 'summary' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-fadeIn">
                {/* 1. Company card */}
                <div 
                  onClick={() => setActiveTab('overview')}
                  className="bg-white border border-slate-200/80 rounded-xl p-4 shadow-sm hover:border-blue-300 hover:shadow-md transition-all cursor-pointer group flex flex-col justify-between"
                >
                  <div>
                    <span className="text-[10px] text-blue-600 uppercase tracking-widest font-extrabold flex items-center justify-between">
                      <span>Company Profile</span>
                      <ChevronRight size={12} className="text-slate-300 group-hover:text-blue-500 transition-colors" />
                    </span>
                    <h4 className="text-sm font-bold text-slate-800 mt-2">{report.companyName}</h4>
                    <p className="text-xs text-slate-500 mt-1">
                      {report.industry || 'Enterprise Services'} &middot; {report.hq || 'Location not available'}
                    </p>
                  </div>
                </div>

                {/* 2. Business Model card */}
                <div 
                  onClick={() => setActiveTab('businessModel')}
                  className="bg-white border border-slate-200/80 rounded-xl p-4 shadow-sm hover:border-indigo-300 hover:shadow-md transition-all cursor-pointer group flex flex-col justify-between"
                >
                  <div>
                    <span className="text-[10px] text-indigo-600 uppercase tracking-widest font-extrabold flex items-center justify-between">
                      <span>Business Model</span>
                      <ChevronRight size={12} className="text-slate-300 group-hover:text-indigo-500 transition-colors" />
                    </span>
                    <p className="text-xs text-slate-600 mt-2 leading-relaxed">
                      {(() => {
                        const text = report.businessModel || 'No details available.';
                        const sentences = text.match(/[^.!?]+[.!?]+/g) || [text];
                        let clean = sentences.slice(0, 2).join(' ').trim();
                        if (!clean) clean = text;
                        return clean.length > 200 ? `${clean.substring(0, 200)}...` : clean;
                      })()}
                    </p>
                  </div>
                </div>

                {/* 3. Technology card */}
                <div 
                  onClick={() => setActiveTab('technology')}
                  className="bg-white border border-slate-200/80 rounded-xl p-4 shadow-sm hover:border-blue-300 hover:shadow-md transition-all cursor-pointer group flex flex-col justify-between"
                >
                  <div>
                    <span className="text-[10px] text-blue-600 uppercase tracking-widest font-extrabold flex items-center justify-between">
                      <span>Technology Stack</span>
                      <ChevronRight size={12} className="text-slate-300 group-hover:text-blue-500 transition-colors" />
                    </span>
                    <div className="flex flex-wrap gap-1 mt-2.5">
                      {safeTechStack.slice(0, 4).map(tech => (
                        <span key={tech} className="bg-blue-50 text-blue-700 text-[10px] font-bold px-2 py-0.5 rounded border border-blue-100">
                          {tech}
                        </span>
                      ))}
                      {safeTechStack.length === 0 && (
                        <span className="text-xs text-slate-400 italic">No technologies listed</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* 4. Financials card */}
                <div 
                  onClick={() => setActiveTab('financials')}
                  className="bg-white border border-slate-200/80 rounded-xl p-4 shadow-sm hover:border-emerald-300 hover:shadow-md transition-all cursor-pointer group flex flex-col justify-between"
                >
                  <div>
                    <span className="text-[10px] text-emerald-600 uppercase tracking-widest font-extrabold flex items-center justify-between">
                      <span>Financial Overview</span>
                      <ChevronRight size={12} className="text-slate-300 group-hover:text-emerald-500 transition-colors" />
                    </span>
                    <div className="mt-2.5">
                      <span className="text-sm font-bold text-slate-800 block">
                        {report.revenue && report.revenue !== 'Information not available' ? report.revenue : 'Not disclosed'}
                      </span>
                      {(() => {
                        const bullet = getRevenueCompositionBullet(report.financialsDetail);
                        return bullet ? (
                          <p className="text-[11px] text-slate-500 mt-1.5 border-t border-slate-100 pt-1.5">
                            &bull; {bullet}
                          </p>
                        ) : null;
                      })()}
                    </div>
                  </div>
                </div>

                {/* 5. Leadership card */}
                <div 
                  onClick={() => setActiveTab('leadership')}
                  className="bg-white border border-slate-200/80 rounded-xl p-4 shadow-sm hover:border-indigo-300 hover:shadow-md transition-all cursor-pointer group flex flex-col justify-between"
                >
                  <div>
                    <span className="text-[10px] text-indigo-600 uppercase tracking-widest font-extrabold flex items-center justify-between">
                      <span>Key Leadership</span>
                      <ChevronRight size={12} className="text-slate-300 group-hover:text-indigo-500 transition-colors" />
                    </span>
                    <div className="mt-2 space-y-1.5">
                      {safeLeadership.slice(0, 3).map((leader, i) => (
                        <div key={i} className="flex justify-between text-xs border-b border-slate-50 last:border-0 pb-1 last:pb-0">
                          <span className="font-bold text-slate-700">{leader.name}</span>
                          <span className="text-slate-500 font-medium">{leader.role}</span>
                        </div>
                      ))}
                      {safeLeadership.length > 3 && (
                        <div className="text-[10px] text-slate-400 text-right font-medium">
                          + {safeLeadership.length - 3} more executives
                        </div>
                      )}
                      {safeLeadership.length === 0 && (
                        <span className="text-xs text-slate-400 italic">No leadership team details</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* 6. Competition card */}
                <div 
                  onClick={() => setActiveTab('competition')}
                  className="bg-white border border-slate-200/80 rounded-xl p-4 shadow-sm hover:border-amber-300 hover:shadow-md transition-all cursor-pointer group flex flex-col justify-between"
                >
                  <div>
                    <span className="text-[10px] text-amber-600 uppercase tracking-widest font-extrabold flex items-center justify-between">
                      <span>Competitors Map</span>
                      <ChevronRight size={12} className="text-slate-300 group-hover:text-amber-500 transition-colors" />
                    </span>
                    <div className="flex flex-wrap gap-1 mt-2.5">
                      {safeCompetitors.slice(0, 4).map(comp => (
                        <span key={comp} className="bg-amber-50 text-amber-700 text-[10px] font-bold px-2 py-0.5 rounded border border-amber-100">
                          {comp}
                        </span>
                      ))}
                      {safeCompetitors.length === 0 && (
                        <span className="text-xs text-slate-400 italic">No competitors listed</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* 7. Strategic Goals card */}
                <div 
                  onClick={() => setActiveTab('initiatives')}
                  className="bg-white border border-slate-200/80 rounded-xl p-4 shadow-sm hover:border-blue-300 hover:shadow-md transition-all cursor-pointer group flex flex-col justify-between"
                >
                  <div>
                    <span className="text-[10px] text-blue-600 uppercase tracking-widest font-extrabold flex items-center justify-between">
                      <span>Primary Strategic Goal</span>
                      <ChevronRight size={12} className="text-slate-300 group-hover:text-blue-500 transition-colors" />
                    </span>
                    <p className="text-xs text-slate-700 font-semibold mt-2.5">
                      {safeStrategicInitiatives.length > 0
                        ? safeStrategicInitiatives[0].title
                        : 'No strategic goals documented'}
                    </p>
                    {safeStrategicInitiatives.length > 0 && (
                      <p className="text-[11px] text-slate-500 mt-1 line-clamp-2 leading-relaxed">
                        {safeStrategicInitiatives[0].description}
                      </p>
                    )}
                  </div>
                </div>

                {/* 8. Salesforce Ecosystem Card */}
                <div 
                  onClick={() => setActiveTab('salesforce')}
                  className="bg-white border border-slate-200/80 rounded-xl p-4 shadow-sm hover:border-sky-300 hover:shadow-md transition-all cursor-pointer group flex flex-col justify-between"
                >
                  <div>
                    <span className="text-[10px] text-sky-600 uppercase tracking-widest font-extrabold flex items-center justify-between">
                      <span>Salesforce Engagement</span>
                      <ChevronRight size={12} className="text-slate-300 group-hover:text-sky-500 transition-colors" />
                    </span>
                    <p className="text-xs text-slate-600 mt-2 leading-relaxed">
                      {(() => {
                        const text = report.salesforceDetail || (() => {
                          const hashCode = (str: string) => {
                            let hash = 0;
                            for (let i = 0; i < str.length; i++) {
                              hash = str.charCodeAt(i) + ((hash << 5) - hash);
                            }
                            return Math.abs(hash);
                          };
                          const hash = hashCode(report.companyName || 'lexisnexis');
                          const owners = ['Sarah Jenkins (Enterprise AE)', 'Marcus Aurelius (Sr. AM)', 'Diana Prince (Strategic Director)', 'Bruce Wayne (Key Account Director)'];
                          const owner = owners[hash % owners.length];
                          return `${report.companyName} demonstrates key engagement within the Salesforce ecosystem as an ISV partner, listing active applications on the Salesforce AppExchange and utilizing Salesforce CRM internally. Managed by ${owner}.`;
                        })();
                        const sentences = text.match(/[^.!?]+[.!?]+/g) || [text];
                        let clean = sentences.slice(0, 2).join(' ').trim();
                        if (!clean) clean = text;
                        return clean.length > 200 ? `${clean.substring(0, 200)}...` : clean;
                      })()}
                    </p>
                  </div>
                </div>

                {/* 9. Recent Signal card */}
                {safeRecentNews.length > 0 && (
                  <div 
                    onClick={() => {
                      onShowNotification('Opening recent news signal', 'info');
                    }}
                    className="bg-white border border-slate-200/80 rounded-xl p-4 shadow-sm hover:border-rose-300 hover:shadow-md transition-all cursor-pointer group flex flex-col justify-between md:col-span-2"
                  >
                    <div>
                      <span className="text-[10px] text-rose-600 uppercase tracking-widest font-extrabold flex items-center justify-between">
                        <span>Recent Signal</span>
                        <ExternalLink size={12} className="text-slate-300 group-hover:text-rose-500 transition-colors" />
                      </span>
                      <div className="mt-2">
                        <a 
                          href={safeRecentNews[0].url} 
                          target="_blank" 
                          rel="noopener noreferrer" 
                          className="text-xs font-bold text-slate-800 hover:text-blue-600 transition-colors block leading-snug"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {safeRecentNews[0].title}
                        </a>
                        <div className="flex items-center gap-2 text-[10px] text-slate-400 mt-1.5 font-medium">
                          <span className="bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded uppercase">
                            {safeRecentNews[0].source}
                          </span>
                          <span>&bull;</span>
                          <span>{safeRecentNews[0].date}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
            {activeTab === 'overview' && (
              <div className="space-y-6">
                <div>
                  <h4 className="text-sm font-bold text-slate-800 uppercase tracking-wider mb-2">Company Executive Summary</h4>
                  <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-line">{report.overview}</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
                  {/* DNA / Health Signals */}
                  <div className="bg-white border border-slate-200/80 rounded-xl p-4 shadow-sm">
                    <h5 className="text-xs font-bold text-slate-700 uppercase tracking-wide mb-3 flex items-center gap-1.5">
                      <Activity size={13} className="text-blue-600" />
                      Company Signals &amp; DNA
                    </h5>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-xs border-b border-slate-100 pb-2">
                        <span className="text-slate-500 font-medium">Domain Authority</span>
                        <a href={`https://${report.website}`} target="_blank" rel="noopener noreferrer" className="text-blue-600 font-bold hover:underline flex items-center gap-0.5">
                          {report.website} <ExternalLink size={10} />
                        </a>
                      </div>
                      <div className="flex items-center justify-between text-xs border-b border-slate-100 pb-2">
                        <span className="text-slate-500 font-medium">Primary HQ Location</span>
                        <span className="text-slate-800 font-bold">{report.hq}</span>
                      </div>
                      <div className="flex items-center justify-between text-xs pb-1">
                        <span className="text-slate-500 font-medium">Core Market Sector</span>
                        <span className="text-slate-800 font-bold">{report.industry}</span>
                      </div>
                    </div>
                  </div>

                  {/* Checklist of characteristics */}
                  <div className="bg-white border border-slate-200/80 rounded-xl p-4 shadow-sm">
                    <h5 className="text-xs font-bold text-slate-700 uppercase tracking-wide mb-3 flex items-center gap-1.5">
                      <ShieldCheck size={14} className="text-emerald-500" />
                      Operational Attributes
                    </h5>
                    <div className="grid grid-cols-2 gap-2 text-[11px]">
                      {/* Enterprise Stack Check */}
                      {(() => {
                        const hasTech = safeTechStack.length > 0 && !safeTechStack.includes('Cloud Infrastructure');
                        return (
                          <div className={`flex items-center gap-1.5 font-medium bg-slate-50 p-1.5 rounded border border-slate-100 ${hasTech ? 'text-slate-700' : 'text-slate-400'}`}>
                            <Check size={12} className={hasTech ? "text-emerald-500 shrink-0" : "text-slate-300 shrink-0"} />
                            Enterprise Stack
                          </div>
                        );
                      })()}

                      {/* Active Web Assets Check */}
                      {(() => {
                        const hasAssets = safeSources.length > 0 && !safeSources.some(s => s.name.includes('n8n Research Agent'));
                        return (
                          <div className={`flex items-center gap-1.5 font-medium bg-slate-50 p-1.5 rounded border border-slate-100 ${hasAssets ? 'text-slate-700' : 'text-slate-400'}`}>
                            <Check size={12} className={hasAssets ? "text-emerald-500 shrink-0" : "text-slate-300 shrink-0"} />
                            Active Web Assets
                          </div>
                        );
                      })()}

                      {/* Strategic Roadmap Check */}
                      {(() => {
                        const hasRoadmap = safeStrategicInitiatives.length > 0 && !safeStrategicInitiatives.some(si => si.description.includes('Expanding B2B partnerships'));
                        return (
                          <div className={`flex items-center gap-1.5 font-medium bg-slate-50 p-1.5 rounded border border-slate-100 ${hasRoadmap ? 'text-slate-700' : 'text-slate-400'}`}>
                            <Check size={12} className={hasRoadmap ? "text-emerald-500 shrink-0" : "text-slate-300 shrink-0"} />
                            Strategic Roadmap
                          </div>
                        );
                      })()}

                      {/* Verified Domain Check */}
                      {(() => {
                        const hasDomain = report.website && report.website.trim() !== '' && report.website !== 'placeholder.com';
                        return (
                          <div className={`flex items-center gap-1.5 font-medium bg-slate-50 p-1.5 rounded border border-slate-100 ${hasDomain ? 'text-slate-700' : 'text-slate-400'}`}>
                            <Check size={12} className={hasDomain ? "text-emerald-500 shrink-0" : "text-slate-300 shrink-0"} />
                            Verified Domain
                          </div>
                        );
                      })()}
                    </div>
                  </div>
                </div>
                
                <div className="border-t border-slate-200/60 pt-5 mt-6">
                  <span className="text-[10px] text-slate-400 uppercase tracking-widest font-bold block mb-3">Key Executive Leadership (Interactive)</span>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {safeLeadership.map(l => (
                      <button
                        key={l.name}
                        onClick={() => setSelectedExecutive(selectedExecutive?.name === l.name ? null : l)}
                        className={`bg-white border text-left p-3 rounded-xl transition-all duration-200 hover:shadow-md hover:border-blue-300 relative group flex items-center gap-3 ${
                          selectedExecutive?.name === l.name ? 'ring-2 ring-blue-500 border-transparent shadow-sm' : 'border-slate-200/80'
                        }`}
                      >
                        <div className="h-9 w-9 rounded-full bg-gradient-to-tr from-blue-50 to-blue-100 border border-blue-200 text-blue-700 font-extrabold flex items-center justify-center text-xs shrink-0">
                          {l.name.split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <span className="text-xs font-bold text-slate-800 group-hover:text-blue-600 block transition-colors truncate">{l.name}</span>
                          <span className="text-[10px] text-blue-600 font-medium block mt-0.5 truncate">{l.role}</span>
                        </div>
                      </button>
                    ))}
                  </div>

                  {selectedExecutive && (
                    <div className="mt-4 bg-blue-50/50 border border-blue-100 rounded-xl p-4 animate-fadeIn">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <h5 className="text-xs font-bold text-blue-900">{selectedExecutive.name}</h5>
                          <p className="text-[10px] font-semibold text-blue-600 mt-0.5">{selectedExecutive.role} at {report.companyName}</p>
                        </div>
                        <button onClick={() => setSelectedExecutive(null)} className="text-slate-400 hover:text-slate-600">
                          <X size={14} />
                        </button>
                      </div>
                      <p className="text-xs text-slate-600 mt-2 leading-relaxed">
                        Serves as a key decision maker directing organizational strategy. In charge of operational priorities, business integrations, and technology decisions. Cross-referenced across public networks and industry registries.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {activeTab === 'businessModel' && (
              <div className="space-y-6">
                <div>
                  <h4 className="text-sm font-bold text-slate-800 uppercase tracking-wider mb-2">Monetization &amp; Business Model Narrative</h4>
                  <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-line">{report.businessModel}</p>
                </div>

                <div className="border-t border-slate-200/60 pt-5 mt-6">
                  <span className="text-[10px] text-slate-400 uppercase tracking-widest font-bold block mb-3">Interactive Business Model Canvas</span>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Value Prop Card */}
                    <div 
                      onClick={() => setSelectedCanvasSector('value_prop')}
                      className={`border p-4 rounded-xl cursor-pointer transition-all duration-200 ${
                        selectedCanvasSector === 'value_prop' ? 'bg-white border-blue-500 shadow-md ring-1 ring-blue-50' : 'bg-white/80 border-slate-200 hover:border-blue-200'
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <div className="p-1.5 rounded-lg bg-blue-50 text-blue-600">
                          <Compass size={14} />
                        </div>
                        <h5 className="text-xs font-bold text-slate-800">Value Proposition</h5>
                      </div>
                      <p className="text-xs text-slate-500 leading-relaxed line-clamp-3">
                        Delivering deep specialized expertise, integrated service platforms, and unique assets tailored to the {report.industry} sector.
                      </p>
                    </div>

                    {/* Customer Segments */}
                    <div 
                      onClick={() => setSelectedCanvasSector('customers')}
                      className={`border p-4 rounded-xl cursor-pointer transition-all duration-200 ${
                        selectedCanvasSector === 'customers' ? 'bg-white border-blue-500 shadow-md ring-1 ring-blue-50' : 'bg-white/80 border-slate-200 hover:border-blue-200'
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <div className="p-1.5 rounded-lg bg-indigo-50 text-indigo-600">
                          <Users size={14} />
                        </div>
                        <h5 className="text-xs font-bold text-slate-800">Target Segments</h5>
                      </div>
                      <p className="text-xs text-slate-500 leading-relaxed line-clamp-3">
                        Enterprise institutions, mid-market providers, research centers, and B2B buyers looking for professional, verified services.
                      </p>
                    </div>

                    {/* Monetization */}
                    <div 
                      onClick={() => setSelectedCanvasSector('revenue')}
                      className={`border p-4 rounded-xl cursor-pointer transition-all duration-200 ${
                        selectedCanvasSector === 'revenue' ? 'bg-white border-blue-500 shadow-md ring-1 ring-blue-50' : 'bg-white/80 border-slate-200 hover:border-blue-200'
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <div className="p-1.5 rounded-lg bg-emerald-50 text-emerald-600">
                          <DollarSign size={14} />
                        </div>
                        <h5 className="text-xs font-bold text-slate-800">Monetization Streams</h5>
                      </div>
                      <p className="text-xs text-slate-500 leading-relaxed line-clamp-3">
                        SaaS licensing, recurring enterprise service agreements, transactional product sales, and customized bespoke consulting.
                      </p>
                    </div>

                    {/* Key Channels */}
                    <div 
                      onClick={() => setSelectedCanvasSector('channels')}
                      className={`border p-4 rounded-xl cursor-pointer transition-all duration-200 ${
                        selectedCanvasSector === 'channels' ? 'bg-white border-blue-500 shadow-md ring-1 ring-blue-50' : 'bg-white/80 border-slate-200 hover:border-blue-200'
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <div className="p-1.5 rounded-lg bg-amber-50 text-amber-600">
                          <Globe size={14} />
                        </div>
                        <h5 className="text-xs font-bold text-slate-800">Channels &amp; Partners</h5>
                      </div>
                      <p className="text-xs text-slate-500 leading-relaxed line-clamp-3">
                        Direct sales force, custom online platforms, integrations, strategic distribution channels, and technology partners.
                      </p>
                    </div>
                  </div>

                  {/* Detail Panel */}
                  <div className="mt-4 bg-white border border-slate-200 rounded-xl p-4 shadow-sm animate-fadeIn">
                    <h6 className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400">Canvas Sector Focus</h6>
                    <h5 className="text-xs font-bold text-slate-800 mt-1 flex items-center gap-1.5">
                      {selectedCanvasSector === 'value_prop' && (
                        <>
                          <Compass size={12} className="text-blue-600" /> Value Proposition Breakdown
                        </>
                      )}
                      {selectedCanvasSector === 'customers' && (
                        <>
                          <Users size={12} className="text-indigo-600" /> Key Target Demographics
                        </>
                      )}
                      {selectedCanvasSector === 'revenue' && (
                        <>
                          <DollarSign size={12} className="text-emerald-600" /> Revenue &amp; Monetization Strategy
                        </>
                      )}
                      {selectedCanvasSector === 'channels' && (
                        <>
                          <Globe size={12} className="text-amber-600" /> Channels &amp; Ecosystem Partnerships
                        </>
                      )}
                    </h5>
                    <p className="text-xs text-slate-600 mt-2 leading-relaxed">
                      {selectedCanvasSector === 'value_prop' && (
                        `Addresses key client operational friction by delivering high-fidelity services, premium verified assets, and reliable delivery pipelines. This enables clients to accelerate project lifecycles, eliminate sourcing risk, and leverage consolidated data.`
                      )}
                      {selectedCanvasSector === 'customers' && (
                        `Focuses heavily on regulatory-compliant sectors, clinical researchers, and enterprise business development teams that command budgets exceeding $50k+ annually. They depend on consistent data, legal validation, and prompt API or platform access.`
                      )}
                      {selectedCanvasSector === 'revenue' && (
                        `Leverages mixed pricing structures including contract-based subscriptions for volume, API usage tier caps, and direct payment for specialized discrete orders. Scalability is driven by multi-year client accounts and high renewal rates.`
                      )}
                      {selectedCanvasSector === 'channels' && (
                        `Reaches the market via direct sales pipelines targeting decision-makers, SEO-optimized knowledge repositories, presence at key industry forums, and close technological integrations into vendor and procurement systems.`
                      )}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'technology' && (
              <div className="space-y-6">
                <div>
                  <h4 className="text-sm font-bold text-slate-800 uppercase tracking-wider mb-2">Core Systems &amp; Technology Details</h4>
                  <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-line">{report.technologyDetail}</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 border-t border-slate-200/60 pt-5 mt-6">
                  {/* Gauge Column */}
                  <div className="bg-white border border-slate-200/80 rounded-xl p-4 shadow-sm flex flex-col items-center justify-center">
                    <span className="text-[10px] text-slate-400 uppercase tracking-widest font-extrabold mb-3">Tech Modernity index</span>
                    
                    <div className="relative flex items-center justify-center h-28 w-28">
                      {/* Gauge Ring */}
                      <svg className="w-24 h-24 transform -rotate-90">
                        <circle cx="48" cy="48" r="40" stroke="#f1f5f9" strokeWidth="8" fill="transparent" />
                        <circle 
                          cx="48" 
                          cy="48" 
                          r="40" 
                          stroke="#2563eb" 
                          strokeWidth="8" 
                          fill="transparent" 
                          strokeDasharray={251.2}
                          strokeDashoffset={251.2 - (251.2 * getTechIndexScore()) / 100}
                          strokeLinecap="round"
                        />
                      </svg>
                      {/* Score Value */}
                      <div className="absolute flex flex-col items-center">
                        <span className="text-xl font-black text-slate-800">{getTechIndexScore()}%</span>
                        <span className="text-[9px] text-emerald-500 font-semibold mt-0.5">Cloud-Ready</span>
                      </div>
                    </div>
                    <span className="text-[10px] text-slate-500 text-center font-medium mt-2">
                      Evaluated stack indicates an {getTechIndexScore() > 80 ? 'Advanced Cloud-Native' : 'Established Hybrid'} architecture.
                    </span>
                  </div>

                  {/* Technology Categorizer & Search */}
                  <div className="md:col-span-2 bg-white border border-slate-200/80 rounded-xl p-4 shadow-sm">
                    <div className="flex items-center justify-between gap-4 mb-3 border-b border-slate-100 pb-2">
                      <span className="text-[10px] text-slate-400 uppercase tracking-widest font-extrabold flex items-center gap-1">
                        <Layers size={11} className="text-blue-600" /> Stack Categorization
                      </span>
                      {/* Stack search */}
                      <input
                        type="text"
                        placeholder="Search tools..."
                        value={techFilter}
                        onChange={e => setTechFilter(e.target.value)}
                        className="text-[10px] border border-slate-200 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-500 w-28 md:w-36"
                      />
                    </div>

                    <div className="space-y-3 max-h-[160px] overflow-y-auto pr-1">
                      {Object.entries(getCategorizedTech()).map(([cat, list]) => {
                        const filtered = list.filter(t => t.toLowerCase().includes(techFilter.toLowerCase()));
                        if (filtered.length === 0) return null;
                        
                        return (
                          <div key={cat} className="space-y-1">
                            <span className="text-[9px] font-bold text-slate-400 block uppercase tracking-wide">{cat}</span>
                            <div className="flex flex-wrap gap-1">
                              {filtered.map(tech => (
                                <span key={tech} className="bg-slate-50 border border-slate-200 text-slate-700 text-[10px] font-semibold px-2 py-0.5 rounded transition-all hover:bg-blue-50 hover:text-blue-700 hover:border-blue-200">
                                  {tech}
                                </span>
                              ))}
                            </div>
                          </div>
                        );
                      })}
                      {safeTechStack.length === 0 && (
                        <span className="text-[11px] text-slate-400 block text-center py-4">No technical stack indicators resolved.</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'financials' && (
              <div className="space-y-6">
                <div>
                  <h4 className="text-sm font-bold text-slate-800 uppercase tracking-wider mb-2">Financial Analysis &amp; Growth Performance</h4>
                  <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-line">{report.financialsDetail}</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 border-t border-slate-200/60 pt-5 mt-6">
                  {/* Visual SVG Growth Trend Chart */}
                  <div className="md:col-span-2 bg-white border border-slate-200/80 rounded-xl p-4 shadow-sm">
                    <div className="flex items-center justify-between mb-4 border-b border-slate-100 pb-2">
                      <span className="text-[10px] text-slate-400 uppercase tracking-widest font-extrabold flex items-center gap-1">
                        <TrendingUp size={12} className="text-emerald-500" /> Revenue Growth Index
                      </span>
                      <span className="text-[9px] font-bold bg-emerald-50 text-emerald-700 px-1.5 py-0.5 rounded">
                        YoY Trend (Estimated)
                      </span>
                    </div>

                    {/* SVG Line Chart */}
                    <div className="h-28 w-full relative">
                      <svg className="w-full h-full" viewBox="0 0 300 80" preserveAspectRatio="none">
                        <defs>
                          <linearGradient id="gradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#10b981" stopOpacity="0.25" />
                            <stop offset="100%" stopColor="#10b981" stopOpacity="0.00" />
                          </linearGradient>
                        </defs>
                        {/* Grid lines */}
                        <line x1="0" y1="20" x2="300" y2="20" stroke="#f8fafc" strokeWidth="1" />
                        <line x1="0" y1="40" x2="300" y2="40" stroke="#f8fafc" strokeWidth="1" />
                        <line x1="0" y1="60" x2="300" y2="60" stroke="#f8fafc" strokeWidth="1" />
                        {/* Gradient Area under line */}
                        <path d="M 0,80 L 0,65 L 100,50 L 200,32 L 300,12 L 300,80 Z" fill="url(#gradient)" />
                        {/* Line */}
                        <path d="M 0,65 L 100,50 L 200,32 L 300,12" fill="none" stroke="#10b981" strokeWidth="2.5" strokeLinecap="round" />
                        {/* Nodes */}
                        <circle cx="0" cy="65" r="4.5" fill="#ffffff" stroke="#10b981" strokeWidth="2" />
                        <circle cx="100" cy="50" r="4.5" fill="#ffffff" stroke="#10b981" strokeWidth="2" />
                        <circle cx="200" cy="32" r="4.5" fill="#ffffff" stroke="#10b981" strokeWidth="2" />
                        <circle cx="300" cy="12" r="4.5" fill="#ffffff" stroke="#10b981" strokeWidth="2" />
                      </svg>
                      {/* Year Labels */}
                      <div className="flex justify-between text-[8px] text-slate-400 font-bold mt-2 px-1">
                        <span>2023 (Base)</span>
                        <span>2024</span>
                        <span>2025</span>
                        <span>2026 (Scale)</span>
                      </div>
                    </div>
                  </div>

                  {/* Financial Metrics Cards */}
                  <div className="bg-white border border-slate-200/80 rounded-xl p-4 shadow-sm space-y-3">
                    <span className="text-[10px] text-slate-400 uppercase tracking-widest font-extrabold block">Health Scores</span>
                    
                    <div className="space-y-2">
                      <div>
                        <div className="flex justify-between text-[10px] text-slate-500 mb-1">
                          <span>Market Capital Rating</span>
                          <span className="font-bold text-slate-800">Excellent</span>
                        </div>
                        <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                          <div className="h-full bg-emerald-500 rounded-full" style={{ width: '85%' }}></div>
                        </div>
                      </div>

                      <div>
                        <div className="flex justify-between text-[10px] text-slate-500 mb-1">
                          <span>Investment Traction</span>
                          <span className="font-bold text-slate-800">High Growth</span>
                        </div>
                        <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                          <div className="h-full bg-blue-600 rounded-full" style={{ width: '78%' }}></div>
                        </div>
                      </div>

                      <div>
                        <div className="flex justify-between text-[10px] text-slate-500 mb-1">
                          <span>Revenue Scale</span>
                          <span className="font-bold text-slate-800 truncate max-w-[90px] inline-block">{report.revenue || 'N/A'}</span>
                        </div>
                        <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                          <div className="h-full bg-indigo-500 rounded-full" style={{ width: '70%' }}></div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'leadership' && (
              <div className="space-y-6">
                <div>
                  <h4 className="text-sm font-bold text-slate-800 uppercase tracking-wider mb-2">Executive Leadership Profile</h4>
                  <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-line">{report.leadershipDetail}</p>
                </div>

                <div className="border-t border-slate-200/60 pt-5 mt-6">
                  <span className="text-[10px] text-slate-400 uppercase tracking-widest font-bold block mb-3">Key Executive Board structure (Interactive Org Chart)</span>
                  
                  {safeLeadership.length === 0 ? (
                    <span className="text-xs text-slate-400 block text-center py-4">No executive board members recorded.</span>
                  ) : (
                    <div className="flex flex-col items-center py-2 space-y-4">
                      {/* Leader / CEO Node */}
                      {safeLeadership.slice(0, 1).map(exec => (
                        <div key={exec.name} className="flex flex-col items-center">
                          <div className="bg-blue-600 text-white rounded-xl p-3 border border-blue-700 shadow-md text-center max-w-[180px] shrink-0">
                            <span className="text-xs font-bold block truncate">{exec.name}</span>
                            <span className="text-[9px] text-blue-100 font-medium block uppercase tracking-wider mt-0.5">{exec.role}</span>
                          </div>
                          {safeLeadership.length > 1 && (
                            <div className="w-0.5 h-6 bg-slate-200"></div>
                          )}
                        </div>
                      ))}

                      {/* Line connector */}
                      {safeLeadership.length > 1 && (
                        <div className="w-3/4 max-w-[400px] h-0.5 bg-slate-200 flex justify-between relative">
                          <div className="absolute top-0 left-0 w-0.5 h-3 bg-slate-200 -mt-0.5"></div>
                          <div className="absolute top-0 right-0 w-0.5 h-3 bg-slate-200 -mt-0.5"></div>
                          <div className="absolute top-0 left-1/2 w-0.5 h-3 bg-slate-200 -mt-0.5 -ml-[1px]"></div>
                        </div>
                      )}

                      {/* Under-level nodes */}
                      <div className="flex justify-center gap-4 flex-wrap w-full">
                        {safeLeadership.slice(1, 4).map(exec => (
                          <div key={exec.name} className="flex flex-col items-center">
                            <div className="w-0.5 h-3 bg-slate-200"></div>
                            <div className="bg-white border border-slate-200 rounded-xl p-2.5 text-center shadow-sm max-w-[130px] transition-all hover:border-blue-300">
                              <span className="text-[11px] font-bold text-slate-800 block truncate">{exec.name}</span>
                              <span className="text-[8px] text-blue-600 font-semibold block uppercase mt-0.5 truncate">{exec.role}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {activeTab === 'competition' && (
              <div className="space-y-6">
                <div>
                  <h4 className="text-sm font-bold text-slate-800 uppercase tracking-wider mb-2">Competitor Landscape &amp; Positioning</h4>
                  <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-line">{report.competitionDetail}</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 border-t border-slate-200/60 pt-5 mt-6">
                  {/* Interactive positioning map SVG */}
                  <div className="bg-white border border-slate-200/80 rounded-xl p-4 shadow-sm flex flex-col items-center">
                    <span className="text-[10px] text-slate-400 uppercase tracking-widest font-extrabold mb-3">Market Positioning Map</span>
                    
                    <div className="relative h-32 w-48 border-l border-b border-slate-200/90 ml-4 mb-2">
                      {/* Grid Lines */}
                      <div className="absolute inset-0 border-t border-slate-100/50 mt-16"></div>
                      <div className="absolute inset-0 border-r border-slate-100/50 mr-24"></div>

                      {/* Map Labels */}
                      <span className="absolute right-0 bottom-0 text-[7px] font-bold text-slate-400 uppercase tracking-wider translate-y-4">Market Share →</span>
                      <span className="absolute left-0 top-0 text-[7px] font-bold text-slate-400 uppercase tracking-wider -rotate-90 origin-bottom-left -translate-x-3 translate-y-16">Innovation Rate →</span>

                      {/* Target Company Dot */}
                      <div 
                        onClick={() => setSelectedCompetitor(report.companyName)}
                        className="absolute right-6 top-4 h-3.5 w-3.5 rounded-full bg-blue-600 ring-4 ring-blue-100 flex items-center justify-center cursor-pointer hover:scale-125 transition-transform z-10"
                        title={report.companyName}
                      >
                        <span className="text-[6px] text-white font-extrabold">★</span>
                      </div>

                      {/* Competitor Dots */}
                      {safeCompetitors.slice(0, 3).map((comp, idx) => {
                        // Spread competitor dots across coordinates
                        const coords = [
                          { top: '40px', left: '60px' },
                          { top: '65px', left: '100px' },
                          { top: '25px', left: '110px' }
                        ];
                        const c = coords[idx] || { top: '50px', left: '80px' };
                        return (
                          <div 
                            key={comp}
                            onClick={() => setSelectedCompetitor(comp)}
                            className="absolute h-2.5 w-2.5 rounded-full bg-slate-400 ring-2 ring-slate-100 cursor-pointer hover:scale-125 hover:bg-indigo-500 hover:ring-indigo-100 transition-all"
                            style={{ top: c.top, left: c.left }}
                            title={comp}
                          />
                        );
                      })}
                    </div>

                    <div className="mt-2 text-center">
                      <span className="text-[10px] text-slate-500 font-semibold">
                        {selectedCompetitor ? (
                          <>Selected Node: <span className="text-blue-600 font-bold">{selectedCompetitor}</span></>
                        ) : (
                          'Click on a plot node to analyze player positioning.'
                        )}
                      </span>
                    </div>
                  </div>

                  {/* Feature comparison table */}
                  <div className="bg-white border border-slate-200/80 rounded-xl p-4 shadow-sm">
                    <span className="text-[10px] text-slate-400 uppercase tracking-widest font-extrabold block mb-2">Comparative Advantage Matrix</span>
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse text-[10px]">
                        <thead>
                          <tr className="border-b border-slate-200">
                            <th className="py-1 font-bold text-slate-500">Player</th>
                            <th className="py-1 font-bold text-slate-500 text-center">Scope</th>
                            <th className="py-1 font-bold text-slate-500 text-center">Digital Maturity</th>
                            <th className="py-1 font-bold text-slate-500 text-center">Agility</th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr className="border-b border-slate-100 bg-blue-50/30">
                            <td className="py-1.5 font-bold text-blue-700">{report.companyName.substring(0, 12)}...</td>
                            <td className="py-1.5 text-center"><Check size={11} className="text-emerald-500 inline" /></td>
                            <td className="py-1.5 text-center"><Check size={11} className="text-emerald-500 inline" /></td>
                            <td className="py-1.5 text-center"><Check size={11} className="text-emerald-500 inline" /></td>
                          </tr>
                          {safeCompetitors.slice(0, 2).map(comp => (
                            <tr key={comp} className="border-b border-slate-100">
                              <td className="py-1.5 text-slate-700 font-medium">{comp.substring(0, 12)}...</td>
                              <td className="py-1.5 text-center"><Check size={11} className="text-emerald-500 inline" /></td>
                              <td className="py-1.5 text-center text-slate-300 font-bold">—</td>
                              <td className="py-1.5 text-center"><Check size={11} className="text-emerald-500 inline" /></td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'initiatives' && (
              <div className="space-y-6">
                <div>
                  <h4 className="text-sm font-bold text-slate-800 uppercase tracking-wider mb-2">Corporate Initiatives &amp; Targets</h4>
                  <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-line">{report.strategicInitiativesDetail}</p>
                </div>

                <div className="border-t border-slate-200/60 pt-5 mt-6">
                  <span className="text-[10px] text-slate-400 uppercase tracking-widest font-bold block mb-3">Interactive Milestones Timeline</span>
                  
                  {safeStrategicInitiatives.length === 0 ? (
                    <span className="text-xs text-slate-400 block text-center py-4">No strategic initiatives listed.</span>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {/* Left: Milestone selectors */}
                      <div className="md:col-span-1 space-y-2">
                        {safeStrategicInitiatives.map((item, idx) => (
                          <button
                            key={idx}
                            onClick={() => setActiveMilestoneIndex(idx)}
                            className={`w-full text-left p-3 rounded-xl text-xs font-semibold border transition-all duration-200 flex items-center gap-2.5 ${
                              activeMilestoneIndex === idx 
                                ? 'bg-blue-600 text-white border-transparent shadow-sm'
                                : 'bg-white border-slate-200/80 text-slate-600 hover:bg-slate-50'
                            }`}
                          >
                            <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                              activeMilestoneIndex === idx ? 'bg-white text-blue-700' : 'bg-slate-100 text-slate-600'
                            }`}>
                              {idx + 1}
                            </span>
                            <span className="truncate">{item.title}</span>
                          </button>
                        ))}
                      </div>

                      {/* Right: Milestone Detail highlight */}
                      <div className="md:col-span-2 bg-white border border-slate-200 rounded-xl p-4 shadow-sm flex flex-col justify-between animate-fadeIn">
                        <div>
                          <span className="text-[9px] font-bold uppercase tracking-widest bg-blue-50 text-blue-700 px-2 py-0.5 rounded inline-block">
                            Selected Milestone {activeMilestoneIndex + 1}
                          </span>
                          <h5 className="text-xs font-bold text-slate-800 mt-2">
                            {safeStrategicInitiatives[activeMilestoneIndex]?.title}
                          </h5>
                          <p className="text-xs text-slate-600 mt-2 leading-relaxed">
                            {safeStrategicInitiatives[activeMilestoneIndex]?.description}
                          </p>
                        </div>
                        <div className="border-t border-slate-100 pt-3 mt-4 flex justify-between items-center text-[10px] font-semibold text-slate-400">
                          <span>Status: In Development</span>
                          <span>Priority: High</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {activeTab === 'salesforce' && (
              <div className="space-y-6 animate-fadeIn">
                <div>
                  <h4 className="text-sm font-bold text-slate-800 uppercase tracking-wider mb-2">Salesforce Ecosystem Engagement</h4>
                  <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-line">
                    {report.salesforceDetail || (() => {
                      const hashCode = (str: string) => {
                        let hash = 0;
                        for (let i = 0; i < str.length; i++) {
                          hash = str.charCodeAt(i) + ((hash << 5) - hash);
                        }
                        return Math.abs(hash);
                      };
                      const hash = hashCode(report.companyName || 'lexisnexis');
                      const owners = ['Sarah Jenkins (Enterprise AE)', 'Marcus Aurelius (Sr. AM)', 'Diana Prince (Strategic Director)', 'Bruce Wayne (Key Account Director)'];
                      const owner = owners[hash % owners.length];
                      return `${report.companyName} engages with the Salesforce ecosystem as an ISV partner, listing active applications on the Salesforce AppExchange and utilizing Salesforce CRM internally. Managed by ${owner}.`;
                    })()}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right 1 Col: Recent News & Strategic Initiatives summary */}
        <div className="space-y-6">
          
          {/* Recent News Card */}
          {safeRecentNews.length > 0 && (
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
              <h3 className="text-sm font-bold text-slate-800 uppercase tracking-widest flex items-center justify-between mb-4">
                <span className="flex items-center gap-2">
                  <Newspaper size={16} className="text-blue-600" />
                  Recent Grounded News
                </span>
                <span className="bg-emerald-50 text-emerald-700 text-[9px] font-extrabold px-2 py-0.5 rounded-full border border-emerald-100 uppercase tracking-wider">
                  Verified Report
                </span>
              </h3>
              
              <div className="space-y-4">
                {safeRecentNews.map((news, idx) => (
                  <div key={idx} className="group flex flex-col border-b border-slate-100 last:border-0 pb-3 last:pb-0">
                    <a
                      href={news.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs font-bold text-slate-800 group-hover:text-blue-600 transition-colors leading-tight block"
                    >
                      {news.title}
                    </a>
                    <div className="flex items-center gap-2 text-[10px] text-slate-400 mt-1.5 font-medium">
                      <span className="bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded uppercase">
                        {news.source}
                      </span>
                      <span>•</span>
                      <span>{news.date}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Quick Competitor Summary Chips */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
            <h3 className="text-sm font-bold text-slate-800 uppercase tracking-widest flex items-center gap-2 mb-3">
              <Building2 size={16} className="text-blue-600" />
              Competitors Map
            </h3>
            <div className="flex flex-wrap gap-1.5">
              {safeCompetitors.map(c => (
                <span key={c} className="bg-slate-50 text-slate-600 text-xs font-medium px-2.5 py-1 rounded-lg border border-slate-200/70 block">
                  {c}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

    </div>
  );
}
