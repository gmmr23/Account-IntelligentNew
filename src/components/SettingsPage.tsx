import React, { useState } from 'react';
import { 
  Settings, 
  Palette, 
  Key, 
  Mail, 
  Bell, 
  Compass, 
  ShieldCheck, 
  Lock,
  Save,
  Check,
  Network,
  Link2,
  Zap,
  Copy
} from 'lucide-react';
import { SystemSettings } from '../types';

interface SettingsPageProps {
  settings: SystemSettings;
  setSettings: React.Dispatch<React.SetStateAction<SystemSettings>>;
  onShowNotification: (message: string, type: 'success' | 'info') => void;
}

export default function SettingsPage({
  settings,
  setSettings,
  onShowNotification
}: SettingsPageProps) {
  const [copied, setCopied] = useState(false);
  
  const handleCopyCallback = () => {
    const callbackUrl = `${window.location.origin}/api/research/callback/{jobId}`;
    navigator.clipboard.writeText(callbackUrl);
    setCopied(true);
    onShowNotification('Callback URL copied to clipboard', 'success');
    setTimeout(() => setCopied(false), 2000);
  };
  
  const handleSave = async () => {
    try {
      const response = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          n8nMode: settings.n8nIntegration?.mode,
          n8nWebhookUrl: settings.n8nIntegration?.webhookUrl,
          n8nAuthToken: settings.n8nIntegration?.authToken
        })
      });
      if (response.ok) {
        onShowNotification('System preferences saved successfully', 'success');
      } else {
        onShowNotification('Saved locally, but failed to sync to server', 'info');
      }
    } catch (err) {
      console.error('Failed to sync settings to server:', err);
      onShowNotification('Saved locally, but server was unreachable', 'info');
    }
  };



  const toggleNotification = (key: keyof SystemSettings['notificationPreferences']) => {
    setSettings(prev => ({
      ...prev,
      notificationPreferences: {
        ...prev.notificationPreferences,
        [key]: !prev.notificationPreferences[key]
      }
    }));
  };

  const toggleFocusArea = (area: string) => {
    setSettings(prev => {
      const current = prev.researchPreferences.focusAreas;
      const next = current.includes(area)
        ? current.filter(a => a !== area)
        : [...current, area];
      return {
        ...prev,
        researchPreferences: {
          ...prev.researchPreferences,
          focusAreas: next
        }
      };
    });
  };

  return (
    <div className="space-y-8 p-4 md:p-6 max-w-4xl mx-auto overflow-y-auto h-full">
      {/* Header Banner */}
      <div className="border-b border-slate-200 pb-5">
        <h1 className="text-xl font-bold text-slate-800 tracking-tight flex items-center gap-2">
          <Settings className="text-blue-600" size={24} />
          System Preferences
        </h1>
        <p className="text-xs text-slate-500 mt-0.5">
          Configure multi-agent research depth, email distribution automation, and layout themes
        </p>
      </div>

      <div className="space-y-6">
        {/* Theme Settings Section */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 md:p-6 shadow-sm">
          <h3 className="text-sm font-bold text-slate-800 uppercase tracking-widest flex items-center gap-2 mb-4">
            <Palette size={16} className="text-blue-600" />
            Visual Workspace Theme
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {[
              { id: 'Light', name: 'Default Charcoal', desc: 'Minimal soft off-white & charcoal layout' },
              { id: 'Enterprise Light', name: 'Enterprise Premium', desc: 'Pure white canvas with modern cobalt highlights' },
              { id: 'Slate Blue', name: 'Professional Slate', desc: 'Slightly technical workspace structure' }
            ].map(themeOpt => {
              const isSelected = settings.theme === themeOpt.id;
              return (
                <button
                  key={themeOpt.id}
                  onClick={() => setSettings(prev => ({ ...prev, theme: themeOpt.id as any }))}
                  className={`p-4 border rounded-xl text-left transition-all ${
                    isSelected
                      ? 'border-blue-600 bg-blue-50/50 shadow-sm'
                      : 'border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-bold text-slate-800">{themeOpt.name}</span>
                    {isSelected && <Check size={14} className="text-blue-600" />}
                  </div>
                  <p className="text-[10px] text-slate-500 leading-normal">{themeOpt.desc}</p>
                </button>
              );
            })}
          </div>
        </div>

        {/* API Credentials & Security Section */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 md:p-6 shadow-sm">
          <h3 className="text-sm font-bold text-slate-800 uppercase tracking-widest flex items-center gap-2 mb-2">
            <Key size={16} className="text-blue-600" />
            API Key &amp; Secure Token Handshakes
          </h3>
          <p className="text-xs text-slate-400 mb-4">
            Managing secure integration channels with global LLM model checkpoints.
          </p>

          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex items-start gap-3.5">
            <div className="bg-emerald-100 text-emerald-700 p-2 rounded-lg mt-0.5">
              <ShieldCheck size={18} className="stroke-[2.5]" />
            </div>
            <div className="min-w-0">
              <span className="text-xs font-bold text-slate-800 block">
                Automatic Server Key Active
              </span>
              <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
                Your application utilizes the server-side environment variable <code className="font-mono bg-slate-200/50 px-1 py-0.5 rounded text-blue-600">GEMINI_API_KEY</code> loaded securely to power the chatbot, while compiling the report overview fully offline. Direct manual key handling has been restricted to secure your enterprise credentials.
              </p>
              <div className="mt-3 inline-flex items-center gap-1.5 bg-emerald-50 text-emerald-800 text-[10px] font-bold border border-emerald-100 py-1 px-2.5 rounded">
                <Lock size={11} />
                SECURE TOKEN LOADED
              </div>
            </div>
          </div>
        </div>

        {/* Research Agent Preferences */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 md:p-6 shadow-sm">
          <h3 className="text-sm font-bold text-slate-800 uppercase tracking-widest flex items-center gap-2 mb-4">
            <Compass size={16} className="text-blue-600" />
            Agent Analysis Specifications
          </h3>

          <div className="space-y-5">
            {/* Deep Research Level selection */}
            <div>
              <span className="text-xs font-bold text-slate-700 block mb-2">Deep Research Analysis Tier</span>
              <div className="flex gap-2">
                {['Standard', 'Deep', 'Exhaustive'].map(tier => {
                  const isSelected = settings.researchPreferences.deepResearchLevel === tier;
                  return (
                    <button
                      key={tier}
                      onClick={() => setSettings(prev => ({
                        ...prev,
                        researchPreferences: { ...prev.researchPreferences, deepResearchLevel: tier as any }
                      }))}
                      className={`py-1.5 px-3 rounded-lg text-xs font-semibold transition-all border ${
                        isSelected
                          ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                          : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      {tier}
                    </button>
                  );
                })}
              </div>
              <span className="text-[10px] text-slate-400 block mt-1.5">
                Standard queries use single-hop discovery; Exhaustive tier triggers full multi-branch grounding analysis.
              </span>
            </div>

            {/* Focus areas checklist */}
            <div>
              <span className="text-xs font-bold text-slate-700 block mb-2">Research Focus Domains</span>
              <div className="grid grid-cols-2 gap-2">
                {[
                  'Technical Systems & Tech Stack',
                  'Competitor Comparison Landscape',
                  'Monetization & Business Modeling',
                  'Executive Management Backgrounds',
                  'Recent Financial Trajectories',
                  'Regulatory Filing Audits'
                ].map(area => {
                  const isChecked = settings.researchPreferences.focusAreas.includes(area);
                  return (
                    <label
                      key={area}
                      className="flex items-center gap-2.5 p-2.5 border border-slate-200/80 rounded-lg cursor-pointer hover:bg-slate-50/50 text-xs text-slate-600 font-medium select-none"
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => toggleFocusArea(area)}
                        className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 w-3.5 h-3.5"
                      />
                      {area}
                    </label>
                  );
                })}
              </div>
            </div>

            {/* Slider for max sources */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-bold text-slate-700">Max Grounded Search Citations</span>
                <span className="text-xs font-bold text-blue-600">{settings.researchPreferences.maxSources} Sources</span>
              </div>
              <input
                type="range"
                min="3"
                max="15"
                value={settings.researchPreferences.maxSources}
                onChange={(e) => setSettings(prev => ({
                  ...prev,
                  researchPreferences: { ...prev.researchPreferences, maxSources: parseInt(e.target.value) }
                }))}
                className="w-full h-1.5 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-blue-600"
              />
            </div>
          </div>
        </div>

        {/* Email Distribution Settings */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 md:p-6 shadow-sm">
          <h3 className="text-sm font-bold text-slate-800 uppercase tracking-widest flex items-center gap-2 mb-4">
            <Mail size={16} className="text-blue-600" />
            Report Email Automation
          </h3>

          <div className="space-y-4">
            <label className="flex items-center justify-between p-3 border border-slate-200 rounded-xl cursor-pointer hover:bg-slate-50/50">
              <div>
                <span className="text-xs font-bold text-slate-800 block">Deliver Reports Automatically</span>
                <span className="text-[10px] text-slate-500 block mt-0.5">Send full compiled HTML directly to recipient on success</span>
              </div>
              <input
                type="checkbox"
                checked={settings.emailSettings.sendAutomatically}
                onChange={(e) => setSettings(prev => ({
                  ...prev,
                  emailSettings: { ...prev.emailSettings, sendAutomatically: e.target.checked }
                }))}
                className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 w-4 h-4 cursor-pointer"
              />
            </label>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">Backup CC Address</label>
              <input
                type="email"
                value={settings.emailSettings.ccAddress}
                onChange={(e) => setSettings(prev => ({
                  ...prev,
                  emailSettings: { ...prev.emailSettings, ccAddress: e.target.value }
                }))}
                className="w-full bg-white border border-slate-200 rounded-xl p-2.5 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 transition-all"
                placeholder="sales-tracker@enterprise.com"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">Corporate Signature</label>
              <textarea
                value={settings.emailSettings.signature}
                onChange={(e) => setSettings(prev => ({
                  ...prev,
                  emailSettings: { ...prev.emailSettings, signature: e.target.value }
                }))}
                className="w-full bg-white border border-slate-200 rounded-xl p-2.5 text-xs font-medium h-20 focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 transition-all"
                placeholder="Enterprise Research Dept."
              />
            </div>
          </div>
        </div>

        {/* Notification preferences */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 md:p-6 shadow-sm">
          <h3 className="text-sm font-bold text-slate-800 uppercase tracking-widest flex items-center gap-2 mb-4">
            <Bell size={16} className="text-blue-600" />
            Alerts &amp; Toast Notifications
          </h3>

          <div className="space-y-2">
            {[
              { id: 'researchStarted', label: 'Research Sessions Started', desc: 'Notify immediately when the multi-agent queue begins processing' },
              { id: 'sourcesFound', label: 'Authoritative Sources Discovered', desc: 'Notify when unique search URLs are parsed' },
              { id: 'agentsCompleted', label: 'AI Workspace Handover Complete', desc: 'Notify on successful pipeline handshakes' },
              { id: 'emailSent', label: 'Report Delivered Successfully', desc: 'Notify when SMTP email triggers fire' },
              { id: 'reportGenerated', label: 'Profile Document Completed', desc: 'Notify when HTML narrative generation succeeds' }
            ].map(pref => {
              const checked = settings.notificationPreferences[pref.id as keyof SystemSettings['notificationPreferences']];
              return (
                <label
                  key={pref.id}
                  className="flex items-center justify-between p-2.5 border border-slate-100 hover:bg-slate-50/50 rounded-xl cursor-pointer select-none"
                >
                  <div className="min-w-0 pr-4">
                    <span className="text-xs font-semibold text-slate-800 block">{pref.label}</span>
                    <span className="text-[10px] text-slate-400 block mt-0.5 truncate">{pref.desc}</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggleNotification(pref.id as any)}
                    className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 w-3.5 h-3.5 cursor-pointer"
                  />
                </label>
              );
            })}
          </div>
        </div>

        {/* n8n Agent Integration */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 md:p-6 shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
            <h3 className="text-sm font-bold text-slate-800 uppercase tracking-widest flex items-center gap-2">
              <Network size={16} className="text-blue-600" />
              n8n Agent Integration
            </h3>
            <span className="inline-flex items-center gap-1 bg-amber-50 text-amber-800 text-[10px] font-bold border border-amber-100 py-1 px-2.5 rounded">
              <Lock size={10} />
              MANAGED BY ADMINISTRATOR
            </span>
          </div>
          <p className="text-xs text-slate-400 mb-5">
            External n8n workflow agent parameters. Editing n8n settings has been restricted to secure your enterprise workspace credentials. Administrators can modify these parameters via server-side environment configurations.
          </p>

          <div className="space-y-6">
            {/* Mode selection buttons */}
            <div>
              <span className="text-xs font-bold text-slate-700 block mb-3">n8n Agent Integration Mode</span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {[
                  { 
                    id: 'disabled', 
                    name: 'Standard (No n8n)', 
                    desc: 'Uses local offline mock report generator.' 
                  },
                  { 
                    id: 'researcher-sync', 
                    name: 'n8n Researcher (Sync)', 
                    desc: 'n8n workflow runs the research and returns the full JSON report in the webhook response.' 
                  },
                  { 
                    id: 'researcher-async', 
                    name: 'n8n Researcher (Async)', 
                    desc: 'Recommended. Webhook triggers n8n immediately. n8n posts results to callback URL when done.' 
                  },
                  { 
                    id: 'automation', 
                    name: 'n8n Automation Trigger', 
                    desc: 'Standard offline generator executes research first, then passes the compiled report to n8n webhook.' 
                  }
                ].map(modeOpt => {
                  const isSelected = settings.n8nIntegration?.mode === modeOpt.id;
                  return (
                    <button
                      key={modeOpt.id}
                      type="button"
                      disabled
                      className={`p-4 border rounded-xl text-left transition-all flex flex-col justify-between ${
                        isSelected
                          ? 'border-blue-600 bg-blue-50/50 shadow-sm cursor-not-allowed'
                          : 'border-slate-200 hover:bg-slate-50 cursor-not-allowed opacity-60'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1.5 w-full">
                        <span className="text-xs font-bold text-slate-800">{modeOpt.name}</span>
                        {isSelected && <Check size={14} className="text-blue-600 shrink-0" />}
                      </div>
                      <p className="text-[10px] text-slate-500 leading-normal">{modeOpt.desc}</p>
                    </button>
                  );
                })}
              </div>
            </div>

            {settings.n8nIntegration?.mode !== 'disabled' && (
              <div className="space-y-4 pt-2 border-t border-slate-100 animate-fadeIn">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    n8n Webhook URL
                  </label>
                  <input
                    type="url"
                    value={settings.n8nIntegration?.webhookUrl || ''}
                    disabled
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs font-medium focus:outline-none transition-all font-mono cursor-not-allowed opacity-80"
                    placeholder="https://primary-n8n.mycompany.com/webhook/research-agent"
                    required
                  />
                  <span className="text-[10px] text-slate-400 block mt-1">
                    Specify the active endpoint of your n8n Webhook Trigger node.
                  </span>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    Authorization Header Value (Optional)
                  </label>
                  <input
                    type="text"
                    value={settings.n8nIntegration?.authToken || ''}
                    disabled
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs font-medium focus:outline-none transition-all font-mono cursor-not-allowed opacity-80"
                    placeholder="Bearer eyJhbGci..."
                  />
                  <span className="text-[10px] text-slate-400 block mt-1">
                    Authorization header added to outgoing webhook requests. E.g. <code className="font-mono bg-slate-100 px-1 rounded text-slate-600">Bearer secret-token-here</code>
                  </span>
                </div>


                {settings.n8nIntegration?.mode === 'researcher-async' && (
                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-2">
                    <div className="flex items-center gap-2 text-slate-800">
                      <Link2 size={14} className="text-blue-600 shrink-0" />
                      <span className="text-xs font-bold">Asynchronous Callback Configuration</span>
                    </div>
                    <p className="text-[10px] text-slate-500 leading-relaxed">
                      In asynchronous mode, the server triggers your n8n workflow and immediately frees the client thread. When research completes, your n8n agent should make an **HTTP POST** request to the callback URL below.
                    </p>
                    <div className="flex items-center gap-2 mt-2 bg-white border border-slate-200 rounded-lg p-2 font-mono text-[10px] text-slate-700 select-all justify-between">
                      <span className="truncate">{window.location.origin}/api/research/callback/&#123;jobId&#125;</span>
                      <button
                        type="button"
                        onClick={handleCopyCallback}
                        className="bg-slate-100 hover:bg-slate-200 text-slate-600 p-1.5 rounded transition-colors shrink-0"
                        title="Copy callback URL"
                      >
                        <Copy size={11} />
                      </button>
                    </div>
                  </div>
                )}

                <div className="bg-blue-50/50 border border-blue-100 rounded-xl p-4">
                  <div className="flex items-center gap-2 text-blue-800 mb-1.5">
                    <Zap size={14} className="text-blue-600 shrink-0" />
                    <span className="text-xs font-bold">Payload Reference</span>
                  </div>
                  <p className="text-[10px] text-slate-500 leading-normal mb-2">
                    {settings.n8nIntegration?.mode === 'automation' 
                      ? 'The n8n webhook will receive a POST body containing the completed Research Report:'
                      : 'The n8n webhook will receive a POST body containing the research parameters:'}
                  </p>
                  <pre className="bg-slate-800 text-slate-200 rounded-lg p-2.5 text-[9px] font-mono leading-normal overflow-x-auto max-h-40">
                    {settings.n8nIntegration?.mode === 'automation' ? (
`{
  "jobId": "h-abc123xyz",
  "companyName": "Acme Corp",
  "website": "acme.com",
  "email": "user@example.com",
  "report": {
    "companyName": "Acme Corp.",
    "website": "acme.com",
    "industry": "Software & Services",
    "hq": "Austin, Texas",
    "employees": "1,200",
    "revenue": "$120M",
    "competitors": [...],
    "techStack": [...],
    "leadership": [...],
    "recentNews": [...],
    "strategicInitiatives": [...],
    "overview": "...",
    "businessModel": "...",
    ...
  }
}`
                    ) : (
`{
  "jobId": "h-abc123xyz",
  "companyName": "Acme Corp",
  "companyWebsite": "acme.com",
  "email": "user@example.com",
  "focusAreas": ["Tech Stack", "Competitors"],
  "deepResearchLevel": "Deep"${settings.n8nIntegration?.mode === 'researcher-async' ? `,\n  "callbackUrl": "${window.location.origin}/api/research/callback/h-abc123xyz"` : ''}
}`
                    )}
                  </pre>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Global Save Controls */}
        <div className="flex justify-end pt-2">
          <button
            onClick={handleSave}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs py-3 px-6 rounded-xl transition-all shadow-md shadow-blue-100"
          >
            <Save size={14} />
            Save Preference Configurations
          </button>
        </div>
      </div>
    </div>
  );
}
