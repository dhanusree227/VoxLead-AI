import React, { useState } from 'react';
import {
  LayoutDashboard,
  PhoneCall,
  Users,
  History,
  BarChart3,
  Settings,
  ChevronLeft,
  ChevronRight,
  Menu,
  X,
  LogOut,
  Mic,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import type { AppRoute } from '../types';

interface LayoutProps {
  currentRoute: AppRoute;
  onNavigate: (route: AppRoute) => void;
  pageTitle: string;
  children: React.ReactNode;
}

const NAV_ITEMS: Array<{
  route: AppRoute;
  label: string;
  shortLabel: string;
  icon: React.ComponentType<{ className?: string }>;
}> = [
  { route: 'dashboard', label: 'Dashboard', shortLabel: 'Home', icon: LayoutDashboard },
  { route: 'voice-agent', label: 'AI Voice Agent', shortLabel: 'Agent', icon: Mic },
  { route: 'leads', label: 'Leads', shortLabel: 'Leads', icon: Users },
  { route: 'calls', label: 'Call History', shortLabel: 'Calls', icon: History },
  { route: 'analytics', label: 'Analytics', shortLabel: 'Metrics', icon: BarChart3 },
  { route: 'settings', label: 'Settings', shortLabel: 'Settings', icon: Settings },
];

export function Layout({ currentRoute, onNavigate, pageTitle, children }: LayoutProps) {
  const { user, isDemoSession, logout } = useAuth();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);

  const activeNav = currentRoute === 'call-detail' ? 'calls' : currentRoute;

  const handleNav = (route: AppRoute) => {
    onNavigate(route);
    setMobileDrawerOpen(false);
  };

  return (
    <div className="min-h-screen bg-[#F5F7FB] text-slate-900 flex flex-col lg:flex-row">
      {/* Desktop Collapsible Sidebar */}
      <aside
        className={`hidden lg:flex flex-col shrink-0 bg-[#172554] text-slate-100 transition-all duration-200 border-r border-slate-900/10 ${
          sidebarCollapsed ? 'w-[76px]' : 'w-[256px]'
        }`}
      >
        <div className="h-16 px-4 flex items-center justify-between border-b border-white/10">
          {!sidebarCollapsed && (
            <button
              type="button"
              onClick={() => handleNav('landing')}
              className="font-display font-bold text-lg tracking-tight text-white whitespace-nowrap truncate focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 rounded"
            >
              VoxLead AI
            </button>
          )}
          <button
            type="button"
            onClick={() => setSidebarCollapsed((v) => !v)}
            aria-label={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            className="p-2 rounded-lg text-slate-300 hover:text-white hover:bg-white/10 transition-colors ml-auto focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400"
          >
            {sidebarCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>
        </div>

        <nav className="flex-1 px-3 py-5 space-y-1">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const active = activeNav === item.route;
            return (
              <button
                key={item.route}
                type="button"
                onClick={() => handleNav(item.route)}
                title={sidebarCollapsed ? item.label : undefined}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 ${
                  active
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-slate-300 hover:text-white hover:bg-white/10'
                }`}
              >
                <Icon className="w-4 h-4 shrink-0" />
                {!sidebarCollapsed && <span className="truncate">{item.label}</span>}
              </button>
            );
          })}
        </nav>

        <div className="p-3 border-t border-white/10">
          <div className={`flex items-center gap-3 px-2 py-2 ${sidebarCollapsed ? 'justify-center' : ''}`}>
            <img
              src="/src/assets/images/avatar_executive_profile_1795005306101.jpg"
              alt={user?.name || 'Workspace User'}
              referrerPolicy="no-referrer"
              className="w-8 h-8 rounded-full object-cover shrink-0 bg-indigo-900"
            />
            {!sidebarCollapsed && (
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold text-white truncate">{user?.name || 'User'}</p>
                <p className="text-[11px] text-slate-300 truncate">{user?.email}</p>
              </div>
            )}
          </div>
          <button
            type="button"
            onClick={logout}
            title="Sign out"
            className={`mt-1 w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium text-slate-300 hover:text-white hover:bg-white/10 transition-colors ${
              sidebarCollapsed ? 'justify-center' : ''
            }`}
          >
            <LogOut className="w-4 h-4 shrink-0" />
            {!sidebarCollapsed && <span>Sign Out</span>}
          </button>
        </div>
      </aside>

      {/* Mobile Slide-out Drawer */}
      {mobileDrawerOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div
            className="fixed inset-0 bg-slate-950/50 backdrop-blur-xs"
            onClick={() => setMobileDrawerOpen(false)}
          />
          <aside className="relative w-72 max-w-[82vw] bg-[#172554] text-slate-100 flex flex-col z-10 shadow-xl">
            <div className="h-14 px-4 flex items-center justify-between border-b border-white/10">
              <span className="font-display font-bold text-lg text-white">VoxLead AI</span>
              <button
                type="button"
                onClick={() => setMobileDrawerOpen(false)}
                aria-label="Close navigation menu"
                className="p-2 rounded-lg text-slate-300 hover:text-white hover:bg-white/10"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <nav className="flex-1 px-3 py-4 space-y-1">
              {NAV_ITEMS.map((item) => {
                const Icon = item.icon;
                const active = activeNav === item.route;
                return (
                  <button
                    key={item.route}
                    type="button"
                    onClick={() => handleNav(item.route)}
                    className={`w-full flex items-center gap-3 px-3 py-3 rounded-lg text-sm font-medium transition-colors ${
                      active ? 'bg-indigo-600 text-white' : 'text-slate-300 hover:bg-white/10 hover:text-white'
                    }`}
                  >
                    <Icon className="w-4 h-4 shrink-0" />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </nav>
            <div className="p-4 border-t border-white/10">
              <p className="text-sm font-medium text-white truncate">{user?.name}</p>
              <p className="text-xs text-slate-300 truncate mb-3">{user?.email}</p>
              <button
                type="button"
                onClick={logout}
                className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg bg-white/10 text-sm font-medium text-white hover:bg-white/15"
              >
                <LogOut className="w-4 h-4" />
                Sign Out
              </button>
            </div>
          </aside>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 min-w-0 flex flex-col pb-16 lg:pb-0">
        {/* Top Workspace Header */}
        <header className="h-14 lg:h-16 bg-white border-b border-slate-200/80 px-4 lg:px-8 flex items-center justify-between gap-4 sticky top-0 z-30">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => setMobileDrawerOpen(true)}
              aria-label="Open navigation menu"
              className="lg:hidden p-2 -ml-2 rounded-lg text-slate-600 hover:bg-slate-100 min-h-[40px] min-w-[40px] flex items-center justify-center"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-2 text-sm min-w-0">
              <span className="hidden sm:inline text-slate-400">Workspace</span>
              <span className="hidden sm:inline text-slate-300">/</span>
              <h1 className="font-display font-semibold text-slate-900 truncate">{pageTitle}</h1>
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            {isDemoSession && (
              <span className="hidden sm:inline-flex items-center rounded-md bg-amber-50 border border-amber-200 px-2.5 py-1 text-xs font-medium text-amber-800 whitespace-nowrap shrink-0">
                Demo Mode
              </span>
            )}
            <button
              type="button"
              onClick={() => onNavigate('voice-agent')}
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg bg-[#172554] hover:bg-indigo-700 text-white text-xs sm:text-sm font-medium transition-colors whitespace-nowrap shrink-0 min-h-[40px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
            >
              <PhoneCall className="w-4 h-4 shrink-0" />
              <span>Start Voice Call</span>
            </button>
          </div>
        </header>

        {isDemoSession && (
          <div className="bg-amber-50/90 border-b border-amber-200/80 px-4 lg:px-8 py-2 text-xs text-amber-900 flex flex-wrap items-center justify-between gap-2">
            <span>
              You are viewing the Demo Workspace with clearly-labelled sample leads and transcripts. All edits and new Gemini calls persist locally.
            </span>
            <button
              type="button"
              onClick={() => onNavigate('settings')}
              className="font-semibold underline hover:text-amber-950 whitespace-nowrap"
            >
              Manage Demo Data
            </button>
          </div>
        )}

        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-[1440px] w-full mx-auto">
          {children}
        </main>
      </div>

      {/* Mobile Bottom Navigation (compact <= 56px to respect 15% mobile sticky cap) */}
      <nav
        aria-label="Mobile navigation"
        className="lg:hidden fixed bottom-0 inset-x-0 h-14 bg-white border-t border-slate-200 grid grid-cols-5 z-40"
      >
        {NAV_ITEMS.slice(0, 5).map((item) => {
          const Icon = item.icon;
          const active = activeNav === item.route;
          return (
            <button
              key={item.route}
              type="button"
              onClick={() => handleNav(item.route)}
              className={`flex flex-col items-center justify-center gap-0.5 text-[11px] font-medium transition-colors ${
                active ? 'text-indigo-600' : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span className="truncate max-w-[60px]">{item.shortLabel}</span>
            </button>
          );
        })}
      </nav>
    </div>
  );
}
