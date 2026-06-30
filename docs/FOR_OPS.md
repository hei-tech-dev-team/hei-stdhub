# Operations — FOR_OPS

## Deployment Architecture

```
Frontend (Vercel) ─── HTTPS ───→ Backend (Render)
                                        │
                                   PostgreSQL (Supabase)
                                        │
                                   Cloudinary (file storage)
```

- **Frontend**: Vercel, SPA rewrite all routes to `/index.html`
- **Backend**: Render (free tier sleeps after inactivity, keep-alive ping via start.sh)
- **Database**: Supabase PostgreSQL
- **File Storage**: Cloudinary (avatars, submissions, chat files, announcements, alumni spotlight images)
- **Push Notifications**: Web Push API (auto-generated VAPID keys — persist in production)

---

## Environment Variables

### Backend (`backend/.env`)

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `PORT` | No | `3001` | Server port |
| `DATABASE_URL` | **Yes** | — | PostgreSQL connection string |
| `JWT_SECRET` | **Yes** | — | JWT signing secret (strong random string) |
| `CLIENT_URL` | **Yes** | — | Frontend URL for CORS |
| `NODE_ENV` | No | — | Set to `production` for prod |
| `BACKEND_URL` | No | — | Self-ping URL for Render keep-alive |
| `VAPID_PUBLIC_KEY` | No | auto-generated | Persist in production (auto-generated keys change each restart) |
| `VAPID_PRIVATE_KEY` | No | auto-generated | Persist in production |
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

### Frontend (`frontend/.env`)

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `VITE_API_URL` | No | `http://localhost:3001` | Backend API URL |

---

## Setup Guide

### 1. Database

```bash
# Create a PostgreSQL database (local or Supabase)
# Run the schema:
psql "$DATABASE_URL" -f backend/db/schema.sql

# Apply migrations in order:
psql "$DATABASE_URL" -f database/migration_invitations.sql
psql "$DATABASE_URL" -f database/migration_first_login.sql
psql "$DATABASE_URL" -f database/migration_student_email_suffix.sql
psql "$DATABASE_URL" -f database/migration_multi_use_invitations.sql
psql "$DATABASE_URL" -f database/migration_alumni_support.sql
psql "$DATABASE_URL" -f database/migration_chat_seen_pseudo_unique.sql
psql "$DATABASE_URL" -f database/migration_scale_500.sql
```

### 2. Backend

```bash
cd backend
cp .env.example .env  # or create .env manually
npm install
npm run dev           # Development with nodemon
# OR
npm start             # Production (via start.sh)
```

### 3. Frontend

```bash
cd frontend
cp .env.example .env  # or create .env manually (VITE_API_URL)
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

## Security Checklist

- [ ] `JWT_SECRET` is a strong random string
- [ ] `DATABASE_URL` uses SSL (required by Supabase)
- [ ] CORS `origin` is restricted in production
- [ ] Rate limiting enabled on auth routes
- [ ] Passwords are bcrypt hashed (salt rounds: 10)
- [ ] SQL uses parameterized queries (`$1`, `$2`)
- [ ] XSS: chat messages sanitized client-side with DOMPurify
- [ ] JWT expires in 7 days
- [ ] Password reset tokens: SHA-256, 1-hour expiry, single-use
- [ ] No secrets in client-side code
- [ ] `.env` files are in `.gitignore`
- [ ] VAPID keys persisted in production (auto-generated keys change each restart)

---

## Troubleshooting

### "Token manquant" errors
→ Check `Authorization: Bearer <token>` header is being sent
→ Verify token exists in `localStorage` key `hei_token`

### "Code d'invitation invalide ou expiré"
→ Invitation codes expire after 14 days
→ `use_count` may have reached `max_uses`
→ Generate a new code from the admin panel

### CORS errors
→ `CLIENT_URL` must match the frontend origin exactly
→ Check `origin` in `cors()` config in `server.js`

### Socket.IO not connecting
→ Verify `VITE_API_URL` is correct
→ Check CORS config on server
→ JWT token must be valid (socket authenticates via `handshake.auth.token`)
→ If token expires, call `refreshSocket()` (handled automatically in AuthContext)

### Socket.IO connection refused (401)
→ Token is missing or expired in localStorage (`hei_token`)
→ Re-login to obtain a fresh token

### Push notifications not working
→ Service worker must be registered
→ Browser must support Push API
→ VAPID keys must be consistent (auto-generated keys change each restart unless persisted in `.env`)

### Email not sending
Password reset uses push notifications, not email. No SMTP/Resend configuration needed for the reset flow.
