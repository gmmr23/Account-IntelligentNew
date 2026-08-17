import React, { useState, useEffect, useRef } from 'react';
import { 
  Send, 
  X, 
  MessageSquare, 
  Trash2, 
  Sparkles, 
  ShieldAlert, 
  Loader, 
  BookOpen, 
  HelpCircle,
  CheckCircle2,
  ArrowRight
} from 'lucide-react';
import { ResearchReport } from '../types';

interface ChatAssistantProps {
  isOpen: boolean;
  onClose: () => void;
  jobId: string;
  report: ResearchReport;
  onShowNotification: (message: string, type: 'success' | 'info' | 'error') => void;
}

interface ChatMessage {
  role: 'user' | 'model';
  text: string;
  citations?: string[];
}

export default function ChatAssistant({
  isOpen,
  onClose,
  jobId,
  report,
  onShowNotification
}: ChatAssistantProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputVal, setInputVal] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isIngested, setIsIngested] = useState(false);
  const [isIngesting, setIsIngesting] = useState(false);
  const [isOnline, setIsOnline] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  // Suggested question chips
  const suggestedQuestions = [
    "Summarize this report",
    "Executive Summary",
    "Technology Stack",
    "Salesforce Opportunities",
    "Financial Overview",
    "Competitors",
    "Risks",
    "Leadership Team",
    "Recent News",
    "AI Initiatives"
  ];

  // Auto-scroll to bottom of chat
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [messages, isOpen]);

  // Health check polling hook
  useEffect(() => {
    const checkHealth = async () => {
      try {
        const response = await fetch('/api/chat/health');
        if (response.ok) {
          setIsOnline(true);
        } else {
          setIsOnline(false);
          setIsIngested(false);
        }
      } catch (err) {
        setIsOnline(false);
        setIsIngested(false);
      }
    };

    // Run health check initially
    checkHealth();

    // Check health every 5 seconds
    const interval = setInterval(checkHealth, 5000);
    return () => clearInterval(interval);
  }, []);

  // Ingest report on mount, when jobId changes, or when backend goes online
  useEffect(() => {
    if (!isOnline || !jobId || !report || isIngested || isIngesting) return;

    const ingestReport = async () => {
      setIsIngesting(true);
      try {
        console.log(`[Chat] Ingesting report for job ${jobId}...`);
        const response = await fetch('/api/chat/ingest', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ jobId, report })
        });

        const data = await response.json().catch(() => ({}));

        if (response.ok) {
          setIsIngested(true);
          console.log(`[Chat] Report ingested successfully.`);
          // Initialize first welcome message if empty
          setMessages([
            {
              role: 'model',
              text: `Hello! I'm your AI Research Assistant. I have read the account intelligence profile for **${report.companyName}**. \n\nAsk me anything about their business model, tech stack, leadership team, financials, competitors, or strategic roadmap. I will answer grounded **only** in this report's contents.`
            }
          ]);
        } else {
          const rawErr = data.detail || data.error || data.message || 'Check backend status';
          console.error('[Chat] Ingest failed:', rawErr);
          onShowNotification(`Chatbot ingestion failed: ${rawErr}`, 'error');
        }
      } catch (err: any) {
        console.error('[Chat] Network error during ingestion:', err);
        onShowNotification(`Chatbot ingestion failed: ${err.message || err}`, 'error');
      } finally {
        setIsIngesting(false);
      }
    };

    ingestReport();
  }, [isOnline, jobId, report, isIngested, isIngesting]);

  // Clear Session Memory
  const handleClearSession = async () => {
    if (!window.confirm("Are you sure you want to reset this chat's memory?")) return;
    
    try {
      const response = await fetch(`/api/chat/session/${jobId}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        setMessages([
          {
            role: 'model',
            text: `Conversation memory reset. I'm ready to answer any new questions about **${report.companyName}**.`
          }
        ]);
        onShowNotification('Chat memory cleared successfully', 'success');
      } else {
        onShowNotification('Failed to clear chat memory', 'error');
      }
    } catch (err) {
      onShowNotification('Network error clearing chat memory', 'error');
    }
  };

  // Handle Query Submission
  const handleSendQuery = async (queryText: string) => {
    if (!queryText.trim() || isLoading || !isIngested) return;

    setInputVal('');
    const userMsg: ChatMessage = { role: 'user', text: queryText };
    setMessages(prev => [...prev, userMsg]);
    setIsLoading(true);

    try {
      const response = await fetch('/api/chat/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jobId, query: queryText })
      });

      if (response.ok) {
        const data = await response.json();
        const modelMsg: ChatMessage = {
          role: 'model',
          text: data.answer,
          citations: data.citations || []
        };
        setMessages(prev => [...prev, modelMsg]);
      } else {
        const errData = await response.json().catch(() => ({}));
        onShowNotification(`Failed to get answer: ${errData.error || 'Server error'}`, 'error');
      }
    } catch (err) {
      onShowNotification('Connection timed out or failed.', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  // Helper to parse simple markdown bold, lists, and headers in JSX
  const formatText = (text: string) => {
    const lines = text.split('\n');
    return lines.map((line, idx) => {
      // 1. Handle Headers
      if (line.trim().startsWith('### ')) {
        return (
          <h5 key={idx} className="text-xs font-bold text-slate-800 uppercase tracking-wide mt-3 mb-1 flex items-center gap-1">
            <Sparkles size={11} className="text-blue-600 shrink-0" />
            {line.replace(/^###\s+/, '')}
          </h5>
        );
      }
      if (line.trim().startsWith('## ') || line.trim().startsWith('# ')) {
        return (
          <h4 key={idx} className="text-xs font-extrabold text-slate-900 mt-4 mb-1.5 border-b border-slate-100 pb-1 flex items-center gap-1.5">
            {line.replace(/^##?\s+/, '')}
          </h4>
        );
      }

      // 2. Parse Bold (**text**)
      const boldRegex = /\*\*(.*?)\*\*/g;
      const parts = [];
      let lastIndex = 0;
      let match;
      
      while ((match = boldRegex.exec(line)) !== null) {
        if (match.index > lastIndex) {
          parts.push(line.substring(lastIndex, match.index));
        }
        parts.push(
          <strong key={match.index} className="font-bold text-slate-900">
            {match[1]}
          </strong>
        );
        lastIndex = boldRegex.lastIndex;
      }
      if (lastIndex < line.length) {
        parts.push(line.substring(lastIndex));
      }

      const inlineContent = parts.length > 0 ? parts : line;

      // 3. Handle Bullet lists
      if (line.trim().startsWith('* ') || line.trim().startsWith('- ')) {
        // Strip bullet prefix
        const cleanLine = line.replace(/^[\*\-]\s+/, '');
        // Run bold replacements inside lists
        const listParts = [];
        let listLastIndex = 0;
        let listMatch;
        const listBoldRegex = /\*\*(.*?)\*\*/g;

        while ((listMatch = listBoldRegex.exec(cleanLine)) !== null) {
          if (listMatch.index > listLastIndex) {
            listParts.push(cleanLine.substring(listLastIndex, listMatch.index));
          }
          listParts.push(
            <strong key={listMatch.index} className="font-bold text-slate-900">
              {listMatch[1]}
            </strong>
          );
          listLastIndex = listBoldRegex.lastIndex;
        }
        if (listLastIndex < cleanLine.length) {
          listParts.push(cleanLine.substring(listLastIndex));
        }

        return (
          <li key={idx} className="list-disc ml-4 mt-1 text-slate-600 leading-relaxed text-xs">
            {listParts.length > 0 ? listParts : cleanLine}
          </li>
        );
      }

      // 4. Empty line
      if (line.trim() === '') {
        return <div key={idx} className="h-2" />;
      }

      // 5. Plain paragraph
      return (
        <p key={idx} className="text-xs text-slate-600 leading-relaxed mt-1">
          {inlineContent}
        </p>
      );
    });
  };
  return (
    <div className={`fixed bottom-24 right-6 w-[380px] h-[600px] max-h-[calc(100vh-120px)] max-w-[calc(100vw-32px)] bg-white shadow-2xl border border-slate-200/80 rounded-2xl z-50 flex flex-col transition-all duration-300 transform origin-bottom-right select-none ${
      isOpen ? 'opacity-100 scale-100 translate-y-0' : 'opacity-0 scale-95 translate-y-4 pointer-events-none'
    }`}>
      
      {/* Header */}
      <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50 shrink-0 rounded-t-2xl">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-md shadow-blue-100">
            <MessageSquare size={16} />
          </div>
          <div>
            <h3 className="text-xs font-bold text-slate-800">Ask AI About This Report</h3>
            <p className="text-[9px] text-slate-400 font-semibold mt-0.5 uppercase tracking-wider flex items-center gap-1">
              {!isOnline ? (
                <span className="text-rose-500 font-bold">Offline</span>
              ) : isIngesting ? (
                <span className="flex items-center gap-1 text-amber-500"><Loader size={8} className="animate-spin" /> Ingesting report...</span>
              ) : isIngested ? (
                <span className="text-emerald-600 flex items-center gap-0.5 font-bold"><CheckCircle2 size={9} /> Grounded &amp; Online</span>
              ) : (
                <span className="text-blue-500 font-bold">Online - Ready</span>
              )}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1">
          <button 
            onClick={handleClearSession}
            title="Reset Conversation"
            className="p-2 hover:bg-slate-200/80 rounded-lg text-slate-400 hover:text-rose-600 transition-colors"
          >
            <Trash2 size={15} />
          </button>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-slate-200/80 rounded-lg text-slate-400 hover:text-slate-700 transition-colors"
          >
            <X size={15} />
          </button>
        </div>
      </div>

      {/* Message Log */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50/50">
        {messages.map((msg, index) => {
          const isUser = msg.role === 'user';
          return (
            <div key={index} className={`flex flex-col ${isUser ? 'items-end' : 'items-start'}`}>
              <div 
                className={`max-w-[85%] rounded-2xl p-3.5 text-xs shadow-sm ${
                  isUser 
                    ? 'bg-blue-600 text-white rounded-br-none' 
                    : 'bg-white border border-slate-200/60 text-slate-800 rounded-bl-none'
                }`}
              >
                {/* Parse Text (Bold, Bullets, Headers) */}
                <div className="space-y-1">
                  {isUser ? msg.text : formatText(msg.text)}
                </div>

                {/* Citations Footer */}
                {!isUser && msg.citations && msg.citations.length > 0 && (
                  <div className="mt-3 pt-2 border-t border-slate-100 flex flex-wrap items-center gap-1 text-[9px] text-slate-400 font-bold">
                    <BookOpen size={10} className="text-blue-500" />
                    <span>RELEVANT SECTIONS:</span>
                    {msg.citations.map((cite, i) => (
                      <span key={i} className="bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded font-semibold tracking-wide border border-slate-200/40">
                        {cite}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {/* Loading Spinner */}
        {isLoading && (
          <div className="flex items-start">
            <div className="bg-white border border-slate-200/60 rounded-2xl rounded-bl-none p-3 shadow-sm flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 bg-blue-600 rounded-full animate-bounce"></span>
              <span className="w-1.5 h-1.5 bg-blue-600 rounded-full animate-bounce [animation-delay:0.2s]"></span>
              <span className="w-1.5 h-1.5 bg-blue-600 rounded-full animate-bounce [animation-delay:0.4s]"></span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Suggested Questions Grid (Only visible if input is empty) */}
      {inputVal.trim() === '' && !isLoading && isIngested && (
        <div className="px-4 py-2 border-t border-slate-100 bg-white overflow-x-auto whitespace-nowrap scrollbar-none shrink-0">
          <div className="flex gap-1.5 py-1">
            {suggestedQuestions.map((q, i) => (
              <button
                key={i}
                onClick={() => handleSendQuery(q)}
                className="bg-slate-50 border border-slate-200 hover:border-blue-300 hover:bg-blue-50/50 hover:text-blue-700 text-slate-600 text-[10px] font-semibold py-1.5 px-3 rounded-full shrink-0 transition-all flex items-center gap-1 cursor-pointer"
              >
                {q} <ArrowRight size={10} className="opacity-60" />
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Chat Input Area */}
      <div className="p-4 border-t border-slate-100 bg-white shrink-0">
        <form 
          onSubmit={(e) => {
            e.preventDefault();
            handleSendQuery(inputVal);
          }}
          className="flex items-center gap-2"
        >
          <input
            type="text"
            disabled={!isOnline || !isIngested || isIngesting || isLoading}
            placeholder={
              !isOnline 
                ? "FastAPI server unreachable" 
                : isIngesting 
                ? "Indexing document intelligence..." 
                : isIngested 
                ? "Ask a question about the report..." 
                : "Ingestion failed - Offline"
            }
            value={inputVal}
            onChange={(e) => setInputVal(e.target.value)}
            className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 focus:bg-white text-slate-800 disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={!inputVal.trim() || isLoading || !isIngested || !isOnline}
            className="h-9 w-9 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 disabled:hover:bg-blue-600 text-white rounded-xl flex items-center justify-center transition-colors cursor-pointer shadow-md shadow-blue-100 shrink-0"
          >
            <Send size={15} />
          </button>
        </form>
      </div>

    </div>
  );
}
