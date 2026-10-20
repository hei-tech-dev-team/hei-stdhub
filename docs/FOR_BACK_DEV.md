# Backend — FOR_BACK_DEV

## Structure

```
backend/
├── server.js                 # Express entry, Socket.IO, rate limiting, VAPID, schema migrations
├── start.sh                  # Production startup (keep-alive ping)
├── db/
│   ├── index.js              # PostgreSQL pool (max: 25)
│   └── schema.sql            # Full schema + seed data
├── middleware/
│   └── auth.js               # JWT verification
├── routes/
│   ├── auth.js               # 12 endpoints — register, login, forgot-password, verify-code, reset-password, me, profile, password, avatar, verify-invite, user/:ref
│   ├── admin.js              # 12 endpoints — stats, next-pseudo, users (list, role, email, delete, role-upgrade, ues), invitations (CRUD + bulk)
│   ├── supports.js           # 3 endpoints — list by UE, create, delete (teacher/admin)
│   ├── messages.js           # 14 endpoints — search, contacts, global, private, send, seen, upload, unread, global/read, delete, favorites (list/add/remove)
│   ├── suggestions.js        # 5 endpoints — submit, list (BDE), patch status, confirm (post to chat), report (PDF)
│   ├── push.js               # 5 endpoints — subscribe, unsubscribe, list notifications, mark read, unread count
│   └── pings.js              # 4 endpoints — send, list, accept, refuse
├── services/
│   ├── notificationService.js # Web Push sender (batched concurrency, cleanup invalid subs)
│   └── suggestionPdf.js      # PDF report (jsPDF, navy/gold branding, summary cards)
├── test/                     # Backend test files
└── uploads/                  # Local file storage (avatars, chat)
```

---

## `server.js` — Entry Point

### VAPID Key Setup
```js
@function VAPID Key Setup
@description Auto-generates VAPID keys if not in env, configures web-push
@side-effects Sets process.env.VAPID_PUBLIC_KEY/PRIVATE_KEY if missing
```

### Rate Limiters
| Limiter | windowMs | max (prod) | Applied to |
|---------|----------|-----------|------------|
| `loginLimiter` | 15 min | 3 | `/api/auth/login`, `/api/auth/register`, `/api/auth/reset-password` |
| `generalLimiter` | 15 min | 50 | All `/api/*` GET requests |
| `writeLimiter` | 15 min | 15 | All `/api/*` POST/PUT/PATCH/DELETE |
| `forgotPasswordLimiter` | 15 min | 2 | `POST /auth/forgot-password` |
| `verifyCodeLimiter` | 15 min | 2 | `POST /auth/forgot-password/verify-code` |
| `resetPasswordLimiter` | 15 min | 3 | `POST /auth/reset-password` |

### Socket.IO Configuration
```js
@config pingTimeout: 20000ms (env SOCKET_PING_TIMEOUT)
@config pingInterval: 25000ms (env SOCKET_PING_INTERVAL)
@config maxHttpBufferSize: 1MB (env SOCKET_MAX_BUFFER)
@config perMessageDeflate threshold: 1KB (env SOCKET_DEFLATE_THRESHOLD)
@config connectionStateRecovery: 2min window
```

### Socket.IO Event Handlers
```js
@event connection → user:join → message:global/private → message:seen → typing:started/stopped → bde:join, drag-*, update → ping:new (emitted from pings route) → disconnect
```

### Schema Migrations (auto-run on startup)
Creates tables if not exist: `password_reset_tokens`, `push_subscriptions`, `push_notifications`, `global_chat_read`, `pings`, `chat_favorites`.

---

## `middleware/auth.js` — JWT Authentication

```js
@function auth
@description Reads Bearer token from Authorization header, verifies with JWT_SECRET, attaches decoded payload to req.user
@status 401 - Token manquant / Token invalide
```

---

## `middleware/profanity.js` — Profanity Filter

```js
@function containsProfanity
@param {string} text - Text to check
@returns {boolean} true if text contains profanity (EN, FR, MG, leetspeak + regex patterns)
@applied-to Global messages, suggestion titles/content, announcement content
```

