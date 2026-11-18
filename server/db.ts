import fs from 'fs';
import path from 'path';
import bcrypt from 'bcryptjs';

export type LeadStatus = 'Hot' | 'Warm' | 'Cold';

export interface UserRecord {
  id: number;
  name: string;
  email: string;
  hashed_password: string;
  created_at: string;
}

export interface LeadRecord {
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

export interface AssistantConfigRecord {
  assistant_name: string;
  description: string;
  voice_id: string;
  language: string;
  greeting_message: string;
  system_prompt: string;
  max_duration_seconds: number;
  auto_qualify: boolean;
}

interface StoreSchema {
  nextUserId: number;
  nextLeadId: number;
  nextCallId: number;
  users: UserRecord[];
  leads: LeadRecord[];
  calls: CallRecord[];
  assistantConfig: AssistantConfigRecord;
}

const DATA_DIR = path.resolve(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'voxlead.db.json');

export const DEFAULT_ASSISTANT_CONFIG: AssistantConfigRecord = {
  assistant_name: 'VoxLead Qualification Agent',
  description: 'Conversational AI specialist trained to qualify inbound and outbound software buyers.',
  voice_id: 'en-US-AriaNeural',
  language: 'en',
  greeting_message: "Hello! I'm the VoxLead AI assistant. Is this a good time to speak?",
  system_prompt:
    "You are VoxLead AI, a polite and perceptive B2B sales qualification specialist. " +
    "Your goal in a brief phone conversation is to understand: (1) the caller's name and company if offered, " +
    "(2) what product or software requirements they have, (3) their approximate budget, and (4) their purchase timeline. " +
    "Ask one clear question at a time, acknowledge answers naturally, never repeat a question already answered, and end politely once details are gathered.",
  max_duration_seconds: 300,
  auto_qualify: true,
};

function createDemoDataset(): { leads: LeadRecord[]; calls: CallRecord[] } {
  const now = Date.now();
  const day = 86400000;

  const leads: LeadRecord[] = [
    {
      id: 1,
      customer_name: 'Aarav Mehta',
      phone_number: '+91 98204 11842',
      email: 'aarav.mehta@finpulse.in',
      company: 'FinPulse Analytics',
      budget: '50,000 INR',
      requirements: 'CRM & automated inbound lead workflow software for a 14-seat sales team.',
      purchase_timeline: 'Within this month',
      interest_level: 'High',
      lead_status: 'Hot',
      lead_source: 'Demo Sample · AI Voice Call',
      is_demo: true,
      created_at: new Date(now - 5 * day).toISOString(),
    },
    {
      id: 2,
      customer_name: 'Elena Rostova',
      phone_number: '+1 415 890 4412',
      email: 'elena@northstarhealth.io',
      company: 'Northstar Health Systems',
      budget: '$1,200/month',
      requirements: 'Patient intake voice triage assistant with HIPAA-ready call logging.',
      purchase_timeline: 'Q1 Next Quarter',
      interest_level: 'Medium-High',
      lead_status: 'Warm',
      lead_source: 'Demo Sample · Inbound Web Voice',
      is_demo: true,
      created_at: new Date(now - 3 * day).toISOString(),
    },
    {
      id: 3,
      customer_name: 'Marcus Vance',
      phone_number: '+1 312 604 9910',
      email: 'm.vance@apexlogistics.com',
      company: 'Apex Freight Logistics',
      budget: '$3,500 setup',
      requirements: 'Dispatch status inquiry automation and fleet driver check-in voice calls.',
      purchase_timeline: 'Immediate (2 weeks)',
      interest_level: 'High',
      lead_status: 'Hot',
      lead_source: 'Demo Sample · Outbound Campaign',
      is_demo: true,
      created_at: new Date(now - 2 * day).toISOString(),
    },
    {
      id: 4,
      customer_name: 'Priya Nair',
      phone_number: '+91 97410 33091',
      email: 'priya@eduspark.co',
      company: 'EduSpark Learning',
      budget: 'Not provided',
      requirements: 'Exploring automated student counseling follow-up reminders.',
      purchase_timeline: '6+ months (Early research)',
      interest_level: 'Low',
      lead_status: 'Cold',
      lead_source: 'Demo Sample · Website Inquiry',
      is_demo: true,
      created_at: new Date(now - 1 * day).toISOString(),
    },
    {
      id: 5,
      customer_name: 'Daniel Brooks',
      phone_number: '+44 20 7946 0821',
      email: 'dbrooks@meridianlegal.co.uk',
      company: 'Meridian Legal Partners',
      budget: '£900/month',
      requirements: 'Client consultation scheduling & pre-qualification voice agent.',
      purchase_timeline: 'Next 45 days',
      interest_level: 'Medium',
      lead_status: 'Warm',
      lead_source: 'Demo Sample · AI Voice Call',
      is_demo: true,
      created_at: new Date(now - 6 * 3600000).toISOString(),
    },
  ];

  const calls: CallRecord[] = [
    {
      id: 1,
      lead_id: 1,
      vapi_call_id: 'demo_call_001',
      customer_name: 'Aarav Mehta',
      phone_number: '+91 98204 11842',
      call_status: 'Completed',
      duration: 142,
      transcript:
        "AI: Hello! I'm the VoxLead AI assistant. Is this a good time to speak?\n" +
        "Customer: Yes, go ahead.\n" +
        "AI: Thank you! I'm calling to understand your requirements. What kind of product or service are you interested in?\n" +
        "Customer: I'm Aarav from FinPulse Analytics. We're looking for business CRM and lead qualification software for 14 reps.\n" +
        "AI: Great! Could you share your approximate budget?\n" +
        "Customer: Around 50,000 rupees.\n" +
        "AI: Thank you. When are you planning to make a purchase?\n" +
        "Customer: Within this month, ideally before our next sales cycle.\n" +
        "AI: Understood. I'll record your requirements and arrange a follow-up. Thank you for your time!",
      summary:
        'Aarav Mehta from FinPulse Analytics is seeking CRM and lead qualification software for a 14-person team with an allocated budget of 50,000 INR and plans to purchase within the month.',
      qualification_result: {
        customer_name: 'Aarav Mehta',
        customer_requirements: 'CRM and automated lead qualification software for 14 sales reps.',
        budget: '50,000 INR',
        purchase_timeline: 'Within this month',
        interest_level: 'High',
        lead_status: 'Hot',
        summary:
          'Aarav Mehta from FinPulse Analytics is seeking CRM and lead qualification software for a 14-person team with an allocated budget of 50,000 INR and plans to purchase within the month.',
        follow_up_recommendation: 'Schedule a 20-minute live product demo and send annual pricing within 24 hours.',
        qualification_reasoning: 'Clear software requirement, confirmed 50,000 INR budget, and immediate monthly purchase timeline.',
      },
      follow_up_recommendation: 'Schedule a 20-minute live product demo and send annual pricing within 24 hours.',
      is_demo: true,
      created_at: new Date(now - 5 * day).toISOString(),
    },
    {
      id: 2,
      lead_id: 2,
      vapi_call_id: 'demo_call_002',
      customer_name: 'Elena Rostova',
      phone_number: '+1 415 890 4412',
      call_status: 'Completed',
      duration: 196,
      transcript:
        "AI: Hello! I'm the VoxLead AI assistant. Is this a good time to speak?\n" +
        "Customer: Yes, I have a few minutes.\n" +
        "AI: Thanks Elena. What workflow are you hoping to automate with voice AI?\n" +
        "Customer: We run Northstar Health Systems and want automated patient intake screening.\n" +
        "AI: Got it. Do you have a target monthly budget in mind?\n" +
        "Customer: Roughly $1,200 a month once we clear compliance review.\n" +
        "AI: And what is your expected timeline to launch?\n" +
        "Customer: Likely Q1 next quarter after our IT review.\n" +
        "AI: Thank you for the context. I'll have our healthcare solutions specialist follow up with compliance documentation.",
      summary:
        'Elena Rostova at Northstar Health Systems wants patient intake voice screening, estimating $1,200/month pending IT compliance review in Q1.',
      qualification_result: {
        customer_name: 'Elena Rostova',
        customer_requirements: 'Automated patient intake voice screening with compliance logging.',
        budget: '$1,200/month',
        purchase_timeline: 'Q1 Next Quarter',
        interest_level: 'Medium-High',
        lead_status: 'Warm',
        summary:
          'Elena Rostova at Northstar Health Systems wants patient intake voice screening, estimating $1,200/month pending IT compliance review in Q1.',
        follow_up_recommendation: 'Send security and compliance whitepaper and schedule technical discovery call.',
        qualification_reasoning: 'Strong fit and defined budget, but timeline depends on next-quarter IT compliance review.',
      },
      follow_up_recommendation: 'Send security and compliance whitepaper and schedule technical discovery call.',
      is_demo: true,
      created_at: new Date(now - 3 * day).toISOString(),
    },
    {
      id: 3,
      lead_id: 3,
      vapi_call_id: 'demo_call_003',
      customer_name: 'Marcus Vance',
      phone_number: '+1 312 604 9910',
      call_status: 'Completed',
      duration: 168,
      transcript:
        "AI: Hello! I'm the VoxLead AI assistant. Is this a good time to speak?\n" +
        "Customer: Sure, Marcus Vance here from Apex Freight.\n" +
        "AI: Great to connect, Marcus. What service are you looking to deploy?\n" +
        "Customer: Automated voice calls for freight dispatch updates and driver check-ins.\n" +
        "AI: What budget have you allocated for setup?\n" +
        "Customer: We have $3,500 approved for initial rollout.\n" +
        "AI: When are you looking to go live?\n" +
        "Customer: Within two weeks if integration works.\n" +
        "AI: Excellent, I will prioritize an onboarding engineer for your team.",
      summary:
        'Marcus Vance of Apex Freight has $3,500 approved to deploy dispatch and driver check-in voice automation within two weeks.',
      qualification_result: {
        customer_name: 'Marcus Vance',
        customer_requirements: 'Automated freight dispatch updates and driver check-in voice workflows.',
        budget: '$3,500 setup',
        purchase_timeline: 'Immediate (2 weeks)',
        interest_level: 'High',
        lead_status: 'Hot',
        summary:
          'Marcus Vance of Apex Freight has $3,500 approved to deploy dispatch and driver check-in voice workflows within two weeks.',
        follow_up_recommendation: 'Assign solutions engineer immediately for API integration scoping.',
        qualification_reasoning: 'Approved budget, urgent two-week rollout target, and specific operational scope.',
      },
      follow_up_recommendation: 'Assign solutions engineer immediately for API integration scoping.',
      is_demo: true,
      created_at: new Date(now - 2 * day).toISOString(),
    },
    {
      id: 4,
      lead_id: 4,
      vapi_call_id: 'demo_call_004',
      customer_name: 'Priya Nair',
      phone_number: '+91 97410 33091',
      call_status: 'Completed',
      duration: 88,
      transcript:
        "AI: Hello! I'm the VoxLead AI assistant. Is this a good time to speak?\n" +
        "Customer: Briefly, yes.\n" +
        "AI: What kind of voice solution are you exploring?\n" +
        "Customer: Just browsing options for student counseling reminders later this year.\n" +
        "AI: Do you have a budget or target timeline?\n" +
        "Customer: No budget yet, probably not for 6 months or more.\n" +
        "AI: Totally understood. Thank you for your time today!",
      summary:
        'Priya Nair is in early exploratory research for student counseling reminders with no defined budget and a 6+ month horizon.',
      qualification_result: {
        customer_name: 'Priya Nair',
        customer_requirements: 'Exploratory research for student counseling reminder calls.',
        budget: 'Not provided',
        purchase_timeline: '6+ months (Early research)',
        interest_level: 'Low',
        lead_status: 'Cold',
        summary:
          'Priya Nair is in early exploratory research for student counseling reminders with no defined budget and a 6+ month horizon.',
        follow_up_recommendation: 'Add to quarterly educational product newsletter; no immediate sales outreach needed.',
        qualification_reasoning: 'No defined budget, exploratory stage only, and 6+ month timeline.',
      },
      follow_up_recommendation: 'Add to quarterly educational product newsletter; no immediate sales outreach needed.',
      is_demo: true,
      created_at: new Date(now - 1 * day).toISOString(),
    },
    {
      id: 5,
      lead_id: 5,
      vapi_call_id: 'demo_call_005',
      customer_name: 'Daniel Brooks',
      phone_number: '+44 20 7946 0821',
      call_status: 'Completed',
      duration: 155,
      transcript:
        "AI: Hello! I'm the VoxLead AI assistant. Is this a good time to speak?\n" +
        "Customer: Yes, Daniel Brooks speaking.\n" +
        "AI: Thanks Daniel. How can VoxLead AI assist your firm?\n" +
        "Customer: At Meridian Legal Partners, we need an intake assistant to pre-qualify consultations.\n" +
        "AI: What monthly investment range makes sense for your firm?\n" +
        "Customer: Around £900 per month.\n" +
        "AI: When would you like to implement this?\n" +
        "Customer: Within the next 45 days after partner sign-off.\n" +
        "AI: Great, I'll arrange a tailored walkthrough for your partners.",
      summary:
        'Daniel Brooks at Meridian Legal Partners wants a consultation pre-qualification agent at ~£900/month pending partner approval in 45 days.',
      qualification_result: {
        customer_name: 'Daniel Brooks',
        customer_requirements: 'Client consultation scheduling and pre-qualification voice agent.',
        budget: '£900/month',
        purchase_timeline: 'Next 45 days',
        interest_level: 'Medium',
        lead_status: 'Warm',
        summary:
          'Daniel Brooks at Meridian Legal Partners wants a consultation pre-qualification agent at ~£900/month pending partner approval in 45 days.',
        follow_up_recommendation: 'Send partner ROI brief and book a 15-minute legal intake demo.',
        qualification_reasoning: 'Clear budget and use case, awaiting partner sign-off within 45 days.',
      },
      follow_up_recommendation: 'Send partner ROI brief and book a 15-minute legal intake demo.',
      is_demo: true,
      created_at: new Date(now - 6 * 3600000).toISOString(),
    },
  ];

  return { leads, calls };
}

function initializeStore(): StoreSchema {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }

