import { useEffect, useState } from 'react';
import { AlertCircle } from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { api } from '../services/api';
import type { AnalyticsOverview, CallTrendPoint, LeadDistribution } from '../types';
import { formatDuration } from '../components/StatusBadge';

const STATUS_COLORS: Record<string, string> = {
  Hot: '#E11D48',
  Warm: '#D97706',
  Cold: '#06B6D4',
};

export function AnalyticsPage() {
  const [overview, setOverview] = useState<AnalyticsOverview | null>(null);
  const [trends, setTrends] = useState<CallTrendPoint[]>([]);
  const [distribution, setDistribution] = useState<LeadDistribution | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      api.getAnalyticsOverview(),
      api.getCallTrends(),
      api.getLeadDistribution(),
    ])
      .then(([ov, tr, dist]) => {
        setOverview(ov);
        setTrends(tr);
        setDistribution(dist);
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load analytics.'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <div className="p-8 text-center text-sm text-slate-500">Calculating analytics from database...</div>;
  }

  if (error) {
    return (
      <div className="rounded-xl bg-rose-50 border border-rose-200 p-4 text-sm text-rose-800 flex items-center gap-2">
        <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
        <span>{error}</span>
      </div>
    );
  }

  const pieData = (distribution?.by_status || []).filter((d) => d.value > 0);
  const sourceData = distribution?.by_source || [];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display text-xl sm:text-2xl font-bold text-[#172554]">AI Lead Analytics</h2>
        <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
          All conversion rates, call trends, and source breakdowns compute directly from stored records
        </p>
      </div>

      {/* KPI Strip */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="bg-white rounded-xl border border-slate-200/90 p-4">
          <p className="text-xs text-slate-500">Total Calls</p>
          <p className="font-display text-2xl font-bold text-[#172554] mt-1.5 tabular-nums">
            {overview?.total_calls ?? 0}
          </p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200/90 p-4">
          <p className="text-xs text-slate-500">Successful Calls</p>
          <p className="font-display text-2xl font-bold text-[#172554] mt-1.5 tabular-nums">
            {overview?.completed_calls ?? 0}
          </p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200/90 p-4">
          <p className="text-xs text-slate-500">Qualified Leads</p>
          <p className="font-display text-2xl font-bold text-indigo-600 mt-1.5 tabular-nums">
            {overview?.qualified_leads ?? 0}
          </p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200/90 p-4">
          <p className="text-xs text-slate-500">Conversion Rate</p>
          <p className="font-display text-2xl font-bold text-cyan-700 mt-1.5 tabular-nums">
            {overview?.conversion_rate ?? 0}%
          </p>
        </div>
        <div className="col-span-2 md:col-span-1 bg-white rounded-xl border border-slate-200/90 p-4">
          <p className="text-xs text-slate-500">Avg Call Duration</p>
          <p className="font-display font-mono text-2xl font-bold text-[#172554] mt-1.5 tabular-nums">
            {formatDuration(overview?.avg_call_duration ?? 0)}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Call Activity Trends */}
        <div className="bg-white rounded-xl border border-slate-200/90 p-5 sm:p-6">
          <h3 className="font-display font-semibold text-slate-900 mb-4">Call Activity Trends</h3>
          <div className="h-64 w-full">
            {trends.length === 0 ? (
              <div className="h-full flex items-center justify-center text-sm text-slate-400">
                No call trend records available yet
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={trends}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
                  <XAxis dataKey="date" stroke="#64748B" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis allowDecimals={false} stroke="#64748B" fontSize={12} tickLine={false} axisLine={false} width={30} />
                  <Tooltip />
                  <Line type="monotone" dataKey="total_calls" name="Total Calls" stroke="#172554" strokeWidth={2.5} />
                  <Line type="monotone" dataKey="completed_calls" name="Successful" stroke="#6366F1" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Lead Tier Distribution */}
        <div className="bg-white rounded-xl border border-slate-200/90 p-5 sm:p-6">
          <h3 className="font-display font-semibold text-slate-900 mb-4">Hot / Warm / Cold Distribution</h3>
          <div className="h-64 w-full">
            {pieData.length === 0 ? (
              <div className="h-full flex items-center justify-center text-sm text-slate-400">
                No lead records available yet
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={52} outerRadius={84} paddingAngle={3}>
                    {pieData.map((entry) => (
                      <Cell key={entry.name} fill={STATUS_COLORS[entry.name] || '#6366F1'} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Lead Source Analysis */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200/90 p-5 sm:p-6">
          <h3 className="font-display font-semibold text-slate-900 mb-4">Lead Source Analysis</h3>
          <div className="h-64 w-full">
            {sourceData.length === 0 ? (
              <div className="h-full flex items-center justify-center text-sm text-slate-400">
                No lead source records available yet
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={sourceData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
                  <XAxis dataKey="source" stroke="#64748B" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis allowDecimals={false} stroke="#64748B" fontSize={12} tickLine={false} axisLine={false} width={30} />
                  <Tooltip />
                  <Bar dataKey="count" name="Leads" fill="#6366F1" radius={[6, 6, 0, 0]} maxBarSize={56} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