---

## `routes/auth.js` — Authentication Routes (12 endpoints)

### Helpers
```js
@function capitalize(str) - Capitalizes each word, rest lowercased
@function makeToken(user) - JWT { id, ref, role, ues }, expiresIn: "7d"
@function hashResetToken(token) - SHA-256 hex digest
@function generateResetCode() - 6-char alphanumeric (A-Z, 2-9, no 0/O/1/I)
@function tryGetAdminFromToken(req) - Tries to extract admin from JWT (for admin-registered users)
```

### Routes
| Route | Auth | Input | Description |
|-------|------|-------|-------------|
| POST `/register` | No | `{ ref, nom, prenom, email, pseudo, password, inviteCode, ues? }` | Role comes from the invitation code (transaction: SELECT FOR UPDATE + consume + INSERT), validates ref/email/UEs per role, checks uniqueness (ref/email/pseudo), bcrypt hash, INSERT, emit `user:registered` |
| POST `/login` | No | `{ ref, password }` | Unified: uppercase + trim the identifier, validate `STD/PROF/ADMIN/DEV` format (400), dummy bcrypt compare to keep timing uniform, generic 401 "Référence ou mot de passe incorrect.", returns JWT + user + access rights |
| GET `/user/:ref` | Yes | — | Public profile by ref |
| POST `/forgot-password` | No | `{ email }` | Lookup user, invalidate old tokens, INSERT new 10min token, send 6-char code via push notification, always return generic response |
| POST `/forgot-password/verify-code` | No | `{ email, code }` | Verify 6-char code, mark used, issue reset token (1h) |
| GET `/reset-password/:token` | No | — | Verify token validity |
| POST `/reset-password` | No | `{ token, newPassword }` | Transaction: UPDATE password + mark token used |
| GET `/me` | Yes | — | Current user profile |
| POST `/verify-invite` | No | `{ code }` | Validate invitation code, return role |
| PATCH `/profile` | Yes | `{ pseudo }` | Check uniqueness, update |
| PATCH `/password` | Yes | `{ current, newPassword }` | Verify current, hash new, update |
| PATCH `/avatar` | Yes | `FormData{ avatar }` | Upload to Cloudinary (200x200 crop) or local disk, update URL |

---

## `routes/admin.js` — Admin Routes (10 endpoints)

### Helper
```js
@function generateInviteCode(role) - Returns "HEI-STD/PROF-XXXXXX"
```

### Routes
| Route | Input | Description |
|-------|-------|-------------|
| GET `/stats` | — | Parallel COUNT queries + GROUP BY role |
| GET `/users` | `?q=&role=&limit=&offset=` | Dynamic SQL with ILIKE + role filter, paginated (max 200) |
| PATCH `/users/:id/role` | `{ role }` | Validates against whitelist (student/teacher/admin/bde) |
| PATCH `/users/:id/email` | `{ email }` | Validate email, update |
| DELETE `/users/:id` | — | Cannot delete self |
| GET `/next-pseudo` | — | Get next sequential pseudo (new_userX) |
| POST `/invitations` | `{ role, max_uses? }` | Single code, student/teacher only, 7d expiry |
| POST `/invitations/bulk` | `{ role, count?, max_uses? }` | Up to 1000 codes, batch INSERT (100/batch) |
| GET `/invitations` | `?limit=&offset=` | Paginated list (max 200) |
| DELETE `/invitations/:id` | — | Hard delete |

---

### UE by Level
- L1: 13 UEs (WEB1, PROG1, SYS1, DONNEES1, THEORIE1-P1, THEORIE1-P2, WEB2, PROG2-POO, PROG2-API, SYS2, MGT1, DONNEES2, IA1)
- L2: 5 UEs (WEB3, PROG3, MGT2, PROG4, SYS3)
- L3: 4 UEs (MOB1, PROG5, SECU1, SECU2)

---

## `routes/supports.js` — Support Links (3 endpoints)

