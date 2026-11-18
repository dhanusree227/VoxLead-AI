import { useEffect, useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Layout } from './components/Layout';
import { LandingPage } from './pages/LandingPage';
import { AuthPage } from './pages/AuthPage';
import { DashboardPage } from './pages/DashboardPage';
import { VoiceAgentPage } from './pages/VoiceAgentPage';
import { LeadsPage } from './pages/LeadsPage';
import { CallsPage } from './pages/CallsPage';
import { CallDetailPage } from './pages/CallDetailPage';
import { AnalyticsPage } from './pages/AnalyticsPage';
import { SettingsPage } from './pages/SettingsPage';
import type { AppRoute } from './types';

const PAGE_TITLES: Record<AppRoute, string> = {
  landing: 'VoxLead AI',
  auth: 'Sign In',
  dashboard: 'Dashboard',
  'voice-agent': 'AI Voice Agent',
  leads: 'Lead Management',
  calls: 'Call History',
  'call-detail': 'Call Details',
  analytics: 'AI Lead Analytics',
  settings: 'Settings',
};

function AppRouter() {
  const { isAuthenticated, isLoading } = useAuth();
  const [route, setRoute] = useState<AppRoute>('landing');
  const [selectedCallId, setSelectedCallId] = useState<number | null>(null);

  useEffect(() => {
    if (!isLoading && !isAuthenticated && route !== 'landing' && route !== 'auth') {
      setRoute('auth');
    }
  }, [isLoading, isAuthenticated, route]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#F5F7FB] flex items-center justify-center text-sm text-slate-500">
        Loading VoxLead AI workspace...
      </div>
    );
  }

  if (route === 'landing') {
    return (
      <LandingPage
        isAuthenticated={isAuthenticated}
        onGetStarted={() => setRoute(isAuthenticated ? 'dashboard' : 'auth')}
        onExploreDashboard={() => setRoute(isAuthenticated ? 'dashboard' : 'auth')}
      />
    );
  }

  if (route === 'auth' || !isAuthenticated) {
    return (
      <AuthPage
        onSuccess={() => setRoute('dashboard')}
        onBackToLanding={() => setRoute('landing')}
      />
    );
  }

  const openCallDetail = (callId: number) => {
    setSelectedCallId(callId);
    setRoute('call-detail');
  };

  return (
    <Layout
      currentRoute={route}
      onNavigate={(next) => setRoute(next)}
      pageTitle={PAGE_TITLES[route]}
    >
      {route === 'dashboard' && (
        <DashboardPage onNavigate={setRoute} onSelectCall={openCallDetail} />
      )}
      {route === 'voice-agent' && (
        <VoiceAgentPage onOpenCallDetail={openCallDetail} />
      )}
      {route === 'leads' && <LeadsPage />}
      {route === 'calls' && (
        <CallsPage onSelectCall={openCallDetail} onNavigate={setRoute} />
      )}
      {route === 'call-detail' && selectedCallId !== null && (
        <CallDetailPage
          callId={selectedCallId}
          onBack={() => setRoute('calls')}
        />
      )}
      {route === 'analytics' && <AnalyticsPage />}
      {route === 'settings' && <SettingsPage />}
    </Layout>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppRouter />
    </AuthProvider>
  );
}
