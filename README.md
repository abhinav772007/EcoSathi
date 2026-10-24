# EcoSathi

Vite + React frontend, FastAPI backend, Supabase Auth + Postgres.

## 1. Supabase project + database

1. Create a project at [supabase.com](https://supabase.com).
2. Open **SQL Editor**, paste and run [`supabase/schema.sql`](./supabase/schema.sql).
3. Open **Project Settings > API** and copy:
   - **Project URL** → `VITE_SUPABASE_URL` and `SUPABASE_URL` (must start with `https://`, never a `postgresql://` string)
   - **anon / publishable** key → `VITE_SUPABASE_ANON_KEY`
   - **service_role / secret** key → `SUPABASE_SERVICE_ROLE_KEY`
4. In **Authentication > URL Configuration**, add `http://localhost:5173` to Site URL / Redirect URLs.
5. For local demos, disable **Confirm email** under Authentication > Providers > Email (optional).

## 2. Environment files

```powershell
cd sociothon-26
copy .env.example .env.local
```

Edit `.env.local` and fill the keys from step 1. Keep `VITE_API_URL=http://localhost:3001` and `CLIENT_ORIGIN=http://localhost:5173`.

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
| `resident` | Own reports, locations |
| `worker` / `administrator` | All reports, routes, analytics, duplicates |

New signups get a `resident` profile automatically. The seed user is an `administrator` so Route / Impact analytics work out of the box.

## API routes

- `GET /api/health`
- `GET /api/me`
- `GET /api/reports` · `POST /api/reports` · `GET|PATCH /api/reports/:code`
- `GET /api/locations`
- `GET /api/collection-plans` · `POST /api/collection-plans/generate`
- `GET /api/analytics/summary`
- `GET /api/duplicates` · `POST /api/duplicates/:link_id/review`
- `GET /api/workflows`
- `POST /api/voice/synthesize` (needs ElevenLabs keys)

## Notes

- Do not put the Postgres pooler URL in `SUPABASE_URL`. The Python Supabase client needs the HTTPS API URL.
- `.env` / `.env.local` are gitignored — never commit secrets.
- ElevenLabs is optional; voice synthesis returns 503 until those keys are set.