| Route | Auth | Role | Description |
|-------|------|------|-------------|
| GET `/:ue` | No | Any | List with author_pseudo |
| POST `/` | Yes | teacher/admin | `{ ue, label, url }` — URL must be http(s):// |
| DELETE `/:id` | Yes | teacher/admin | Hard delete |

---

## `routes/messages.js` — Chat Messages (14 endpoints)

| Route | Auth | Input/Params | Description |
|-------|------|--------------|-------------|
| GET `/search?q=` | Yes | — | ILIKE on pseudo/ref, exclude self, limit 10 |
| GET `/contacts?q=&limit=&offset=` | Yes | — | All users, sorted: teachers→admins→others, ILIKE filter, paginated |
| GET `/global?before=&limit=` | Yes | — | Cursor pagination (max 500), DESC then ASC |
| GET `/private/:userId?before=&limit=` | Yes | — | Cursor pagination (max 500), both directions |
| POST `/` | Yes | `{ content, receiver_id?, is_global? }` | Profanity filter on global, push notif for private, Socket emit |
| PATCH `/seen` | Yes | `{ ids: number[] }` | Batch mark, emit message:seen to senders |
| PATCH `/:id/seen` | Yes | — | Legacy single mark |
| POST `/upload` | Yes | `FormData{ file }` | Max 10MB, Cloudinary or local, returns `{ filename, url, isImage }` |
| GET `/unread` | Yes | — | Global count + per-contact { unread, pending } |
| POST `/global/read` | Yes | `{ messageId }` | UPSERT with GREATEST |
| DELETE `/:id` | Yes | — | Sender only, Cloudinary cleanup if file, Socket emit |
| GET `/favorites` | Yes | — | Array of contact IDs |
| POST `/favorites` | Yes | `{ contact_id }` | ON CONFLICT DO NOTHING |
| DELETE `/favorites/:contactId` | Yes | — | Hard delete |

---

## `routes/suggestions.js` — BDE Suggestions (5 endpoints)

| Route | Auth | Role | Input | Description |
|-------|------|------|-------|-------------|
| POST `/` | Yes | student/teacher/admin | `{ titre, contenu, anonyme }` | Profanity filter |
| GET `/` | Yes | bde | `?limit=&offset=` | Anonymizes nom/prenom/email/ref |
| PATCH `/:id` | Yes | bde | `{ statut, justification? }` | statut: recu/accepte/a_discuter/refuse, refuse requires justification |
| POST `/confirm` | Yes | bde | — | Fetch processed, build chat msg, INSERT global message, DELETE all suggestions |
| POST `/report` | Yes | bde/admin | `{ suggestions }` | Generate PDF via jsPDF |

---

## `routes/push.js` — Push Notifications (5 endpoints)

| Route | Auth | Input | Description |
|-------|------|-------|-------------|
| POST `/subscribe` | Yes | `{ subscription: { endpoint, keys: { auth, p256dh } } }` | UPSERT |
| DELETE `/subscribe` | Yes | `{ endpoint }` | Hard delete |
| GET `/notifications` | Yes | — | Last 50, ORDER BY created_at DESC |
| PATCH `/notifications/read` | Yes | `{ ids: number[] }` | Mark is_read = TRUE |
| GET `/notifications/unread-count` | Yes | — | `{ count }` |

---

## `routes/pings.js` — Pings (4 endpoints)

| Route | Auth | Input | Description |
|-------|------|-------|-------------|
| POST `/` | Yes | `{ receiver_id }` | Cannot ping self, check existing (delete if accepted/refused, reject if pending), Socket emit `ping:new` |
| GET `/` | Yes | — | All pings (sent + received) with sender/receiver details |
| PATCH `/:id/accept` | Yes | — | Receiver only, Socket emit `ping:accepted` |
| PATCH `/:id/refuse` | Yes | — | Receiver only, Socket emit `ping:refused` |

---

## `services/notificationService.js` — Web Push

