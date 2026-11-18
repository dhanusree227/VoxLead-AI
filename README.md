# VoxLead AI — Intelligent Voice Calling & Lead Qualification Platform

VoxLead AI is a full-stack AI Voice Calling & Lead Qualification SaaS platform built with **React, TypeScript, Tailwind CSS, Recharts**, **Python FastAPI, Pydantic, SQLAlchemy, PostgreSQL**, **Google Gemini API**, and **Vapi Voice AI**.

---

## Architecture Overview

- **Frontend (`src/`)**: Responsive React + TypeScript + Tailwind CSS dashboard with Landing Page, JWT Authentication (Login/Register/Forgot Password + Demo Mode), Main Dashboard, AI Voice Agent Console, Lead Management CRM, Call History & Transcript Details, AI Lead Analytics, and Settings.
- **Python FastAPI Backend (`backend/`)**: Complete production-ready REST API with SQLAlchemy ORM, PostgreSQL models (`users`, `leads`, `calls`), Pydantic v2 validation, bcrypt + JWT authentication, Google Gemini structured JSON qualification, and Vapi session/webhook handling.
- **Integrated Preview Gateway (`server.ts`)**: Express + Vite server running on port `3000` with persistent storage (`data/voxlead.db.json`) and server-side `@google/genai` (`gemini-4-hydrogen`) for immediate preview execution.

---

## Folder Structure

```text
├── backend/
│   ├── app/
│   │   ├── main.py
│   │   ├── config.py
│   │   ├── database.py
│   │   ├── models/
│   │   │   ├── user.py
│   │   │   ├── lead.py
│   │   │   └── call.py
│   │   ├── schemas/
│   │   │   ├── auth_schema.py
│   │   │   ├── lead_schema.py
│   │   │   ├── call_schema.py
│   │   │   └── voice_schema.py
│   │   ├── routes/
│   │   │   ├── auth.py
│   │   │   ├── leads.py
│   │   │   ├── calls.py
│   │   │   ├── voice.py
│   │   │   ├── ai.py
│   │   │   └── analytics.py
│   │   ├── services/
│   │   │   ├── gemini_service.py
│   │   │   ├── vapi_service.py
│   │   │   └── qualification_service.py
│   │   └── utils/
│   │       └── security.py
│   ├── requirements.txt
│   └── .env.example
├── server/
│   ├── db.ts
│   └── gemini.ts
├── src/
│   ├── components/
│   ├── context/
│   ├── pages/
│   ├── services/
│   └── types/
├── server.ts
├── .env.example
└── README.md
```

---

## Environment Variables

Copy `.env.example` (and `backend/.env.example` when running the FastAPI service) and configure:

| Variable | Required | Description |
| :--- | :--- | :--- |
| `GEMINI_API_KEY` | Yes (for AI) | Server-side Google Gemini API key |
| `VAPI_API_KEY` | Optional | Vapi Private Server API key |
| `VAPI_PUBLIC_KEY` | Optional | Vapi Public Client Key for browser WebRTC |
| `VAPI_ASSISTANT_ID` | Optional | Vapi Assistant ID |
| `VAPI_WEBHOOK_SECRET` | Optional | HMAC secret to verify `/api/voice/webhook` |
| `DATABASE_URL` | Yes (FastAPI) | PostgreSQL connection string (`postgresql://user:pass@host:5432/voxlead_db`) |
| `JWT_SECRET_KEY` | Yes | Random secret used to sign JWT session tokens |
| `FRONTEND_URL` | Yes | Allowed CORS origin (e.g., `http://localhost:3000`) |

> **Security Note:** Never expose `GEMINI_API_KEY`, `VAPI_API_KEY`, or `JWT_SECRET_KEY` in client-side code.

---

## Local Development Setup

### 1. Frontend & Integrated Preview Gateway (Port 3000)

```bash
npm install
cp .env.example .env
# Add your GEMINI_API_KEY (and optional Vapi keys) to .env
npm run dev
```

