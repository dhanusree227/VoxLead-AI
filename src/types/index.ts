export type LeadStatus = 'Hot' | 'Warm' | 'Cold';

export type AppRoute =
  | 'landing'
  | 'auth'
  | 'dashboard'
  | 'voice-agent'
  | 'leads'
  | 'calls'
  | 'call-detail'
  | 'analytics'
  | 'settings';

export interface User {
  id: number;
  name: string;
  email: string;
  created_at: string;
}

export interface AuthResponse {
  access_token: string;
  token_type: string;
  user: User;
}

export interface Lead {
  id: number;
  customer_name: string;
  phone_number: string | null;
  email: string | null;
  company: string | null;
  budget: string | null;
  requirements: string | null;
  purchase_timeline: string | null;
  interest_level: string | null;
  lead_status: LeadStatus;
  lead_source: string;
  is_demo?: boolean;
  created_at: string;
}

export interface QualificationResult {
  customer_name: string;
  customer_requirements: string;
  budget: string;
  purchase_timeline: string;
  interest_level: string;
  lead_status: LeadStatus;
  summary: string;
  follow_up_recommendation: string;
  qualification_reasoning?: string;
}

export interface CallRecord {
  id: number;
  lead_id: number | null;
  vapi_call_id: string | null;
  customer_name: string;
  phone_number: string | null;
  call_status: 'Completed' | 'In Progress' | 'Missed' | 'Simulated';
  duration: number;
  transcript: string;
  summary: string | null;
  qualification_result: QualificationResult | null;
  follow_up_recommendation: string | null;
  is_demo?: boolean;
  created_at: string;
}

export interface AssistantConfig {
  assistant_name: string;
  description: string;
  voice_id: string;
  language: string;
  greeting_message: string;
  system_prompt: string;
  max_duration_seconds: number;
  auto_qualify: boolean;
}

export interface AnalyticsOverview {
  total_calls: number;
  completed_calls: number;
  qualified_leads: number;
  conversion_rate: number;
  hot_leads: number;
  warm_leads: number;
  cold_leads: number;
  avg_call_duration: number;
  has_demo_records: boolean;
}

export interface CallTrendPoint {
  date: string;
  total_calls: number;
  completed_calls: number;
}

export interface LeadDistribution {
  by_status: Array<{ name: LeadStatus; value: number }>;
  by_source: Array<{ source: string; count: number }>;
}

export interface SettingsStatus {
  gemini_configured: boolean;
  vapi_configured: boolean;
  vapi_public_configured: boolean;
  database_connected: boolean;
  database_engine: string;
  jwt_secure: boolean;
  phone_calling_enabled: boolean;
}
