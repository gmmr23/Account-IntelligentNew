import React from 'react';
import { 
  Sparkles, 
  ArrowRight, 
  PlayCircle, 
  Layers, 
  TrendingUp, 
  BrainCircuit, 
  Search, 
  ShieldCheck, 
  BarChart3,
  Network,
  Cpu,
  Building2
} from 'lucide-react';
import { motion } from 'motion/react';
import CleanLogo from './CleanLogo';
import logoImg from '@/assets/logo.jpg';

interface LandingPageProps {
  onGetStarted: () => void;
  onWatchDemo?: () => void;
}

export default function LandingPage({ onGetStarted, onWatchDemo }: LandingPageProps) {
  return (
    <div className="h-screen w-full overflow-y-auto overflow-x-hidden bg-[#F7F9FC] text-slate-800 font-sans relative selection:bg-blue-500 selection:text-white">
      
      {/* Background Subtle Mesh Grid */}
      <div 
        className="absolute inset-0 pointer-events-none opacity-40" 
        style={{
          backgroundImage: `radial-gradient(#CBD5E1 1px, transparent 1px)`,
          backgroundSize: '24px 24px'
        }}
      />

      {/* Top Navbar */}
      <nav className="relative z-10 max-w-7xl mx-auto px-6 py-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <CleanLogo src={logoImg} className="h-10 object-contain" alt="Account Intelligence Engine" />
          <div className="flex flex-col">
            <span className="font-extrabold text-lg tracking-tight text-slate-900 leading-none">
              Account Intelligence Engine
            </span>
            <span className="text-[10px] font-semibold text-blue-600 tracking-wider uppercase">
              Autonomous AI Research
            </span>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <button
            onClick={onGetStarted}
            className="text-xs font-bold text-slate-600 hover:text-slate-900 transition-colors hidden sm:block cursor-pointer"
          >
            Sign In
          </button>
          <button
            onClick={onGetStarted}
            className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs px-5 py-2.5 rounded-full transition-all shadow-md shadow-blue-500/20 active:scale-95 flex items-center gap-2 cursor-pointer"
          >
            Start Autonomous Research
            <ArrowRight size={14} />
          </button>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative z-10 pt-10 pb-16 px-4 max-w-5xl mx-auto text-center space-y-8">
        
        {/* Intro Badge Pill */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="inline-flex items-center gap-2 bg-blue-50/80 border border-blue-200/80 px-4 py-1.5 rounded-full"
        >
          <span className="w-2 h-2 rounded-full bg-blue-600 animate-pulse" />
          <span className="text-[11px] font-bold text-blue-700 tracking-wider uppercase">
            INTRODUCING ACCOUNT INTELLIGENCE AGENT
          </span>
        </motion.div>

        {/* Hero Title */}
        <motion.h1
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="text-4xl sm:text-6xl md:text-7xl font-extrabold tracking-tight text-slate-900 leading-[1.1]"
        >
          The Autonomous Agent for <br />
          <span className="bg-gradient-to-r from-blue-600 via-cyan-500 to-emerald-500 bg-clip-text text-transparent">
            Account Intelligence.
          </span>
        </motion.h1>

        {/* Subtitle */}
        <motion.p
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="text-slate-600 text-base sm:text-lg max-w-2xl mx-auto font-normal leading-relaxed"
        >
          Deploy AI that researches, analyzes, and synthesizes deep insights on your target accounts in real-time. Uncover the hidden signals your competitors miss.
        </motion.p>

        {/* Hero CTA Group */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="flex flex-wrap items-center justify-center gap-4 pt-2"
        >
          <button
            onClick={onGetStarted}
            className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm px-7 py-3.5 rounded-full transition-all shadow-lg shadow-blue-500/25 active:scale-95 flex items-center gap-2 cursor-pointer"
          >
            Start Autonomous Research
            <ArrowRight size={16} />
          </button>
          <button
            onClick={onWatchDemo || onGetStarted}
            className="bg-white/80 hover:bg-white border border-slate-200 text-slate-700 hover:text-slate-900 font-bold text-sm px-6 py-3.5 rounded-full transition-all shadow-xs hover:shadow-md flex items-center gap-2 cursor-pointer"
          >
            <PlayCircle size={18} className="text-slate-500" />
            Watch Live Demo
          </button>
        </motion.div>

        {/* App Browser Mockup Wrapper */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.4 }}
          className="pt-8 max-w-5xl mx-auto"
        >
          <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xl shadow-slate-300/60 overflow-hidden">
            
            {/* Window Top Bar */}
            <div className="bg-slate-100/80 border-b border-slate-200 px-4 py-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-rose-400 inline-block" />
                <span className="w-3 h-3 rounded-full bg-amber-400 inline-block" />
                <span className="w-3 h-3 rounded-full bg-emerald-400 inline-block" />
              </div>
              <div className="bg-white border border-slate-200 rounded-md px-6 py-1 text-[11px] font-semibold text-slate-500 flex items-center gap-2 shadow-2xs">
                <span className="text-slate-400">🔒</span> intelligence.agent.ai
              </div>
              <div className="w-12"></div>
            </div>

            {/* Mock Dashboard Graphic Content */}
            <div className="p-6 md:p-8 bg-slate-50/50 space-y-6 text-left">
              
              {/* Mock Dashboard Top Row */}
              <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 pb-4 border-b border-slate-200/80">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold">
                    AIE
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-800 text-base">Welcome to Account Intelligence Engine</h3>
                    <p className="text-xs text-slate-500">Strategic Account Overview & Predictive Insights</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="bg-white border border-slate-200 px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-600 flex items-center gap-2">
                    <Search size={14} className="text-slate-400" /> Search Accounts...
                  </div>
                  <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center text-xs font-bold text-slate-700">
                    JD
                  </div>
                </div>
              </div>

              {/* Mock Content Grid */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                
                {/* Network Map Mock Card */}
                <div className="md:col-span-2 bg-white p-4 rounded-xl border border-slate-200 shadow-2xs space-y-3">
                  <div className="flex items-center justify-between text-xs font-bold text-slate-700">
                    <span>Target Account Network Map</span>
                    <span className="text-[10px] bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full font-bold">50+ Accounts</span>
                  </div>
                  <div className="h-40 bg-slate-50 rounded-lg border border-dashed border-slate-200 flex items-center justify-center relative overflow-hidden">
                    <Network size={64} className="text-blue-500/20 absolute" />
                    <div className="relative z-10 flex items-center justify-center gap-4">
                      <div className="p-3 bg-white shadow-md rounded-xl border border-slate-200 text-center">
                        <span className="block text-[10px] font-bold text-slate-400">PARENT</span>
                        <span className="text-xs font-bold text-blue-600">Enterprise Corp</span>
                      </div>
                      <div className="w-8 h-0.5 bg-blue-300"></div>
                      <div className="p-3 bg-white shadow-md rounded-xl border border-slate-200 text-center">
                        <span className="block text-[10px] font-bold text-slate-400">TARGET</span>
                        <span className="text-xs font-bold text-emerald-600">CloudSync Inc</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Predictive Metrics Mock Card */}
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs space-y-3">
                  <span className="text-xs font-bold text-slate-700 block">PREDICTIVE SCORING</span>
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div className="bg-emerald-50 p-2 rounded-lg border border-emerald-100">
                      <span className="block text-lg font-black text-emerald-600">92%</span>
                      <span className="text-[9px] font-bold text-emerald-700 uppercase">Fit</span>
                    </div>
                    <div className="bg-amber-50 p-2 rounded-lg border border-amber-100">
                      <span className="block text-lg font-black text-amber-600">78%</span>
                      <span className="text-[9px] font-bold text-amber-700 uppercase">Intent</span>
                    </div>
                    <div className="bg-blue-50 p-2 rounded-lg border border-blue-100">
                      <span className="block text-lg font-black text-blue-600">85%</span>
                      <span className="text-[9px] font-bold text-blue-700 uppercase">Growth</span>
                    </div>
                  </div>
                  <div className="space-y-1.5 text-[11px] font-medium text-slate-600">
                    <div className="flex items-center justify-between">
                      <span>Tech Stack Alignment</span>
                      <span className="font-bold text-slate-800">High</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Executive Hiring Signals</span>
                      <span className="font-bold text-emerald-600">+24%</span>
                    </div>
                  </div>
                </div>

                {/* Tech Breakdown Mock Card */}
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs space-y-3">
                  <span className="text-xs font-bold text-slate-700 block">DETECTED TECH STACK</span>
                  <div className="flex flex-wrap gap-1.5">
                    {['AWS', 'React', 'Snowflake', 'Datadog', 'Salesforce', 'Python'].map((t) => (
                      <span key={t} className="bg-slate-100 text-slate-700 text-[10px] font-bold px-2 py-1 rounded-md border border-slate-200">
                        {t}
                      </span>
                    ))}
                  </div>
                </div>

              </div>

            </div>

          </div>
        </motion.div>

      </section>

      {/* Core Capabilities Section */}
      <section className="relative z-10 py-16 px-4 max-w-6xl mx-auto text-center space-y-12">
        <div className="space-y-2">
          <span className="text-[11px] font-bold text-blue-600 uppercase tracking-widest block">
            CORE CAPABILITIES
          </span>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
            Intelligence at scale.
          </h2>
        </div>

        {/* 3 Capability Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-left">
          
          {/* Card 1: Autonomous Research */}
          <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm hover:shadow-xl transition-all space-y-4 flex flex-col justify-between group">
            <div className="space-y-4">
              <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                <BrainCircuit size={24} />
              </div>
              <h3 className="text-lg font-bold text-slate-900">Autonomous Research</h3>
              <p className="text-xs text-slate-600 leading-relaxed font-medium">
                Deploy agents to scour the web, SEC filings, news, and social channels. They build comprehensive account maps while you sleep, synthesizing thousands of data points into actionable intelligence.
              </p>
            </div>
            <div className="bg-slate-50 border border-slate-100 rounded-xl p-3 flex items-center gap-3">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-500 animate-ping" />
              <div className="space-y-0.5">
                <span className="block text-[11px] font-bold text-slate-800">Scraped 140+ Sources</span>
                <span className="block text-[9px] text-slate-500">SEC 10-K, Tech Blogs, Press Releases</span>
              </div>
            </div>
          </div>

          {/* Card 2: Live Agent Monitoring */}
          <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm hover:shadow-xl transition-all space-y-4 flex flex-col justify-between group">
            <div className="space-y-4">
              <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                <TrendingUp size={24} />
              </div>
              <h3 className="text-lg font-bold text-slate-900">Live Agent Monitoring</h3>
              <p className="text-xs text-slate-600 leading-relaxed font-medium">
                Track intent signals in real-time. The system actively monitors target accounts for hiring changes, technology stack shifts, and executive movements, alerting you the moment an opportunity opens.
              </p>
            </div>
            <div className="bg-slate-50 border border-slate-100 rounded-xl p-3">
              <div className="h-8 bg-emerald-50/60 rounded-lg flex items-center px-3 justify-between">
                <span className="text-[10px] font-bold text-emerald-700">Intent Score Spiked +34%</span>
                <span className="text-[9px] font-bold text-emerald-600">Live</span>
              </div>
            </div>
          </div>

          {/* Card 3: Deep Brief Synthesis */}
          <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm hover:shadow-xl transition-all space-y-4 flex flex-col justify-between group">
            <div className="space-y-4">
              <div className="w-12 h-12 rounded-xl bg-cyan-50 text-cyan-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                <Layers size={24} />
              </div>
              <h3 className="text-lg font-bold text-slate-900">Deep Brief Synthesis</h3>
              <p className="text-xs text-slate-600 leading-relaxed font-medium">
                Transform raw data into polished executive briefings. Generate personalized outreach strategies, risk assessments, and value hypotheses tailored perfectly to the prospect's current context.
              </p>
            </div>
            <div className="bg-slate-50 border border-slate-100 rounded-xl p-3 space-y-1">
              <div className="h-2 w-3/4 bg-slate-200 rounded-full"></div>
              <div className="h-2 w-1/2 bg-blue-200 rounded-full"></div>
              <div className="h-2 w-5/6 bg-slate-200 rounded-full"></div>
            </div>
          </div>

        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 border-t border-slate-200/80 py-8 px-6 text-center text-xs text-slate-500 font-medium">
        <p>© 2026 Account Intelligence Engine. All rights reserved.</p>
      </footer>

    </div>
  );
}
