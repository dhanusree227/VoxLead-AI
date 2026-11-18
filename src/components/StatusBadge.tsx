import { Flame, Thermometer, Snowflake, CheckCircle2, Radio, AlertCircle } from 'lucide-react';
import type { CallRecord, LeadStatus } from '../types';

export function LeadStatusTag({ status }: { status: LeadStatus }) {
  if (status === 'Hot') {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-md bg-rose-50 px-2 py-0.5 text-xs font-medium text-rose-700 border border-rose-200/80 whitespace-nowrap shrink-0">
        <Flame className="w-3.5 h-3.5 text-rose-600" />
        Hot
      </span>
    );
  }
  if (status === 'Warm') {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-md bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-800 border border-amber-200/80 whitespace-nowrap shrink-0">
        <Thermometer className="w-3.5 h-3.5 text-amber-600" />
        Warm
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 rounded-md bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700 border border-slate-200 whitespace-nowrap shrink-0">
      <Snowflake className="w-3.5 h-3.5 text-cyan-700" />
      Cold
    </span>
  );
}

export function CallStatusTag({ status }: { status: CallRecord['call_status'] }) {
  if (status === 'Completed') {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-md bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700 border border-emerald-200/80 whitespace-nowrap shrink-0">
        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
        Completed
      </span>
    );
  }
  if (status === 'Simulated') {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-md bg-indigo-50 px-2 py-0.5 text-xs font-medium text-indigo-700 border border-indigo-200/80 whitespace-nowrap shrink-0">
        <Radio className="w-3.5 h-3.5 text-indigo-600" />
        Simulated Preview
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 rounded-md bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700 border border-slate-200 whitespace-nowrap shrink-0">
      <AlertCircle className="w-3.5 h-3.5 text-slate-500" />
      {status}
    </span>
  );
}

export function formatDuration(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds));
  const mins = Math.floor(s / 60);
  const rem = s % 60;
  return `${String(mins).padStart(2, '0')}:${String(rem).padStart(2, '0')}`;
}

export function formatDateShort(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  } catch {
    return iso;
  }
}

export function formatDateTime(iso: string): string {
  try {
    return new Date(iso).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
}
