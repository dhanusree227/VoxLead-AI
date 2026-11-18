import React, { useState } from 'react';
import { ArrowLeft, Eye, EyeOff, AlertCircle, CheckCircle2, PhoneCall } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

type AuthMode = 'login' | 'register' | 'forgot';

interface AuthPageProps {
  onSuccess: () => void;
  onBackToLanding: () => void;
}

export function AuthPage({ onSuccess, onBackToLanding }: AuthPageProps) {
  const { login, register, loginDemo } = useAuth();
  const [mode, setMode] = useState<AuthMode>('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setNotice(null);

    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError('Please enter a valid email address.');
      return;
    }

    if (mode === 'forgot') {
      setNotice(
        `If an account exists for ${email.trim()}, password reset instructions have been queued. For local evaluation, you may register a new account or enter Demo Mode below.`
      );
      return;
    }

    if (mode === 'register' && name.trim().length < 2) {
      setError('Please enter your full name (at least 2 characters).');
      return;
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters long.');
      return;
    }

    setSubmitting(true);
    try {
      if (mode === 'login') {
        await login(email.trim(), password);
      } else {
        await register(name.trim(), email.trim(), password);
      }
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Authentication failed.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDemoEnter = async () => {
    setError(null);
    setSubmitting(true);
    try {
      await loginDemo();
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to start Demo Mode.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F5F7FB] flex flex-col justify-center py-10 px-4 sm:px-6">
      <div className="max-w-md w-full mx-auto">
        <button
          type="button"
          onClick={onBackToLanding}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-600 hover:text-[#172554] mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to VoxLead AI
        </button>

        <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-6 sm:p-8">
          <div className="flex items-center gap-2.5 mb-2">
            <div className="w-8 h-8 rounded-lg bg-[#172554] text-white flex items-center justify-center">
              <PhoneCall className="w-4 h-4" />
            </div>
            <span className="font-display font-bold text-lg text-[#172554]">VoxLead AI</span>
          </div>

          <h1 className="font-display text-2xl font-bold text-slate-900 mt-4">
            {mode === 'login' && 'Sign in to your workspace'}
            {mode === 'register' && 'Create your workspace account'}
            {mode === 'forgot' && 'Reset your password'}
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            {mode === 'login' && 'Access voice agents, call transcripts, and Gemini lead scoring.'}
            {mode === 'register' && 'Start qualifying inbound and browser voice calls with Gemini.'}
            {mode === 'forgot' && 'Enter your email address to request a password reset link.'}
          </p>

          {error && (
            <div className="mt-5 rounded-lg bg-rose-50 border border-rose-200 p-3 text-xs text-rose-800 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" />
              <span>{error}</span>
            </div>
          )}

          {notice && (
            <div className="mt-5 rounded-lg bg-emerald-50 border border-emerald-200 p-3 text-xs text-emerald-800 flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-emerald-600" />
              <span>{notice}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            {mode === 'register' && (
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">Full Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Alex Rivera"
                  required
                  className="w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Work Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@company.com"
                required
                className="w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>

            {mode !== 'forgot' && (
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-semibold text-slate-700">Password</label>
                  {mode === 'login' && (
                    <button
                      type="button"
                      onClick={() => {
                        setMode('forgot');
                        setError(null);
                        setNotice(null);
                      }}
                      className="text-xs font-medium text-indigo-600 hover:text-indigo-800"
                    >
                      Forgot password?
                    </button>
                  )}
                </div>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Minimum 8 characters"
                    required
                    className="w-full rounded-lg border border-slate-300 px-3.5 py-2.5 pr-10 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-700"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-2.5 px-4 rounded-lg bg-[#172554] hover:bg-indigo-700 disabled:opacity-60 text-white text-sm font-semibold transition-colors min-h-[44px]"
            >
              {submitting
                ? 'Please wait...'
                : mode === 'login'
                ? 'Sign In'
                : mode === 'register'
                ? 'Create Account'
                : 'Send Reset Instructions'}
            </button>
          </form>

          <div className="mt-5 pt-5 border-t border-slate-200">
            <button
              type="button"
              onClick={handleDemoEnter}
              disabled={submitting}
              className="w-full py-2.5 px-4 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-900 border border-indigo-200 text-xs sm:text-sm font-semibold transition-colors min-h-[44px]"
            >
              Enter Demo Mode (Sample Leads &amp; Transcripts)
            </button>
            <p className="text-[11px] text-slate-500 text-center mt-2">
              Demo Mode uses a pre-seeded workspace account (<span className="font-mono">demo@voxlead.ai</span>) with clearly labelled sample records.
            </p>
          </div>

          <div className="mt-5 text-center text-xs text-slate-600">
            {mode === 'login' ? (
              <>
                New to VoxLead AI?{' '}
                <button
                  type="button"
                  onClick={() => {
                    setMode('register');
                    setError(null);
                    setNotice(null);
                  }}
                  className="font-semibold text-indigo-600 hover:text-indigo-800"
                >
                  Create an account
                </button>
              </>
            ) : (
              <>
                Already have an account?{' '}
                <button
                  type="button"
                  onClick={() => {
                    setMode('login');
                    setError(null);
                    setNotice(null);
                  }}
                  className="font-semibold text-indigo-600 hover:text-indigo-800"
                >
                  Sign in
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
