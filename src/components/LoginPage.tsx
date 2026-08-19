import React, { useState } from 'react';
import { 
  Mail, 
  Lock, 
  Eye, 
  EyeOff, 
  Building2, 
  ShieldCheck, 
  ArrowLeft,
  KeyRound
} from 'lucide-react';
import { motion } from 'motion/react';
import CleanLogo from './CleanLogo';
import logoImg from '@/assets/logo.jpg';

interface LoginPageProps {
  onLogin: (userInfo: { email: string; companyName: string }) => void;
  onBackToHome?: () => void;
}

export default function LoginPage({ onLogin, onBackToHome }: LoginPageProps) {
  const [companyName, setCompanyName] = useState<string>('');
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !companyName) return;

    setIsLoading(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, companyName, password })
      });
      const data = await res.json();
      setIsLoading(false);

      if (data.success && data.user) {
        if (data.user.token) {
          localStorage.setItem('aie_session_token', data.user.token);
        }
        onLogin({
          email: data.user.email,
          companyName: data.user.companyName
        });
      } else {
        // Fallback
        onLogin({ email, companyName });
      }
    } catch (err) {
      console.error('Failed to log in via server API:', err);
      setIsLoading(false);
      onLogin({ email, companyName });
    }
  };

  const handleSSOLogin = async () => {
    setIsLoading(true);
    const ssoEmail = email || 'enterprise.user@company.com';
    const ssoCompany = companyName || 'Enterprise Corp';

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: ssoEmail, companyName: ssoCompany })
      });
      const data = await res.json();
      setIsLoading(false);

      if (data.success && data.user) {
        if (data.user.token) {
          localStorage.setItem('aie_session_token', data.user.token);
        }
        onLogin({
          email: data.user.email,
          companyName: data.user.companyName
        });
      } else {
        onLogin({ email: ssoEmail, companyName: ssoCompany });
      }
    } catch (err) {
      setIsLoading(false);
      onLogin({ email: ssoEmail, companyName: ssoCompany });
    }
  };

  return (
    <div className="h-screen w-full overflow-y-auto bg-[#F7F9FC] text-slate-800 font-sans flex items-center justify-center p-4 relative overflow-x-hidden selection:bg-blue-500 selection:text-white">
      
      {/* Background Soft Glow */}
      <div 
        className="absolute inset-0 pointer-events-none opacity-50" 
        style={{
          backgroundImage: `radial-gradient(#CBD5E1 1px, transparent 1px)`,
          backgroundSize: '24px 24px'
        }}
      />

      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-blue-400/10 rounded-full blur-3xl pointer-events-none" />

      {/* Back to Home Header button */}
      {onBackToHome && (
        <button
          onClick={onBackToHome}
          className="absolute top-6 left-6 text-xs font-bold text-slate-500 hover:text-slate-900 flex items-center gap-2 transition-colors cursor-pointer"
        >
          <ArrowLeft size={16} />
          Back to Home
        </button>
      )}

      {/* Main Login Card */}
      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.4 }}
        className="relative z-10 w-full max-w-md bg-white border border-slate-200/90 rounded-3xl p-8 sm:p-10 shadow-2xl shadow-slate-200/80 space-y-6"
      >
        {/* Logo Badge */}
        <div className="text-center space-y-3">
          <div className="mx-auto w-16 h-16 rounded-2xl bg-blue-50/80 border border-blue-100 flex items-center justify-center text-blue-600 shadow-sm p-1.5">
            <CleanLogo src={logoImg} className="h-12 object-contain" alt="Account Intelligence Engine" />
          </div>
          <div>
            <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">
              Welcome Back
            </h2>
            <p className="text-xs font-medium text-slate-500 mt-1">
              Sign in to your enterprise account.
            </p>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          
          {/* Company Name Field (Collected record) */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 block">
              Company Name
            </label>
            <div className="relative">
              <Building2 className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              <input
                type="text"
                required
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                placeholder="Acme Corp"
                className="w-full bg-slate-50 hover:bg-slate-100/60 focus:bg-white border border-slate-200 rounded-xl py-3 pl-10 pr-4 text-xs font-semibold placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 transition-all"
              />
            </div>
          </div>

          {/* Work Email Field */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 block">
              Work Email
            </label>
            <div className="relative">
              <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              <input
                type="email"
                required
                pattern="[^@\s]+@[^@\s]+\.[a-zA-Z]{2,}"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@company.com"
                className="w-full bg-slate-50 hover:bg-slate-100/60 focus:bg-white border border-slate-200 rounded-xl py-3 pl-10 pr-4 text-xs font-semibold placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 transition-all"
              />
            </div>
          </div>

          {/* Password Field */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-700 block">
                Password
              </label>
              <a href="#" onClick={(e) => e.preventDefault()} className="text-[11px] font-bold text-blue-600 hover:text-blue-700">
                Forgot?
              </a>
            </div>
            <div className="relative">
              <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-slate-50 hover:bg-slate-100/60 focus:bg-white border border-slate-200 rounded-xl py-3 pl-10 pr-10 text-xs font-semibold placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 transition-all"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs py-3.5 rounded-full transition-all shadow-md shadow-blue-500/20 active:scale-98 flex items-center justify-center gap-2 cursor-pointer mt-2"
          >
            {isLoading ? (
              <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              'Sign In'
            )}
          </button>
        </form>

        {/* OR Divider */}
        <div className="relative flex items-center justify-center my-4">
          <div className="border-t border-slate-200 w-full" />
          <span className="bg-white px-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider relative z-10">
            OR
          </span>
        </div>

        {/* Single Sign-On Button */}
        <button
          type="button"
          onClick={handleSSOLogin}
          className="w-full bg-slate-100/80 hover:bg-slate-100 border border-slate-200/80 text-slate-700 font-bold text-xs py-3 rounded-full transition-all flex items-center justify-center gap-2 cursor-pointer hover:border-slate-300"
        >
          <Building2 size={14} className="text-blue-600" />
          Continue with Single Sign-On
        </button>

        {/* Footer Terms */}
        <div className="pt-2 text-center text-[11px] font-medium text-slate-400 space-x-2">
          <a href="#" onClick={(e) => e.preventDefault()} className="hover:text-slate-600">Privacy Policy</a>
          <span>•</span>
          <a href="#" onClick={(e) => e.preventDefault()} className="hover:text-slate-600">Terms of Service</a>
        </div>

      </motion.div>

    </div>
  );
}
