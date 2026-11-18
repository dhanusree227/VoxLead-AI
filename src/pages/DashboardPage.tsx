import { useEffect, useState } from 'react';
import { PhoneCall, ArrowRight, AlertCircle, Database } from 'lucide-react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { api } from '../services/api';
import type { AnalyticsOverview, AppRoute, CallRecord, CallTrendPoint, Lead, LeadDistribution } from '../types';
import { CallStatusTag, LeadStatusTag, formatDateShort, formatDuration } from '../components/StatusBadge';

interface DashboardPageProps {
  onNavigate: (route: AppRoute) => void;
  onSelectCall: (callId: number) => void;
}

const PIE_COLORS: Record<string, string> = {
  Hot: '#E11D48',
  Warm: '#D97706',
  Cold: '#06B6D4',
};

export function DashboardPage({ onNavigate, onSelectCall }: DashboardPageProps) {
  const [overview, setOverview] = useState<AnalyticsOverview | null>(null);
  const [trends, setTrends] = useState<CallTrendPoint[]>([]);
  const [distribution, setDistribution] = useState<LeadDistribution | null>(null);
  const [recentCalls, setRecentCalls] = useState<CallRecord[]>([]);
  const [recentLeads, setRecentLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDashboard = async () => {
    setLoading(true);
    setError(null);
    try {
      const [ov, tr, dist, calls, leads] = await Promise.all([
        api.getAnalyticsOverview(),
        api.getCallTrends(),
        api.getLeadDistribution(),
        api.getCalls(),
        api.getLeads({ sort: 'desc' }),
      ]);
      setOverview(ov);
      setTrends(tr);
      setDistribution(dist);
      setRecentCalls(calls.slice(0, 5));
      setRecentLeads(leads.slice(0, 5));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load dashboard data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
  }, []);

  const handleLoadSample = async () => {
    try {
      await api.loadDemoData();
      await fetchDashboard();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load sample data.');
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-28 rounded-xl bg-white border border-slate-200 animate-pulse p-5" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 h-80 rounded-xl bg-white border border-slate-200 animate-pulse" />
          <div className="h-80 rounded-xl bg-white border border-slate-200 animate-pulse" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-xl bg-rose-50 border border-rose-200 p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
          <div>
            <h2 className="font-display font-semibold text-rose-950">Unable to load dashboard</h2>
            <p className="text-sm text-rose-800 mt-1">{error}</p>
          </div>
        </div>
        <button
          type="button"
          onClick={fetchDashboard}
          className="px-4 py-2 rounded-lg bg-rose-700 text-white text-sm font-medium hover:bg-rose-800 shrink-0"
        >
          Retry
        </button>
      </div>
    );
  }

  const isEmpty = !overview || (overview.total_calls === 0 && recentLeads.length === 0);

  if (isEmpty) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 p-8 sm:p-12 text-center max-w-2xl mx-auto mt-6">
        <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto mb-4">
          <Database className="w-6 h-6" />
        </div>
        <h2 className="font-display text-xl font-bold text-[#172554]">No calls or leads recorded yet</h2>
        <p className="text-sm text-slate-600 mt-2 max-w-md mx-auto">
          All dashboard metrics calculate directly from stored records. Start a browser voice call or load
          clearly-labelled sample records to explore the analytics pipeline.
        </p>
        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          <button
            type="button"
            onClick={() => onNavigate('voice-agent')}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-[#172554] hover:bg-indigo-700 text-white text-sm font-semibold min-h-[44px]"
          >
            <PhoneCall className="w-4 h-4" />
            Start New Call
          </button>
          <button
            type="button"
            onClick={handleLoadSample}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-white border border-slate-300 hover:bg-slate-50 text-slate-800 text-sm font-semibold min-h-[44px]"
          >
            Load Sample Demo Data
          </button>
        </div>
      </div>
    );
  }

  const pieData = (distribution?.by_status || []).filter((item) => item.value > 0);

  return (
    <div className="space-y-6">
      {/* Top Action Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="font-display text-xl sm:text-2xl font-bold text-[#172554]">Pipeline Overview</h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Real-time metrics computed directly from persisted call logs and qualified leads
          </p>
        </div>
        <button
          type="button"
          onClick={() => onNavigate('voice-agent')}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold transition-colors whitespace-nowrap min-h-[42px]"
        >
          <PhoneCall className="w-4 h-4" />
          <span>Start New Call</span>
        </button>
      </div>

      {/* Primary KPI Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-slate-200/90 p-5">
          <p className="text-xs font-medium text-slate-500">Total Calls</p>
          <p className="font-display text-2xl sm:text-3xl font-bold text-[#172554] mt-2 tabular-nums">
            {overview.total_calls}
          </p>
          <p className="text-xs text-slate-500 mt-1 tabular-nums">
            Avg duration {formatDuration(overview.avg_call_duration)}
          </p>
        </div>

        <div className="bg-white rounded-xl border border-slate-200/90 p-5">
          <p className="text-xs font-medium text-slate-500">Completed Calls</p>
          <p className="font-display text-2xl sm:text-3xl font-bold text-[#172554] mt-2 tabular-nums">
            {overview.completed_calls}
          </p>
          <p className="text-xs text-slate-500 mt-1">Transcripts stored &amp; analyzed</p>
        </div>

        <div className="bg-white rounded-xl border border-slate-200/90 p-5">
          <p className="text-xs font-medium text-slate-500">Qualified Leads</p>
          <p className="font-display text-2xl sm:text-3xl font-bold text-indigo-600 mt-2 tabular-nums">
            {overview.qualified_leads}
          </p>
          <p className="text-xs text-slate-500 mt-1">Hot &amp; Warm opportunities</p>
        </div>

        <div className="bg-white rounded-xl border border-slate-200/90 p-5">
          <p className="text-xs font-medium text-slate-500">Conversion Rate</p>
          <p className="font-display text-2xl sm:text-3xl font-bold text-cyan-700 mt-2 tabular-nums">
            {overview.conversion_rate}%
          </p>
          <p className="text-xs text-slate-500 mt-1">Qualified leads per call</p>
        </div>
      </div>

      {/* Hot / Warm / Cold Lead Breakdown */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-slate-200/90 p-4 flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-slate-500">Hot Leads</p>
            <p className="font-display text-2xl font-bold text-rose-600 mt-1 tabular-nums">
              {overview.hot_leads}
            </p>
          </div>
          <LeadStatusTag status="Hot" />
        </div>

        <div className="bg-white rounded-xl border border-slate-200/90 p-4 flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-slate-500">Warm Leads</p>
            <p className="font-display text-2xl font-bold text-amber-600 mt-1 tabular-nums">
              {overview.warm_leads}
            </p>
          </div>
          <LeadStatusTag status="Warm" />
        </div>

        <div className="bg-white rounded-xl border border-slate-200/90 p-4 flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-slate-500">Cold Leads</p>
            <p className="font-display text-2xl font-bold text-slate-700 mt-1 tabular-nums">
              {overview.cold_leads}
            </p>
          </div>
          <LeadStatusTag status="Cold" />
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200/90 p-5 sm:p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-display font-semibold text-slate-900">Calls Over Time</h3>
            <span className="text-xs text-slate-500 tabular-nums">{trends.length} active days</span>
          </div>
          <div className="h-64 w-full">
            {trends.length === 0 ? (
              <div className="h-full flex items-center justify-center text-sm text-slate-400">
                No call activity dates available yet
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={trends}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
                  <XAxis dataKey="date" stroke="#64748B" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis allowDecimals={false} stroke="#64748B" fontSize={12} tickLine={false} axisLine={false} width={32} />
                  <Tooltip />
                  <Line
                    type="monotone"
                    dataKey="total_calls"
                    name="Total Calls"
                    stroke="#172554"
                    strokeWidth={2.5}
                    dot={{ r: 4, fill: '#172554' }}
                  />
                  <Line
                    type="monotone"
                    dataKey="completed_calls"
                    name="Completed"
                    stroke="#06B6D4"
                    strokeWidth={2}
                    dot={{ r: 3, fill: '#06B6D4' }}
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200/90 p-5 sm:p-6 flex flex-col">
          <h3 className="font-display font-semibold text-slate-900 mb-4">Lead Classification</h3>
          <div className="h-52 w-full flex-1">
            {pieData.length === 0 ? (
              <div className="h-full flex items-center justify-center text-sm text-slate-400">
                No leads classified yet
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={48}
                    outerRadius={76}
                    paddingAngle={3}
                  >
                    {pieData.map((entry) => (
                      <Cell key={entry.name} fill={PIE_COLORS[entry.name] || '#6366F1'} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
          <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-around text-xs">
            {(distribution?.by_status || []).map((item) => (
              <div key={item.name} className="flex items-center gap-1.5">
                <span
                  className="w-2.5 h-2.5 rounded-full"
                  style={{ backgroundColor: PIE_COLORS[item.name] }}
                />
                <span className="text-slate-600">{item.name}:</span>
                <span className="font-semibold text-slate-900 tabular-nums">{item.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recent Calls & Recent Qualified Leads */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
        <div className="xl:col-span-7 bg-white rounded-xl border border-slate-200/90 p-5 sm:p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-display font-semibold text-slate-900">Recent Calls</h3>
            <button
              type="button"
              onClick={() => onNavigate('calls')}
              className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:text-indigo-800"
            >
              View all <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Desktop Table */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-xs text-slate-500">
                  <th className="pb-2.5 font-medium">Customer</th>
                  <th className="pb-2.5 font-medium">Date</th>
                  <th className="pb-2.5 font-medium text-right">Duration</th>
                  <th className="pb-2.5 font-medium text-right">Status</th>
                  <th className="pb-2.5 font-medium text-right">Tier</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {recentCalls.map((call) => (
                  <tr
                    key={call.id}
                    onClick={() => onSelectCall(call.id)}
                    className="hover:bg-slate-50/80 cursor-pointer transition-colors"
                  >
                    <td className="py-3 pr-3 font-medium text-slate-900 truncate max-w-[160px]">
                      {call.customer_name}
                    </td>
                    <td className="py-3 pr-3 text-xs text-slate-500 whitespace-nowrap tabular-nums">
                      {formatDateShort(call.created_at)}
                    </td>
                    <td className="py-3 pr-3 text-right font-mono text-xs text-slate-600 tabular-nums">
                      {formatDuration(call.duration)}
                    </td>
                    <td className="py-3 pr-3 text-right">
                      <CallStatusTag status={call.call_status} />
                    </td>
                    <td className="py-3 text-right">
                      <LeadStatusTag status={call.qualification_result?.lead_status || 'Cold'} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile Card List */}
          <div className="md:hidden space-y-3">
            {recentCalls.map((call) => (
              <button
                key={call.id}
                type="button"
                onClick={() => onSelectCall(call.id)}
                className="w-full text-left rounded-lg border border-slate-200 p-3.5 hover:bg-slate-50 transition-colors"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-semibold text-sm text-slate-900 truncate">{call.customer_name}</span>
                  <LeadStatusTag status={call.qualification_result?.lead_status || 'Cold'} />
                </div>
                <div className="mt-1.5 flex items-center gap-2 text-xs text-slate-500 tabular-nums">
                  <span>{formatDateShort(call.created_at)}</span>
                  <span aria-hidden="true">·</span>
                  <span className="font-mono">{formatDuration(call.duration)}</span>
                  <span aria-hidden="true">·</span>
                  <span>{call.call_status}</span>
                </div>
              </button>
            ))}
          </div>
        </div>

        <div className="xl:col-span-5 bg-white rounded-xl border border-slate-200/90 p-5 sm:p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-display font-semibold text-slate-900">Recent Qualified Leads</h3>
            <button
              type="button"
              onClick={() => onNavigate('leads')}
              className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:text-indigo-800"
            >
              Manage leads <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="divide-y divide-slate-100">
            {recentLeads.map((lead) => (
              <div key={lead.id} className="py-3 first:pt-0 last:pb-0">
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-medium text-sm text-slate-900 truncate">{lead.customer_name}</p>
                    <p className="text-xs text-slate-500 truncate mt-0.5">
                      {lead.company || 'Independent'} · {lead.budget || 'Budget pending'}
                    </p>
                  </div>
                  <LeadStatusTag status={lead.lead_status} />
                </div>
                {lead.requirements && (
                  <p className="text-xs text-slate-600 mt-1.5 line-clamp-2">{lead.requirements}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
