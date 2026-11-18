import { useEffect, useState } from 'react';
import { History, ArrowRight, AlertCircle, PhoneCall } from 'lucide-react';
import { api } from '../services/api';
import type { AppRoute, CallRecord } from '../types';
import { CallStatusTag, LeadStatusTag, formatDateTime, formatDuration } from '../components/StatusBadge';

interface CallsPageProps {
  onSelectCall: (callId: number) => void;
  onNavigate: (route: AppRoute) => void;
}

export function CallsPage({ onSelectCall, onNavigate }: CallsPageProps) {
  const [calls, setCalls] = useState<CallRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .getCalls()
      .then(setCalls)
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load calls.'))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="font-display text-xl sm:text-2xl font-bold text-[#172554]">Call History</h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Inspect full transcripts, Gemini qualification reasoning, and follow-up actions
          </p>
        </div>
        <button
          type="button"
          onClick={() => onNavigate('voice-agent')}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-[#172554] hover:bg-indigo-700 text-white text-sm font-semibold whitespace-nowrap min-h-[42px]"
        >
          <PhoneCall className="w-4 h-4" />
          New Voice Call
        </button>
      </div>

      {error && (
        <div className="rounded-xl bg-rose-50 border border-rose-200 p-4 text-sm text-rose-800 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <div className="bg-white rounded-xl border border-slate-200/90 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-sm text-slate-500">Loading call records...</div>
        ) : calls.length === 0 ? (
          <div className="p-10 text-center">
            <History className="w-8 h-8 text-slate-300 mx-auto mb-3" />
            <p className="font-display font-semibold text-slate-900">No calls recorded yet</p>
            <p className="text-xs text-slate-500 mt-1">
              Run a voice call in the AI Voice Agent console to generate transcripts and summaries.
            </p>
          </div>
        ) : (
          <>
            {/* Desktop Table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50/80 border-b border-slate-200 text-xs text-slate-500">
                  <tr>
                    <th className="py-3 px-4 font-medium">Customer</th>
                    <th className="py-3 px-4 font-medium">Phone Number</th>
                    <th className="py-3 px-4 font-medium">Call Date</th>
                    <th className="py-3 px-4 font-medium text-right">Duration</th>
                    <th className="py-3 px-4 font-medium">Call Status</th>
                    <th className="py-3 px-4 font-medium">Lead Classification</th>
                    <th className="py-3 px-4 font-medium text-right">Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {calls.map((call) => (
                    <tr
                      key={call.id}
                      onClick={() => onSelectCall(call.id)}
                      className="hover:bg-slate-50/80 cursor-pointer transition-colors"
                    >
                      <td className="py-3.5 px-4 font-medium text-slate-900">
                        {call.customer_name}
                      </td>
                      <td className="py-3.5 px-4 font-mono text-xs text-slate-600 tabular-nums">
                        {call.phone_number || 'Browser Session'}
                      </td>
                      <td className="py-3.5 px-4 text-xs text-slate-500 tabular-nums whitespace-nowrap">
                        {formatDateTime(call.created_at)}
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono text-xs text-slate-700 tabular-nums">
                        {formatDuration(call.duration)}
                      </td>
                      <td className="py-3.5 px-4">
                        <CallStatusTag status={call.call_status} />
                      </td>
                      <td className="py-3.5 px-4">
                        <LeadStatusTag status={call.qualification_result?.lead_status || 'Cold'} />
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <span className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-600">
                          Inspect <ArrowRight className="w-3.5 h-3.5" />
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Cards */}
            <div className="md:hidden divide-y divide-slate-100">
              {calls.map((call) => (
                <button
                  key={call.id}
                  type="button"
                  onClick={() => onSelectCall(call.id)}
                  className="w-full text-left p-4 space-y-2 hover:bg-slate-50 transition-colors"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-semibold text-sm text-slate-900 truncate">{call.customer_name}</span>
                    <LeadStatusTag status={call.qualification_result?.lead_status || 'Cold'} />
                  </div>
                  <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 tabular-nums">
                    <span className="font-mono">{call.phone_number || 'Browser Session'}</span>
                    <span aria-hidden="true">·</span>
                    <span>{formatDateTime(call.created_at)}</span>
                    <span aria-hidden="true">·</span>
                    <span className="font-mono">{formatDuration(call.duration)}</span>
                  </div>
                  <div className="flex items-center justify-between pt-1">
                    <CallStatusTag status={call.call_status} />
                    <span className="text-xs font-semibold text-indigo-600">View transcript →</span>
                  </div>
                </button>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