### Functions
```js
@async @function sendPushToUser(userId, { title, body, tag, url?, type? })
@description Fetches push subscriptions for userId, sends in parallel batches (concurrency: 10), saves notification to push_notifications table, cleans up 410/404 subscriptions
@returns {Promise<void>}

@async @function sendPushToAll({ title, body, tag, url?, type? })
@description Fetches ALL subscriptions (DISTINCT endpoint), sends in parallel batches, saves notifications, cleans up invalid subscriptions
@returns {Promise<void>}
```

---

## `services/suggestionPdf.js` — PDF Report

```js
@function generateSuggestionReport(suggestions)
@description Generates styled PDF: navy header + gold accents, summary cards, category sections with colored accent bars, justification boxes, footer per page
@returns {jsPDF} document
```

---

## Database Schema (full in `db/schema.sql`)

### Tables
- `users` — id, ref (UNIQUE), nom, prenom, email (UNIQUE), pseudo (UNIQUE), password, role (ENUM), avatar, ues (TEXT[]), first_login (DEFAULT TRUE), created_at, updated_at (auto-trigger)
- `password_reset_tokens` — id, user_id (FK), token_hash (SHA-256, UNIQUE), expires_at, used_at
- `supports` — id, ue (CHECK valid), label, url (https://), author_id
- `messages` — id, sender_id, receiver_id (NULL for global), content (NOT NULL), is_global, seen, seen_at, created_at, indexes on sender/receiver/created
- `global_chat_read` — user_id (PK, FK), last_read_msg_id, updated_at
- `suggestions` — id, student_id, titre, contenu, anonyme, statut (recu/accepte/a_discuter/refuse), justification, created_at, updated_at
- `invitations` — id, code (UNIQUE), role, max_uses, use_count, used_by, created_by, expires_at
- `push_subscriptions` — id, user_id (FK), endpoint, auth_key, p256dh_key, UNIQUE(user_id, endpoint)
- `push_notifications` — id, user_id (FK), type, title, body, data (JSONB), is_read, created_at
- `pings` — id, sender_id (FK), receiver_id (FK), status (pending/accepted/refused), created_at, responded_at, UNIQUE(sender_id, receiver_id)
- `announcement_reactions` — id, announcement_id (FK), user_id (FK), reaction_type, UNIQUE(announcement_id, user_id)
- `chat_favorites` — user_id, contact_id, PRIMARY KEY(user_id, contact_id)

### Indexes
- GIN on `users.ues`
- Composite on `messages(is_global, created_at ASC)`, `messages(sender_id, receiver_id)`, `messages(receiver_id, sender_id)`
- Indexes on `invitations(expires_at, use_count)`, `push_subscriptions(endpoint)`
- Indexes on `suggestions(statut, student_id)`, `global_chat_read(user_id)`

### Seed Data
- Admin: `ADMIN001` / `password`
- Student: `STD25001` / `password`
- Teacher: `PROF001` / `password`
- All passwords hash: `$2b$10$gjbcSWvJAI698s1zi3ZVxOrvjzbkaAqZIK8jEkDSf6ixszON.EWji`

### Migrations (apply in order)
1. `migration_invitations.sql` — invitations table
2. `migration_first_login.sql` — first_login column
3. `migration_student_email_suffix.sql` — email constraint update
4. `migration_multi_use_invitations.sql` — max_uses/use_count/used_by
5. `migration_alumni_support.sql` — alumni/bde roles (superseded: alumni removed by `migration_remove_alumni.sql`)
6. `migration_chat_seen_pseudo_unique.sql` — avatar, ues, unique pseudo, seen/seen_at, global_chat_read
7. `migration_scale_500.sql` — performance indexes
8. `migration_chat_emoji_transfer_answer.sql` — emoji transfer/answer columns
9. `migration_groupe_column.sql` — groupe column (since removed by `migration_remove_groupe.sql`)
10. `migration_developer_role.sql` — developer role
11. `migration_refactor_td_exams.sql` — TD/exams refactor
12. `migration_remove_alumni.sql` — alumni → student, drop alumni from enum/data
14. `migration_remove_groupe.sql` — drop users.groupe
