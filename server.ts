import express, { Request, Response, NextFunction } from 'express';
import dotenv from 'dotenv';
import path from 'path';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { createServer as createViteServer } from 'vite';
import { db, type LeadStatus } from './server/db.ts';
import {
  isGeminiConfigured,
  qualifyLeadWithGemini,
  summarizeCallWithGemini,
  generateVoiceAgentReply,
} from './server/gemini.ts';

dotenv.config();

const PORT = 3000;
const JWT_SECRET = process.env.JWT_SECRET_KEY || 'voxlead-local-dev-jwt-secret';

interface AuthRequest extends Request {
  user?: { id: number; email: string; name: string };
}

function isVapiConfigured(): boolean {
  return Boolean((process.env.VAPI_API_KEY || '').trim() && (process.env.VAPI_ASSISTANT_ID || '').trim());
}

function isVapiPublicConfigured(): boolean {
  return Boolean((process.env.VAPI_PUBLIC_KEY || '').trim() && (process.env.VAPI_ASSISTANT_ID || '').trim());
}

function signToken(user: { id: number; email: string; name: string }): string {
  return jwt.sign({ sub: user.email, id: user.id, name: user.name }, JWT_SECRET, { expiresIn: '24h' });
}

function requireAuth(req: AuthRequest, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ detail: 'Authentication credentials required.' });
    return;
  }
  const token = authHeader.slice('Bearer '.length).trim();
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { sub: string; id: number; name: string };
    const user = db.findUserByEmail(decoded.sub);
    if (!user) {
      res.status(401).json({ detail: 'Account not found.' });
      return;
    }
    req.user = { id: user.id, email: user.email, name: user.name };
    next();
  } catch {
    res.status(401).json({ detail: 'Invalid or expired authentication token.' });
  }
}

