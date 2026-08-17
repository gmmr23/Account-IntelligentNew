import React, { useState, useEffect, useRef } from 'react';
import { 
  Building2, 
  Sparkles, 
  Plus, 
  ArrowRight, 
  Search, 
  HelpCircle, 
  Globe,
  Mail,
  ShieldAlert,
  Loader2,
  FileCheck2
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

// Import Types
import { 
  ResearchHistoryItem, 
  ResearchReport, 
  DashboardStats, 
  SystemSettings 
} from './types';

// Import Components
import Sidebar from './components/Sidebar';
import AgentWorkflow from './components/AgentWorkflow';
import ReportView from './components/ReportView';
import Dashboard from './components/Dashboard';
import ResearchHistory from './components/ResearchHistory';
import SettingsPage from './components/SettingsPage';
import ToastContainer, { ToastMessage } from './components/Toast';

// Import Utilities
import { downloadHtmlReport } from './utils';

export default function App() {
  // Navigation / Sidebar State
  const [currentTab, setCurrentTab] = useState<string>('research');
  const [sidebarCollapsed, setSidebarCollapsed] = useState<boolean>(false);

  // Form Fields
  const [companyName, setCompanyName] = useState<string>('');
  const [companyWebsite, setCompanyWebsite] = useState<string>('');
  const [emailAddress, setEmailAddress] = useState<string>('john@enterprise.com');

  // Interactive Research Job State
  const [researchState, setResearchState] = useState<'idle' | 'processing' | 'viewing-report'>('idle');
  const [activeJobId, setActiveJobId] = useState<string | null>(null);
  const [activeReport, setActiveReport] = useState<ResearchReport | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [currentStep, setCurrentStep] = useState<string | null>(null);

  // Database / Stats State
  const [historyList, setHistoryList] = useState<ResearchHistoryItem[]>([]);
  const [dashboardStats, setDashboardStats] = useState<DashboardStats>({
    totalReports: 0,
    researchToday: 0,
    avgProcessingTime: 0,
    reportsSent: 0,
    topIndustries: [],
    recentResearch: []
  });

  // System Preferences
  const [settings, setSettings] = useState<SystemSettings>({
    theme: 'Enterprise Light',
    apiKeyMode: 'System Key',
    customApiKey: '',
    emailSettings: {
      sendAutomatically: true,
      ccAddress: 'sales-tracker@enterprise.com',
      signature: 'Account Intelligence Team'
    },
    notificationPreferences: {
      researchStarted: false,
      sourcesFound: false,
      agentsCompleted: false,
      emailSent: false,
      reportGenerated: false
    },
    researchPreferences: {
      deepResearchLevel: 'Deep',
      focusAreas: ['Technical Systems & Tech Stack', 'Competitor Comparison Landscape'],
      maxSources: 8
    },
    n8nIntegration: {
      mode: 'disabled',
      webhookUrl: '',
      authToken: ''
    }
  });

  // Toasts Alert state
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  // Timeout references for workflow notifications
  const sourcesTimeoutRef = useRef<any>(null);
  const agentsTimeoutRef = useRef<any>(null);

  const [waitingForReportAfterSimulation, setWaitingForReportAfterSimulation] = useState(false);
  const simulationFinishedTimeoutRef = useRef<any>(null);

  // Sync state variables to refs to avoid stale SSE closures
  const activeJobIdRef = useRef<string | null>(null);
  const n8nModeRef = useRef<string>('disabled');
  const emailAddressRef = useRef<string>('');
  const downloadedJobsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    activeJobIdRef.current = activeJobId;
  }, [activeJobId]);

  useEffect(() => {
    n8nModeRef.current = settings.n8nIntegration.mode;
  }, [settings.n8nIntegration.mode]);

  useEffect(() => {
    emailAddressRef.current = emailAddress;
  }, [emailAddress]);

  // Effect to navigate when report is received after simulation finished
  useEffect(() => {
    if (waitingForReportAfterSimulation && activeReport) {
      setWaitingForReportAfterSimulation(false);
      if (simulationFinishedTimeoutRef.current) {
        clearTimeout(simulationFinishedTimeoutRef.current);
      }
      setResearchState('viewing-report');
      if (settings.notificationPreferences.reportGenerated) {
        showNotification('Enterprise intelligence report compiled', 'success');
      }
      if (settings.emailSettings.sendAutomatically && settings.notificationPreferences.emailSent) {
        setTimeout(() => {
          showNotification(`Intelligence report mailed to ${emailAddress}`, 'success');
        }, 1500);
      }
      fetchHistoryAndStats();
    }
  }, [activeReport, waitingForReportAfterSimulation]);

  // Research workflow error state
  const [researchError, setResearchError] = useState<string | null>(null);

  const showNotification = (text: string, type: 'success' | 'info' | 'error' = 'info') => {
    const id = 'toast-' + Math.random().toString(36).substr(2, 9);
    setToasts(prev => [...prev, { id, text, type }]);
  };

  const removeNotification = (id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  // Sync / Load History & Stats from API
  const fetchHistoryAndStats = async () => {
    try {
      const histRes = await fetch('/api/history');
      if (histRes.ok) {
        const data = await histRes.json();
        setHistoryList(data);
      }

      const statsRes = await fetch('/api/stats');
      if (statsRes.ok) {
        const statsData = await statsRes.json();
        setDashboardStats(statsData);
      }
    } catch (err) {
      console.error('Failed to sync history from backend server:', err);
    }
  };

  // Initial Seed Load
  useEffect(() => {
    fetchHistoryAndStats();

    const loadServerSettings = async () => {
      try {
        const configRes = await fetch('/api/settings');
        if (configRes.ok) {
          const config = await configRes.json();
          if (config.n8nMode !== 'disabled') {
            setSettings(prev => ({
              ...prev,
              n8nIntegration: {
                mode: config.n8nMode,
                webhookUrl: config.n8nWebhookUrl,
                authToken: config.n8nAuthToken === 'configured' ? 'configured' : ''
              }
            }));
          }
        }
      } catch (err) {
        console.error('Failed to load server settings defaults:', err);
      }
    };
    loadServerSettings();
  }, []);

  // Real-time updates via Server-Sent Events (SSE)
  useEffect(() => {
    console.log('[SSE] Connecting to event stream...');
    const eventSource = new EventSource('/api/updates');

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        console.log('[SSE] Message received:', data);

        if (data.type === 'initial') {
          setHistoryList(data.history);
        } else if (data.type === 'job_added') {
          setHistoryList(data.history);
          // Refresh stats
          fetch('/api/stats')
            .then(res => res.ok ? res.json() : null)
            .then(statsData => {
              if (statsData) setDashboardStats(statsData);
            });
        } else if (data.type === 'job_deleted') {
          setHistoryList(data.history);
          // Refresh stats
          fetch('/api/stats')
            .then(res => res.ok ? res.json() : null)
            .then(statsData => {
              if (statsData) setDashboardStats(statsData);
            });
        } else if (data.type === 'job_updated') {
          setHistoryList(data.history);
          
          const currentActiveJobId = activeJobIdRef.current;
          const target = data.job;

          if (currentActiveJobId && target && target.id === currentActiveJobId) {
            if (target.status === 'Completed' && target.report) {
              setActiveReport(target.report);
              
              // Automatically download document if it was an n8n job
              if (n8nModeRef.current !== 'disabled') {
                if (!downloadedJobsRef.current.has(target.id)) {
                  downloadedJobsRef.current.add(target.id);
                  downloadHtmlReport(target.companyName, target.report, target.rawHtml);
                  showNotification('Research complete. n8n document downloaded automatically.', 'success');
                }
              }

              if (sourcesTimeoutRef.current) clearTimeout(sourcesTimeoutRef.current);
              if (agentsTimeoutRef.current) clearTimeout(agentsTimeoutRef.current);
            } else if (target.status === 'Failed') {
              const errMsg = target.error || 'unspecified error';
              showNotification(`Research agent failed: ${errMsg}`, 'error');
              setResearchError(errMsg);
              
              if (sourcesTimeoutRef.current) clearTimeout(sourcesTimeoutRef.current);
            } else {
              if (target.statusMessage) setStatusMessage(target.statusMessage);
              if (target.currentStep) setCurrentStep(target.currentStep);
            }
          }
        }
      } catch (err) {
        console.error('[SSE] Failed to parse event data:', err);
      }
    };

    eventSource.onerror = (err) => {
      console.error('[SSE] Connection error:', err);
    };

    return () => {
      console.log('[SSE] Closing connection...');
      eventSource.close();
    };
  }, []);

  // Handle suggested chips pre-fill
  const handleSelectSuggestion = (company: string, domain: string) => {
    setCompanyName(company);
    setCompanyWebsite(domain);
    showNotification(`Pre-filled coordinates for ${company}`, 'info');
  };

  // Form submission / Initiate research run
  const handleGenerateReport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!companyName) {
      showNotification('Please specify a company name to research', 'error');
      return;
    }

    // Email format validation (checks presence of @, . and TLD)
    if (emailAddress) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[a-zA-Z]{2,}$/;
      if (!emailRegex.test(emailAddress)) {
        showNotification('Invalid email format. Must contain "@", "." and a valid top-level domain (e.g. .com, .org)', 'error');
        setResearchState('idle');
        return;
      }
    }

    // Generate client-side jobId immediately to avoid race conditions with SSE callbacks
    const jobId = 'h-' + Math.random().toString(36).substr(2, 9);
    setActiveJobId(jobId);
    setStatusMessage('Initiating input validation...');
    setActiveReport(null);
    setResearchError(null);
    setResearchState('processing');

    if (settings.notificationPreferences.researchStarted) {
      showNotification(`Research started for ${companyName}`, 'info');
    }

    try {
      const response = await fetch('/api/research', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jobId,
          companyName,
          companyWebsite,
          email: emailAddress,
          focusAreas: settings.researchPreferences.focusAreas,
          deepResearchLevel: settings.researchPreferences.deepResearchLevel,
          n8nIntegration: settings.n8nIntegration
        })
      });

      if (response.ok) {
        if (sourcesTimeoutRef.current) clearTimeout(sourcesTimeoutRef.current);
        if (agentsTimeoutRef.current) clearTimeout(agentsTimeoutRef.current);

        // Notify sources found step
        sourcesTimeoutRef.current = setTimeout(() => {
          if (settings.notificationPreferences.sourcesFound) {
            showNotification('Authoritative web resources identified', 'success');
          }
        }, 3000);

        // Notify agents active
        agentsTimeoutRef.current = setTimeout(() => {
          if (settings.notificationPreferences.agentsCompleted) {
            showNotification('Active AI agents synchronized', 'success');
          }
        }, 7500);

      } else {
        const errData = await response.json().catch(() => ({}));
        const errMsg = errData.error || 'Invalid inputs provided: Please check the company name, domain, or email address and try again.';
        showNotification(`Research agent failed: ${errMsg}`, 'error');
        setResearchError(errMsg);
        setResearchState('idle');
      }
    } catch (err) {
      showNotification('Network connection error. Server is unreachable.', 'error');
      setResearchError('Network connection error. Server is unreachable.');
      setResearchState('idle');
    }
  };

  // Triggered when AgentWorkflow simulation completes
  const handleWorkflowFinished = () => {
    // If the real backend report is already resolved in activeReport, navigate to ReportView!
    // If not, we wait for SSE updates.
    if (activeReport) {
      setResearchState('viewing-report');
      if (settings.notificationPreferences.reportGenerated) {
        showNotification('Enterprise intelligence report compiled', 'success');
      }
      if (settings.emailSettings.sendAutomatically && settings.notificationPreferences.emailSent) {
        setTimeout(() => {
          showNotification(`Intelligence report mailed to ${emailAddress}`, 'success');
        }, 1500);
      }
      fetchHistoryAndStats();
    } else {
      // In SSE mode, we don't need to poll. We just wait for SSE to set activeReport.
      setWaitingForReportAfterSimulation(true);
      
      // Still keep a timeout to fail if it takes too long (e.g. 15 seconds)
      if (simulationFinishedTimeoutRef.current) clearTimeout(simulationFinishedTimeoutRef.current);
      simulationFinishedTimeoutRef.current = setTimeout(() => {
        setWaitingForReportAfterSimulation(false);
        if (!activeReport) {
          showNotification('Research report generation timed out. Please check logs.', 'error');
          setResearchState('idle');
        }
      }, 15000);
    }
  };

  // Back to input landing
  const handleStartNewResearch = () => {
    setCompanyName('');
    setCompanyWebsite('');
    setActiveReport(null);
    setActiveJobId(null);
    setStatusMessage(null);
    setCurrentStep(null);
    setResearchError(null);
    setResearchState('idle');
    setCurrentTab('research');
    if (sourcesTimeoutRef.current) clearTimeout(sourcesTimeoutRef.current);
    if (agentsTimeoutRef.current) clearTimeout(agentsTimeoutRef.current);
    if (simulationFinishedTimeoutRef.current) clearTimeout(simulationFinishedTimeoutRef.current);
    setWaitingForReportAfterSimulation(false);
  };

  // Select historical report from logs
  const handleSelectReport = (item: ResearchHistoryItem) => {
    if (item.report) {
      setActiveReport(item.report);
      setCompanyName(item.companyName);
      setCompanyWebsite(item.website);
      setEmailAddress(item.email);
      setActiveJobId(item.id);
      setResearchState('viewing-report');
      setCurrentTab('research');
      showNotification(`Viewing report for ${item.companyName}`, 'info');
    } else {
      showNotification('Report payload is corrupted or missing', 'error');
    }
  };

  // Delete log item
  const handleDeleteHistory = async (id: string) => {
    try {
      const res = await fetch(`/api/history/${id}`, { method: 'DELETE' });
      if (res.ok) {
        fetchHistoryAndStats();
        if (activeJobId === id) {
          handleStartNewResearch();
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Simulated Email send
  const handleSendEmailReport = () => {
    showNotification(`SMTP handshake initiated. Delivering file to ${emailAddress}`, 'info');
    setTimeout(() => {
      showNotification(`Report sent successfully to ${emailAddress}`, 'success');
    }, 2000);
  };

  // Get theme-specific layout classes
  const getThemeClasses = () => {
    switch (settings.theme) {
      case 'Enterprise Light':
        return 'bg-[#F8FAFC] text-slate-900';
      case 'Slate Blue':
        return 'bg-[#EDF2F7] text-[#1A202C]';
      case 'Light':
      default:
        return 'bg-slate-50 text-slate-800';
    }
  };

  return (
    <div className={`flex h-screen w-screen overflow-hidden font-sans ${getThemeClasses()}`}>
      
      {/* Toast Alert Drawer */}
      <ToastContainer toasts={toasts} onClose={removeNotification} />

      {/* Left Sidebar navigation panel */}
      <Sidebar
        currentTab={currentTab}
        setCurrentTab={(tab) => {
          setCurrentTab(tab);
          // If moving away from research, keep active report state but reset workspace input views if idle
          if (tab !== 'research' && researchState === 'processing') {
            showNotification('Multi-agent research continues running in background', 'info');
          }
        }}
        collapsed={sidebarCollapsed}
        setCollapsed={setSidebarCollapsed}
        onNewResearch={handleStartNewResearch}
      />

      {/* Main Container workspace */}
      <main className="flex-1 flex flex-col h-full overflow-hidden relative">
        
        {/* Top Header Rail */}
        <header className="h-14 bg-white border-b border-slate-200 px-6 md:px-8 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2 text-xs md:text-sm">
            <span className="text-slate-400 capitalize font-medium">{currentTab}</span>
            <span className="text-slate-300">/</span>
            <span className="font-semibold text-slate-700">
              {currentTab === 'research' ? (
                researchState === 'idle' ? 'New Workspace' :
                researchState === 'processing' ? `Active Project: ${companyName || 'Analyzing...'}` :
                `Compiled Report: ${companyName}`
              ) : currentTab === 'dashboard' ? (
                'Enterprise Analytics Summary'
              ) : currentTab === 'history' ? (
                'Account Intelligence Telemetry Logs'
              ) : (
                'System Configuration Preferences'
              )}
            </span>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 text-xs text-slate-500 font-medium">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <span>All Workspace Agents Online</span>
            </div>
          </div>
        </header>

        {/* Dynamic Route Screen Frame */}
        <div className="flex-1 overflow-hidden relative">
          <AnimatePresence mode="wait">
            {currentTab === 'research' && (
              <motion.div
                key="research-tab"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                transition={{ duration: 0.2 }}
                className="h-full w-full"
              >
                {/* 1. Landing Input View */}
                {researchState === 'idle' && (
                  <div className="max-w-4xl mx-auto px-4 py-8 md:py-12 overflow-y-auto h-full space-y-8">
                    
                    {/* Welcome Banner */}
                    <div className="text-center space-y-3">
                      <div className="mx-auto w-12 h-12 rounded-2xl bg-blue-600 text-white flex items-center justify-center shadow-lg shadow-blue-100 mb-2">
                        <Sparkles size={24} className="animate-pulse" />
                      </div>
                      <h2 className="text-2xl md:text-3xl font-extrabold text-slate-800 tracking-tight leading-none">
                        Welcome to Account Intelligence Research Agent
                      </h2>
                      <p className="text-xs md:text-sm text-slate-500 max-w-lg mx-auto font-medium">
                        Research any company and generate an enterprise intelligence report in minutes.
                      </p>
                    </div>

                    {/* Input Form Cards */}
                    <form onSubmit={handleGenerateReport} className="bg-white border border-slate-200 rounded-2xl p-6 md:p-8 shadow-md space-y-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        
                        {/* Company Name */}
                        <div className="space-y-1.5">
                          <label className="text-xs font-bold text-slate-700 block uppercase tracking-wider">
                            Company Name
                          </label>
                          <div className="relative">
                            <Building2 className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                            <input
                              type="text"
                              required
                              value={companyName}
                              onChange={(e) => setCompanyName(e.target.value)}
                              placeholder="e.g. Microsoft"
                              className="w-full bg-slate-50 hover:bg-slate-100/50 focus:bg-white border border-slate-200 rounded-xl py-3 pl-10 pr-4 text-xs font-semibold placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 transition-all"
                            />
                          </div>
                        </div>

                        {/* Company Website */}
                        <div className="space-y-1.5">
                          <label className="text-xs font-bold text-slate-700 block uppercase tracking-wider">
                            Company Website
                          </label>
                          <div className="relative">
                            <Globe className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                            <input
                              type="text"
                              value={companyWebsite}
                              onChange={(e) => setCompanyWebsite(e.target.value)}
                              placeholder="e.g. microsoft.com"
                              className="w-full bg-slate-50 hover:bg-slate-100/50 focus:bg-white border border-slate-200 rounded-xl py-3 pl-10 pr-4 text-xs font-semibold placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 transition-all"
                            />
                          </div>
                        </div>

                      </div>

                      {/* Recipient Email */}
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-700 block uppercase tracking-wider">
                          Distribution Email Address
                        </label>
                        <div className="relative">
                          <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                          <input
                            type="email"
                            required
                            pattern="[^@\s]+@[^@\s]+\.[a-zA-Z]{2,}"
                            value={emailAddress}
                            onChange={(e) => setEmailAddress(e.target.value)}
                            placeholder="john@example.com"
                            className="w-full bg-slate-50 hover:bg-slate-100/50 focus:bg-white border border-slate-200 rounded-xl py-3 pl-10 pr-4 text-xs font-semibold placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 transition-all"
                          />

                        </div>
                      </div>

                      {/* Main Launch Button */}
                      <button
                        id="generate-intelligence-btn"
                        type="submit"
                        className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs py-4 rounded-xl transition-all shadow-lg shadow-blue-100/80 active:scale-99 flex items-center justify-center gap-2 cursor-pointer"
                      >
                        <FileCheck2 size={16} className="stroke-[2.5]" />
                        Generate Intelligence Report
                        <ArrowRight size={14} className="stroke-[2.5]" />
                      </button>
                    </form>

                    {/* Suggestions Chip Row */}
                    <div className="space-y-3">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block text-center">
                        Quick Grounding Examples
                      </span>
                      <div className="flex flex-wrap items-center justify-center gap-2.5 max-w-2xl mx-auto">
                        {[
                          { name: 'Salesforce', website: 'salesforce.com' },
                          { name: 'OpenAI', website: 'openai.com' },
                          { name: 'Microsoft', website: 'microsoft.com' },
                          { name: 'Nvidia', website: 'nvidia.com' },
                          { name: 'Stripe', website: 'stripe.com' }
                        ].map((company) => (
                          <button
                            id={`suggestion-chip-${company.name.toLowerCase()}`}
                            key={company.name}
                            type="button"
                            onClick={() => handleSelectSuggestion(company.name, company.website)}
                            className="bg-white hover:bg-blue-50/50 border border-slate-200 hover:border-blue-200 text-slate-600 hover:text-blue-600 px-4 py-2 rounded-full text-xs font-bold transition-all shadow-xs cursor-pointer hover:-translate-y-0.5"
                          >
                            Research {company.name}
                          </button>
                        ))}
                      </div>
                    </div>

                  </div>
                )}

                {/* 2. Agent Processing Screen */}
                {researchState === 'processing' && (
                  <AgentWorkflow 
                    companyName={companyName} 
                    onComplete={handleWorkflowFinished} 
                    statusMessage={statusMessage}
                    currentStep={currentStep}
                    isCompleted={!!activeReport}
                    isFailed={!!researchError}
                    errorMessage={researchError}
                    onCancel={handleStartNewResearch}
                    validationResolved={activeJobId !== null}
                  />
                )}


                {/* 3. Compiled Report View */}
                {researchState === 'viewing-report' && activeReport && (
                  <ReportView
                    report={activeReport}
                    jobId={activeJobId || ''}
                    rawHtml={historyList.find(item => item.id === activeJobId)?.rawHtml}
                    email={emailAddress}
                    onNewResearch={handleStartNewResearch}
                    onSendEmail={handleSendEmailReport}
                    onShowNotification={showNotification}
                  />
                )}
              </motion.div>
            )}

            {/* Dashboard Analytics View */}
            {currentTab === 'dashboard' && (
              <motion.div
                key="dashboard-tab"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="h-full w-full"
              >
                <Dashboard 
                  stats={dashboardStats} 
                  onSelectReport={handleSelectReport} 
                />
              </motion.div>
            )}

            {/* Research History List view */}
            {currentTab === 'history' && (
              <motion.div
                key="history-tab"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="h-full w-full"
              >
                <ResearchHistory
                  history={historyList}
                  onSelectReport={handleSelectReport}
                  onDeleteHistory={handleDeleteHistory}
                  onShowNotification={showNotification}
                />
              </motion.div>
            )}

            {/* Settings Configuration Page */}
            {currentTab === 'settings' && (
              <motion.div
                key="settings-tab"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="h-full w-full"
              >
                <SettingsPage
                  settings={settings}
                  setSettings={setSettings}
                  onShowNotification={showNotification}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
}