  if (fs.existsSync(DB_FILE)) {
    try {
      const raw = fs.readFileSync(DB_FILE, 'utf-8');
      const parsed = JSON.parse(raw) as StoreSchema;
      if (parsed && Array.isArray(parsed.users) && Array.isArray(parsed.leads) && Array.isArray(parsed.calls)) {
        return parsed;
      }
    } catch (err) {
      console.error('Failed to read existing store, recreating:', err);
    }
  }

  const demoPasswordHash = bcrypt.hashSync('VoxLeadDemo2026!', 10);
  const demoData = createDemoDataset();
  const initial: StoreSchema = {
    nextUserId: 2,
    nextLeadId: demoData.leads.length + 1,
    nextCallId: demoData.calls.length + 1,
    users: [
      {
        id: 1,
        name: 'Claire Bennett',
        email: 'demo@voxlead.ai',
        hashed_password: demoPasswordHash,
        created_at: new Date().toISOString(),
      },
    ],
    leads: demoData.leads,
    calls: demoData.calls,
    assistantConfig: DEFAULT_ASSISTANT_CONFIG,
  };

  fs.writeFileSync(DB_FILE, JSON.stringify(initial, null, 2), 'utf-8');
  return initial;
}

let store: StoreSchema = initializeStore();

function persistStore(): void {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  fs.writeFileSync(DB_FILE, JSON.stringify(store, null, 2), 'utf-8');
}

