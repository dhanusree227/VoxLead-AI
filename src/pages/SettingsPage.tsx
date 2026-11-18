import { useEffect, useState } from 'react';
import { CheckCircle2, AlertTriangle, LogOut, Copy, Check, Database, Trash2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import type { SettingsStatus } from '../types';

const ENV_TEMPLATE = `GEMINI_API_KEY=your_gemini_api_key
VAPI_API_KEY=your_vapi_private_key
VAPI_PUBLIC_KEY=your_vapi_public_key
VAPI_ASSISTANT_ID=your_vapi_assistant_id
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/voxlead_db
JWT_SECRET_KEY=replace-with-strong-random-secret
FRONTEND_URL=http://localhost:3000`;

export function SettingsPage() {
  const { user, logout, isDemoSession } = useAuth();
  const [status, setStatus] = useState<SettingsStatus | null>(null);
  const [copied, setCopied] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api.getSettingsStatus().then(setStatus).catch(() => null);
  }, []);

  const copyEnv = async () => {
    try {
      await navigator.clipboard.writeText(ENV_TEMPLATE);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };

  const handleLoadDemo = async () => {
    setBusy(true);
    setNotice(null);
    try {
      const res = await api.loadDemoData();
      setNotice(`Loaded sample dataset (${res.leads} leads, ${res.calls} calls).`);
    } catch (err) {
      setNotice(err instanceof Error ? err.message : 'Unable to load sample data.');
    } finally {
      setBusy(false);
    }
  };

  const handleClearData = async () => {
    setBusy(true);
    setNotice(null);
    try {
      await api.clearWorkspace();
      setNotice('All workspace leads and call records have been cleared.');
    } catch (err) {
      setNotice(err instanceof Error ? err.message : 'Unable to clear workspace.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h2 className="font-display text-xl sm:text-2xl font-bold text-[#172554]">Workspace Settings</h2>
        <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
          Manage your profile, inspect integration readiness, and review environment configuration
        </p>
      </div>

      {notice && (
        <div className="rounded-xl bg-indigo-50 border border-indigo-200 p-4 text-sm text-indigo-900">
          {notice}
        </div>
      )}

      {/* User Profile */}
      <div className="bg-white rounded-xl border border-slate-200/90 p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <img
            src="/src/assets/images/avatar_executive_profile_1795005306101.jpg"
            alt={user?.name || 'User avatar'}
            referrerPolicy="no-referrer"
            className="w-14 h-14 rounded-full object-cover border border-slate-200 shrink-0"
          />
          <div>
            <h3 className="font-display font-bold text-slate-900">{user?.name}</h3>
            <p className="text-sm text-slate-600">{user?.email}</p>
            <p className="text-xs text-slate-400 mt-0.5">
              {isDemoSession ? 'Demo Workspace Session' : 'Authenticated Account'}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={logout}
          className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg border border-slate-300 hover:bg-slate-50 text-slate-700 text-sm font-medium min-h-[40px]"
        >
          <LogOut className="w-4 h-4" />
          Sign Out
        </button>
      </div>

      {/* Integration Status Panel (Never displays secret keys) */}
      <div className="bg-white rounded-xl border border-slate-200/90 p-5 sm:p-6 space-y-4">
        <div>
          <h3 className="font-display font-bold text-slate-900">Integration Configuration Status</h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Secret keys are read strictly on the server via environment variables and are never exposed in the browser.
          </p>
        </div>

        <div className="divide-y divide-slate-100 text-sm">
          <div className="py-3 flex items-center justify-between gap-4">
            <div>
              <p className="font-semibold text-slate-900">Google Gemini API</p>
              <p className="text-xs text-slate-500">Lead qualification, structured JSON extraction, and voice turns</p>
            </div>
            {status?.gemini_configured ? (
              <span className="inline-flex items-center gap-1.5 rounded-md bg-emerald-50 border border-emerald-200 px-2.5 py-1 text-xs font-medium text-emerald-700 whitespace-nowrap">
                <CheckCircle2 className="w-3.5 h-3.5" /> Configured
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 rounded-md bg-amber-50 border border-amber-200 px-2.5 py-1 text-xs font-medium text-amber-800 whitespace-nowrap">
                <AlertTriangle className="w-3.5 h-3.5" /> Not Configured
              </span>
            )}
          </div>

          <div className="py-3 flex items-center justify-between gap-4">
            <div>
              <p className="font-semibold text-slate-900">Vapi Voice AI</p>
              <p className="text-xs text-slate-500">Browser WebRTC voice calling &amp; end-of-call webhooks (Telephony optional)</p>
            </div>
            {status?.vapi_configured && status?.vapi_public_configured ? (
              <span className="inline-flex items-center gap-1.5 rounded-md bg-emerald-50 border border-emerald-200 px-2.5 py-1 text-xs font-medium text-emerald-700 whitespace-nowrap">
                <CheckCircle2 className="w-3.5 h-3.5" /> Configured
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 rounded-md bg-amber-50 border border-amber-200 px-2.5 py-1 text-xs font-medium text-amber-800 whitespace-nowrap">
                <AlertTriangle className="w-3.5 h-3.5" /> Not Configured
              </span>
            )}
          </div>

          <div className="py-3 flex items-center justify-between gap-4">
            <div>
              <p className="font-semibold text-slate-900">Database Persistence</p>
              <p className="text-xs text-slate-500">{status?.database_engine || 'Persistent Store (FastAPI uses PostgreSQL)'}</p>
            </div>
            <span className="inline-flex items-center gap-1.5 rounded-md bg-emerald-50 border border-emerald-200 px-2.5 py-1 text-xs font-medium text-emerald-700 whitespace-nowrap">
              <CheckCircle2 className="w-3.5 h-3.5" /> Connected
            </span>
          </div>
        </div>
      </div>

      {/* Environment Setup Instructions */}
      <div className="bg-white rounded-xl border border-slate-200/90 p-5 sm:p-6 space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h3 className="font-display font-bold text-slate-900">Environment Setup Guide</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Configure these variables in <span className="font-mono">.env</span> for local development or in Render / Railway / AI Studio Secrets.
            </p>
          </div>
          <button
            type="button"
            onClick={copyEnv}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-300 text-xs font-medium text-slate-700 hover:bg-slate-50 whitespace-nowrap"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
            {copied ? 'Copied' : 'Copy Template'}
          </button>
        </div>

        <pre className="rounded-lg bg-slate-950 text-slate-100 p-4 text-xs font-mono overflow-x-auto leading-relaxed">
          {ENV_TEMPLATE}
        </pre>

        <div className="text-xs text-slate-600 space-y-1.5">
          <p>
            <strong>1. Gemini API:</strong> Create an API key in Google AI Studio and assign it to{' '}
            <span className="font-mono">GEMINI_API_KEY</span>.
          </p>
          <p>
            <strong>2. Vapi Voice AI:</strong> Create an assistant in Vapi, copy the Private Key, Public Key, and Assistant ID into{' '}
            <span className="font-mono">VAPI_API_KEY</span>, <span className="font-mono">VAPI_PUBLIC_KEY</span>, and{' '}
            <span className="font-mono">VAPI_ASSISTANT_ID</span>. Point the Vapi webhook URL to <span className="font-mono">/api/voice/webhook</span>.
          </p>
          <p>
            <strong>3. Python FastAPI + PostgreSQL:</strong> Run <span className="font-mono">uvicorn app.main:app --reload</span> inside{' '}
            <span className="font-mono">backend/</span> with <span className="font-mono">DATABASE_URL</span> pointing to your PostgreSQL instance.
          </p>
        </div>
      </div>

      {/* Workspace Data Controls */}
      <div className="bg-white rounded-xl border border-slate-200/90 p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="font-display font-bold text-slate-900">Sample &amp; Workspace Records</h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Reload clearly-labelled sample data or clear all records to test an empty workspace.
          </p>
        </div>
        <div className="flex flex-wrap gap-2.5">
          <button
            type="button"
            disabled={busy}
            onClick={handleLoadDemo}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-slate-300 hover:bg-slate-50 text-xs font-semibold text-slate-800"
          >
            <Database className="w-3.5 h-3.5" />
            Load Sample Data
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={handleClearData}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-rose-200 hover:bg-rose-50 text-xs font-semibold text-rose-700"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Clear All Records
          </button>
        </div>
      </div>
    </div>
  );
}
