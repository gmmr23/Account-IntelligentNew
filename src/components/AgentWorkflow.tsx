import React, { useState, useEffect } from 'react';
import { 
  CheckCircle2, 
  Loader2, 
  Clock, 
  Search, 
  ShieldCheck, 
  Cpu, 
  Database, 
  Briefcase, 
  UserCheck, 
  FileCheck2,
  AlertTriangle 
} from 'lucide-react';
import { motion } from 'motion/react';

interface AgentWorkflowProps {
  companyName: string;
  onComplete: () => void;
  statusMessage?: string | null;
  currentStep?: string | null;
  isCompleted?: boolean;
  isFailed?: boolean;
  errorMessage?: string | null;
  onCancel?: () => void;
  validationResolved?: boolean;
}

export default function AgentWorkflow({ 
  companyName, 
  onComplete, 
  statusMessage, 
  currentStep = null,
  isCompleted,
  isFailed = false,
  errorMessage = null,
  onCancel,
  validationResolved = false
}: AgentWorkflowProps) {
  const [elapsedTime, setElapsedTime] = useState(0);
  const [activeStep, setActiveStep] = useState(0);

  // Define workflow timeline steps
  const steps = [
    { id: 1, name: 'Input Validator', desc: 'Verifying company registry and website constraints', icon: ShieldCheck },
    { id: 2, name: 'Researcher', desc: 'Querying search engines for press releases, financials & profiles', icon: Search },
    { id: 3, name: 'Business Intelligence Analyser', desc: 'Synthesizing market positioning and monetization strategy', icon: Briefcase },
    { id: 4, name: 'Leadership and Executive Mapping Analyser', desc: 'Identifying C-suite officers and structural org charts', icon: UserCheck },
    { id: 5, name: 'Report Drafter', desc: 'Assembling narrative parameters and compiling output', icon: FileCheck2 },
  ];

  // Define agents for right panel
  const [agents, setAgents] = useState([
    { name: 'CEO Agent', role: 'Supervisory Control', status: 'Running', desc: 'Coordinating workflow validation', color: 'blue' },
    { name: 'Discovery Agent', role: 'Data Mining', status: 'Waiting', desc: 'Awaiting authoritative domains', color: 'amber' },
    { name: 'Research Agent', role: 'Context Synthesis', status: 'Waiting', desc: 'Reading search citations', color: 'purple' },
    { name: 'Business Intelligence Agent', role: 'Market Analyst', status: 'Waiting', desc: 'Analyzing monetization and competitors', color: 'emerald' },
    { name: 'Leadership Agent', role: 'Org Chart Specialist', status: 'Waiting', desc: 'Scraping executive teams', color: 'pink' },
    { name: 'Report Agent', role: 'Narrative Designer', status: 'Waiting', desc: 'Composing polished publication data', color: 'indigo' },
  ]);

  // Handle ticking timer
  useEffect(() => {
    const timer = setInterval(() => {
      setElapsedTime(prev => prev + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const getFailedStepIndex = () => {
    if (!isFailed || !errorMessage) return -1;
    const lower = errorMessage.toLowerCase();
    if (lower.includes('input') || lower.includes('domain') || lower.includes('email') || lower.includes('name') || lower.includes('website') || lower.includes('registry')) {
      return 0; // Input Validator
    }
    if (lower.includes('source') || lower.includes('resource') || lower.includes('search') || lower.includes('google') || lower.includes('authority') || lower.includes('research')) {
      return 1; // Researcher
    }
    if (lower.includes('business') || lower.includes('monetization') || lower.includes('strategic') || lower.includes('financial') || lower.includes('model') || lower.includes('competitor')) {
      return 2; // Business Intelligence Analyser
    }
    if (lower.includes('leadership') || lower.includes('executive') || lower.includes('officer') || lower.includes('c-suite') || lower.includes('org chart') || lower.includes('bio')) {
      return 3; // Leadership and Executive Mapping Analyser
    }
    return activeStep < 5 ? activeStep : 4;
  };

  // Drive activeStep and agent states dynamically from the statusMessage and job completion state
  useEffect(() => {
    if (isFailed) {
      const failedStepIdx = getFailedStepIndex();
      setActiveStep(failedStepIdx);
      setAgents(prev => {
        return prev.map((a, idx) => {
          if (idx === 0) {
            return { ...a, status: 'Failed' as any, desc: 'Validation failed' };
          }
          if (idx === 1 && failedStepIdx <= 1) {
            return { ...a, status: 'Failed' as any, desc: 'Domain validation rejected' };
          }
          if (idx === 2 && failedStepIdx === 2) {
            return { ...a, status: 'Failed' as any, desc: 'Grounding retrieval failed' };
          }
          if (idx === 3 && failedStepIdx === 3) {
            return { ...a, status: 'Failed' as any, desc: 'Market synthesis failed' };
          }
          if (idx === 4 && failedStepIdx === 4) {
            return { ...a, status: 'Failed' as any, desc: 'Executive indexing failed' };
          }
          if (idx === 5 && failedStepIdx === 5) {
            return { ...a, status: 'Failed' as any, desc: 'Report compilation failed' };
          }
          if (a.status === 'Running') {
            return { ...a, status: 'Failed' as any, desc: 'Execution halted' };
          }
          return a;
        });
      });
      return;
    }

    if (isCompleted) {
      setActiveStep(5);
      setAgents(prev => {
        const next = prev.map(a => ({
          ...a,
          status: 'Completed' as const,
        }));
        next[0].desc = 'All sub-agents verified';
        next[5].desc = 'Enterprise intelligence report built';
        return next;
      });

      const finalTimer = setTimeout(() => {
        onComplete();
      }, 800); // 800ms delay to let the user see the completed state

      return () => clearTimeout(finalTimer);
    }

    if (!statusMessage && !currentStep) {
      // Starting state
      setActiveStep(0);
      setAgents(prev => {
        const next = prev.map(a => ({ ...a, status: 'Waiting' as const }));
        next[0].status = 'Running';
        next[0].desc = 'Coordinating workflow validation';
        next[1].status = 'Running';
        next[1].desc = 'Awaiting authoritative domains';
        return next;
      });
      return;
    }

    const stepIdentifier = (currentStep || '').toString().toUpperCase();
    const msg = statusMessage ? statusMessage.toLowerCase() : '';

    // Determine current active step index (0 to 4) using a robust step-cascade
    let newActiveStep = 0;

    if (stepIdentifier === 'HTTP2') {
      newActiveStep = 1; // HTTP2 finishes -> Researcher starts
    } else if (stepIdentifier === 'HTTP3') {
      newActiveStep = 2; // HTTP3 finishes -> BI starts
    } else if (stepIdentifier === 'HTTP4') {
      newActiveStep = 3; // HTTP4 finishes -> Leadership starts
    } else if (stepIdentifier === 'HTTP5') {
      newActiveStep = 4; // HTTP5 finishes -> Report Drafter starts
    } else if (stepIdentifier === 'HTTP1') {
      newActiveStep = 5; // HTTP1 finishes -> all complete
    } else {
      // Fallback matching cascade if node name not sent
      if (
        msg.includes('report') ||
        msg.includes('compilation') ||
        msg.includes('draft') ||
        msg.includes('publication') ||
        msg.includes('pdf') ||
        msg.includes('final')
      ) {
        newActiveStep = 4;
      } 
      else if (
        msg.includes('leadership') ||
        msg.includes('executive') ||
        msg.includes('c-suite') ||
        msg.includes('org chart') ||
        msg.includes('orgchart') ||
        msg.includes('structure')
      ) {
        newActiveStep = 3;
      }
      else if (
        msg.includes('analysis') ||
        msg.includes('monetization') ||
        msg.includes('business') ||
        msg.includes('competitor') ||
        msg.includes('market') ||
        msg.includes('metric') ||
        msg.includes('research is completed') ||
        msg.includes('research completed') ||
        msg.includes('research complete') ||
        msg.includes('research is complete')
      ) {
        newActiveStep = 2;
      }
      else if (
        msg.includes('research') ||
        msg.includes('search') ||
        msg.includes('tavily') ||
        msg.includes('perplexity') ||
        msg.includes('source') ||
        msg.includes('grounding') ||
        msg.includes('validation passed') ||
        msg.includes('validation completed') ||
        msg.includes('validation success') ||
        msg.includes('validation finished')
      ) {
        newActiveStep = 1;
      }
    }

    setActiveStep(newActiveStep);

    // Update agents based on newActiveStep and statusMessage text
    setAgents(prevAgents => {
      return prevAgents.map((a, idx) => {
        // CEO Agent (always running until done)
        if (idx === 0) {
          return { 
            ...a, 
            status: 'Running' as const, 
            desc: newActiveStep > 0 ? `Supervising ${steps[newActiveStep]?.name || 'workflow'}` : 'Coordinating workflow validation' 
          };
        }
        // Discovery Agent (for validation)
        if (idx === 1) {
          if (newActiveStep > 0) {
            return { ...a, status: 'Completed' as const, desc: 'Domain validation passed' };
          }
          return { ...a, status: 'Running' as const, desc: statusMessage || 'Verifying registry and constraints' };
        }
        // Research Agent
        if (idx === 2) {
          if (newActiveStep > 1) {
            return { ...a, status: 'Completed' as const, desc: 'Located citations' };
          }
          if (newActiveStep === 1) {
            return { ...a, status: 'Running' as const, desc: statusMessage || 'Reading search citations' };
          }
          return { ...a, status: 'Waiting' as const, desc: 'Awaiting validation' };
        }
        // Business Intelligence Agent
        if (idx === 3) {
          if (newActiveStep > 2) {
            return { ...a, status: 'Completed' as const, desc: 'Strategic analysis completed' };
          }
          if (newActiveStep === 2) {
            return { ...a, status: 'Running' as const, desc: statusMessage || 'Analyzing monetization and competitors' };
          }
          return { ...a, status: 'Waiting' as const, desc: 'Awaiting market metrics' };
        }
        // Leadership Agent
        if (idx === 4) {
          if (newActiveStep > 3) {
            return { ...a, status: 'Completed' as const, desc: 'C-Suite leaders verified' };
          }
          if (newActiveStep === 3) {
            return { ...a, status: 'Running' as const, desc: statusMessage || 'Scraping executive teams' };
          }
          return { ...a, status: 'Waiting' as const, desc: 'Awaiting executive details' };
        }
        // Report Agent
        if (idx === 5) {
          if (newActiveStep === 4) {
            return { ...a, status: 'Running' as const, desc: statusMessage || 'Composing publication output' };
          }
          return { ...a, status: 'Waiting' as const, desc: 'Awaiting sections' };
        }
        return a;
      });
    });
  }, [statusMessage, currentStep, isCompleted, isFailed, validationResolved]);


  // Helper to format duration
  const formatTime = (secs: number) => {
    return `${secs}s`;
  };

  const getStepStatus = (index: number) => {
    const failedStepIdx = getFailedStepIndex();
    if (isFailed && index === failedStepIdx) return 'Failed';
    if (isFailed && index > failedStepIdx) return 'Waiting';
    if (activeStep > index) return 'Completed';
    if (activeStep === index) return 'Running';
    return 'Waiting';
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-full p-4 md:p-6 overflow-y-auto">
      {/* Center Left: AI Workflow Timeline */}
      <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200/80 p-6 shadow-sm flex flex-col h-fit">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-5 mb-6">
          <div>
            <span className="text-[11px] font-bold text-blue-600 uppercase tracking-widest">
              Multi-Agent Engine
            </span>
            <h2 className="text-xl font-bold text-slate-800 tracking-tight mt-1">
              Researching <span className="text-blue-600">{companyName}</span>
            </h2>
            {isFailed ? (
              <p className="text-xs text-rose-600 mt-1 font-semibold flex items-center gap-1">
                <AlertTriangle size={14} className="shrink-0" />
                {errorMessage || 'Research agent failed.'}
              </p>
            ) : (
              <p className="text-xs text-slate-500 mt-1 animate-pulse font-medium">
                {statusMessage || 'Running deep search grounding across active directories...'}
              </p>
            )}
          </div>
          
          {isFailed ? (
            <button
              onClick={onCancel}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 border border-slate-200 hover:border-slate-300 text-slate-700 text-xs font-semibold rounded-xl transition-all self-start md:self-auto cursor-pointer"
            >
              Back to Input
            </button>
          ) : (
            <div className="flex items-center gap-3 bg-slate-50 border border-slate-100 px-4 py-2.5 rounded-xl self-start md:self-auto">
              <Clock className="text-slate-400 shrink-0" size={16} />
              <div className="flex gap-4 text-xs font-mono text-slate-600">
                <div>
                  <span className="text-[10px] text-slate-400 block uppercase font-sans tracking-wider">Elapsed</span>
                  <span className="font-semibold text-slate-800">{formatTime(elapsedTime)}</span>
                </div>
                <div className="border-r border-slate-200 h-6"></div>
                <div>
                  <span className="text-[10px] text-slate-400 block uppercase font-sans tracking-wider">Estimated</span>
                  <span className="font-semibold text-slate-800">20s</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Dynamic Progress Bar */}
        <div className="w-full bg-slate-100 rounded-full h-1.5 mb-8 overflow-hidden">
          <motion.div
            className={`h-full rounded-full ${isFailed ? 'bg-rose-600' : 'bg-blue-600'}`}
            initial={{ width: '0%' }}
            animate={{ 
              width: isFailed 
                ? `${Math.min(((getFailedStepIndex() + 0.5) / steps.length) * 100, 100)}%` 
                : `${Math.min(((activeStep + 0.5) / steps.length) * 100, 95)}%` 
            }}
            transition={{ ease: 'easeInOut', duration: 0.8 }}
          />
        </div>

        {/* Steps List */}
        <div className="space-y-4">
          {steps.map((step, index) => {
            const status = getStepStatus(index);
            const StepIcon = step.icon;
            
            return (
              <motion.div
                key={step.id}
                className={`flex items-start gap-4 p-4 rounded-xl border transition-all duration-300 ${
                  status === 'Completed'
                    ? 'bg-slate-50/50 border-slate-100'
                    : status === 'Failed'
                    ? 'bg-rose-50/30 border-rose-100 shadow-sm shadow-rose-50/50'
                    : status === 'Running'
                    ? 'bg-blue-50/30 border-blue-100 shadow-sm shadow-blue-50/50'
                    : 'bg-white border-dashed border-slate-200 opacity-60'
                }`}
                animate={{ scale: status === 'Running' ? 1.01 : 1 }}
              >
                {/* Step indicator */}
                <div className="flex items-center justify-center shrink-0 mt-0.5">
                  {status === 'Completed' ? (
                    <div className="bg-emerald-100 text-emerald-600 p-1.5 rounded-full">
                      <CheckCircle2 size={18} className="stroke-[2.5]" />
                    </div>
                  ) : status === 'Failed' ? (
                    <div className="bg-rose-100 text-rose-600 p-1.5 rounded-full">
                      <AlertTriangle size={18} className="stroke-[2.5]" />
                    </div>
                  ) : status === 'Running' ? (
                    <div className="bg-blue-100 text-blue-600 p-1.5 rounded-full animate-spin">
                      <Loader2 size={18} className="stroke-[2.5]" />
                    </div>
                  ) : (
                    <div className="bg-slate-100 text-slate-400 p-1.5 rounded-full">
                      <StepIcon size={18} className="stroke-[2]" />
                    </div>
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <h3 className={`text-sm font-semibold tracking-tight ${
                      status === 'Running' ? 'text-blue-600' : status === 'Failed' ? 'text-rose-600' : 'text-slate-800'
                    }`}>
                      {step.name}
                    </h3>
                    <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md ${
                      status === 'Completed'
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                        : status === 'Failed'
                        ? 'bg-rose-50 text-rose-700 border border-rose-100'
                        : status === 'Running'
                        ? 'bg-blue-50 text-blue-700 border border-blue-100'
                        : 'bg-slate-50 text-slate-400'
                    }`}>
                      {status}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5 leading-relaxed truncate md:whitespace-normal">
                    {step.desc}
                  </p>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* Right Sidebar: AI Agents Activity Panel */}
      <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 md:p-5 shadow-sm flex flex-col">
        <div className="border-b border-slate-200/60 pb-3 mb-4">
          <h3 className="text-sm font-bold text-slate-800 uppercase tracking-widest flex items-center gap-2">
            <Cpu size={16} className="text-blue-600 stroke-[2]" />
            AI Workspace Agents
          </h3>
          <p className="text-[11px] text-slate-500 mt-1">
            Active autonomous models processing target intelligence metrics
          </p>
        </div>

        <div className="space-y-3 flex-1 overflow-y-auto pr-1">
          {agents.map((agent) => (
            <div
              key={agent.name}
              className="bg-white border border-slate-200/80 rounded-xl p-3.5 shadow-xs flex flex-col gap-2 transition-all duration-200 hover:border-slate-300"
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${
                    agent.status === 'Completed'
                      ? 'bg-emerald-500 animate-pulse'
                      : agent.status === 'Failed'
                      ? 'bg-rose-500'
                      : agent.status === 'Running'
                      ? 'bg-blue-500 animate-ping'
                      : 'bg-slate-300'
                  }`} />
                  <span className="font-sans font-bold text-xs text-slate-800">
                    {agent.name}
                  </span>
                </div>
                
                <span className={`text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded ${
                  agent.status === 'Completed'
                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                    : agent.status === 'Failed'
                    ? 'bg-rose-50 text-rose-700 border border-rose-100'
                    : agent.status === 'Running'
                    ? 'bg-blue-50 text-blue-700 border border-blue-100 animate-pulse'
                    : 'bg-slate-50 text-slate-400 border border-slate-100'
                }`}>
                  {agent.status}
                </span>
              </div>

              <div className="flex flex-col">
                <span className="text-[10px] text-slate-400 font-medium uppercase tracking-wider">
                  {agent.role}
                </span>
                <span className="text-xs text-slate-600 mt-0.5 leading-tight italic">
                  "{agent.desc}"
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