Open `http://localhost:3000`.

### 2. Python FastAPI Backend & PostgreSQL

#### Database Setup (PostgreSQL)

Create a local or hosted PostgreSQL database:

```bash
createdb voxlead_db
```

#### Backend Installation

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
# Edit backend/.env with DATABASE_URL, GEMINI_API_KEY, JWT_SECRET_KEY, and VAPI_* keys
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

Interactive Swagger API docs are available at `http://localhost:8000/docs`.

---

## API Integration Guides

### Google Gemini API Setup
1. Generate an API key in Google AI Studio.
2. Set `GEMINI_API_KEY` in your backend `.env` or hosting Secrets panel.
3. Gemini powers:
   - `POST /api/ai/qualify-lead`: Extracts `customer_name`, `customer_requirements`, `budget`, `purchase_timeline`, `interest_level`, `lead_status` (`Hot | Warm | Cold`), `summary`, `follow_up_recommendation`, and `qualification_reasoning`.
   - `POST /api/ai/summarize-call`: Generates concise executive call summaries.
   - `POST /api/voice/chat`: Generates contextual conversational turns during browser voice previews.

### Vapi Voice AI Setup
1. Create an account and Assistant in the Vapi dashboard.
2. Configure your Vapi Webhook URL to point to `https://<your-backend-domain>/api/voice/webhook` and listen for `end-of-call-report`.
3. Add `VAPI_API_KEY`, `VAPI_PUBLIC_KEY`, and `VAPI_ASSISTANT_ID` to your environment.
4. When Vapi credentials are omitted, VoxLead AI clearly displays the setup state and lets you test conversations via the **Simulated Browser Preview** mode.

---

## REST API Endpoints

### Authentication
- `POST /api/auth/register` — Create user with bcrypt password hashing & return JWT
- `POST /api/auth/login` — Verify credentials & return JWT
- `GET /api/auth/me` — Fetch authenticated user profile

### Leads CRUD
- `GET /api/leads` — Search, filter (`Hot|Warm|Cold`), and sort leads by date
- `POST /api/leads` — Create a new lead
- `GET /api/leads/{id}` — Retrieve single lead
- `PUT /api/leads/{id}` — Update lead details
- `DELETE /api/leads/{id}` — Delete lead

### Calls & Voice
- `GET /api/calls` — List call history
- `GET /api/calls/{id}` — Get call details, transcript, summary, and qualification JSON
- `POST /api/voice/start` — Initialize Vapi browser session or return Simulated Preview status
- `POST /api/voice/chat` — Multi-turn Gemini voice agent dialogue
- `POST /api/voice/webhook` — Receive Vapi `end-of-call-report` events and persist qualified records

### AI & Analytics
- `POST /api/ai/qualify-lead` — Run Gemini structured lead qualification & persist
- `POST /api/ai/summarize-call` — Summarize transcript with Gemini
- `GET /api/analytics/overview` — Compute totals, conversion rate, and Hot/Warm/Cold counts
- `GET /api/analytics/call-trends` — Daily call volume trends
- `GET /api/analytics/lead-distribution` — Status and lead source distribution
- `GET /api/health` — Database and integration readiness check

---

## Deployment Instructions

### Frontend on Vercel
1. Connect your repository to Vercel.
2. Set build command to `npm run build` and output directory to `dist`.
3. Configure your backend API proxy/base URL and redeploy.

### Backend on Render or Railway
1. Create a **PostgreSQL** instance on Render/Railway and copy its `DATABASE_URL`.
2. Deploy the `backend/` directory as a Python Web Service:
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
3. Set `GEMINI_API_KEY`, `VAPI_API_KEY`, `VAPI_PUBLIC_KEY`, `VAPI_ASSISTANT_ID`, `DATABASE_URL`, `JWT_SECRET_KEY`, and `FRONTEND_URL` in your service environment variables.
