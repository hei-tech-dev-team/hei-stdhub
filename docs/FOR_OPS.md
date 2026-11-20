# Operations — FOR_OPS

## Deployment Architecture

```
Frontend (Vercel) ─── HTTPS ───→ Backend (Render)
      │                                │
      │ /api/auth/* via Vercel proxy    │
      └────────────────────────────────┘
                                        │
                                   PostgreSQL (Supabase, migrating to Neon — #144)
                                        │
                                   Cloudinary (file storage)
```

- **Frontend**: Vercel, SPA rewrite all routes to `/index.html`
- **Auth proxy**: Vercel function `frontend/api/auth/[...path].js`, same-origin `/api/auth/*` → Render
- **Backend**: Render (free tier sleeps after inactivity, keep-alive ping via start.sh)
- **Database**: Supabase PostgreSQL (Neon migration tracked in #144)
- **File Storage**: Cloudinary (avatars, chat files)
- **Push Notifications**: Web Push API (VAPID keys from the host environment in production — see `SECRET_ROTATION.md`)

The refresh cookie is host-only and scoped to `/api/auth`, so it is only sent to
the Vercel proxy. Business API calls and Socket.IO go directly to Render with
`Authorization: Bearer <access token>`. See `DOC_SESSIONS_GUIDE.md` for the full
session model.

---

## Environment Variables

> **Production:** secrets live in **Render → Environment** (runtime) and in
> **GitHub → Settings → Environments → Production** (CI/CD), never in a file.
> Rotation procedure: [`SECRET_ROTATION.md`](./SECRET_ROTATION.md).

### Backend (repository-root `.env`, loaded by `server.js`)

`backend/server.js` loads `../.env`. There is no `backend/.env` in the repo.

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `PORT` | No | `3001` | Server port |
| `DATABASE_URL` | **Yes** | — | PostgreSQL connection string |
| `JWT_SECRET` | **Yes** | — | JWT signing secret (strong random string) |
| `JWT_ISSUER` | No | `hei-stdhub-api` | Expected `iss` claim |
| `JWT_AUDIENCE` | No | `hei-stdhub-web` | Expected `aud` claim |
| `ACCESS_TOKEN_TTL_SECONDS` | No | `900` | Access token lifetime (15 minutes) |
| `REFRESH_TOKEN_TTL_DAYS` | No | `30` | Absolute refresh-session lifetime |
| `REFRESH_REUSE_GRACE_SECONDS` | No | `15` | Multi-tab rotation grace window |
| `AUTH_CACHE_TTL_MS` | No | `15000` | Per-session user cache; `0` in tests |
| `MAX_SESSIONS_PER_USER` | No | `20` | Active sessions per user; `1000` in tests |
| `SESSION_RETENTION_DAYS` | No | `30` | Retention after expiry/revocation |
| `AUTH_PROXY_SECRET` | With proxy | — | Shared secret so Render trusts `X-Forwarded-For` from the Vercel proxy |
| `CLIENT_URL` | **Yes** | — | Frontend URL for CORS |
| `NODE_ENV` | No | — | Set to `production` for prod |
| `BACKEND_URL` | No | — | Self-ping URL for Render keep-alive |
| `VAPID_PUBLIC_KEY` | Production | auto-generated (dev only) | Required when `NODE_ENV=production` — the server exits without it. Generate once with `npx web-push generate-vapid-keys` |
| `VAPID_PRIVATE_KEY` | Production | auto-generated (dev only) | Required when `NODE_ENV=production` |
| `CLOUDINARY_CLOUD_NAME` | No | — | Cloudinary cloud name |
| `CLOUDINARY_API_KEY` | No | — | Cloudinary API key |
| `CLOUDINARY_API_SECRET` | No | — | Cloudinary API secret |
| `DB_POOL_MAX` | No | `25` | Max PostgreSQL connections in pool |
| `DB_IDLE_TIMEOUT` | No | `30000` | Close idle connections after ms |
| `DB_CONNECT_TIMEOUT` | No | `5000` | Connection timeout in ms |
| `REQUEST_TIMEOUT` | No | `30000` | HTTP request timeout in ms |
| `PUSH_CONCURRENCY` | No | `10` | Parallel push notifications per batch |
| `MAX_ONLINE_USERS` | No | `5000` | Max concurrent online users tracked |
| `SOCKET_PING_TIMEOUT` | No | `20000` | Socket.IO ping timeout (ms) |
| `SOCKET_PING_INTERVAL` | No | `25000` | Socket.IO ping interval (ms) |
| `SOCKET_MAX_BUFFER` | No | `1048576` | Max socket message size (bytes) |
| `SOCKET_DEFLATE_THRESHOLD` | No | `1024` | Min message size for compression (bytes) |

### Frontend (no committed `.env`)

The frontend only needs `VITE_API_URL`. It falls back to
`http://localhost:3001`; production sets it in the Vercel project settings.
For a local override, use `frontend/.env.local` (ignored by git).

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `VITE_API_URL` | No | `http://localhost:3001` | Backend API and Socket.IO URL |
| `VITE_AUTH_API_URL` | No | same-origin `/api/auth` in production | Optional auth base URL; development defaults to the local API |

### Vercel (auth proxy)

| Variable | Required | Description |
|----------|----------|-------------|
| `API_URL` | **Yes** | Render backend URL, without `/api` |
| `AUTH_PROXY_SECRET` | Recommended | Must match the Render value; lets the backend trust the forwarded client IP |
| `VITE_API_URL` | **Yes** | Render URL used by the frontend for API and Socket.IO |
| `VITE_AUTH_API_URL` | No | Leave empty to use the same-origin proxy |

---

## Setup Guide

> ⚠️ **Never run `backend/db/seed.dev.sql` against production, and never run
> `backend/db/schema.sql` against a database that holds data.**
> `schema.sql` starts with `DROP TABLE ... CASCADE` (full data loss) and `seed.dev.sql`
> creates well-known accounts with the password `password`, including the hidden
> `DEV001` developer superuser. An existing production database is only evolved with
> the migrations in `database/`, and the first admin account is created by hand with
> a strong, unique password.

### 1. Database

```bash
# Create a PostgreSQL database (local or Supabase)
# Fresh, EMPTY database only — schema.sql drops every table first:
psql "$DATABASE_URL" -f backend/db/schema.sql
# Local/CI only (never production) — test accounts with password "password":
# psql "$DATABASE_URL" -f backend/db/seed.dev.sql

# Apply migrations in order:
psql "$DATABASE_URL" -f database/migration_invitations.sql
psql "$DATABASE_URL" -f database/migration_first_login.sql
psql "$DATABASE_URL" -f database/migration_student_email_suffix.sql
psql "$DATABASE_URL" -f database/migration_multi_use_invitations.sql
psql "$DATABASE_URL" -f database/migration_alumni_support.sql
psql "$DATABASE_URL" -f database/migration_chat_seen_pseudo_unique.sql
psql "$DATABASE_URL" -f database/migration_scale_500.sql
psql "$DATABASE_URL" -f database/migration_token_version.sql
psql "$DATABASE_URL" -f database/migration_sessions.sql
psql "$DATABASE_URL" -f database/migration_chat_emoji_transfer_answer.sql
psql "$DATABASE_URL" -f database/migration_groupe_column.sql
psql "$DATABASE_URL" -f database/migration_admin_audit_log.sql
psql "$DATABASE_URL" -f database/migration_developer_role.sql
psql "$DATABASE_URL" -f database/migration_refactor_td_exams.sql
psql "$DATABASE_URL" -f database/migration_remove_alumni.sql
psql "$DATABASE_URL" -f database/migration_remove_levels.sql
psql "$DATABASE_URL" -f database/migration_remove_groupe.sql
```

### 2. Backend

```bash
cp .env.example .env  # from the repository root: server.js loads ../.env
cd backend
npm install
npm run dev           # Development with nodemon
# OR
npm start             # Production (via start.sh)
```

### 3. Frontend

```bash
cd frontend
# Optional local override: cp .env.example .env.local
npm install
npm run dev           # Development on port 5173
# OR
npm run build         # Production build → dist/
```

### 4. Vercel Deployment (Frontend)

```bash
cd frontend
npm run build
# Deploy dist/ to Vercel (auto-deploys from git)
# vercel.json handles SPA rewrites
```

Set **Root Directory** to `frontend` in the Vercel project settings. This is
required for the `api/auth/[...path].js` serverless function to be discovered.
Set `API_URL`, `AUTH_PROXY_SECRET` and `VITE_API_URL` in the Vercel dashboard.
The `/api/auth/*` function proxies to Render and keeps the refresh cookie
first-party; API and Socket.IO calls still go directly to Render.

### 5. Render Deployment (Backend)

```bash
# Deploy from git. Set all env vars in Render dashboard.
# Build command: npm install
# Start command: npm start
# Health check: /api/health
# start.sh handles keep-alive ping
```

---

## Runbook

### Start / Stop

```bash
# Backend
cd backend && npm start          # Start (via start.sh)
pkill -f "node server.js"       # Stop

# Frontend (dev)
cd frontend && npm run dev       # Start on :5173
```

### Restart

```bash
pkill -f "node server.js" && cd backend && npm start
```

### Health Check

```bash
curl https://your-backend.com/api/health
# Expected: { "status": "ok", "time": "..." }
```

### Logs

```bash
# Backend stdout/stderr
cd backend && npm start 2>&1

# PostgreSQL logs
# Check your Supabase dashboard or local PostgreSQL logs
```

### Keep-Alive

`start.sh` runs a keep-alive loop that pings the backend every 14 minutes:
```bash
while true; do
  curl -s $BACKEND_URL/api/health > /dev/null 2>&1
  sleep 840  # 14 minutes
done
```

Ensure `BACKEND_URL` env var is set.

---

## Monitoring

| Signal | How | Threshold |
|--------|-----|-----------|
| Health check | `GET /api/health` | Must return 200 |
| Response time | APM / logs | < 1s |
| Database connections | `pg` pool | < 80% of max |
| Disk space | `uploads/` directory | < 80% full |
| SSL cert expiry | Monitor | > 30 days |

### Key Metrics
- **Login failures**: Check `401` rate on `/api/auth/login`
- **Rate limiting**: `429` responses = too many attempts
- **Push notification failures**: `410`/`404` errors (auto-cleaned from DB)

---

## Backup & Recovery

### Database

```bash
# Backup
pg_dump "$DATABASE_URL" > backup_$(date +%Y%m%d).sql

# Restore
psql "$DATABASE_URL" < backup_20250101.sql
```

### File Storage
- **Cloudinary**: Assets stored in Cloudinary folders. No local backup needed.
- **Local uploads**: `backend/uploads/` — include in periodic backups if needed.

---

## Version Bumping

```bash
# Run from root
npm run release:patch   # 1.9.0 → 1.9.1
npm run release:minor   # 1.9.0 → 1.10.0
npm run release:major   # 1.9.0 → 2.0.0
```

Updates both `backend/package.json` and `frontend/package.json` simultaneously.

---

## Secret Rotation

Every credential that was ever committed is listed in
[`SECRET_ROTATION.md`](./SECRET_ROTATION.md), with the provider steps and the
verification checklist. Rotate **before** purging git history (#130): rotation
protects users, history purging only removes copies.

The backend refuses to start with `NODE_ENV=production` while a known leaked
value is still configured. If it logs `Refusing to start`, a variable in Render
still has its old value — rotate it, do not bypass the guard.

---

## Security Checklist

- [ ] `JWT_SECRET` is a strong random value of at least 32 bytes, stored in Render
- [ ] `DATABASE_URL` uses SSL (required by Supabase/Neon)
- [ ] CORS `origin` is restricted in production
- [ ] Rate limiting enabled on auth routes
- [ ] Passwords are bcrypt hashed (salt rounds: 10)
- [ ] SQL uses parameterized queries (`$1`, `$2`)
- [ ] XSS: chat messages sanitized client-side with DOMPurify
- [ ] Access token expires in 15 minutes and is kept in memory
- [ ] Refresh cookie is `HttpOnly`, `Secure`, `SameSite=Strict`, `Path=/api/auth`
- [ ] `migration_sessions.sql` applied before deploying the session code
- [ ] `AUTH_PROXY_SECRET` matches between Vercel and Render
- [ ] Password reset tokens: SHA-256, 1-hour expiry, single-use
- [ ] No secrets in client-side code
- [ ] `.env` files are ignored and none are tracked by git
- [ ] `frontend/.env` does not exist; `VITE_API_URL` is set in Vercel
- [ ] `VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY` set in the Render environment (the server refuses to start in production without them)
- [ ] Every value in `docs/SECRET_ROTATION.md` has been rotated or revoked

---

## Troubleshooting

### "Token manquant" errors
→ Check `Authorization: Bearer <token>` header is being sent
→ Access tokens live in memory only; reload the page or log in again
→ Refresh failures return 401 and clear the local session

### The page reloads and the user is logged out
→ Check that `hei_csrf` exists in `localStorage`
→ Check that the `hei_refresh` cookie is present on `/api/auth`
→ In production, `Secure` requires HTTPS and the cookie must come from the Vercel proxy
→ Check `AUTH_PROXY_SECRET` and `API_URL` on Vercel

### "Code d'invitation invalide ou expiré"
→ Invitation codes expire after 7 days
→ `use_count` may have reached `max_uses`
→ Generate a new code from the admin panel

### CORS errors
→ `CLIENT_URL` must match the frontend origin exactly
→ Check `origin` in `cors()` config in `server.js`

### Socket.IO not connecting
→ Verify `VITE_API_URL` is correct
→ Check CORS config on server
→ Access token must be valid (socket authenticates via `handshake.auth.token`)
→ Expired access tokens trigger `auth:expired`; the client refreshes and reconnects

### Socket.IO connection refused (401)
→ The in-memory access token is missing or expired
→ Refresh or log in again; tokens are no longer stored in `localStorage`
→ A revoked session disconnects the socket and redirects to `/login`

### Random logouts while using multiple tabs
→ Check `REFRESH_REUSE_GRACE_SECONDS` (default 15)
→ A refresh token reused outside the grace window revokes the session by design
→ Inspect `sessions.revoked_reason='reuse'`

### Push notifications not working
→ Service worker must be registered
→ Browser must support Push API
→ VAPID keys must come from the host environment in production; after a key rotation every device must re-subscribe ([`SECRET_ROTATION.md`](./SECRET_ROTATION.md))

### Email not sending
Password reset uses push notifications, not email. No SMTP/Resend configuration needed for the reset flow.
