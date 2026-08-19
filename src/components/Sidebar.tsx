import React from 'react';
import logoImg from '@/assets/logo.jpg';
import CleanLogo from './CleanLogo';
import { 
  Sparkles, 
  Plus, 
  History, 
  BarChart3, 
  Settings, 
  User, 
  ChevronLeft, 
  ChevronRight,
  Shield,
  Search,
  Building2
} from 'lucide-react';
import { motion } from 'motion/react';

interface SidebarProps {
  currentTab: string;
  setCurrentTab: (tab: string) => void;
  collapsed: boolean;
  setCollapsed: (collapsed: boolean) => void;
  onNewResearch: () => void;
  userEmail?: string;
  userCompanyName?: string;
  onSignOut?: () => void;
}

export default function Sidebar({
  currentTab,
  setCurrentTab,
  collapsed,
  setCollapsed,
  onNewResearch,
  userEmail = 'john@enterprise.com',
  userCompanyName = 'Enterprise Corp',
  onSignOut
}: SidebarProps) {
  const menuItems = [
    { id: 'research', label: 'Research Workspace', icon: Sparkles },
    { id: 'dashboard', label: 'Analytics Dashboard', icon: BarChart3 },
    { id: 'history', label: 'Research History', icon: History },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  const getInitials = (emailStr: string) => {
    const parts = emailStr.split('@')[0].split(/[._-]/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return emailStr.substring(0, 2).toUpperCase();
  };

  return (
    <motion.div
      id="left-sidebar"
      className="bg-white border-r border-slate-200 h-screen flex flex-col relative shrink-0"
      animate={{ width: collapsed ? 72 : 280 }}
      transition={{ duration: 0.25, ease: 'easeInOut' }}
    >
      {/* Sidebar Header */}
      <div className="p-4 flex flex-col gap-3 border-b border-slate-100 overflow-hidden min-h-[73px] justify-center">
        {collapsed ? (
          <div className="flex items-center justify-center w-full">
            <CleanLogo src={logoImg} alt="Account Intelligence Engine" className="h-8 object-contain" />
          </div>
        ) : (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex flex-col gap-2.5 select-none w-full"
          >
            {/* Logo */}
            <div className="flex items-center justify-start w-full pl-1">
              <CleanLogo src={logoImg} alt="4CE CloudLabs" className="h-11 object-contain" />
            </div>
            
            {/* Divider */}
            <div className="h-px bg-slate-100 w-full"></div>

            {/* App title */}
            <div className="flex flex-col select-none px-1">
              <span className="font-sans font-bold text-slate-800 text-sm tracking-tight leading-tight">
                Account Intelligence
              </span>
              <span className="font-sans text-[10px] text-blue-600 font-semibold uppercase tracking-wider mt-0.5">
                Research Agent
              </span>
            </div>
          </motion.div>
        )}
      </div>

      {/* New Research Button */}
      <div className="p-4 overflow-hidden">
        <button
          id="new-research-sidebar-btn"
          onClick={onNewResearch}
          className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium py-3 px-4 rounded-xl transition-all duration-200 shadow-lg shadow-blue-100/80 active:scale-98 overflow-hidden"
        >
          <Plus size={18} className="shrink-0 stroke-[2.5]" />
          {!collapsed && (
            <motion.span
              initial={{ opacity: 0, width: 0 }}
              animate={{ opacity: 1, width: 'auto' }}
              className="whitespace-nowrap"
            >
              New Research
            </motion.span>
          )}
        </button>
      </div>

      {/* Navigation Menu */}
      <nav className="flex-1 px-3 py-2 space-y-1 overflow-y-auto">
        {menuItems.map((item) => {
          const IconComponent = item.icon;
          const isActive = currentTab === item.id;
          return (
            <button
              id={`nav-item-${item.id}`}
              key={item.id}
              onClick={() => setCurrentTab(item.id)}
              className={`w-full flex items-center gap-3 px-3.5 py-3 rounded-xl text-sm font-medium transition-all duration-200 group relative ${
                isActive
                  ? 'bg-blue-50/70 text-blue-600'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
              }`}
            >
              <IconComponent 
                size={18} 
                className={`shrink-0 transition-transform duration-200 group-hover:scale-105 ${
                  isActive ? 'text-blue-600 stroke-[2.2]' : 'text-slate-400 stroke-[1.8]'
                }`} 
              />
              {!collapsed && (
                <motion.span
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="whitespace-nowrap"
                >
                  {item.label}
                </motion.span>
              )}
              
              {/* Active Indicator Line */}
              {isActive && !collapsed && (
                <motion.div 
                  layoutId="active-indicator" 
                  className="absolute right-0 top-3 bottom-3 w-1 bg-blue-600 rounded-l-full"
                />
              )}
            </button>
          );
        })}
      </nav>

      {/* Profile Footer */}
      <div className="p-3 border-t border-slate-100 bg-slate-50/50">
        <div className="flex items-center justify-between overflow-hidden rounded-xl p-2 gap-2">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="h-9 w-9 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-sm shrink-0 border border-blue-200">
              {getInitials(userEmail)}
            </div>
            {!collapsed && (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex flex-col min-w-0"
              >
                <span className="text-xs font-semibold text-slate-800 truncate">{userCompanyName}</span>
                <span className="text-[10px] text-slate-500 truncate">{userEmail}</span>
              </motion.div>
            )}
          </div>

          {!collapsed && onSignOut && (
            <button
              onClick={onSignOut}
              title="Sign Out / Home"
              className="text-xs font-bold text-slate-400 hover:text-rose-600 p-1.5 rounded-lg hover:bg-rose-50 transition-colors cursor-pointer shrink-0"
            >
              Sign Out
            </button>
          )}
        </div>
      </div>

      {/* Collapse/Expand Toggle Tab */}
      <button
        id="sidebar-toggle-btn"
        onClick={() => setCollapsed(!collapsed)}
        className="absolute top-[88px] -right-3 bg-white hover:bg-slate-50 border border-slate-200 rounded-full p-1.5 shadow-sm text-slate-500 hover:text-slate-800 transition-all hover:scale-110 z-30 flex items-center justify-center cursor-pointer"
      >
        {collapsed ? <ChevronRight size={13} /> : <ChevronLeft size={13} />}
      </button>
    </motion.div>
  );
}
