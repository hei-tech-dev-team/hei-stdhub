# Sessions and Authentication

This guide describes the session architecture put in place to close findings
H-01 and H-02 of the November 2026 security audit. It replaces the old
"7-day JWT in `localStorage`" rules: access is now carried by a short-lived
in-memory token, renewal by a rotating `HttpOnly` cookie, and every session can
be revoked server-side.

## Overview

```
Browser                            Vercel                    Render
┌──────────────────────┐      ┌──────────────────┐      ┌─────────────────────┐
│ access token (memory) │─────▶│ /api/auth/* proxy│─────▶│ Express API          │
│ hei_refresh cookie    │      │  (function)      │      │ + PostgreSQL         │
│ hei_csrf (localStorage)│     └──────────────────┘      │ + Socket.IO          │
└──────────────────────┘                                  └─────────────────────┘
            │                                                        │
            └────────────── rest of the API + Socket.IO ────────────┘
                    Authorization: Bearer <access token>
```

The authentication proxy makes the refresh cookie **first-party** on the Vercel
domain. All other calls (business API, Socket.IO) go directly to Render with the
`Authorization` header, because the cookie is restricted to `Path=/api/auth`.

## The three secrets

### Access token

- JWT signed with **HS256** using `JWT_SECRET`.
- Lifetime: **15 minutes** (`ACCESS_TOKEN_TTL_SECONDS=900`).
- Kept **in memory only** in `tokenStore.js`. No `localStorage`, no cookie.
- Claims: `sub` (user id), `sid` (session id), `tv` (token version), `iss`,
  `aud`, `iat`, `exp`. No role, username, or course unit (UE) is embedded.
- Verification: pinned algorithm, `issuer` and `audience` checked, then the
  session and the user are loaded from the database.

### Refresh token

- 32 random bytes encoded as base64url.
- Stored **hashed with SHA-256** in `sessions.refresh_token_hash`. The plaintext
  token only exists in the browser's cookie.
- `hei_refresh` cookie with `HttpOnly`, `Secure` in production,
  `SameSite=Strict`, `Path=/api/auth`, no `Domain` attribute (host-only cookie),
  and a lifetime of **30 days**.
- Rotated on every successful refresh. The old hash is kept in
  `previous_refresh_token_hash` with a **15-second** grace window.
- Reuse outside the grace window: the session is revoked with reason `reuse`,
  which also disconnects its sockets.

### CSRF token

- Generated at the same time as the session, stored hashed in
  `sessions.csrf_token_hash`.
- Returned to the client on login, registration, and password change. It is kept
  in `localStorage` under `hei_csrf` so it can be shared between tabs.
- Required in the `X-CSRF-Token` header for `/api/auth/refresh` and
  `/api/auth/logout`.
- It stays stable for the whole life of the session; it is not regenerated on
  each refresh token rotation.

## Roles and responsibilities

| Component | Role |
|-----------|------|
| `backend/config/auth.js` | Centralizes lifetimes, cookie names, issuer/audience, and limits. |
| `backend/services/tokenAuth.js` | Signs and verifies access tokens, enforces HS256 + issuer/audience + session. |
| `backend/services/sessionService.js` | Creates, rotates, revokes, lists, and verifies sessions; manages the cache and sockets. |
| `backend/services/sessionCleanupJob.js` | Daily purge at 03:30 of sessions that expired or were revoked more than 30 days ago. |
| `backend/middleware/auth.js` | Extracts the Bearer token, attaches `req.user` loaded from the database. |
| `backend/middleware/clientIp.js` | Only trusts `X-Forwarded-For` if the Vercel proxy presents `AUTH_PROXY_SECRET`. |
| `backend/routes/auth.js` | Login, registration, refresh, logout, global logout, session listing/revocation, password. |
| `backend/routes/admin.js` | Revokes the target's sessions on role change, email change, or deletion. |
| `backend/server.js` | Authenticates sockets, creates `session:<sid>` and `user:<uid>` rooms, cuts connections on expiry or revocation. |
| `frontend/src/api/tokenStore.js` | Keeps the access token in memory and the CSRF token in `localStorage`. |
| `frontend/src/api/authApi.js` | Axios client for the `/api/auth` proxy (same origin by default), with `withCredentials`, automatic Bearer and CSRF. |
| `frontend/src/api/session.js` | Single-flight refresh, application of authentication responses, local purge. |
| `frontend/src/api/axios.js` | Adds the Bearer token, attempts a refresh on 401, replays the request once. |
| `frontend/src/context/AuthContext.jsx` | Restores the session on startup, refreshes before expiry, reacts to revocation. |
| `frontend/src/socket.js` | Socket.IO connection with the access token, refresh on `auth:expired`, listens for `session:revoked`. |
| `frontend/api/auth/[...path].js` | Vercel proxy for `/api/auth/*` to Render, forwarding the cookie and the client IP. |
| `frontend/src/pages/ProfilePage.jsx` | Lists active sessions, lets the user revoke one device or all devices. |

