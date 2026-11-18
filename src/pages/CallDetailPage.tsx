import { useEffect, useState } from 'react';
import { ArrowLeft, RefreshCw, AlertCircle } from 'lucide-react';
import { api } from '../services/api';
import type { CallRecord } from '../types';
import { CallStatusTag, LeadStatusTag, formatDateTime, formatDuration } from '../components/StatusBadge';

interface CallDetailPageProps {
  callId: number;
  onBack: () => void;
}

export function CallDetailPage({ callId, onBack }: CallDetailPageProps) {
  const [call, setCall] = useState<CallRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [reanalyzing, setReanalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    api
      .getCall(callId)
      .then(setCall)
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load call record.'))
      .finally(() => setLoading(false));
  }, [callId]);

  const handleReanalyze = async () => {
    if (!call || !call.transcript.trim()) return;
    setReanalyzing(true);
    setError(null);
    try {
      const res = await api.qualifyLead({
        transcript: call.transcript,
        call_id: call.id,
        customer_name: call.customer_name,
        phone_number: call.phone_number || undefined,
        persist: true,
      });
      if (res.call) {
        setCall(res.call);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gemini re-analysis failed.');
    } finally {
      setReanalyzing(false);
    }
  };

  if (loading) {
    return <div className="p-8 text-center text-sm text-slate-500">Loading call record...</div>;
  }

  if (!call) {
    return (
      <div className="space-y-4">
        <button type="button" onClick={onBack} className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-600 hover:text-[#172554]">
          <ArrowLeft className="w-4 h-4" /> Back to Call History
        </button>
        <div className="rounded-xl bg-rose-50 border border-rose-200 p-6 text-sm text-rose-800">
          {error || 'Call record not found.'}
        </div>
      </div>
    );
  }

  const qual = call.qualification_result;
  const transcriptLines = call.transcript
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-600 hover:text-[#172554]"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Call History
        </button>

        <button
          type="button"
          onClick={handleReanalyze}
          disabled={reanalyzing || !call.transcript.trim()}
          className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg bg-white border border-slate-300 hover:bg-slate-50 text-slate-800 text-xs sm:text-sm font-semibold disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${reanalyzing ? 'animate-spin' : ''}`} />
          {reanalyzing ? 'Analyzing with Gemini...' : 'Re-run Gemini Qualification'}
        </button>
      </div>

      {error && (
        <div className="rounded-xl bg-rose-50 border border-rose-200 p-4 text-sm text-rose-800 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Header Metadata Card */}
      <div className="bg-white rounded-xl border border-slate-200/90 p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="font-display text-xl font-bold text-[#172554]">{call.customer_name}</h2>
          <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-500 tabular-nums">
            <span className="font-mono">{call.phone_number || 'Browser Session'}</span>
            <span aria-hidden="true">·</span>
            <span>{formatDateTime(call.created_at)}</span>
            <span aria-hidden="true">·</span>
            <span className="font-mono">Duration {formatDuration(call.duration)}</span>
          </div>
        </div>
        <div className="flex items-center gap-2.5">
          <CallStatusTag status={call.call_status} />
          <LeadStatusTag status={qual?.lead_status || 'Cold'} />
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
        {/* AI Qualification Summary */}
        <div className="xl:col-span-5 space-y-5 bg-white rounded-xl border border-slate-200/90 p-5 sm:p-6">
          <h3 className="font-display font-bold text-slate-900">AI Lead Qualification</h3>

          <div>
            <p className="text-xs font-medium text-slate-500">AI-Generated Call Summary</p>
            <p className="text-sm text-slate-800 leading-relaxed mt-1">
              {call.summary || qual?.summary || 'No summary generated yet.'}
            </p>
          </div>

          <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t border-slate-100 text-sm">
            <div>
              <dt className="text-xs text-slate-500">Budget</dt>
              <dd className="font-semibold text-slate-900 mt-0.5 tabular-nums">
                {qual?.budget || 'Not provided'}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-slate-500">Interest Level</dt>
              <dd className="font-semibold text-slate-900 mt-0.5">
                {qual?.interest_level || 'Not provided'}
              </dd>
            </div>
            <div className="sm:col-span-2">
              <dt className="text-xs text-slate-500">Purchase Timeline</dt>
              <dd className="font-medium text-slate-900 mt-0.5">
                {qual?.purchase_timeline || 'Not provided'}
              </dd>
            </div>
            <div className="sm:col-span-2">
              <dt className="text-xs text-slate-500">Customer Requirements</dt>
              <dd className="text-slate-800 mt-0.5">
                {qual?.customer_requirements || 'Not provided'}
              </dd>
            </div>
          </dl>

          <div className="pt-4 border-t border-slate-100 space-y-3 text-sm">
            <div>
              <p className="text-xs text-slate-500">Lead Qualification Reasoning</p>
              <p className="text-slate-800 mt-1">
                {qual?.qualification_reasoning || 'Classified based on budget, timeline, and stated requirements.'}
              </p>
            </div>

            <div className="rounded-lg bg-indigo-50/80 border border-indigo-200/80 p-3.5">
              <p className="text-xs font-semibold text-indigo-900">Follow-Up Recommendation</p>
              <p className="text-sm text-indigo-950 mt-1">
                {call.follow_up_recommendation || qual?.follow_up_recommendation || 'Follow up with prospect.'}
              </p>
            </div>
          </div>
        </div>

        {/* Full Transcript */}
        <div className="xl:col-span-7 bg-white rounded-xl border border-slate-200/90 p-5 sm:p-6">
          <h3 className="font-display font-bold text-slate-900 mb-4">Full Call Transcript</h3>
          {transcriptLines.length === 0 ? (
            <p className="text-sm text-slate-500">No transcript available for this call.</p>
          ) : (
            <div className="space-y-3">
              {transcriptLines.map((line, i) => {
                const isAI = line.startsWith('AI:') || line.startsWith('Assistant:');
                const isCustomer = line.startsWith('Customer:') || line.startsWith('User:');
                const speaker = isAI ? 'VoxLead AI' : isCustomer ? call.customer_name : 'Speaker';
                const content = line.replace(/^(AI|Assistant|Customer|User):\s*/i, '');

                return (
                  <div
                    key={i}
                    className={`rounded-lg p-3.5 text-sm ${
                      isAI
                        ? 'bg-[#F5F7FB] border border-slate-200/70 text-slate-800'
                        : 'bg-white border border-slate-200 text-slate-900'
                    }`}
                  >
                    <p className="text-xs font-semibold text-[#172554] mb-1">{speaker}</p>
                    <p className="leading-relaxed">{content}</p>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
