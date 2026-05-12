# Operations — FOR_OPS

## Deployment Architecture

```
Frontend (Vercel) ─── HTTPS ───→ Backend (Render)
                                       │
                                  PostgreSQL (Supabase)
                                       │
                                  Cloudinary (file storage)
                                       │
                                  Resend / SMTP (email)
```

- **Frontend**: Vercel, SPA rewrite all routes to `/index.html`
- **Backend**: Render (free tier sleeps after inactivity, keep-alive ping prevents this)
- **Database**: Supabase PostgreSQL
- **File Storage**: Cloudinary (avatars, submissions, chat files)
- **Email**: Resend API or SMTP relay
- **Push Notifications**: Web Push API (auto-generated VAPID keys)

---

## Environment Variables

### Backend (`backend/.env`)

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `PORT` | No | `3001` | Server port |
| `DATABASE_URL` | **Yes** | — | PostgreSQL connection string |
| `JWT_SECRET` | **Yes** | — | JWT signing secret (use a strong random string) |
| `CLIENT_URL` | **Yes** | — | Frontend URL for CORS (e.g. `https://hei-stdhub.vercel.app`) |
| `NODE_ENV` | No | — | Set to `production` for prod |
| `BACKEND_URL` | No | — | Used for keep-alive ping (Render), e.g. `https://hei-api.onrender.com` |
| `VAPID_PUBLIC_KEY` | No | auto-generated | VAPID public key for Web Push |
| `VAPID_PRIVATE_KEY` | No | auto-generated | VAPID private key for Web Push |
| `CLOUDINARY_CLOUD_NAME` | No | — | Cloudinary cloud name |
| `CLOUDINARY_API_KEY` | No | — | Cloudinary API key |
| `CLOUDINARY_API_SECRET` | No | — | Cloudinary API secret |
| `RESEND_API_KEY` | No | — | Resend API key for email |
| `SMTP_HOST` / `EMAIL_HOST` | No | — | SMTP server hostname |
| `SMTP_PORT` / `EMAIL_PORT` | No | `587` | SMTP port |
| `SMTP_USER` / `EMAIL_USER` | No | — | SMTP username |
| `SMTP_PASS` / `EMAIL_PASS` | No | — | SMTP password |
| `SMTP_SECURE` / `EMAIL_SECURE` | No | — | `true` for TLS (port 465) |
| `SMTP_FROM` / `EMAIL_FROM` / `MAIL_FROM` | No | — | Sender email address |
| `RESEND_FROM` | No | — | Resend sender email |
| `EMAIL_TIMEOUT_MS` / `RESEND_TIMEOUT_MS` | No | `10000` | Email timeout in ms |

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
```

### 2. Backend

```bash
cd backend
cp .env.example .env  # or create .env manually
npm install
npm run dev           # Development with nodemon
# OR
npm start             # Production
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
```

---

## Runbook

### Start / Stop

```bash
# Backend
cd backend && npm start          # Start
pkill -f "node server.js"       # Stop

# Frontend (dev)
cd frontend && npm run dev       # Start on :5173
```

### Restart

```bash
# Backend
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

In production, the backend pings itself every 14 minutes:
```js
setInterval(() => {
  https.get(BACKEND_URL + "/api/health");
}, 14 * 60 * 1000);
```

Ensure `BACKEND_URL` env var is set.

---

## Monitoring

### What to Monitor

| Signal | How | Threshold |
|--------|-----|-----------|
| Health check | `GET /api/health` | Must return 200 |
| Response time | APM / logs | < 1s |
| Database connections | `pg` pool | < 80% of max |
| Disk space | `uploads/` directory | < 80% full |
| SSL cert expiry | Monitor | > 30 days |

### Key Metrics

- **Login failures**: Check `401` rate on `/api/auth/login`
- **Rate limiting**: `429` responses on auth routes = too many attempts
- **Email failures**: Logs show `ERREUR email` patterns
- **Push notification failures**: `410`/`404` Web Push errors (auto-cleaned)

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

- **Cloudinary**: Assets are stored in Cloudinary folders. No local backup needed.
- **Local uploads**: `backend/uploads/` — include in periodic backups if needed.

---

## Version Bumping

```bash
# Run from root
npm run release:patch   # 1.3.2 → 1.3.3
npm run release:minor   # 1.3.2 → 1.4.0
npm run release:major   # 1.3.2 → 2.0.0
```

Updates both `backend/package.json` and `frontend/package.json` simultaneously via `scripts/bump-version.js`.

---

## Security Checklist

- [ ] `JWT_SECRET` is a strong random string (not `"secret"`)
- [ ] `DATABASE_URL` uses SSL (required by Supabase)
- [ ] CORS `origin` is restricted in production (not `"*"`)
- [ ] Rate limiting is enabled on auth routes (10 req/15min)
- [ ] Passwords are bcrypt hashed (salt rounds: 10)
- [ ] SQL uses parameterized queries (`$1`, `$2`) — no string concatenation
- [ ] XSS: chat messages sanitized client-side with DOMPurify
- [ ] JWT expires in 7 days
- [ ] Password reset tokens expire in 1 hour (single-use, SHA-256)
- [ ] No secrets in client-side code
- [ ] `.env` files are in `.gitignore`

---

## Troubleshooting

### "Token manquant" errors
→ Check `Authorization: Bearer <token>` header is being sent
→ Verify token exists in `localStorage` key `hei_token`

### "Code d'invitation invalide ou expiré"
→ Invitation codes expire after 14 days
→ `use_count` may have reached `max_uses`
→ Generate a new code from the admin panel

### Email not sending
→ Check `RESEND_API_KEY` or SMTP env vars
→ Check logs for `ERREUR email` patterns
→ Verify `CLIENT_URL` is correct for reset links

### CORS errors
→ `CLIENT_URL` must match the frontend origin exactly
→ Check `origin` in `cors()` config in `server.js`

### Socket.IO not connecting
→ Verify `VITE_API_URL` is correct
→ Check CORS config on server
→ Client falls back to polling if WebSocket fails

### Push notifications not working
→ Service worker must be registered
→ Browser must support Push API
→ VAPID keys must be consistent (auto-generated keys change each restart unless persisted in `.env`)