## User roles

The role is **never** read from the token. It is loaded from `users.role` on
every authenticated request, with an in-memory cache of 15 seconds per session
(`AUTH_CACHE_TTL_MS`). The cache is cleared immediately on revocation, role
change, password change, or profile update.

| Role | Session access | Business access |
|------|----------------|-----------------|
| `student` | Lists and revokes their own sessions. | Student routes, chat, suggestions, archives. |
| `teacher` | Lists and revokes their own sessions. | Teacher routes, archives, chat, suggestions. |
| `bde` | Lists and revokes their own sessions. | Student union (BDE) routes and `bde:*` socket events. |
| `admin` | Lists and revokes their own sessions. Cannot revoke another user's session via `/auth/sessions/:id`. | User administration, invitations, announcements, course units (UEs). |
| `developer` | Lists and revokes their own sessions. | Full administration, including sensitive roles. |

A role change revokes all of the target's sessions and increments
`users.token_version`. An administrator cannot modify a `developer` account or
assign that role; only a `developer` can.

## Session lifecycle

| Action | Server effect | Cookie | Sockets |
|--------|---------------|--------|---------|
| Login / registration | Creates a `sessions` row, returns access token + CSRF. | New `hei_refresh`. | Connection possible with the new access token. |
| Successful refresh | Rotates the refresh token, updates `last_used_at`, `ip`, `user_agent`. | New cookie. | No disconnection. |
| Reuse within 15 s | Accepts the old token, rotates nothing. | Unchanged. | No disconnection. |
| Reuse outside grace | Revokes the session (`reuse`). | Cleared client-side on next failure. | `session:revoked` then disconnection. |
| Logout | Revokes the current session (`logout`). | Cleared. | `session:revoked` then disconnection. |
| Global logout | Revokes all sessions (`logout_all`) and increments `token_version`. | Cleared. | `session:revoked` then disconnection of all sockets. |
| Password change | Revokes the other sessions (`password_change`), increments `token_version`, creates a new session for the current device. | New cookie. | Disconnection without an event, so the current tab can reconnect. |
| Password reset | Revokes all sessions (`password_reset`) and increments `token_version`. | Cleared. | `session:revoked` then disconnection. |
| Role / email change | Revokes all of the target's sessions (`role_change`, `email_change`). | Cleared on next refresh. | `session:revoked` then disconnection. |
| Account deletion | Sessions are deleted by cascade. | Cleared on next refresh. | Disconnection. |
| Expiry | `expires_at` reached: refresh returns 401 and revokes the row (`expired`). | Cleared. | The access token expires at most 15 min after the last refresh. |
| Session limit | On the 21st login, the oldest session is revoked (`limit`). | Unchanged for the others. | The revoked session is disconnected. |

A session has an **absolute lifetime of 30 days**: rotation does not extend
`expires_at`. A user must therefore log in again at least once every 30 days.

### Why a 15-second grace window

Several tabs may call `/refresh` in parallel with the same cookie. The first one
rotates the token; the following ones present the old token during the grace
window and receive an access token without a new rotation. Without this window,
a simple race between tabs would revoke the session.

## Endpoints

| Method | Path | Authentication | CSRF | Description |
|--------|------|----------------|------|-------------|
| `POST` | `/api/auth/login` | No | No | Creates a session, returns `token`, `expires_in`, `csrf_token`, `user`. |
| `POST` | `/api/auth/register` | Invitation or admin | No | Creates the account and a session. |
| `POST` | `/api/auth/refresh` | `hei_refresh` cookie | Yes | Rotates the refresh token and returns a new access token. |
| `POST` | `/api/auth/logout` | Cookie + CSRF | Yes | Revokes the current session. |
| `POST` | `/api/auth/logout-all` | Bearer | No | Revokes all of the user's sessions. |
| `GET` | `/api/auth/sessions` | Bearer | No | Lists active sessions, with `current: true` for the calling session. |
| `DELETE` | `/api/auth/sessions/:id` | Bearer | No | Revokes a session belonging to the user. |
| `PATCH` | `/api/auth/password` | Bearer | No | Changes the password, revokes the other sessions, and returns a new session. |
| `GET` | `/api/auth/me` | Bearer | No | Returns the current user loaded from the database. |
| `PATCH` | `/api/auth/profile` | Bearer | No | Updates the username and invalidates the user cache. |
| `PATCH` | `/api/auth/avatar` | Bearer | No | Updates the avatar and invalidates the user cache. |

