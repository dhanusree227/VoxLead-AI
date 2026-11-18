import type {
  AnalyticsOverview,
  AssistantConfig,
  AuthResponse,
  CallRecord,
  CallTrendPoint,
  Lead,
  LeadDistribution,
  LeadStatus,
  QualificationResult,
  SettingsStatus,
  User,
} from '../types';

let authToken: string | null = null;

export function setAuthToken(token: string | null): void {
  authToken = token;
}

export function getAuthToken(): string | null {
  return authToken;
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers = new Headers(options.headers || {});
  if (!headers.has('Content-Type') && options.body) {
    headers.set('Content-Type', 'application/json');
  }
  if (authToken) {
    headers.set('Authorization', `Bearer ${authToken}`);
  }

  const res = await fetch(path, { ...options, headers });
  if (res.status === 204) {
    return undefined as T;
  }

  const text = await res.text();
  let data: Record<string, unknown> = {};
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = { detail: text };
    }
  }

  if (!res.ok) {
    const message =
      (typeof data.detail === 'string' && data.detail) ||
      (typeof data.error === 'string' && data.error) ||
      `Request failed with status ${res.status}`;
    throw new Error(message);
  }

  return data as T;
}

export const api = {
  // Auth
  register: (payload: { name: string; email: string; password: string }) =>
    request<AuthResponse>('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  login: (payload: { email: string; password: string }) =>
    request<AuthResponse>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  me: () => request<User>('/api/auth/me'),

  // Leads
  getLeads: (params?: { search?: string; status?: string; sort?: 'asc' | 'desc' }) => {
    const qs = new URLSearchParams();
    if (params?.search) qs.set('search', params.search);
    if (params?.status && params.status !== 'All') qs.set('status', params.status);
    if (params?.sort) qs.set('sort', params.sort);
    const suffix = qs.toString() ? `?${qs.toString()}` : '';
    return request<Lead[]>(`/api/leads${suffix}`);
  },
  createLead: (payload: Partial<Lead> & { customer_name: string; lead_status: LeadStatus }) =>
    request<Lead>('/api/leads', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  updateLead: (id: number, payload: Partial<Lead>) =>
    request<Lead>(`/api/leads/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    }),
  deleteLead: (id: number) =>
    request<void>(`/api/leads/${id}`, {
      method: 'DELETE',
    }),

  // Calls
  getCalls: () => request<CallRecord[]>('/api/calls'),
  getCall: (id: number) => request<CallRecord>(`/api/calls/${id}`),
  createCall: (payload: Partial<CallRecord>) =>
    request<CallRecord>('/api/calls', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  // Voice & Vapi
  getAssistantConfig: () => request<AssistantConfig>('/api/voice/assistant-config'),
  updateAssistantConfig: (payload: Partial<AssistantConfig>) =>
    request<AssistantConfig>('/api/voice/assistant-config', {
      method: 'PUT',
      body: JSON.stringify(payload),
    }),
  getVoiceConfig: () =>
    request<{
      vapi_configured: boolean;
      vapi_public_configured: boolean;
      public_key: string | null;
      assistant_id: string | null;
      gemini_configured: boolean;
    }>('/api/voice/config'),
  startVoiceSession: () =>
    request<{
      mode: 'vapi_live' | 'simulated_preview';
      vapi_configured: boolean;
      public_key?: string;
      assistant_id?: string;
      message?: string;
    }>('/api/voice/start', { method: 'POST', body: JSON.stringify({}) }),
  voiceChatTurn: (payload: {
    history: Array<{ role: 'assistant' | 'user'; content: string }>;
    user_message: string;
    assistant_config?: AssistantConfig;
  }) =>
    request<{ reply: string; should_end_call: boolean }>('/api/voice/chat', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  // Gemini AI Qualification
  qualifyLead: (payload: {
    transcript: string;
    call_id?: number;
    customer_name?: string;
    phone_number?: string;
    duration?: number;
    call_status?: CallRecord['call_status'];
    lead_source?: string;
    persist?: boolean;
  }) =>
    request<{
      qualification: QualificationResult;
      call: CallRecord | null;
      lead: Lead | null;
    }>('/api/ai/qualify-lead', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  summarizeCall: (payload: { transcript: string; call_id?: number }) =>
    request<{ summary: string }>('/api/ai/summarize-call', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  // Analytics
  getAnalyticsOverview: () => request<AnalyticsOverview>('/api/analytics/overview'),
  getCallTrends: () => request<CallTrendPoint[]>('/api/analytics/call-trends'),
  getLeadDistribution: () => request<LeadDistribution>('/api/analytics/lead-distribution'),

  // Settings & Workspace
  getSettingsStatus: () => request<SettingsStatus>('/api/settings/status'),
  loadDemoData: () => request<{ message: string; leads: number; calls: number }>('/api/workspace/demo-load', { method: 'POST' }),
  clearWorkspace: () => request<{ message: string }>('/api/workspace/clear', { method: 'POST' }),
};
