# Deploying Aria

Two services + a managed DB:

- **Frontend** (Next.js) → **Vercel**
- **Backend** (FastAPI) → **Railway** (Dockerfile)
- **Database** → **Supabase** (already hosted)

Deploy the backend first so you have its URL for the frontend's env.

---

## 1. Backend → Railway

1. railway.app → **New Project** → **Deploy from GitHub repo** → pick `Aria-miami`.
2. In the service **Settings**:
   - **Root Directory:** `aria/apps/api`
   - Build is automatic — it uses `aria/apps/api/Dockerfile`.
3. **Variables** — add:
   ```
   ANTHROPIC_API_KEY=sk-ant-...
   SUPABASE_URL=https://vsykrzfyvhnrwjyleywl.supabase.co
   SUPABASE_SERVICE_ROLE_KEY=eyJ... (service_role)
   GEMINI_API_KEY=AIza...           # optional, only for scripts
   GOOGLE_MAPS_API_KEY=AIza...      # optional, only for scripts
   ```
4. **Settings → Networking → Generate Domain.** Copy the URL
   (e.g. `https://aria-api-production.up.railway.app`).
5. Confirm `GET /health` on that URL returns `{"ok": true}`.

CORS already allows any `*.vercel.app` origin. To lock it to your exact
domain later, set `ALLOWED_ORIGINS=https://your-app.vercel.app` on Railway.

## 2. Frontend → Vercel

1. vercel.com → **Add New… → Project** → import `Aria-miami`.
2. **Root Directory:** `aria/apps/web` (framework auto-detected as Next.js).
3. **Environment Variables:**
   ```
   NEXT_PUBLIC_API_URL=<the Railway URL from step 1.4>
   NEXT_PUBLIC_MAPBOX_TOKEN=pk.eyJ...
   NEXT_PUBLIC_SUPABASE_URL=https://vsykrzfyvhnrwjyleywl.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ... (anon public)
   ```
4. **Deploy.**

## 3. Smoke test the public URL

- `/` — landing page (globe hero)
- `/dashboard` — 3D Miami map, one pulsing marker → click → **VIEW BUILDING**
- `/building/{id}` — click **RUN PRE-PLAN AGENT** → cached replay streams the
  agent log and the report fades in.

If the agent log stays empty, `NEXT_PUBLIC_API_URL` is wrong or the cache is
cold (re-run `scripts/prewarm_cache.py` against the deployed building).
