# HEI STDhub — AI Context

## Project Overview
Full-stack app for HEI school (student hub). Features: chat, admin panel, auth, push notifications, file uploads, password reset.

## Stack
- **Frontend:** React (Vite), Context API, Socket.io
- **Backend:** Node.js, Express, PostgreSQL, Socket.io
- **Auth:** JWT, bcrypt
- **Push:** Web Push API (VAPID), service workers
- **File uploads:** multer (local disk or Cloudinary)
- **Email:** nodemailer (Gmail SMTP)

## Database
- **Production DB:** Supabase PostgreSQL via pooler URL (`aws-1-eu-west-1.pooler.supabase.com`)
- **SSL required:** auto-detected when host contains `supabase` or `pooler` (`db/index.js`)
- **Connection string:** `DATABASE_URL` in `.env`
- **Local DB:** fallback if `DATABASE_URL` not set

## Branches

### `main`
Production-ready branch. Deployed on Render (backend) + Vercel (frontend).

### `dev`
Main development branch. Always rebase/merge feature branches here.

### `feat/std-ref-prefill`
Frontend-only changes to `AdminPage.jsx`:
- STD2 pre-fill: when creating a student, typing STD2 auto-fills STD1 from DB
- Forbidden group letters: validates group letter against list
- Email validation: enforces `@hei.school` domain with regex

### `fix/push-notifications`
Backend + frontend push notification fixes:
- **`notificationService.js`:** single source for `sendPushToUser`/`sendPushToAll`/`sendPushToLevel` with batched concurrency + stale subscription cleanup + batch INSERTs
- **VAPID key persistence:** keys saved to `.vapid-keys.json` so they survive restarts (previously regenerated every restart, invalidating all subscriptions)
- **Fallback chain:** env vars → `backend/.vapid-keys.json` → project-root `.vapid-keys.json` → generate new
- **`messages.js` cleanup:** removed dead duplicate push functions; added `sendPushToAll()` for global messages
- **`auth.js`:** sends push notification (type: `reset-code`) on password reset
- **`announcements.js`:** calls `sendPushToLevel()` when `target_level` set, else `sendPushToAll()`
- **`AuthContext.jsx`:** calls `unsubscribeFromPush()` on logout
- **`push.js`:** empty catch blocks now log errors
- **`main.jsx`:** `fetchMissedNotifications()` shows browser notifications for missed pushes
- **`db/index.js`:** added `ssl: { rejectUnauthorized: false }` for Supabase pooler connections

## Running Locally
```bash
# Backend (from project root)
node backend/server.js

# Frontend (from project root or frontend/)
npm run dev
```

Requires `.env` file at project root with: `DATABASE_URL`, `JWT_SECRET`, `CLIENT_URL`. SMTP optional (for password reset emails).

## Key Files

### Backend
| File | Purpose |
|------|---------|
| `backend/server.js` | Express app init, VAPID key loading, table creation, routes mounting |
| `backend/db/index.js` | PostgreSQL pool with auto-SSL for Supabase/pooler hosts |
| `backend/services/notificationService.js` | Push notification logic: `sendPushToUser`, `sendPushToAll`, `sendPushToLevel`, `saveNotification`, `saveNotificationsBatch`, `sendPushWithConcurrency` |
| `backend/services/mailer.js` | Password reset email via nodemailer |
| `backend/routes/auth.js` | Login, register, forgot/reset password, security questions (push on reset-code) |
| `backend/routes/messages.js` | Chat messages CRUD, reactions, file upload, push on new message (global via `sendPushToAll`, private via `sendPushToUser`) |
| `backend/routes/announcements.js` | Announcements CRUD, push via `sendPushToLevel` or `sendPushToAll` depending on `target_level` |
| `backend/routes/push.js` | Subscribe / unsubscribe push subscriptions, serve VAPID public key |
| `backend/middleware/auth.js` | JWT auth middleware |

### Frontend
| File | Purpose |
|------|---------|
| `frontend/src/context/AuthContext.jsx` | Auth state, login/logout, push subscribe on login |
| `frontend/src/push.js` | `subscribeToPush` / `unsubscribeFromPush` with VAPID key validation |
| `frontend/src/pages/AdminPage.jsx` | Admin panel (STD2 auto-fill, group letters, email validation on `feat/std-ref-prefill`) |
| `frontend/src/socket.js` | Socket.io chat connection |

## Important Environment Variables
```
DATABASE_URL       # PostgreSQL connection string — REQUIRED (use Supabase pooler for production)
JWT_SECRET         # Auth token signing key (REQUIRED)
CLIENT_URL         # Frontend URL for password reset links (REQUIRED)
SMTP_HOST/SMTP_USER/SMTP_PASS  # Gmail SMTP for password reset emails
VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY  # Optional — auto-generated and persisted to .vapid-keys.json
CLOUDINARY_CLOUD_NAME / CLOUDINARY_API_KEY / CLOUDINARY_API_SECRET  # Optional — for cloud file uploads
```

## Push Notification Flow
1. User logs in → `AuthContext` calls `subscribeToPush()` in `push.js`
2. Frontend fetches VAPID public key from `GET /api/push/vapid-key`
3. Browser subscribes via `PushManager.subscribe()` → sends subscription to `POST /api/push/subscribe`
4. Backend stores in `push_subscriptions` table
5. When triggered:
   - **Global message** → `sendPushToAll()` in `messages.js` (saves for ALL users + pushes to all subscribed)
   - **Private message** → `sendPushToUser(recipientId)` in `messages.js`
   - **Announcement** → `sendPushToLevel(level)` or `sendPushToAll()` in `announcements.js`
   - **Password reset** → `sendPushToUser(userId, { type: 'reset-code' })` in `auth.js`
6. `sendPushToAll` / `sendPushToLevel` save notifications via batch INSERT for ALL target users (not just subscribed ones)
7. Offline users receive missed notifications on reconnect via `fetchMissedNotifications()` in `main.jsx`
8. Stale subscriptions (410/404) are auto-deleted during push sending

## Notification Types
| Type | Trigger | Target |
|------|---------|--------|
| `reset-code` | Password reset request | Single user |
| `global_message` | Message in general chat | All users |
| `private_message` | Private/direct message | Single recipient |
| `announcement` | Admin announcement | All users or level-specific (L1/L2/L3) |

## Performance Notes
- `sendPushWithConcurrency` limits parallel pushes to 10 at a time
- `saveNotificationsBatch` uses single multi-row INSERT (vs one query per user)
- Push timeout reduced to 5s per subscription
- Auto-cleanup of 410/404 subscriptions prevents sending to dead endpoints

## VAPID Key Management
- If `VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY` env vars are set, use those
- Otherwise, load from `.vapid-keys.json` (project root, fallback to `backend/.vapid-keys.json`)
- If neither exists, generate new keys and save to `.vapid-keys.json` at project root
- This ensures keys are stable across restarts
- Old subscriptions with different keys are detected by the frontend and re-subscribed automatically
- ⚠️ Local VAPID keys differ from production keys; redeploy needed to use production keys

## Conventions
- No comments in code (unless explicitly asked)
- Minimal explanation in responses unless asked for detail
- French for user-facing strings, English for code
- ES modules on frontend, CommonJS on backend
