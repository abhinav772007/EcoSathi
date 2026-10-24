# EcoSathi

## Local setup

1. Create a Supabase project and copy its URL, anon key, and service-role key.
2. In Supabase SQL Editor, run [`supabase/schema.sql`](./supabase/schema.sql).
3. Copy [`.env.example`](./.env.example) to `.env.local` and fill in the values below.
4. Install and start both applications:

```bash
npm install
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
npm run dev:all
```

Open `http://localhost:5173`. The FastAPI service runs at `http://localhost:3001` and exposes interactive docs at `http://localhost:3001/docs`.

### Connection strings and keys

Do not commit real credentials. Supabase provides the following in **Project Settings > API**:

```env
VITE_SUPABASE_URL=https://<project-ref>.supabase.co
VITE_SUPABASE_ANON_KEY=<publishable-anon-key>
SUPABASE_URL=https://<project-ref>.supabase.co
SUPABASE_SERVICE_ROLE_KEY=<secret-service-role-key>
```

The Supabase database connection string is in **Project Settings > Database > Connection string**:

```text
postgresql://postgres.<project-ref>:[YOUR-PASSWORD]@aws-0-<region>.pooler.supabase.com:6543/postgres
```

Use the pooler string only for server-side migrations or workers, never in browser code. ElevenLabs values are available in the ElevenLabs dashboard under **Developers > API keys** and **Voices**:

```env
ELEVENLABS_API_KEY=<secret-api-key>
ELEVENLABS_VOICE_ID=<voice-id>
```

The browser calls the API through `VITE_API_URL`; the API calls ElevenLabs so its secret remains private. The `POST /api/voice/synthesize` endpoint returns MP3 audio.

### Seed demo data

After running the Supabase schema and installing the Python dependencies, seed a demo account and five reports:

```bash
python3 -m server.seed
```

The default test credentials are `demo@ecosathi.local` / `EcoSathiDemo123!`. Override them with `SEED_USER_EMAIL` and `SEED_USER_PASSWORD` in `.env.local`. The seed is safe to run repeatedly: report codes are upserted and the demo user is reused.

### Auth configuration

In Supabase **Authentication > URL Configuration**, add `http://localhost:5173` to the site URL / redirect allow list. Email confirmation can be disabled for local development or left enabled for production.

Available API routes:

- `GET /api/health`
- `GET /api/reports`
- `POST /api/reports`
- `GET /api/reports/:code`
- `PATCH /api/reports/:code` and `/api/reports/:code/status`
- `GET /api/locations`
- `POST /api/webhooks/elevenlabs/create_waste_report`
- `GET /api/webhooks/elevenlabs/get_report_status/:code`
- `GET /api/duplicates`
- `POST /api/duplicates/:link_id/review`
- `GET /api/collection-plans`
- `POST /api/collection-plans/generate`
- `PATCH /api/collection-stops/:stop_id`
- `GET /api/workflows`
- `GET /api/analytics/summary`
- `POST /api/voice/synthesize`