`/api/auth/refresh` and `/api/auth/logout` also check `Origin` when the header
is present. The allowed origins are `CLIENT_URL`, `http://localhost:5173`,
`http://localhost:3000`, and `https://hei-stdhub.vercel.app`.

## Database

Migration: `database/migration_sessions.sql`.

| Column | Role |
|--------|------|
| `id` | Session UUID, reused in the `sid` claim. |
| `user_id` | Owner, `ON DELETE CASCADE`. |
| `refresh_token_hash` | SHA-256 of the current refresh token. |
| `previous_refresh_token_hash` | SHA-256 of the previous token, for the grace window. |
| `previous_valid_until` | End of the grace window. |
| `csrf_token_hash` | SHA-256 of the CSRF token. |
| `token_version` | Version expected at creation time. |
| `user_agent`, `ip` | Context shown in the session list. |
| `created_at`, `last_used_at`, `expires_at` | Lifecycle. |
| `revoked_at`, `revoked_reason` | Revocation and cause (`reuse`, `logout`, `logout_all`, `password_change`, `password_reset`, `role_change`, `email_change`, `expired`, `version`, `limit`). |

Indexes: `(user_id) WHERE revoked_at IS NULL`, `expires_at`, `revoked_at`,
`previous_refresh_token_hash`.

The purge deletes rows whose `expires_at` is more than 30 days old or whose
`revoked_at` is more than 30 days old. It runs every day at 03:30 via
`node-cron`. In production, apply the migration before deploying the code.

## Configuration

### Backend

| Variable | Default | Description |
|----------|---------|-------------|
| `JWT_SECRET` | required | HS256 secret. |
| `JWT_ISSUER` | `hei-stdhub-api` | Expected `iss` claim. |
| `JWT_AUDIENCE` | `hei-stdhub-web` | Expected `aud` claim. |
| `ACCESS_TOKEN_TTL_SECONDS` | `900` | Access token lifetime. |
| `REFRESH_TOKEN_TTL_DAYS` | `30` | Absolute session lifetime. |
| `REFRESH_REUSE_GRACE_SECONDS` | `15` | Multi-tab grace window. |
| `AUTH_CACHE_TTL_MS` | `15000` | Per-session user cache; `0` in test. |
| `MAX_SESSIONS_PER_USER` | `20` | Maximum active sessions; `1000` in test. |
| `SESSION_RETENTION_DAYS` | `30` | Retention after expiry or revocation. |
| `AUTH_PROXY_SECRET` | empty | Secret shared with the Vercel proxy to trust `X-Forwarded-For`. |
| `CLIENT_URL` | required | Frontend origin allowed by CORS and `Origin`. |

### Frontend

| Variable | Default | Description |
|----------|---------|-------------|
| `VITE_API_URL` | `http://localhost:3001` | Business API and Socket.IO, called directly. |
| `VITE_AUTH_API_URL` | same origin in production | Origin of the authentication proxy (without `/api/auth`); in development, the local API is used. Do not point it directly at Render in production: the cookie is host-only and `SameSite=Strict`. |

## Deployment: Option B (Vercel proxy)

This option is the current configuration.

1. The Vercel project must have **Root Directory = `frontend`** so that
   `frontend/api/auth/[...path].js` is deployed as a serverless function.
2. Vercel variables:
   - `API_URL`: public URL of Render, for example
     `https://hei-stdhub-api.onrender.com`.
   - `AUTH_PROXY_SECRET`: long random value, identical to the one on Render.
   - `VITE_API_URL`: public URL of Render for direct calls and Socket.IO.
3. Render variables:
   - `CLIENT_URL`: exact Vercel URL, for example
     `https://hei-stdhub.vercel.app`.
   - `AUTH_PROXY_SECRET`: same value as on Vercel.
   - `JWT_ISSUER` and `JWT_AUDIENCE` if you want values other than the
     defaults.
4. The proxy forwards `cookie`, `origin`, `user-agent`, `x-csrf-token`, and the
   client IP. It adds `X-Proxy-Secret`, which Render verifies before reading
   `X-Forwarded-For`.
5. The cookie stays host-only on the Vercel domain and is never sent on direct
   calls to Render.

Do not expose `/api/auth/avatar` through the proxy: the avatar upload is a
`multipart/form-data` request that goes through the direct API with the Bearer
token and does not need the cookie.

### Future migration to subdomains (Option A)

The goal is to remove the proxy function by serving the API and the frontend
under the same parent domain, for example `app.example.com` and
`api.example.com`. This will require:

- setting `VITE_AUTH_API_URL` to the authentication origin;
- adding a `Domain=.example.com` attribute to the refresh cookie, currently
  host-only, via a new configuration variable;
- extending `CLIENT_URL` and the `Origin` allowlist to both subdomains;
- keeping `SameSite=Strict` and the CSRF protection.