async function startServer(): Promise<void> {
  const app = express();

  app.use(
    express.json({
      limit: '2mb',
      verify: (req, _res, buf) => {
        (req as Request & { rawBody?: Buffer }).rawBody = buf;
      },
    })
  );

  // Health & Settings Status (never exposes secret keys)
  app.get('/api/health', (_req, res) => {
    res.json({
      status: 'ok',
      runtime: 'node-express-gateway',
      fastapi_reference_dir: 'backend/',
      database_connected: true,
      database_mode: process.env.DATABASE_URL ? 'PostgreSQL Configured' : 'Persistent Local File Store',
      gemini_configured: isGeminiConfigured(),
      vapi_configured: isVapiConfigured(),
      vapi_public_configured: isVapiPublicConfigured(),
    });
  });

  app.get('/api/settings/status', requireAuth, (_req, res) => {
    res.json({
      gemini_configured: isGeminiConfigured(),
      vapi_configured: isVapiConfigured(),
      vapi_public_configured: isVapiPublicConfigured(),
      database_connected: true,
      database_engine: process.env.DATABASE_URL ? 'PostgreSQL (via DATABASE_URL)' : 'Local JSON Store (FastAPI uses PostgreSQL)',
      jwt_secure: Boolean(process.env.JWT_SECRET_KEY && process.env.JWT_SECRET_KEY !== 'replace-with-a-secure-random-secret'),
      phone_calling_enabled: false,
    });
  });

  // Auth Routes
  app.post('/api/auth/register', (req, res) => {
    const { name, email, password } = req.body || {};
    if (!name || typeof name !== 'string' || name.trim().length < 2) {
      res.status(400).json({ detail: 'Full name must be at least 2 characters.' });
      return;
    }
    if (!email || typeof email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      res.status(400).json({ detail: 'Please provide a valid email address.' });
      return;
    }
    if (!password || typeof password !== 'string' || password.length < 8) {
      res.status(400).json({ detail: 'Password must be at least 8 characters.' });
      return;
    }

    if (db.findUserByEmail(email)) {
      res.status(409).json({ detail: 'An account with this email already exists.' });
      return;
    }

    const hashed = bcrypt.hashSync(password, 10);
    const user = db.createUser(name.trim(), email.trim(), hashed);
    const access_token = signToken(user);

    res.status(201).json({
      access_token,
      token_type: 'bearer',
      user: { id: user.id, name: user.name, email: user.email, created_at: user.created_at },
    });
  });

  app.post('/api/auth/login', (req, res) => {
    const { email, password } = req.body || {};
    if (!email || !password) {
      res.status(400).json({ detail: 'Email and password are required.' });
      return;
    }
    const user = db.findUserByEmail(String(email));
    if (!user || !bcrypt.compareSync(String(password), user.hashed_password)) {
      res.status(401).json({ detail: 'Invalid email or password.' });
      return;
    }
    const access_token = signToken(user);
    res.json({
      access_token,
      token_type: 'bearer',
      user: { id: user.id, name: user.name, email: user.email, created_at: user.created_at },
    });
  });

  app.get('/api/auth/me', requireAuth, (req: AuthRequest, res) => {
    const user = db.findUserByEmail(req.user!.email);
    if (!user) {
      res.status(404).json({ detail: 'User not found.' });
      return;
    }
    res.json({ id: user.id, name: user.name, email: user.email, created_at: user.created_at });
  });

  // Demo Data Controls
  app.post('/api/workspace/demo-load', requireAuth, (_req, res) => {
    const counts = db.loadDemoData();
    res.json({ message: 'Demo dataset loaded.', ...counts });
  });

  app.post('/api/workspace/clear', requireAuth, (_req, res) => {
    db.clearWorkspaceData();
    res.json({ message: 'Workspace records cleared.' });
  });

  // Leads CRUD
  app.get('/api/leads', requireAuth, (req, res) => {
    const search = String(req.query.search || '').trim().toLowerCase();
    const status = String(req.query.status || '').trim();
    const sort = String(req.query.sort || 'desc').toLowerCase();

    let leads = db.getLeads();
    if (status && ['Hot', 'Warm', 'Cold'].includes(status)) {
      leads = leads.filter((l) => l.lead_status === status);
    }
    if (search) {
      leads = leads.filter((l) =>
        [l.customer_name, l.company, l.email, l.requirements, l.phone_number]
          .filter(Boolean)
          .some((field) => String(field).toLowerCase().includes(search))
      );
    }
    leads.sort((a, b) => {
      const diff = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      return sort === 'asc' ? diff : -diff;
    });
    res.json(leads);
  });

  app.post('/api/leads', requireAuth, (req, res) => {
    const body = req.body || {};
    if (!body.customer_name || !String(body.customer_name).trim()) {
      res.status(400).json({ detail: 'Customer name is required.' });
      return;
    }
    const status: LeadStatus = ['Hot', 'Warm', 'Cold'].includes(body.lead_status) ? body.lead_status : 'Warm';
    const created = db.createLead({
      customer_name: String(body.customer_name).trim(),
      phone_number: body.phone_number ? String(body.phone_number).trim() : null,
      email: body.email ? String(body.email).trim() : null,
      company: body.company ? String(body.company).trim() : null,
      budget: body.budget ? String(body.budget).trim() : 'Not provided',
      requirements: body.requirements ? String(body.requirements).trim() : 'Not provided',
      purchase_timeline: body.purchase_timeline ? String(body.purchase_timeline).trim() : 'Not provided',
      interest_level: body.interest_level ? String(body.interest_level).trim() : 'Medium',
      lead_status: status,
      lead_source: body.lead_source ? String(body.lead_source).trim() : 'Manual Entry',
      is_demo: false,
    });
    res.status(201).json(created);
  });

  app.get('/api/leads/:id', requireAuth, (req, res) => {
    const id = Number(req.params.id);
    const lead = db.findLeadById(id);
    if (!lead) {
      res.status(404).json({ detail: 'Lead not found.' });
      return;
    }
    res.json(lead);
  });

  app.put('/api/leads/:id', requireAuth, (req, res) => {
    const id = Number(req.params.id);
    const body = req.body || {};
    const updated = db.updateLead(id, {
      ...(body.customer_name !== undefined ? { customer_name: String(body.customer_name).trim() } : {}),
      ...(body.phone_number !== undefined ? { phone_number: body.phone_number || null } : {}),
      ...(body.email !== undefined ? { email: body.email || null } : {}),
      ...(body.company !== undefined ? { company: body.company || null } : {}),
      ...(body.budget !== undefined ? { budget: body.budget || 'Not provided' } : {}),
      ...(body.requirements !== undefined ? { requirements: body.requirements || 'Not provided' } : {}),
      ...(body.purchase_timeline !== undefined ? { purchase_timeline: body.purchase_timeline || 'Not provided' } : {}),
      ...(body.interest_level !== undefined ? { interest_level: body.interest_level || 'Medium' } : {}),
      ...(body.lead_status !== undefined && ['Hot', 'Warm', 'Cold'].includes(body.lead_status)
        ? { lead_status: body.lead_status }
        : {}),
      ...(body.lead_source !== undefined ? { lead_source: body.lead_source } : {}),
    });
    if (!updated) {
      res.status(404).json({ detail: 'Lead not found.' });
      return;
    }
    res.json(updated);
  });

  app.delete('/api/leads/:id', requireAuth, (req, res) => {
    const id = Number(req.params.id);
    const ok = db.deleteLead(id);
    if (!ok) {
      res.status(404).json({ detail: 'Lead not found.' });
      return;
    }
    res.status(204).send();
  });

  // Calls Routes
  app.get('/api/calls', requireAuth, (_req, res) => {
    const calls = db.getCalls().sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
    res.json(calls);
  });

  app.post('/api/calls', requireAuth, (req, res) => {
    const body = req.body || {};
    const created = db.createCall({
      lead_id: body.lead_id ?? null,
      vapi_call_id: body.vapi_call_id ?? null,
      customer_name: String(body.customer_name || 'Browser Voice Prospect'),
      phone_number: body.phone_number || null,
      call_status: body.call_status || 'Completed',
      duration: Number(body.duration || 0),
      transcript: String(body.transcript || ''),
      summary: body.summary || null,
      qualification_result: body.qualification_result || null,
      follow_up_recommendation: body.follow_up_recommendation || null,
      is_demo: false,
    });
    res.status(201).json(created);
  });

  app.get('/api/calls/:id', requireAuth, (req, res) => {
    const id = Number(req.params.id);
    const call = db.findCallById(id);
    if (!call) {
      res.status(404).json({ detail: 'Call not found.' });
      return;
    }
    res.json(call);
  });

  // Voice Assistant Config & Vapi Session Routes
  app.get('/api/voice/assistant-config', requireAuth, (_req, res) => {
    res.json(db.getAssistantConfig());
  });

  app.put('/api/voice/assistant-config', requireAuth, (req, res) => {
    const updated = db.updateAssistantConfig(req.body || {});
    res.json(updated);
  });

  app.get('/api/voice/config', requireAuth, (_req, res) => {
    res.json({
      vapi_configured: isVapiConfigured(),
      vapi_public_configured: isVapiPublicConfigured(),
      public_key: isVapiPublicConfigured() ? process.env.VAPI_PUBLIC_KEY : null,
      assistant_id: isVapiPublicConfigured() ? process.env.VAPI_ASSISTANT_ID : null,
      gemini_configured: isGeminiConfigured(),
    });
  });

  app.post('/api/voice/start', requireAuth, (_req, res) => {
    if (!isVapiPublicConfigured()) {
      res.json({
        mode: 'simulated_preview',
        vapi_configured: false,
        message:
          'Vapi credentials are not configured. Running clearly-labelled Simulated Browser Voice Preview powered by Google Gemini.',
      });
      return;
    }
    res.json({
      mode: 'vapi_live',
      vapi_configured: true,
      public_key: process.env.VAPI_PUBLIC_KEY,
      assistant_id: process.env.VAPI_ASSISTANT_ID,
    });
  });

  app.post('/api/voice/chat', requireAuth, async (req, res) => {
    const { history = [], user_message, assistant_config } = req.body || {};
    if (!user_message || typeof user_message !== 'string') {
      res.status(400).json({ detail: 'user_message is required.' });
      return;
    }
    const config = assistant_config || db.getAssistantConfig();
    try {
      const result = await generateVoiceAgentReply({
        systemPrompt: config.system_prompt,
        language: config.language || 'en',
        history,
        userMessage: user_message,
      });
      res.json(result);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Gemini voice turn failed.';
      res.status(isGeminiConfigured() ? 500 : 503).json({ detail: message });
    }
  });

  app.post('/api/voice/webhook', async (req: Request & { rawBody?: Buffer }, res) => {
    const secret = (process.env.VAPI_WEBHOOK_SECRET || '').trim();
    if (secret) {
      const signature = req.header('x-vapi-signature') || '';
      const expected = crypto
        .createHmac('sha256', secret)
        .update(req.rawBody || Buffer.from(JSON.stringify(req.body || {})))
        .digest('hex');
      if (!signature || signature.length !== expected.length || !crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) {
        res.status(401).json({ detail: 'Invalid webhook signature.' });
        return;
      }
    }

    const message = req.body?.message || {};
    if (message.type === 'end-of-call-report') {
      const transcript = String(message.transcript || '').trim();
      const callObj = message.call || {};
      const customerObj = callObj.customer || {};
      const duration = Number(message.durationSeconds || 0);

      if (transcript) {
        try {
          const qualification = await qualifyLeadWithGemini(transcript);
          const resolvedName =
            qualification.customer_name && qualification.customer_name !== 'Not provided'
              ? qualification.customer_name
              : customerObj.name || 'Vapi Inbound Caller';

          const lead = db.createLead({
            customer_name: resolvedName,
            phone_number: customerObj.number || null,
            email: null,
            company: null,
            budget: qualification.budget,
            requirements: qualification.customer_requirements,
            purchase_timeline: qualification.purchase_timeline,
            interest_level: qualification.interest_level,
            lead_status: qualification.lead_status,
            lead_source: 'Vapi Voice Call',
            is_demo: false,
          });

          const call = db.createCall({
            lead_id: lead.id,
            vapi_call_id: callObj.id || null,
            customer_name: resolvedName,
            phone_number: customerObj.number || null,
            call_status: 'Completed',
            duration,
            transcript,
            summary: qualification.summary,
            qualification_result: qualification,
            follow_up_recommendation: qualification.follow_up_recommendation,
            is_demo: false,
          });

          res.json({ status: 'processed', call_id: call.id, lead_id: lead.id });
          return;
        } catch (err) {
          const msg = err instanceof Error ? err.message : 'Webhook qualification failed.';
          res.status(500).json({ detail: msg });
          return;
        }
      }
    }

    res.json({ status: 'ignored', event_type: message.type || null });
  });

  // Gemini AI Qualification & Summarization Routes
  app.post('/api/ai/qualify-lead', requireAuth, async (req, res) => {
    const {
      transcript,
      call_id,
      customer_name,
      phone_number,
      duration = 0,
      call_status = 'Completed',
      lead_source = 'Browser Voice Call',
      persist = true,
    } = req.body || {};

    if (!transcript || typeof transcript !== 'string' || transcript.trim().length < 10) {
      res.status(400).json({ detail: 'A valid transcript (at least 10 characters) is required.' });
      return;
    }

    try {
      const qualification = await qualifyLeadWithGemini(transcript);

      if (!persist) {
        res.json({ qualification, call: null, lead: null });
        return;
      }

      const resolvedName =
        qualification.customer_name && qualification.customer_name !== 'Not provided'
          ? qualification.customer_name
          : customer_name || 'Voice Prospect';

      let call = call_id ? db.findCallById(Number(call_id)) : undefined;
      let lead = call?.lead_id ? db.findLeadById(call.lead_id) : undefined;

      if (!lead) {
        lead = db.createLead({
          customer_name: resolvedName,
          phone_number: phone_number || null,
          email: null,
          company: null,
          budget: qualification.budget,
          requirements: qualification.customer_requirements,
          purchase_timeline: qualification.purchase_timeline,
          interest_level: qualification.interest_level,
          lead_status: qualification.lead_status,
          lead_source,
          is_demo: false,
        });
      } else {
        lead = db.updateLead(lead.id, {
          customer_name: resolvedName,
          budget: qualification.budget,
          requirements: qualification.customer_requirements,
          purchase_timeline: qualification.purchase_timeline,
          interest_level: qualification.interest_level,
          lead_status: qualification.lead_status,
        })!;
      }

      if (!call) {
        call = db.createCall({
          lead_id: lead.id,
          vapi_call_id: null,
          customer_name: resolvedName,
          phone_number: phone_number || null,
          call_status,
          duration: Number(duration || 0),
          transcript,
          summary: qualification.summary,
          qualification_result: qualification,
          follow_up_recommendation: qualification.follow_up_recommendation,
          is_demo: false,
        });
      } else {
        call = db.updateCall(call.id, {
          lead_id: lead.id,
          customer_name: resolvedName,
          summary: qualification.summary,
          qualification_result: qualification,
          follow_up_recommendation: qualification.follow_up_recommendation,
        })!;
      }

      res.json({ qualification, call, lead });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Lead qualification failed.';
      res.status(isGeminiConfigured() ? 500 : 503).json({ detail: message });
    }
  });

  app.post('/api/ai/summarize-call', requireAuth, async (req, res) => {
    const { transcript, call_id } = req.body || {};
    if (!transcript || typeof transcript !== 'string' || transcript.trim().length < 10) {
      res.status(400).json({ detail: 'A valid transcript is required.' });
      return;
    }
    try {
      const summary = await summarizeCallWithGemini(transcript);
      if (call_id) {
        db.updateCall(Number(call_id), { summary });
      }
      res.json({ summary });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Call summarization failed.';
      res.status(isGeminiConfigured() ? 500 : 503).json({ detail: message });
    }
  });

  // Analytics Endpoints (Strictly computed from persisted records)
  app.get('/api/analytics/overview', requireAuth, (_req, res) => {
    const calls = db.getCalls();
    const leads = db.getLeads();

    const total_calls = calls.length;
    const completed_calls = calls.filter((c) => c.call_status === 'Completed' || c.call_status === 'Simulated').length;
    const hot_leads = leads.filter((l) => l.lead_status === 'Hot').length;
    const warm_leads = leads.filter((l) => l.lead_status === 'Warm').length;
    const cold_leads = leads.filter((l) => l.lead_status === 'Cold').length;
    const qualified_leads = hot_leads + warm_leads;
    const conversion_rate = total_calls > 0 ? Number(((qualified_leads / total_calls) * 100).toFixed(1)) : 0;
    const avg_call_duration =
      total_calls > 0 ? Math.round(calls.reduce((acc, c) => acc + (c.duration || 0), 0) / total_calls) : 0;

    res.json({
      total_calls,
      completed_calls,
      qualified_leads,
      conversion_rate,
      hot_leads,
      warm_leads,
      cold_leads,
      avg_call_duration,
      has_demo_records: calls.some((c) => c.is_demo) || leads.some((l) => l.is_demo),
    });
  });

  app.get('/api/analytics/call-trends', requireAuth, (_req, res) => {
    const calls = [...db.getCalls()].sort(
      (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    );
    const map = new Map<string, { date: string; total_calls: number; completed_calls: number }>();

    for (const c of calls) {
      const day = c.created_at.slice(0, 10);
      const entry = map.get(day) || { date: day, total_calls: 0, completed_calls: 0 };
      entry.total_calls += 1;
      if (c.call_status === 'Completed' || c.call_status === 'Simulated') {
        entry.completed_calls += 1;
      }
      map.set(day, entry);
    }

    res.json(Array.from(map.values()));
  });

  app.get('/api/analytics/lead-distribution', requireAuth, (_req, res) => {
    const leads = db.getLeads();
    const byStatus = [
      { name: 'Hot', value: leads.filter((l) => l.lead_status === 'Hot').length },
      { name: 'Warm', value: leads.filter((l) => l.lead_status === 'Warm').length },
      { name: 'Cold', value: leads.filter((l) => l.lead_status === 'Cold').length },
    ];

    const sourceMap = new Map<string, number>();
    for (const l of leads) {
      const src = (l.lead_source || 'Direct').replace('Demo Sample · ', '');
      sourceMap.set(src, (sourceMap.get(src) || 0) + 1);
    }
    const bySource = Array.from(sourceMap.entries()).map(([source, count]) => ({ source, count }));

    res.json({ by_status: byStatus, by_source: bySource });
  });

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`VoxLead AI server listening on http://localhost:${PORT}`);
  });
}

startServer();
