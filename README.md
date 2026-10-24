# EcoSathi

Voice-first waste reporting and collection intelligence for a campus pilot.

- **Frontend:** Vite + React, Recharts, Lucide
- **Backend:** FastAPI (validation, auth, report lifecycle, workflows, routing, analytics)
- **Database:** Supabase Postgres + Supabase Auth
- **Voice:** ElevenLabs Agent webhook tools, with a browser Speech API fallback
- **Workflow model:** durable `workflow_runs` records for triage and route generation, ready to mirror in Render Workflows

## What is implemented

- Voice or text report creation with a draft that must be confirmed
- Configured campus locations and bins
- Report status lifecycle with role-based transitions and audit events
- Duplicate detection (same location + category within 24 hours) and human review; originals are preserved
- Priority-aware nearest-neighbour route planning from a campus depot with a reproducible FIFO baseline
- Worker stop actions: start, complete with measured weight, skip
- Impact analytics: resolution rate, median resolution, route distance saved, completed stops, measured waste, duplicate and workflow metrics
- Duplicates, Workflows, Locations, Reports, Route, and Impact pages with role-aware navigation
- CSV export for reports and JSON export for analytics

Seeded data is clearly demonstration data. Do not present simulated route or waste metrics as verified campus impact.

## 1. Supabase project + database

1. Create a project at [supabase.com](https://supabase.com).
2. Open **SQL Editor**, paste and run [`supabase/schema.sql`](./supabase/schema.sql).
3. Open **Project Settings > API** and copy:
   - **Project URL** → `VITE_SUPABASE_URL` and `SUPABASE_URL` (must start with `https://`, never a `postgresql://` string)
   - **anon / publishable** key → `VITE_SUPABASE_ANON_KEY`
   - **service_role / secret** key → `SUPABASE_SERVICE_ROLE_KEY`
4. In **Authentication > URL Configuration**, add `http://localhost:5173` to Site URL / Redirect URLs.
5. For local demos, disable **Confirm email** under Authentication > Providers > Email (optional).

The schema is idempotent. Re-running it adds new columns (`workflow_runs.payload`, route comparison fields, stop weights, audit notes) and additional demo locations/bins without dropping data.

## 2. Environment files

```powershell
cd sociothon-26
copy .env.example .env.local
```

Fill the Supabase keys. Keep `VITE_API_URL=http://localhost:3001` and `CLIENT_ORIGIN=http://localhost:5173`.

Optional voice settings:

```dotenv
ELEVENLABS_API_KEY=...
ELEVENLABS_VOICE_ID=...
ELEVENLABS_WEBHOOK_SECRET=long-random-shared-secret
VOICE_AGENT_USER_ID=optional-profile-uuid
CAMPUS_DEPOT_LAT=29.8645
CAMPUS_DEPOT_LNG=77.8960
```

Browser voice capture works without ElevenLabs. ElevenLabs speech synthesis and agent webhook calls need the keys above.

## 3. Install dependencies (Windows PowerShell)

```powershell
cd sociothon-26
npm install
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
```

macOS / Linux:

```bash
cd sociothon-26
npm install
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

Use `supabase>=2.18.0` so new `sb_secret_` / `sb_publishable_` API keys work.

## 4. Create tables + seed

```powershell
npm run db:setup
npm run db:seed
```

Or:

```powershell
python -m server.setup_db
python -m server.seed
```

Default login: `demo@ecosathi.local` / `EcoSathiDemo123!` (administrator).

`DATABASE_URL` is required for `db:setup`. Get it from Supabase → Project Settings → Database → URI. If the password contains `@`, encode it as `%40`.

## 5. Run frontend + backend

```powershell
npm run dev:all
```

After changing `.env` / `.env.local`, stop the process (Ctrl+C) and start `npm run dev:all` again.

- App: http://localhost:5173
- API: http://localhost:3001
- Docs: http://localhost:3001/docs

Or separately:

```powershell
npm run server
npm run dev
```

## Auth roles

| Role | Access |
|------|--------|
| `resident` | Own reports and all configured locations |
| `worker` | All reports, start/complete stops, collection route, analytics, duplicates (read-only) |
| `administrator` | Everything, including duplicate review, workflow/audit visibility, locations, and all status transitions |

New signups get a `resident` profile automatically. The seed user is an `administrator` so Route / Impact analytics work out of the box.

## ElevenLabs agent tools

Two protected webhook tools map to the backend:

| Tool | Method and path | Purpose |
|------|-----------------|---------|
| `create_waste_report` | `POST /api/webhooks/elevenlabs/create_waste_report` | Create a confirmed report and return the genuine report ID |
| `get_report_status` | `GET /api/webhooks/elevenlabs/get_report_status/{code}` | Return the current status and last update time |

Set the request header `X-EcoSathi-Secret` to `ELEVENLABS_WEBHOOK_SECRET`, or use a Supabase bearer token. The agent must ask for location, category, severity, and explicit confirmation before calling `create_waste_report`. Optional `resident_id` attributes the report to that profile; otherwise `VOICE_AGENT_USER_ID` (or the first administrator) is used.

`POST /api/voice/interpret` is the browser fallback that turns a transcript into an editable draft. `POST /api/voice/synthesize` returns ElevenLabs audio for confirmation messages.

## Workflow model

The API writes each triage or route request to `workflow_runs` before processing and records success/failure, algorithm version, timings, and payload. The Workflows page surfaces these runs. The same tasks can be moved into Render Workflows without changing the report or plan tables:

1. Validate report
2. Find likely duplicates
3. Calculate priority
4. Generate route
5. Persist plan

## API routes

- `GET /api/health`
- `GET /api/me` · `POST /api/auth/register` · `POST /api/auth/login`
- `GET /api/reports` · `POST /api/reports` · `GET|PATCH /api/reports/:code`
- `GET /api/reports/:code/timeline`
- `GET /api/locations` · `POST /api/locations` (administrator)
- `GET /api/bins`
- `GET /api/collection-plans` · `GET /api/collection-plans/:id` · `POST /api/collection-plans/generate`
- `PATCH /api/collection-stops/:id`
- `GET /api/analytics/summary`
- `GET /api/duplicates` · `POST /api/duplicates/:link_id/review`
- `GET /api/workflows` · `GET /api/audit-events` (administrator)
- `POST /api/voice/interpret` · `POST /api/voice/synthesize`

## Notes

- Do not put the Postgres pooler URL in `SUPABASE_URL`. The Python Supabase client needs the HTTPS API URL.
- `.env` / `.env.local` are gitignored — never commit secrets.
- Route distances are straight-line haversine approximations. Distance saved is not fuel or emissions saved.
- Waste recovery is only reported when a worker logs a measured weight. The seeded report mix is demonstration data.