As long as the cookie remains host-only, Option A will not work as is: the
cookie set by `api.example.com` would not be sent by `app.example.com`. This is
why Option B is kept for now.

## Frontend flow

1. On startup, `AuthContext` reads `hei_csrf`. If it is absent, no refresh is
   attempted and the user stays logged out.
2. If the CSRF token is present, `refreshAccessToken()` calls `/api/auth/refresh`
   with the cookie. The access token is stored in memory, and the user is loaded.
3. All API requests go through `axios.js`, which adds the Bearer token. On 401,
   a single refresh is attempted (`refreshPromise`), then the request is replayed
   once.
4. A timer checks every 30 seconds whether the access token expires in less than
   90 seconds, and refreshes it. Returning to the foreground triggers the same
   check.
5. Socket.IO uses `handshake.auth.token`. On `auth:expired`, the client
   refreshes then reconnects. On `session:revoked`, it clears the local state,
   closes the socket, and redirects to `/login`.
6. The Profile page lists sessions and lets the user revoke a device. Revoking
   the current device redirects to `/login`.

No access token or user object is written to `localStorage`. Local storage only
contains `hei_csrf`, which is needed for the same-origin refresh.

## Socket.IO

- On connection, the server verifies the access token then automatically joins
  `session:<sid>` and `user:<uid>`.
- A timer disconnects the socket when the access token expires and emits
  `auth:expired` so the client refreshes.
- Revocation paths (`revokeSession`, `revokeAllForUser`, `disconnectUser`) emit
  `session:revoked` then disconnect the affected sockets. The session limit does
  the same for evicted sessions.
- A password change disconnects sockets without emitting `session:revoked`, so
  that the current tab can reconnect with the new token.
- Business rooms (`bde`, etc.) remain controlled by the role loaded from the
  database, not by the token.

## Operations

### Check active sessions

```sql
SELECT id, user_id, created_at, last_used_at, expires_at, ip, revoked_at, revoked_reason
FROM sessions
WHERE revoked_at IS NULL AND expires_at > NOW()
ORDER BY last_used_at DESC;
```

### Revoke all of a user's sessions

The safest way is to change their role or password from the administration
panel, which revokes the sessions and increments `token_version`. As a last
resort:

```sql
UPDATE sessions
SET revoked_at = NOW(), revoked_reason = 'manual'
WHERE user_id = 42 AND revoked_at IS NULL;

UPDATE users SET token_version = token_version + 1 WHERE id = 42;
```

The session cache expires after 15 seconds. To cut sockets immediately, prefer
the administration API or `logout-all`.

### Purge manually

```bash
cd backend
node -e "require('./services/sessionCleanupJob').purgeExpiredSessions().then(console.log)"
```

### Rotate `JWT_SECRET`

Rotating `JWT_SECRET` invalidates the access tokens in circulation, but **not**
the refresh tokens: sessions remain valid and can issue new access tokens. To
log everyone out, also revoke the sessions (for example by incrementing
`token_version` for every account).

### Monitor

- Rate of 401s on `/api/auth/refresh`: expired cookies or refresh token theft.
- `sessions` rows with `revoked_reason='reuse'`: replay attempts.
- Number of active sessions per user: close to 20 means forgotten devices or
  abuse.
- 502 errors from the Vercel proxy: Render unavailable or incorrect `API_URL`.

## Tests

The backend tests cover the critical scenarios:

- `backend/test/session.test.js`: claims, cookie, CSRF, rotation, grace window,
  reuse, logout, global logout, listing/revocation, password change, role
  change, purge.
- `backend/test/socket-join-auth.test.js`: rooms tied to the authenticated
  identity and disconnection on revocation.
- `backend/test/token-revocation.test.js`: `token_version`, role read from the
  database, token without `sid`, alternative algorithms.

Command:

```bash
cd backend
NODE_ENV=test node node_modules/mocha/bin/mocha.js "test/**/*.test.js"
```

Use Node 20: Mocha does not start correctly under Node 26 with the current
configuration.

## Known limitations

- The CSRF token is in `localStorage`: an XSS can read it. The refresh cookie
  remains `HttpOnly`, but an XSS can call `/api/auth/refresh` from the page and
  obtain an access token. The main defense against XSS remains escaping,
  DOMPurify, and a future strict CSP.
- The 15-second grace window allows the old refresh token to be replayed during
  that time. This is a deliberate trade-off for multiple tabs.
- The 15-second user cache can delay the effect of a change made directly in the
  database, outside the application services.
- Revocation takes effect on the next request (the session cache is cleared) and
  the affected sockets are cut immediately. A revocation made directly in the
  database, outside the application services, may remain invisible for up to
  15 seconds.
- The purge is daily; revoked rows are kept for 30 days for auditing.
- The Vercel proxy adds an extra network round trip and a cold start to
  authentication calls.