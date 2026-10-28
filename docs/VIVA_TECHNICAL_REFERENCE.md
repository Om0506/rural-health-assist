# Rural Healthcare Assistance Platform — Complete Technical Reference

**Purpose:** Viva / final review preparation — describes the **current implementation only** (no proposed refactors).

**Stack (as implemented):** React 18 + Vite + Tailwind | Node.js + Express | PostgreSQL (Neon) | Firebase Auth | Groq AI (Llama 3.3) | Frontend → Vercel | Backend → Render

---

## Table of Contents

1. [System Architecture](#part-1--complete-system-architecture)
2. [AI Implementation](#part-2--ai-implementation-analysis)
3. [Case Management Workflow](#part-3--case-management-workflow)
4. [Role-Based Workflow](#part-4--role-based-workflow)
5. [Multilingual Implementation](#part-5--multilingual-implementation)
6. [Database & Backend Flow](#part-6--database--backend-flow)
7. [Security & Validation](#part-7--security--validation)
8. [Design Decisions (Why)](#part-8--project-design-decisions)
9. [Future Scope](#part-9--future-scope)
10. [Viva Q&A Bank](#part-10--viva-question-bank-with-answers)

---

# PART 1 — COMPLETE SYSTEM ARCHITECTURE

## 1.1 High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         CLIENT (Browser / Mobile)                        │
│  React SPA (Vite) — Villager / ASHA / Doctor dashboards + marketing     │
│  Firebase Auth SDK → ID Token on every API call                           │
└───────────────────────────────┬─────────────────────────────────────────┘
                                │ HTTPS  (Bearer JWT from Firebase)
                                ▼
┌─────────────────────────────────────────────────────────────────────────┐
│              BACKEND API — Node.js + Express (Render)                    │
│  Routes: /api/users, /health, /flag, /chatbot, /cases, /doctor, ...   │
│  Services: Groq triage, risk scoring, case workflow, notifications       │
│  Multer uploads → backend/uploads/                                       │
└───────────────────────────────┬─────────────────────────────────────────┘
                                │ SQL (pg pool)
                                ▼
┌─────────────────────────────────────────────────────────────────────────┐
│              PostgreSQL — Neon (cloud-hosted)                            │
│  Schema auto-initialized on server start (initializeDatabase)          │
└─────────────────────────────────────────────────────────────────────────┘

        ┌──────────────────┐
        │  Groq API        │  ← OpenAI-compatible client, JSON triage
        │  (Llama 3.3 70B) │
        └──────────────────┘
```

## 1.2 Frontend Architecture

| Layer | Technology | Location |
|-------|------------|----------|
| Build tool | Vite 5, port **5000**, `host: 0.0.0.0` | `frontend/vite.config.js` |
| UI framework | React 18 + React Router 6 | `frontend/src/App.jsx` |
| Styling | Tailwind CSS + dark mode (`ThemeContext`) | `frontend/src/index.css` |
| HTTP | Axios + Firebase token interceptor | `frontend/src/services/api.js` |
| i18n | react-i18next (`en`, `hi`, `mr`) | `frontend/src/i18n/` |
| QR | html5-qrcode, qrcode.react | ASHA/Doctor scan flows |

**Provider tree** (`main.jsx`):

```
ThemeProvider → LanguageProvider → App
  → TopbarProvider → ScanProvider → BrowserRouter
```

**Layout modes:**
- **Public:** Home, About, Services, Contact, Login, Register — marketing `Navbar`
- **Authenticated dashboards:** `AppShell` (sidebar/topbar, QR FAB) except Villager (mobile tab nav, `hideSidebar: true`)

**Role routing** (`App.jsx` + `ProtectedRoute`):
- Normalizes roles: `ASHA Worker` → `ASHA`, lowercase variants → canonical names
- Mismatch → redirect to `/`

| Role | Primary routes |
|------|----------------|
| **Villager** | `/dashboard/villager` (hash tabs: chatbot, records, cases, qr, profile, notifications) |
| **ASHA** | `/dashboard/asha`, `/asha/*` (flagged cases, village records, medicine log, daily visits, patient search) |
| **Doctor** | `/doctor-dashboard`, `/doctor/escalated`, `/patients`, `/insights`, `/prescriptions`, `/notifications` |
| **Shared** | `/patient/:patientId` (ASHA + Doctor) |

## 1.3 Backend Architecture

**Entry:** `backend/src/server.js`

- `dotenv` loaded first, then Firebase Admin init
- Global middleware: `cors()`, `express.json()`
- **No global auth** — each route applies `authenticateUser` / `requireRole` / `canAccessUserData`
- DB tables created on startup via `initializeDatabase()`
- Listens on `0.0.0.0:${PORT}` (default 3000) — suitable for Render/Docker

**Service layer pattern:** Routes are thin; business logic lives in `backend/src/services/` (triage, cases, chat sessions, notifications).

## 1.4 API Flow (Typical Request)

1. User logs in via **Firebase Auth** (email/password) on frontend
2. Frontend axios interceptor attaches `Authorization: Bearer <Firebase ID token>`
3. Backend `authenticateUser` verifies token with Firebase Admin SDK
4. Authorization middleware checks **role** and **patient data access**
5. Route handler runs SQL via `query()` pool
6. JSON response consumed by dashboard components

**API base URL resolution** (`api.js`):
- Production: `VITE_API_URL` + optional `VITE_LOCK_API_URL=true` (locks to Render URL)
- Dev: dynamic `hostname:3000` for LAN testing

## 1.5 Authentication Flow

```
Register/Login (Firebase) → onAuthStateChanged
  → userAPI.getProfile() → PostgreSQL users row (firebase_uid link)
  → Role-based redirect (Villager / ASHA / Doctor dashboard)
```

- **Identity provider:** Firebase (not custom JWT issuance)
- **Backend trust:** Firebase Admin `verifyToken()` — effectively JWT validation
- **User record:** `users` table stores `firebase_uid`, `role`, `village_id`, profile fields
- **Registration:** `POST /api/users/register` after Firebase account creation

## 1.6 Role-Based Dashboard Structure

| Dashboard | Key features | Primary APIs |
|-----------|--------------|--------------|
| **Villager** | AI chatbot, health records, cases timeline, QR card, notifications | `chatbot`, `health`, `cases`, `documents`, `notifications`, `qr` |
| **ASHA** | AI-flagged queue, manual flagging, village records, medicine log, daily visits, QR scan → patient | `flag`, `health`, `medicine`, `visits`, `villages`, `qr` |
| **Doctor** | Escalated cases, consultations, prescriptions, insights, high-risk list | `doctor`, `flag`, `documents`, `prescriptions` |

Dashboards stay synchronized through **shared PostgreSQL entities**: `healthcare_cases`, `flagged_cases`, `notifications` — not real-time WebSockets; refresh/polling on navigation.

## 1.7 Deployment Architecture

| Component | Platform | Configuration |
|-----------|----------|---------------|
| **Frontend** | Vercel (static `dist/` from `npm run build`) | `VITE_API_URL=https://<render-backend>` , `VITE_LOCK_API_URL=true` |
| **Backend** | Render | `DATABASE_URL`, `FIREBASE_*`, `GROQ_API_KEY`, `NODE_ENV=production` |
| **Database** | Neon PostgreSQL | SSL enabled in production (`rejectUnauthorized: false`) |
| **Auth** | Firebase Console | Email/password; service account on backend |
| **AI** | Groq Cloud | `GROQ_API_KEY`, model `openai/gpt-oss-120b` (default, with `qwen/qwen3.8-27b` fallback) |
| **File storage** | Local disk on Render | `backend/uploads/` — served via authenticated download API |

**Note:** No `vercel.json` in repo; SPA routing requires host rewrite to `index.html` for deep links (`/doctor/*`, `/dashboard/*`).

---

# PART 2 — AI IMPLEMENTATION ANALYSIS

## 2.1 Design Philosophy: Assistant, Not Diagnostician

The system prompt (`HEALTH_TRIAGE_SYSTEM_PROMPT` in `groqTriageService.js`) explicitly states:

- **NOT a doctor** — no final diagnosis
- **No aggressive prescribing**
- Role: conversational triage, progression detection, **escalation routing**

**Why:** Legal/ethical safety, rural context (ASHA/doctor must validate), and reduced hallucination risk. The backend owns numeric risk scores and case creation — Groq only suggests deltas and natural language.

## 2.2 Groq Integration

| Item | Implementation |
|------|----------------|
| Client | OpenAI SDK pointed at `https://api.groq.com/openai/v1` (`groqClient.js`) |
| Model | `process.env.GROQ_MODEL` or `openai/gpt-oss-120b` (fallback: `qwen/qwen3.8-27b`) |
| Response format | `response_format: { type: 'json_object' }` |
| Temperature | `0.35` (consistent triage) |
| Fallback | `buildFallbackAnalysis()` if Groq fails |

**Unused in live chat path:** `groqChatService.js` (conversational-only), `geminiService.js` (legacy alternate).

## 2.3 Complete AI Message Flow

**Endpoint:** `POST /api/chatbot/message`

```
User message
    │
    ├─► detectSymptoms() — keyword/symptom extraction (severityEngine)
    ├─► accumulateSymptomsFromMessage() — session symptom memory
    ├─► addMessage(user) — persist to chat_messages
    ├─► getPatientHistoryContext() — prior records for prompt context
    │
    ├─► analyzeHealthTurn() — GROQ JSON triage
    │       Inputs: healthMemory, last 6 messages, user message, language, history
    │       Output: assistantResponse, severityDelta, trend, escalationSuggestion, summary, ...
    │
    ├─► finalizeTriageDecision() — BACKEND safety merge (triageSafetyService)
    │       Rule score + Groq delta + smoothing + red-flag overrides
    │
    ├─► buildEscalationRequest() — IF allowAutomation AND triage ≠ LOW
    │       → pending_escalation on session (consent gate)
    │
    ├─► addMessage(bot) + updateSession + chat_history legacy row
    │
    └─► JSON response to frontend (reply, risk_score, escalation_request, symptom_summary)
```

**Critical:** Escalation to ASHA/doctor does **NOT** happen on message alone. User must approve via `POST /api/chatbot/escalation-consent`.

## 2.4 Prompt Engineering (Current)

Groq returns **structured JSON only** with fields including:

- `assistantResponse` — patient-facing text (2–4 short paragraphs)
- `severityDelta` — signed integer **change** to prior score (NOT absolute score)
- `escalationSuggestion` — `SELF_CARE` | `ASHA_REVIEW` | `DOCTOR_ESCALATION`
- `trend` — stable / worsening / deteriorating / improving
- `summary` — one-line for health workers

**Language instruction:** For Hindi/Marathi session language, `assistantResponse` is written in that language unless user wrote in English.

## 2.5 Risk Scoring (Backend-Only)

**Rule engine** (`computeRiskScore` in `riskScoringService.js`) — examples:

| Signal | Points |
|--------|--------|
| Fever | +10 |
| Dehydration | +20 |
| Symptoms > 2 days | +20 |
| Weakness | +15 |
| Breathing difficulty | +50 |
| Chest pain | +50 |
| Emergency keywords (with clinical context) | +30 |

**Triage mapping:**
- Score **≥ 80** → `DOCTOR_ESCALATED`
- Score **≥ 30** → `ASHA_REVIEW`
- Else → `LOW`

**Groq delta:** Clamped to **[-15, +20]** and merged with rule score.

## 2.6 AI Stabilization Logic (Anti-False-Positive)

Implemented in `triageSafetyService.js` and `riskScoringService.js`:

1. **Casual message filter** (`shouldIgnoreForTriage`) — greetings, jokes, "prescribe me medicine", non-health → score 0, no automation
2. **Score jump smoothing** — base &lt; 30 cannot jump above 70 in one turn; base &lt; 10 capped at 40
3. **Mild symptom cap** — ≤2 symptoms, no progression → max score 45
4. **Qualifying escalation signal** (`hasEscalationQualifyingSignal`) — without it, score ≥ 30 is capped to 25 and route forced to `SELF_CARE`
5. **Chest pain / breathing** — floor score 85, doctor route
6. **24-hour duplicate suppression** — same patient + triage type won't create duplicate AI flags

## 2.7 Escalation Threshold Logic (Automation)

`runTriageAutomation` (`notificationService.js`) — **only after user consent:**

| Triage status | Minimum risk score | Actions |
|---------------|-------------------|---------|
| `ASHA_REVIEW` | ≥ 30 | Create `flagged_cases` (source `ai_triage`), `healthcare_cases` → `UNDER_MONITORING`, notify village ASHA workers |
| `DOCTOR_ESCALATED` | ≥ 80 | Create flag, case → `DOCTOR_ESCALATED`, notify all doctors + ASHA |
| `LOW` | — | No automation |

Also requires `hasStructuredClinicalSignal` (fever, cough, etc. in structured snapshot).

## 2.8 User Consent Workflow

1. Chat response may include `escalation_request` with `status: 'pending_user_consent'`
2. Stored in `chat_sessions.pending_escalation`
3. Frontend (`Chatbot.jsx`) shows: triage label, risk score, target (ASHA / doctor)
4. **Yes, forward** → `POST /escalation-consent` `{ consent: true }` → `runTriageAutomation`
5. **Not now** → clears pending; bot confirms no forwarding

**Viva answer:** Consent prevents unsolicited medical alerts and respects patient autonomy; AI suggests, human approves forwarding.

## 2.9 Healthcare Case Creation from AI

On consent approval:

1. `ensureHealthcareCase()` — reuse active case or create `NEW`
2. `INSERT flagged_cases` with `source = 'ai_triage'`, `case_id` link, `structured_symptoms` JSONB
3. `updateHealthcareCaseStatus` → `UNDER_MONITORING` or `DOCTOR_ESCALATED`
4. `addCaseTimelineEvent` — e.g. "AI escalated for ASHA monitoring"
5. `createNotification` for patient, ASHA workers (by village), and/or all doctors

## 2.10 Multilingual AI Responses

- Session language: `English` | `Hindi` | `Marathi` (API strings)
- Frontend maps UI `en`/`hi`/`mr` via `toApiLanguage()` / `fromApiLanguage()`
- `detectLanguageFromText()` can override per message (Devanagari detection)
- UI labels (buttons, consent panel) use react-i18next; bot text comes from Groq in session language

## 2.11 Frontend Chatbot UI

**Component:** `frontend/src/components/Chatbot.jsx`

- Variants: `default`, `assistant` (Villager dashboard — sidebar sessions + `SymptomSummaryPanel`)
- Session CRUD via `chatbotAPI`
- Displays: risk score, triage label, trend, escalation consent panel
- Requires `sessionId` before sending (user must start "New Chat")

---

# PART 3 — CASE MANAGEMENT WORKFLOW

## 3.1 Centralized Healthcare Case System

**Core table:** `healthcare_cases`

- One **active** case per patient at a time (statuses excluding `RESOLVED`)
- Links: `flagged_cases.case_id`, `health_records.case_id`, `prescriptions.case_id`, `medical_documents.case_id`, `medicine_logs.case_id`, `daily_visits.case_id`, `notifications.case_id`

**Service:** `caseWorkflowService.js`

## 3.2 Case Status Lifecycle

| Status | Meaning | Typical trigger |
|--------|---------|-----------------|
| **NEW** | Case created, not yet actively managed | First escalation or explicit create |
| **UNDER_MONITORING** | ASHA/community follow-up active | AI ASHA review, ASHA adds records |
| **DOCTOR_ESCALATED** | Requires doctor attention | AI doctor escalation, ASHA manual escalate, severe health record |
| **PRESCRIPTION_ADDED** | Doctor issued prescription linked to case | Doctor consultation flow |
| **FOLLOW_UP_PENDING** | Scheduled follow-up needed | Health record with follow-up date, symptom patterns |
| **RESOLVED** | Case closed | Doctor resolves flagged case |

**Status preservation rules:** Higher states are not downgraded accidentally (e.g. `DOCTOR_ESCALATED` won't revert to `NEW` from a weaker event).

**Legacy:** `FOLLOW_UP` migrated to `FOLLOW_UP_PENDING` on DB init.

## 3.3 Flagged Cases vs Healthcare Cases

| Entity | Purpose |
|--------|---------|
| `healthcare_cases` | Longitudinal patient episode — timeline, status, assignments |
| `flagged_cases` | Actionable queue item for ASHA/Doctor (manual or `ai_triage`) |

When doctor resolves: `flagged_cases.status = 'resolved'` and `healthcare_cases.status = 'RESOLVED'` (synced in workflow).

## 3.4 Record Linking (`caseId`)

`attachRecordToCaseIfMissing()`:

1. Use explicit `case_id` if provided and matches patient
2. Else attach to latest **active** case
3. Optional `createIfMissing: true` for flows that must create a case

Used by: health records, document uploads, prescriptions, medicine logs, visits.

## 3.5 Timeline / History

**Table:** `case_timeline` — events with `event_type`, `title`, `details`, `actor_user_id`, `metadata` JSONB

**Event types include:** `CASE_CREATED`, `STATUS_UPDATED`, `REPORT_UPLOADED`, `DOCTOR_CONSULTATION`, `ASHA_VISIT_RECORDED`, `MEDICINE_LOG_RECORDED`, `HEALTH_RECORD_ADDED`, `PRESCRIPTION_ADDED`

**API:** `GET /api/cases/:caseId/timeline` — shown in `CaseTimelineModal.jsx`

**Patient bundle:** `GET /api/history/:userId` — aggregates profile, records, visits, Rx, flags, documents, cases, chat sessions.

---

# PART 4 — ROLE-BASED WORKFLOW

## 4.1 Patient (Villager) Workflow

1. Register as Villager → linked to village (optional)
2. **AI Chatbot** — symptom conversation, optional escalation consent
3. **Health records** — view ASHA/doctor entries (read-only for villager)
4. **My Cases** — select case → prescriptions, documents, notes, timeline
5. **QR health card** — generate/download/share (`QRCard.jsx`, `qrAPI`)
6. **Notifications** — case created, ASHA follow-up, doctor escalation

## 4.2 ASHA Worker Workflow

1. Dashboard stats: AI flagged, active flagged, critical (doctor-escalated), unread notifications
2. **QR scan** (`ScanContext` + `QRScannerModal`) → resolve patient → `/patient/:id`
3. **AI-flagged queue** (`AshaFlaggedCasesPanel`) — review AI triage, add notes, escalate to doctor
4. **Manual flag** (`FlagCaseModal`) — reason + severity
5. **Village records** — add health records, medicine distribution, daily visits
6. **Patient search** — find villagers in assigned villages
7. **Document upload** — lab reports, etc. linked to `case_id`

**Village assignment:** `asha_villages` table links worker to villages; doctor can assign via `POST /api/villages/assign`

## 4.3 Doctor Workflow

**Router-level guard:** all `/api/doctor/*` require `Doctor` role

1. **Overview** — stats, quick links (`DoctorOverview.jsx`)
2. **Escalated cases** — AI + manual flags; resolve, notes, consultation, Rx; view documents (`DoctorEscalated.jsx`)
3. **Patients** — search, full profile (`DoctorPatients.jsx`, `PatientProfile.jsx`)
4. **Prescriptions** — add/list, PDF export (`DoctorPrescriptions.jsx`)
5. **Insights** — analytics, high-risk patients (`DoctorInsights.jsx`)
6. **Notifications** — filter `doctor_escalation` type

## 4.4 Notification Workflow

**Creation triggers:**
- AI escalation (after consent)
- Case status changes
- ASHA manual actions
- Doctor requests ASHA coordination

**Delivery:** Poll-based `GET /api/notifications/:userId`

**Access:** Villager (own), Doctor (own + can read patient-related), ASHA (own)

**Types:** `ai_flagged`, `doctor_escalation`, `case_created`, `asha_followup`, `system`

**UI:** Role-specific components (not the legacy `NotificationPanel.jsx`)

## 4.5 Cross-Role Case Movement

```
Villager reports symptoms (chatbot)
    → [consent] → flagged_cases + healthcare_cases (UNDER_MONITORING or DOCTOR_ESCALATED)
        → ASHA reviews, adds visit/records, may escalateToDoctor
            → Doctor consults, prescribes, resolves
                → RESOLVED + notifications to all parties
```

---

# PART 5 — MULTILINGUAL IMPLEMENTATION

## 5.1 react-i18next Setup

**File:** `frontend/src/i18n/index.js`

- Languages: `en`, `hi`, `mr`
- Namespace: `common` only
- Resources: `locales/{en,hi,mr}/common.js`
- Persistence: `localStorage` key `rha_language`
- Fallback: English

## 5.2 Translation Architecture

```
LanguageContext (useTranslation hook)
    → t('key') across components
translations.js → legacy translate() shim for non-hook call sites
i18nHealthcare.js → translateStatus, translateSeverity, detectLanguageFromText
```

## 5.3 UI vs Chatbot Language

| Layer | Mechanism |
|-------|-----------|
| **App UI** | `en` / `hi` / `mr` via LanguageContext |
| **Chatbot API** | `English` / `Hindi` / `Marathi` via `toApiLanguage()` |
| **Bot replies** | Groq writes in session language |
| **Notifications** | Stored in English in DB (display can use translation helpers where applied) |

## 5.4 Why Centralized Translations

- Single source of truth for 3 languages
- Easy viva explanation: rural users need Hindi/Marathi; healthcare terms centralized in `common.js`
- Separates UI strings from AI-generated clinical text (dynamic, per conversation)

---

# PART 6 — DATABASE & BACKEND FLOW

## 6.1 Major Tables

| Table | Purpose |
|-------|---------|
| `users` | firebase_uid, role, village_id, worker_id |
| `villages` | Village master data |
| `asha_villages` | ASHA ↔ village mapping |
| `healthcare_cases` | Central case entity |
| `case_timeline` | Audit trail per case |
| `health_records` | Vitals, symptoms, visit notes, case_id |
| `flagged_cases` | ASHA/doctor queue (manual + ai_triage) |
| `notifications` | User alerts with optional case_id |
| `prescriptions` | Doctor medicines, case_id |
| `medical_documents` | Uploaded files metadata, case_id |
| `medicine_logs` | ASHA medicine distribution |
| `daily_visits` | ASHA field visits |
| `qrcodes` | Patient QR tokens |
| `villager_profiles` | Extended health profile |
| `chat_sessions` | AI sessions, health_memory, pending_escalation |
| `chat_messages` | Per-session messages |
| `chat_history` | Legacy flat log |

## 6.2 Schema Initialization

- **No Flyway/Liquibase** — `initializeDatabase()` runs `CREATE TABLE IF NOT EXISTS` + `ALTER TABLE ADD COLUMN IF NOT EXISTS` on every server start
- Suitable for small teams; viva caveat: production should eventually use versioned migrations

## 6.3 API Routing Structure

All routes prefixed `/api/` — see Part 1 and exploration report for full endpoint list.

**Notable:** `GET /api/villages/` is **public** (unauthenticated village list).

## 6.4 Document Storage

- Physical files: `backend/uploads/{timestamp}_{random}.ext`
- Max 15 MB; PDF, JPEG, PNG, WEBP, GIF
- Download: `GET /api/documents/:docId/download` (auth + patient access check)

---

# PART 7 — SECURITY & VALIDATION

## 7.1 Authentication

| Layer | Mechanism |
|-------|-----------|
| Client | Firebase Auth session |
| Transport | HTTPS (production) |
| API | Bearer Firebase ID token |
| Backend | Firebase Admin `verifyToken` |

## 7.2 Authorization

- **`requireRole(['ASHA', 'Doctor'])`** — DB role lookup, ASHA Worker normalized to ASHA
- **`canAccessUserData`** — Villager: own data only; ASHA/Doctor: any patient
- **Doctor routes** — entire router protected at mount

## 7.3 Controlled Escalation

- AI cannot create cases without **user consent**
- Backend thresholds re-check score before automation
- Casual/non-clinical messages filtered before scoring

## 7.4 Validation Examples

- Chatbot: `sessionId` required, language enum, message non-empty
- Documents: MIME allowlist, size limit
- Registration: role validation, Firebase UID uniqueness

---

# PART 8 — PROJECT DESIGN DECISIONS

| Decision | Why |
|----------|-----|
| **Centralized `healthcare_cases`** | Single timeline for villager, ASHA, doctor; avoids fragmented records |
| **AI as assistant, not diagnosis** | Safety, regulatory fit, human-in-the-loop for rural care |
| **Multilingual (en/hi/mr)** | Target rural Maharashtra/India users |
| **ASHA workflow** | Reflects real public health model — community bridge between villager and doctor |
| **Separate doctor escalation** | Clear urgency path; doctor dashboard filters escalated queue |
| **Records linked to `case_id`** | Traceability for viva/demo: "show everything for this illness episode" |
| **Controlled notifications** | Prevents alert fatigue; tied to real case events |
| **Escalation stabilization** | Prevents joke/greeting messages from flooding ASHA/doctor |
| **Firebase Auth** | Fast, secure auth without custom password hashing |
| **Groq + JSON triage** | Low-latency inference; structured output for backend rules |
| **Render + Vercel split** | Free-tier friendly; static frontend CDN + long-running Node API |
| **Consent before automation** | Ethical design for health data sharing |

---

# PART 9 — FUTURE SCOPE (Realistic Enhancements)

| Enhancement | Benefit |
|-------------|---------|
| **Offline support** | Service workers + local queue for ASHA field areas with poor connectivity |
| **Voice interaction** | Speech-to-text in Hindi/Marathi for low-literacy users |
| **OCR report scanning** | Auto-extract lab values from uploaded PDFs/images |
| **Village-level analytics** | Heatmaps of fever outbreaks, medicine stock |
| **Cloud storage (S3)** | Scalable document storage vs Render ephemeral disk |
| **Appointment scheduling** | Doctor calendar + SMS reminders |
| **Advanced AI monitoring** | Longitudinal risk trends across sessions |
| **SMS/WhatsApp notifications** | Reach users without opening app |
| **Versioned DB migrations** | Safer production schema changes |
| **WebSocket notifications** | Real-time dashboard updates |

---

# PART 10 — VIVA QUESTION BANK WITH ANSWERS

## Architecture

**Q: Explain your 3-tier architecture.**  
A: React SPA (presentation) talks to Express REST API (business logic) and PostgreSQL (persistence). Firebase handles authentication; Groq is an external AI service called only from the backend.

**Q: Why separate frontend and backend deployments?**  
A: Vercel optimizes static React delivery globally; Render runs Node continuously for API, file uploads, and DB connections. Environment variables connect them via `VITE_API_URL`.

**Q: How do dashboards stay in sync?**  
A: Shared database entities (`healthcare_cases`, `flagged_cases`, `notifications`). Each role reads/writes the same case rows; updates appear on next API fetch/navigation.

## AI

**Q: Which AI model do you use?**  
A: Groq-hosted open LLM (`openai/gpt-oss-120b`, with `qwen/qwen3.8-27b` fallback) via OpenAI-compatible API, returning JSON triage analysis per message.

**Q: Does AI directly create doctor cases?**  
A: No. AI proposes escalation; `pending_escalation` requires user consent; `runTriageAutomation` creates DB records only after approval.

**Q: How do you prevent casual messages from escalating?**  
A: `shouldIgnoreForTriage` filters greetings/jokes; `hasEscalationQualifyingSignal` required; score smoothing; minimum thresholds (30 for ASHA, 80 for doctor).

**Q: Why doesn't Groq output the risk score?**  
A: Backend `computeRiskScore` provides auditable, deterministic scoring. Groq only suggests `severityDelta` to adjust contextually.

**Q: Why assistant instead of diagnosis?**  
A: Legal/ethical safety; ASHA and doctors validate; reduces dangerous hallucinated prescriptions.

## Database

**Q: How is schema managed?**  
A: `initializeDatabase()` on server startup creates/alters tables. Demo seed via `npm run seed:demo`.

**Q: Relationship between flagged_cases and healthcare_cases?**  
A: `flagged_cases.case_id` → `healthcare_cases.id`. Flag is queue item; case is longitudinal episode with timeline.

## Security

**Q: Is it JWT?**  
A: Firebase ID tokens (JWT format) verified by Firebase Admin on each request — not custom server-issued JWT.

**Q: Can a villager see another villager's records?**  
A: No. `canAccessUserData` restricts villagers to their own `userId`.

## Multilingual

**Q: How many languages?**  
A: English, Hindi, Marathi — UI via i18next; chatbot via API language parameter and Groq prompt instructions.

## Deployment

**Q: What environment variables are critical?**  
A: Backend: `DATABASE_URL`, `FIREBASE_*`, `GROQ_API_KEY`. Frontend: `VITE_FIREBASE_*`, `VITE_API_URL`, `VITE_LOCK_API_URL=true` in production.

**Q: Where are files stored?**  
A: `backend/uploads/` on the Render instance; metadata in `medical_documents`; download through authenticated API.

## Implementation

**Q: What happens when ASHA scans a QR code?**  
A: `POST /api/qr/resolve` decodes patient ID → navigate to `/patient/:patientId` for records and actions.

**Q: Explain case status UNDER_MONITORING vs DOCTOR_ESCALATED.**  
A: UNDER_MONITORING = ASHA-led follow-up after moderate AI triage; DOCTOR_ESCALATED = high-risk path requiring physician review (score ≥ 80 or red-flag symptoms).

**Q: What is the risk score range?**  
A: 0–100, computed by backend rules + bounded Groq delta, mapped to LOW / ASHA_REVIEW / DOCTOR_ESCALATED.

---

# QUICK REFERENCE — KEY FILES

| Area | Path |
|------|------|
| Server entry | `backend/src/server.js` |
| DB schema | `backend/src/config/database.js` |
| Chatbot route | `backend/src/routes/chatbot.js` |
| Groq triage | `backend/src/services/groqTriageService.js` |
| Safety layer | `backend/src/services/triageSafetyService.js` |
| Risk scoring | `backend/src/services/riskScoringService.js` |
| Automation | `backend/src/services/notificationService.js` |
| Case workflow | `backend/src/services/caseWorkflowService.js` |
| Auth middleware | `backend/src/middleware/auth.js`, `authorization.js` |
| Frontend routes | `frontend/src/App.jsx` |
| API client | `frontend/src/services/api.js` |
| Chatbot UI | `frontend/src/components/Chatbot.jsx` |
| i18n | `frontend/src/i18n/index.js` |

---

# PRESENTATION TIPS (2-MINUTE PITCH)

1. **Problem:** Rural patients lack quick access to triage; ASHA/doctors need coordinated case visibility.  
2. **Solution:** Multilingual AI chatbot + role dashboards + centralized cases.  
3. **Differentiator:** Consent-gated escalation, backend-stabilized risk scoring, ASHA–doctor workflow.  
4. **Demo flow:** Villager chats → moderate risk → consent → ASHA sees flag → doctor escalates → resolve case.  
5. **Tech:** React, Node, PostgreSQL, Firebase, Groq, Vercel, Render.

---

*Document generated from codebase analysis. Reflects implementation as of project state in repository — use alongside live demo rehearsal.*
