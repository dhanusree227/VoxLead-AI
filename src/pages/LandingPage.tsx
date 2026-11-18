import { ArrowRight, Mic, BrainCircuit, Database, ShieldCheck, BarChart2, PhoneCall, Check } from 'lucide-react';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip } from 'recharts';

interface LandingPageProps {
  onGetStarted: () => void;
  onExploreDashboard: () => void;
  isAuthenticated: boolean;
}

const PREVIEW_TREND_DATA = [
  { day: 'Mon', calls: 14, qualified: 8 },
  { day: 'Tue', calls: 21, qualified: 12 },
  { day: 'Wed', calls: 18, qualified: 11 },
  { day: 'Thu', calls: 29, qualified: 19 },
  { day: 'Fri', calls: 34, qualified: 24 },
];

export function LandingPage({ onGetStarted, onExploreDashboard, isAuthenticated }: LandingPageProps) {
  return (
    <div className="min-h-screen bg-[#F5F7FB] text-slate-900 flex flex-col">
      {/* Strict 3-Zone Top Bar Contract */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-sm border-b border-slate-200/80">
        <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-8">
          <a
            href="#top"
            className="font-display font-bold text-lg tracking-tight text-[#172554] whitespace-nowrap shrink-0"
          >
            VoxLead AI
          </a>

          <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-600">
            <a href="#features" className="hover:text-[#172554] hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0">
              Features
            </a>
            <a href="#how-it-works" className="hover:text-[#172554] hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0">
              How It Works
            </a>
            <a href="#stack" className="hover:text-[#172554] hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0">
              Architecture
            </a>
            <a href="#analytics-preview" className="hover:text-[#172554] hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0">
              Analytics
            </a>
          </nav>

          <div className="shrink-0">
            <button
              type="button"
              onClick={isAuthenticated ? onExploreDashboard : onGetStarted}
              className="px-4 py-2 rounded-lg bg-[#172554] hover:bg-indigo-700 text-white text-sm font-medium transition-colors whitespace-nowrap shrink-0 min-h-[40px]"
            >
              {isAuthenticated ? 'Open Dashboard' : 'Get Started'}
            </button>
          </div>
        </div>
      </header>

      <main id="top" className="flex-1">
        {/* Hero Section */}
        <section className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8 pt-10 pb-14 lg:pt-16 lg:pb-20">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-stretch">
            <div className="lg:col-span-6 flex flex-col justify-center">
              <p className="text-xs font-medium text-indigo-600 mb-3 tracking-wide">
                Voice AI Qualification Platform
              </p>
              <h1
                className="font-display font-bold text-[#172554] tracking-tight text-balance leading-[1.1]"
                style={{ fontSize: 'clamp(2.25rem, 4vw, 3.5rem)' }}
              >
                Turn Every Conversation Into an Opportunity.
              </h1>
              <p className="mt-5 text-base sm:text-lg text-slate-600 leading-relaxed max-w-xl">
                Automate inbound and outbound qualification calls with low-latency voice interaction,
                extract structured budget and timeline signals with Google Gemini, and sync every
                qualified prospect directly to your pipeline.
              </p>

              <div className="mt-8 flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={onGetStarted}
                  className="inline-flex items-center gap-2 px-5 py-3 rounded-lg bg-[#172554] hover:bg-indigo-700 text-white text-sm font-semibold transition-colors whitespace-nowrap min-h-[44px]"
                >
                  <span>Get Started</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={onExploreDashboard}
                  className="inline-flex items-center gap-2 px-5 py-3 rounded-lg bg-white hover:bg-slate-50 text-slate-800 border border-slate-300 text-sm font-semibold transition-colors whitespace-nowrap min-h-[44px]"
                >
                  <span>Explore Dashboard</span>
                </button>
              </div>

              <div className="mt-8 pt-6 border-t border-slate-200/80 flex flex-wrap items-center gap-x-6 gap-y-2 text-xs text-slate-500">
                <span>Vapi Browser Voice</span>
                <span aria-hidden="true">·</span>
                <span>Google Gemini Structured JSON</span>
                <span aria-hidden="true">·</span>
                <span>FastAPI &amp; PostgreSQL Ready</span>
              </div>
            </div>

            <div className="lg:col-span-6 flex">
              <div className="w-full rounded-xl overflow-hidden border border-slate-200 bg-white shadow-xs">
                <img
                  src="/src/assets/images/hero_voice_studio_1795005306154.jpg"
                  alt="VoxLead AI enterprise acoustic voice qualification studio"
                  referrerPolicy="no-referrer"
                  className="w-full h-64 sm:h-80 lg:h-full object-cover"
                />
              </div>
            </div>
          </div>
        </section>

        {/* Features Asymmetric Bento Grid */}
        <section id="features" className="bg-white border-y border-slate-200/80 py-14 lg:py-20">
          <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8">
            <div className="max-w-2xl mb-10">
              <h2 className="font-display text-2xl sm:text-3xl font-bold text-[#172554] tracking-tight text-balance">
                Purpose-built for automated voice discovery and revenue triage
              </h2>
              <p className="mt-3 text-slate-600">
                Every call moves cleanly from natural spoken dialogue to verified CRM records without manual note-taking.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="md:col-span-2 rounded-xl border border-slate-200 bg-[#F5F7FB] p-6 sm:p-8">
                <div className="w-10 h-10 rounded-lg bg-[#172554] text-white flex items-center justify-center mb-5">
                  <Mic className="w-5 h-5" />
                </div>
                <h3 className="font-display text-lg font-semibold text-slate-900">
                  01. Natural Browser &amp; Vapi Voice Conversations
                </h3>
                <p className="mt-2 text-sm text-slate-600 leading-relaxed max-w-2xl">
                  Configure greeting scripts, persona prompts, language settings, and call duration limits.
                  Test directly from your browser via Vapi Web Calling or the built-in Gemini Simulated
                  Browser Preview without initiating external phone charges.
                </p>
                <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-slate-700">
                  <div className="bg-white border border-slate-200/80 rounded-lg p-3">
                    Contextual follow-up without repeating answered questions
                  </div>
                  <div className="bg-white border border-slate-200/80 rounded-lg p-3">
                    Webhook-ready transcript capture and duration tracking
                  </div>
                </div>
              </div>

              <div className="rounded-xl border border-slate-200 bg-white p-6 sm:p-8">
                <div className="w-10 h-10 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center mb-5">
                  <BrainCircuit className="w-5 h-5" />
                </div>
                <h3 className="font-display text-lg font-semibold text-slate-900">
                  02. Gemini JSON Qualification
                </h3>
                <p className="mt-2 text-sm text-slate-600 leading-relaxed">
                  Automatically extracts requirements, budget, buying timeline, interest level, and
                  Hot / Warm / Cold classification with strict schema validation.
                </p>
              </div>

              <div className="rounded-xl border border-slate-200 bg-white p-6 sm:p-8">
                <div className="w-10 h-10 rounded-lg bg-cyan-50 text-cyan-700 flex items-center justify-center mb-5">
                  <Database className="w-5 h-5" />
                </div>
                <h3 className="font-display text-lg font-semibold text-slate-900">
                  03. Full CRM &amp; Transcript Ledger
                </h3>
                <p className="mt-2 text-sm text-slate-600 leading-relaxed">
                  Search, filter, and edit qualified leads alongside complete speaker transcripts,
                  AI summaries, and follow-up recommendations.
                </p>
              </div>

              <div className="md:col-span-2 rounded-xl border border-slate-200 bg-white p-6 sm:p-8 flex flex-col justify-between">
                <div>
                  <div className="w-10 h-10 rounded-lg bg-slate-100 text-[#172554] flex items-center justify-center mb-5">
                    <ShieldCheck className="w-5 h-5" />
                  </div>
                  <h3 className="font-display text-lg font-semibold text-slate-900">
                    04. Server-Side Secrets &amp; Transparent Integration States
                  </h3>
                  <p className="mt-2 text-sm text-slate-600 leading-relaxed max-w-2xl">
                    API credentials stay strictly on the server. When Vapi or Gemini keys are absent,
                    the platform reports setup status transparently rather than masking mock outputs as live calls.
                  </p>
                </div>
                <div className="mt-5 flex flex-wrap gap-4 text-xs font-medium text-slate-700">
                  <span className="inline-flex items-center gap-1.5">
                    <Check className="w-4 h-4 text-indigo-600" /> JWT Session Auth
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <Check className="w-4 h-4 text-indigo-600" /> Pydantic Validation
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <Check className="w-4 h-4 text-indigo-600" /> Webhook Signature Check
                  </span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* How It Works */}
        <section id="how-it-works" className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8 py-14 lg:py-20">
          <div className="max-w-2xl mb-10">
            <h2 className="font-display text-2xl sm:text-3xl font-bold text-[#172554] tracking-tight">
              How the qualification pipeline operates
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              {
                step: '01. Configure Agent',
                desc: 'Define the assistant greeting, voice profile, language, and qualification rubric.',
              },
              {
                step: '02. Run Voice Call',
                desc: 'Conduct a live Vapi browser call or interactive Gemini speech preview from the console.',
              },
              {
                step: '03. Qualify with Gemini',
                desc: 'Server-side Gemini parses the transcript into structured budget, timeline, and Hot/Warm/Cold status.',
              },
              {
                step: '04. Review & Follow Up',
                desc: 'Track conversion trends, inspect call reasoning, and dispatch sales follow-ups.',
              },
            ].map((item) => (
              <div key={item.step} className="rounded-xl border border-slate-200 bg-white p-6">
                <h3 className="font-display font-semibold text-base text-[#172554]">{item.step}</h3>
                <p className="mt-2 text-sm text-slate-600 leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Architecture & Analytics Preview */}
        <section id="stack" className="bg-white border-t border-slate-200/80 py-14 lg:py-20">
          <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            <div className="lg:col-span-5">
              <h2 className="font-display text-2xl sm:text-3xl font-bold text-[#172554] tracking-tight text-balance">
                Production architecture across frontend, API, and database
              </h2>
              <p className="mt-3 text-sm sm:text-base text-slate-600 leading-relaxed">
                Designed with modular React components, a complete Python FastAPI + SQLAlchemy +
                PostgreSQL backend in <span className="font-mono text-xs bg-slate-100 px-1.5 py-0.5 rounded">backend/</span>,
                and an integrated Node gateway for instant preview execution.
              </p>

              <dl className="mt-6 space-y-3 text-sm">
                <div className="flex justify-between py-2 border-b border-slate-100">
                  <dt className="font-medium text-slate-700">Frontend Interface</dt>
                  <dd className="text-slate-500">React · TypeScript · Tailwind · Recharts</dd>
                </div>
                <div className="flex justify-between py-2 border-b border-slate-100">
                  <dt className="font-medium text-slate-700">Backend &amp; ORM</dt>
                  <dd className="text-slate-500">Python · FastAPI · Pydantic · SQLAlchemy</dd>
                </div>
                <div className="flex justify-between py-2 border-b border-slate-100">
                  <dt className="font-medium text-slate-700">Voice &amp; Intelligence</dt>
                  <dd className="text-slate-500">Vapi Web SDK · Google Gemini API</dd>
                </div>
                <div className="flex justify-between py-2">
                  <dt className="font-medium text-slate-700">Persistence &amp; Deploy</dt>
                  <dd className="text-slate-500">PostgreSQL · Vercel · Render / Railway</dd>
                </div>
              </dl>
            </div>

            <div id="analytics-preview" className="lg:col-span-7 rounded-xl border border-slate-200 bg-[#F5F7FB] p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="font-display font-semibold text-slate-900 flex items-center gap-2">
                    <BarChart2 className="w-4 h-4 text-indigo-600" />
                    Sample Call Qualification Throughput
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Illustrative preview · Live dashboard metrics calculate directly from stored database records
                  </p>
                </div>
                <button
                  type="button"
                  onClick={onExploreDashboard}
                  className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 whitespace-nowrap"
                >
                  Open Live Metrics →
                </button>
              </div>
              <div className="h-56 w-full bg-white rounded-lg border border-slate-200/80 p-3">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={PREVIEW_TREND_DATA}>
                    <XAxis dataKey="day" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                    <YAxis stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} width={30} />
                    <Tooltip />
                    <Area
                      type="monotone"
                      dataKey="calls"
                      name="Total Calls"
                      stroke="#172554"
                      fill="#6366F1"
                      fillOpacity={0.14}
                      strokeWidth={2}
                    />
                    <Area
                      type="monotone"
                      dataKey="qualified"
                      name="Qualified Leads"
                      stroke="#06B6D4"
                      fill="#06B6D4"
                      fillOpacity={0.12}
                      strokeWidth={2}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Quiet Footer */}
      <footer className="bg-white border-t border-slate-200/80 py-8">
        <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <div className="flex items-center gap-2">
            <PhoneCall className="w-4 h-4 text-[#172554]" />
            <span className="font-display font-semibold text-slate-800">VoxLead AI</span>
            <span aria-hidden="true">·</span>
            <span>Intelligent Voice Calling &amp; Lead Qualification</span>
          </div>
          <div className="flex items-center gap-6">
            <a href="#features" className="hover:text-slate-900">Features</a>
            <a href="#how-it-works" className="hover:text-slate-900">How It Works</a>
            <button type="button" onClick={onGetStarted} className="hover:text-slate-900">
              Sign In
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
}