export const db = {
  getUsers: () => store.users,
  findUserByEmail: (email: string) => store.users.find((u) => u.email.toLowerCase() === email.toLowerCase()),
  createUser: (name: string, email: string, hashed_password: string): UserRecord => {
    const user: UserRecord = {
      id: store.nextUserId++,
      name,
      email: email.toLowerCase(),
      hashed_password,
      created_at: new Date().toISOString(),
    };
    store.users.push(user);
    persistStore();
    return user;
  },

  getLeads: () => [...store.leads],
  findLeadById: (id: number) => store.leads.find((l) => l.id === id),
  createLead: (data: Omit<LeadRecord, 'id' | 'created_at'>): LeadRecord => {
    const lead: LeadRecord = {
      ...data,
      id: store.nextLeadId++,
      created_at: new Date().toISOString(),
    };
    store.leads.unshift(lead);
    persistStore();
    return lead;
  },
  updateLead: (id: number, updates: Partial<LeadRecord>): LeadRecord | null => {
    const idx = store.leads.findIndex((l) => l.id === id);
    if (idx === -1) return null;
    store.leads[idx] = { ...store.leads[idx], ...updates };
    persistStore();
    return store.leads[idx];
  },
  deleteLead: (id: number): boolean => {
    const before = store.leads.length;
    store.leads = store.leads.filter((l) => l.id !== id);
    if (store.leads.length !== before) {
      persistStore();
      return true;
    }
    return false;
  },

  getCalls: () => [...store.calls],
  findCallById: (id: number) => store.calls.find((c) => c.id === id),
  createCall: (data: Omit<CallRecord, 'id' | 'created_at'>): CallRecord => {
    const call: CallRecord = {
      ...data,
      id: store.nextCallId++,
      created_at: new Date().toISOString(),
    };
    store.calls.unshift(call);
    persistStore();
    return call;
  },
  updateCall: (id: number, updates: Partial<CallRecord>): CallRecord | null => {
    const idx = store.calls.findIndex((c) => c.id === id);
    if (idx === -1) return null;
    store.calls[idx] = { ...store.calls[idx], ...updates };
    persistStore();
    return store.calls[idx];
  },

  getAssistantConfig: (): AssistantConfigRecord => ({ ...store.assistantConfig }),
  updateAssistantConfig: (updates: Partial<AssistantConfigRecord>): AssistantConfigRecord => {
    store.assistantConfig = { ...store.assistantConfig, ...updates };
    persistStore();
    return { ...store.assistantConfig };
  },

  loadDemoData: (): { leads: number; calls: number } => {
    const demo = createDemoDataset();
    const existingDemoLeadIds = new Set(store.leads.filter((l) => l.is_demo).map((l) => l.id));
    if (existingDemoLeadIds.size === 0) {
      const idMap = new Map<number, number>();
      for (const l of demo.leads) {
        const created = db.createLead({
          customer_name: l.customer_name,
          phone_number: l.phone_number,
          email: l.email,
          company: l.company,
          budget: l.budget,
          requirements: l.requirements,
          purchase_timeline: l.purchase_timeline,
          interest_level: l.interest_level,
          lead_status: l.lead_status,
          lead_source: l.lead_source,
          is_demo: true,
        });
        idMap.set(l.id, created.id);
      }
      for (const c of demo.calls) {
        db.createCall({
          lead_id: c.lead_id ? idMap.get(c.lead_id) ?? null : null,
          vapi_call_id: `${c.vapi_call_id}_${Date.now()}`,
          customer_name: c.customer_name,
          phone_number: c.phone_number,
          call_status: c.call_status,
          duration: c.duration,
          transcript: c.transcript,
          summary: c.summary,
          qualification_result: c.qualification_result,
          follow_up_recommendation: c.follow_up_recommendation,
          is_demo: true,
        });
      }
    }
    return { leads: store.leads.length, calls: store.calls.length };
  },

  clearWorkspaceData: (): void => {
    store.leads = [];
    store.calls = [];
    persistStore();
  },
};
