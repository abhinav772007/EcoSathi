# EcoSathi

Voice-first waste reporting and collection intelligence for a campus pilot.

- **Frontend:** Vite + React, Recharts, Lucide Icons, Web Speech API
- **Backend:** FastAPI (validation, auth, report lifecycle, workflows, routing, analytics)
- **Database:** Supabase Postgres + Supabase Auth
- **Voice:** ElevenLabs Agent webhook tools with intelligent browser voice fallback & synthesis
- **Workflow model:** Durable `workflow_runs` records for triage and route generation, ready to mirror in Render Workflows

## What is implemented

- **Interactive Role Architecture:** Full role-based user experiences for **Administrator**, **Collection Worker**, and **Resident / Student**, with a 1-click **Role Switcher** in the topbar and quick demo sign-in buttons.
- **Team & Role Management:** Dedicated administrative page (`/team`) to configure personnel roles, promote/demote members, and view operational focus areas.
- **Disposal & Segregation Guide:** Public campus guidance (`/guidance`) detailing accepted/forbidden items, bin color coding (Green, Blue, Orange, Yellow/Red), drop-off points, and clean separation rules.
- **Voice or Text Reporting:** Natural speech recognition with NLP draft extraction, campus location auto-matching, and spoken audio confirmation.
- **Configured Locations & Bins:** Campus collection registry with coordinate projection on the interactive campus route map.
- **Report Lifecycle:** Transparent transitions (`Submitted` → `Needs review` / `Verified` → `Assigned` → `In Progress` → `Resolved` / `Rejected`) with full audit logs.
- **Duplicate Consolidation:** Spatio-temporal matching with human review; originals are preserved.
- **Priority Collection Routing:** Priority-weighted nearest-neighbour collection stop sequencing compared against a fixed chronological baseline.
- **Worker Stop Execution:** Mobile-ready stop checklist with real-time status actions (`In Progress`, `Completed` with measured weight in kg, `Skipped`).
- **Impact Analytics:** Measurable resolution rate, median turnaround time, route distance saved, completed collections, and recovered material breakdown.
- **Data Export:** CSV export for reports and JSON export for impact analytics.

---

## Roles & Access Control

| Role | Operational Scope | Accessible Views |
|------|-------------------|------------------|
| 👑 **Administrator** | Full queue triage, duplicate review, collection plan generation, workflow execution auditing, and campus personnel role configuration. | Overview, Reports, Collection Route, Impact, Duplicates, Workflows, Team & Roles, Locations, Disposal Guide |
| 🚛 **Collection Worker** | Route stop execution, real-time stop progress (`In Progress`, `Completed`), measured waste weight logging (kg), and field notes. | Overview, Reports, Collection Route, Impact, Duplicates, Workflows, Locations, Disposal Guide |
| 👤 **Resident / Student** | Frictionless voice/text reporting, real-time report status lookup by ID, and campus waste stream disposal guidelines. | Overview, Reports, Locations, Disposal Guide |

> **Role Switcher Tip:** Use the role badge dropdown in the Topbar to instantly switch between Administrator, Collection Worker, and Resident perspectives with one click.

---

## 1. Quick Start (Frontend Standalone / Demo Mode)

EcoSathi includes full mock data and fallback engines. You can run the complete frontend immediately:

```bash
npm install
npm run dev
```

Open **http://localhost:5173** in your browser.
- Click any of the **Quick 1-Click Demo** buttons on the sign-in page to enter as an Administrator, Worker, or Resident.
- Use the **Role Switcher** in the header to switch perspectives on the fly.

---

## 2. Running with Backend & Database

### Backend Setup:

1. Configure `.env` / `.env.local` with your Supabase credentials:
   - `VITE_SUPABASE_URL` and `SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY` and `SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `DATABASE_URL` (for database migrations)

2. Activate virtual environment & install requirements:
   ```bash
   source .venv/bin/activate   # or .\.venv\Scripts\Activate.ps1 on Windows
   pip install -r requirements.txt
   ```

3. Run migrations and demo seeds:
   ```bash
   python -m server.setup_db
   python -m server.seed
   ```

4. Run all services:
   ```bash
   npm run dev:all
   ```

- Web App: http://localhost:5173
- Backend API: http://localhost:3001
- API Docs: http://localhost:3001/docs
