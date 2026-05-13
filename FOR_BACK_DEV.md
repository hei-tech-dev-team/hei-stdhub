# Backend — FOR_BACK_DEV

## Structure

```
backend/
├── server.js                 # Express entry, Socket.io, rate limiting, VAPID
├── db/
│   ├── index.js              # PostgreSQL pool
│   └── schema.sql            # Full schema (tables, enums, constraints, seed)
├── middleware/
│   └── auth.js               # JWT verification
├── routes/
│   ├── auth.js               # Auth & profile routes
│   ├── admin.js              # Admin-only routes
│   ├── posts.js              # Course materials
│   ├── submissions.js        # Homework submissions
│   ├── supports.js           # Support links
│   ├── messages.js           # Chat messages + push notifications
│   ├── suggestions.js        # BDE suggestions
│   └── push.js               # Push notification subscriptions
├── services/
│   ├── mailer.js             # Email (SMTP + Resend)
│   └── suggestionPdf.js      # PDF reports for BDE
├── test/                     # 13 test files (200 passing)
├── scripts/                  # Utilities
└── uploads/                  # Local file storage
```

---

## `server.js` — Entry Point

### VAPID Key Setup

```js
@function VAPID Key Setup
@description Auto-generates VAPID keys if not in env, configures web-push
@side-effects Sets process.env.VAPID_PUBLIC_KEY/_PRIVATE_KEY if missing
```

### `loginLimiter`

```js
@type RateLimitRequestHandler
@description Rate limiter for auth routes
  windowMs: 15min, max: 10 (0 in test mode)
  message: "Trop de tentatives. Réessayez dans 15 minutes."
@applied-to /api/auth/login, /api/auth/forgot-password, /api/auth/reset-password
```

### Socket.io Event Handlers

```js
@event connection
@description Creates socket connection, tracks online users

@event user:join
@param {string} userId
@description Stores userId→socketId mapping, joins user room, broadcasts online status

@event message:global
@param {Object} msg
@description Re-broadcasts message to all connected clients

@event message:private
@param {Object} payload { receiverId, msg }
@description Sends message to receiver's room AND sender's room

@event message:seen
@param {Object} payload { messageId, senderId }
@description Forwards seen status to sender's room

@event message:deleted
@param {Object} payload { messageId, isGlobal, receiverId, senderId }
@description Broadcasts message deletion to all connected clients

@event unread:update
@param {Object} payload { contactId, unread, pending }
@description Sends unread count update to sender after sending private message

@event user:registered
@param {Object} user - New user object (id, ref, pseudo, role)
@description Broadcasts new registration to admin panel for live updates

@event bde:join
@description Joins the "bde" room for real-time Kanban sync

@event bde:drag-start
@param {Object} payload { suggestionId }
@description Broadcasts drag start to other BDE members

@event bde:drag-over
@param {Object} payload { columnId }
@description Broadcasts drag-over to other BDE members

@event bde:drag-end
@description Broadcasts drag-end to other BDE members

@event bde:update
@param {Object} payload { id, statut, justification }
@description Broadcasts suggestion status update to BDE room

@event disconnect
@description Removes user from onlineUsers, broadcasts offline status
```

### Health & VAPID Endpoints

```js
@route GET /api/health
@returns {JSON} { status: "ok", time: Date }
@status 200

@route GET /api/push/vapid-key
@returns {JSON} { publicKey: string }
@status 200

@route ALL 404 catch-all
@returns {JSON} { error: "Route introuvable." }
@status 404
```

---

## `db/index.js` — Database Connection

```js
@type Pool
@description PostgreSQL connection pool using DATABASE_URL env var
@config max: 25, idleTimeoutMillis: 30000, connectionTimeoutMillis: 10000
@exports { query: (text, params) => pool.query(text, params), pool }

@event pool:connect
@description Logs "PostgreSQL connecté"

@event pool:error
@description Logs error and calls process.exit(-1)
```

---

## `middleware/auth.js` — JWT Authentication

```js
@function auth
@param {Request} req - Express request object
@param {Response} res - Express response object
@param {Function} next - Express next middleware
@description Reads Bearer token from Authorization header, verifies with JWT_SECRET, attaches decoded payload to req.user
@returns {void} Calls next() on success
@throws {void} Returns 401 JSON on failure
@status 401 - Token manquant / Token invalide
```

---

## `routes/auth.js` — Authentication Routes

### Helpers

```js
@function capitalize
@param {string} str
@returns {string} Each word capitalized, rest lowercased, trimmed

@function makeToken
@param {Object} user - Must have { id, ref, role }
@returns {string} JWT signed with { id, ref, role }, expiresIn: "7d"

@function hashResetToken
@param {string} token
@returns {string} SHA-256 hex digest of token
```

### Routes

```js
@route POST /register
@param {body} { ref, nom, prenom, email, pseudo, password, role, level?, inviteCode, ues? }
@description
  1. Validates required fields
  2. Checks teacher has UEs
  3. Verifies invitation code (use_count < max_uses, not expired)
  4. Checks ref/email uniqueness
  5. bcrypt hashes password (salt: 10)
  6. INSERT user with capitalize() on name fields
  7. Increments invitation use_count
  8. Sets first_login = FALSE
@returns {JSON} { token, user, first_login: true }
@status 201 - Created
@status 400 - Validation error or invalid invite
@status 409 - Duplicate ref/email
@status 500 - Server error

@route POST /login
@param {body} { ref, password }
@description
  1. Validates fields
  2. SELECT user by ref
  3. bcrypt.compare password
  4. If first_login, sets FALSE
  5. Returns safeUser (no password, no first_login)
@returns {JSON} { token, user, first_login }
@status 200 - Success
@status 400 - Missing fields
@status 401 - Invalid ref or password
@status 500 - Server error

@route POST /forgot-password
@param {body} { email }
@description
  1. Validates email (required, max 254 chars)
  2. Looks up user by email
  3. Always returns generic response (prevent enumeration)
  4. Invalidates existing unused tokens
  5. Inserts new token (1 hour expiry)
  6. Asynchronous sendPasswordResetEmail()
@returns {JSON} { message: "Si un compte..." }
@status 200 - Always (even if email not found)
@status 400 - Missing/too-long email
@status 500 - Server error

@route GET /reset-password/:token
@param {params} { token }
@description Verifies token validity (hash match, not used, not expired)
@returns {JSON} { valid: true }
@status 200 - Valid token
@status 400 - Missing or invalid/expired token
@status 500 - Server error

@route POST /reset-password
@param {body} { token, newPassword }
@description
  1. Validates fields, password min 6 chars
  2. Verifies token
  3. Transaction: UPDATE password + invalidate token
@returns {JSON} { message: "Mot de passe réinitialisé." }
@status 200 - Success
@status 400 - Validation error or invalid/expired token
@status 500 - Server error

@route GET /me
@middleware auth
@description Fetches current user by req.user.id
@returns {JSON} User object (id, ref, nom, prenom, email, pseudo, role, level, avatar)
@status 200 - Success
@status 404 - Not found
@status 500 - Server error

@route POST /verify-invite
@param {body} { code }
@description Validates invitation code (use_count < max_uses, not expired)
@returns {JSON} { role: string }
@status 200 - Valid code
@status 400 - Invalid/expired code
@status 500 - Server error

@route PATCH /profile
@middleware auth
@param {body} { pseudo }
@description Updates user pseudo
@returns {JSON} Updated user object
@status 200 - Success
@status 400 - Missing pseudo
@status 500 - Server error

@route PATCH /avatar
@middleware auth, multer(avatarUpload)
@description Uploads avatar to Cloudinary (hei-stdhub/avatars, 200x200 cropped)
  with local disk fallback. Updates user record with URL.
@returns {JSON} Updated user object with new avatar URL
@status 200 - Success
@status 400 - Upload error or missing file
@status 500 - Server error

@route PATCH /password
@middleware auth
@param {body} { current, newPassword }
@description Verifies current password, updates to new password
@returns {JSON} { message: "Mot de passe mis à jour." }
@status 200 - Success
@status 400 - Missing fields or too short
@status 401 - Current password incorrect
@status 500 - Server error

@route PATCH /avatar
@middleware auth, multer(avatarUpload)
@description Uploads avatar to Cloudinary (200x200 cropped), updates user record
@returns {JSON} Updated user object with new avatar URL
@status 200 - Success
@status 400 - Upload error or missing file
@status 500 - Server error
```

---

## `routes/admin.js` — Admin Routes

### Middleware

```js
@function adminOnly
@param {Request} req
@param {Response} res
@param {Function} next
@description Checks req.user.role === "admin"
@returns {void} Calls next() or 403
@status 403 - "Accès réservé à l'admin."
```

### Helper

```js
@function generateInviteCode
@param {string} role - "student", "teacher", or "alumni"
@returns {string} Format: "HEI-STD/PROF/ALUM-XXXXXX" (6 random alphanumeric chars)
```

### Routes

```js
@route GET /stats
@middleware auth, adminOnly
@description Runs 4 COUNT queries + GROUP BY role in parallel
@returns {JSON} { total_users, total_posts, total_submissions, total_messages, by_role }
@status 200 - Success
@status 500 - Server error

@route GET /users
@middleware auth, adminOnly
@param {query} q? - ILIKE search on ref/pseudo/email
@param {query} role? - comma-separated role filter
@param {query} limit? - page size (default 50, max 200)
@param {query} offset? - page offset (default 0)
@description Builds dynamic SQL with optional filters, paginated
@returns {JSON} { users: Array, total: number, limit: number, offset: number }
@status 200 - Success
@status 500 - Server error

@route PATCH /users/:id/role
@middleware auth, adminOnly
@param {params} id
@param {body} { role }
@description Changes user role (validates against whitelist)
@returns {JSON} { id, ref, pseudo, role }
@status 200 - Success
@status 400 - Invalid role
@status 404 - User not found
@status 500 - Server error

@route DELETE /users/:id
@middleware auth, adminOnly
@param {params} id
@description Deletes user, prevents self-deletion
@returns {JSON} { success: true }
@status 200 - Success
@status 400 - Cannot delete self
@status 500 - Server error

@route POST /invitations
@middleware auth, adminOnly
@param {body} { role, max_uses? }
@description Generates single invitation code (14 day expiry)
@returns {JSON} Invitation object
@status 201 - Created
@status 400 - Invalid role
@status 500 - Server error

@route POST /invitations/bulk
@middleware auth, adminOnly
@param {body} { role, count?, max_uses? }
@description Generates up to 1000 invitation codes in batches of 100 (batch INSERT)
@returns {JSON} { count, codes: Array }
@status 201 - Created
@status 400 - Invalid role
@status 500 - Server error

@route GET /invitations
@middleware auth, adminOnly
@param {query} limit? - page size (default 50, max 200)
@param {query} offset? - page offset (default 0)
@returns {JSON} { invitations: Array, total: number, limit: number, offset: number }
@status 200 - Success
@status 500 - Server error

@route DELETE /invitations/:id
@middleware auth, adminOnly
@param {params} id
@returns {JSON} { success: true }
@status 200 - Success
@status 500 - Server error
```

---

## `routes/posts.js` — Course Posts

```js
@route GET /
@param {query} ue? - filter by UE code
@param {query} type? - filter by post type (cours/td/examen)
@param {query} level? - expands to all UEs for that level
@param {query} limit? - page size (default 50, max 200)
@param {query} offset? - page offset (default 0)
@description Fetches posts with LEFT JOIN on users for author info, paginated
@returns {JSON} { posts: Array, total: number, limit: number, offset: number }
@status 200

@route POST /
@middleware auth, multer(upload)
@param {body} { title, description?, ue, type, link? }
@param {file} file? (optional, 20MB max)
@description Creates a new post (teacher/admin only). Requires file_path OR link.
  Uploads file to local uploads/ directory with timestamp prefix.
@returns {JSON} Created post object
@status 201
@status 400 - Missing fields or file/link
@status 403 - Forbidden role

@route DELETE /:id
@middleware auth
@description Deletes a post (teacher/admin only)
@returns {JSON} { message: "Post supprimé." }
@status 200
@status 403 - Forbidden role
```

---

## `routes/submissions.js` — Homework Submissions

```js
@route POST /
@middleware auth, multer(upload)
@param {body} { nom, prenom, email, ref, level, groupe, ue, type, link? }
@param {file} file? (optional, 10MB max)
@description Submits homework. Uploads file to Cloudinary (hei-stdhub/submissions).
  Requires file or link. Stores all student info denormalized.
@returns {JSON} Created submission object
@status 201
@status 400 - Missing fields or file/link

@route GET /
@middleware auth
@param {query} type?, groupe?, ue?, search?
@param {query} limit? - page size (default 50, max 200)
@param {query} offset? - page offset (default 0)
@description Lists submissions with pagination and server-side search.
  Teachers see only their assigned UEs submissions.
  Search matches ref, nom, prenom, email, groupe (ILIKE).
@returns {JSON} { submissions: Array, total: number, limit: number, offset: number }
@status 200
@status 403 - Forbidden role (student/bde)
```

---

## `routes/supports.js` — Support Links

```js
@route GET /:ue
@description Lists support links for a given UE (public)
@returns {JSON} Array of support objects with author_pseudo

@route POST /
@middleware auth
@param {body} { ue, label, url }
@description Creates a support link (teacher/admin only)
@returns {JSON} Created support object
@status 201
@status 400 - Missing fields
@status 403 - Forbidden role

@route DELETE /:id
@middleware auth
@description Deletes support link (teacher/admin only)
@returns {JSON} { message: "Support supprimé." }
```

---

## `routes/messages.js` — Chat Messages

### File Upload Setup

```js
@description Configures Cloudinary storage (hei-stdhub/chat) if env vars set,
  otherwise uses local disk storage (backend/uploads/chat/) with random hex filenames.
  File size limit: 10MB.
```

### Helpers

```js
@function sendPushWithConcurrency
@param {Array} subscriptions
@param {string} payload
@description Sends push notifications in batches of CONCURRENCY_LIMIT (10)
  using Promise.allSettled. On 410/404 error, deletes invalid subscription.
@returns {Promise<Array>} Results

@async
@function sendPushNotification
@param {number} userId
@param {Object} options { title, body, tag, url }
@description
  1. Fetches push subscriptions for userId
  2. Sends Web Push notification with concurrency limit of 10
  3. On 410/404 error, deletes invalid subscription
@returns {Promise<void>}

@async
@function sendPushToAll
@param {Object} options { title, body, tag, url }
@description
  1. Fetches ALL push subscriptions (DISTINCT on endpoint)
  2. Sends Web Push notification with concurrency limit of 10
  3. On 410/404 error, deletes invalid subscription
@returns {Promise<void>}
```

### Routes

```js
@route GET /search
@middleware auth
@param {query} q
@description Searches users by pseudo or ref (ILIKE), excludes current user, limit 10
@returns {JSON} Array of user objects
@status 200 - (empty array if no query)

@route GET /contacts
@middleware auth
@param {query} q? - ILIKE search on pseudo/ref
@param {query} limit? - page size (default 200)
@param {query} offset? - page offset (default 0)
@description Lists users with optional server-side search and pagination,
  sorted: teachers first, then admins, then others
@returns {JSON} { users: Array, total: number }

@route GET /global
@middleware auth
@param {query} before? - cursor: load messages older than this id
@param {query} limit? - page size (default 200, max 500)
@description Returns global messages with optional cursor pagination.
  Without before: returns the last N messages (ASC order).
  With before: returns N messages older than the given id (DESC then reversed).
@returns {JSON} Array of message objects

@route GET /private/:userId
@middleware auth
@param {params} userId
@param {query} before? - cursor: load messages older than this id
@param {query} limit? - page size (default 100, max 500)
@description Returns private message history with optional cursor pagination.
  Without before: returns the last N messages (ASC order).
  With before: returns N messages older than the given id (DESC then reversed).
@returns {JSON} Array of message objects

@route POST /
@middleware auth
@param {body} { content, receiver_id?, is_global? }
@description
  1. Validates content non-empty
  2. INSERT message
  3. If global: io.emit("message:global")
  4. If private: io.to("user:{id}").emit("message:private") for both sender & receiver
  5. If private: sends push notification to receiver
@returns {JSON} Full message object with sender_pseudo/sender_avatar
@status 201
@status 400 - Empty message or missing receiver for private

@route PATCH /seen
@middleware auth
@param {body} { ids: number[] }
@description Batch marks multiple messages as seen in one query.
  Emits "message:seen" to each sender's room.
  Replaces N+1 individual PATCH calls with a single query.
@returns {JSON} { updated: number }
@status 200
@status 400 - Missing or empty ids array

@route PATCH /:id/seen
@middleware auth
@param {params} id
@description Marks a single message as seen (only if receiver matches current user),
  emits "message:seen" to sender's room. Legacy endpoint.
@returns {JSON} Updated message
@status 200
@status 404 - Message not found

@route POST /upload
@middleware auth, multer(chatUpload)
@description Uploads file for chat sharing, returns filename, url, isImage
@returns {JSON} { filename, url, isImage }
@status 200
@status 400 - Upload error

@route GET /unread
@middleware auth
@description
  1. Reads global_chat_read.last_read_msg_id for current user
  2. Counts global messages after that id
  3. Groups private messages by contact, counts unread (received, not seen)
     and pending (sent, not seen by receiver)
@returns {JSON} { global: number, contacts: { [contactId]: { unread, pending } } }
@status 200

@route POST /global/read
@middleware auth
@param {body} { messageId }
@description Upserts global_chat_read to mark last read message id.
  Uses ON CONFLICT with GREATEST() to never regress.
@returns {JSON} { success: true }
@status 200
@status 400 - Missing messageId

@route DELETE /:id
@middleware auth
@description Hard-deletes message only if sender_id matches current user.
  Emits "message:deleted" socket event with message metadata.
@returns {JSON} { message: "Message supprimé." }
@status 200
@status 404 - Message introuvable ou non autorisé
```

---

## `routes/suggestions.js` — BDE Suggestions

```js
@route POST /
@middleware auth
@param {body} { titre, contenu, anonyme? }
@description Submits a suggestion (student/teacher/alumni/admin only)
@returns {JSON} Created suggestion
@status 201
@status 400 - Missing titre/contenu
@status 403 - Forbidden role (bde cannot submit)

@route GET /
@middleware auth
@param {query} limit? - page size (default 50, max 200)
@param {query} offset? - page offset (default 0)
@description Lists suggestions with pagination (BDE only).
  Anonymizes nom/prenom/email/ref when anonyme=true using CASE statements.
@returns {JSON} { suggestions: Array, total: number, limit: number, offset: number }
@status 200
@status 403 - Forbidden role

@route PATCH /:id
@middleware auth
@param {params} id
@param {body} { statut, justification? }
@description Updates suggestion status (BDE only).
  Refuse requires justification.
  Valid statuts: recu, accepte, a_discuter, refuse
@returns {JSON} Updated suggestion
@status 200
@status 400 - Invalid status or missing justification
@status 403 - Forbidden role
@status 404 - Not found

@route POST /confirm
@middleware auth
@description
  1. Fetches all processed suggestions (statut != 'recu')
  2. Builds chat summary message with French date and categorised results
  3. INSERTS as global chat message
  4. DELETEs all suggestions
@returns {JSON} { suggestions, message }
@status 200
@status 400 - No processed suggestions
@status 403 - Forbidden role

@route POST /report
@middleware auth
@param {body} { suggestions: Array }
@description Generates PDF report from suggestion data (BDE/admin only).
  Uses jsPDF via suggestionPdf service.
@returns {PDF} Binary PDF attachment
@status 200
@status 400 - Missing/invalid suggestions
@status 403 - Forbidden role
```

---

## `routes/push.js` — Push Notifications

```js
@route POST /subscribe
@middleware auth
@param {body} { subscription: { endpoint, keys: { auth, p256dh } } }
@description Stores push subscription (UPSERT via ON CONFLICT DO NOTHING)
@returns {JSON} { subscribed: true }
@status 201
@status 400 - Missing subscription

@route DELETE /subscribe
@middleware auth
@param {body} { endpoint }
@description Removes push subscription
@returns {JSON} { unsubscribed: true }
@status 200
@status 400 - Missing endpoint
```

---

## `services/mailer.js` — Email Service

### Helpers

```js
@function getFrontendUrl
@returns {string} CLIENT_URL or FRONTEND_URL or "http://localhost:5173" (trailing slash removed)

@function getFromAddress
@returns {string} SMTP_FROM | EMAIL_FROM | MAIL_FROM | SMTP_USER | "HEI STDhub <no-reply@hei-stdhub.local>"

@function createTransport
@returns {Object|null} Nodemailer transporter or null if no SMTP host configured

@function buildResetUrl
@param {string} token
@returns {string} Full reset URL with encoded token

@function escapeHtml
@param {string} value
@returns {string} HTML-safe string (&, <, >, ", ' escaped)

@function getEmailTimeoutMs
@returns {number} EMAIL_TIMEOUT_MS | RESEND_TIMEOUT_MS | 10000

@async
@function readResponseBody
@param {Response} response - fetch Response
@returns {string} Parsed JSON string or raw text

@async
@function sendWithResend
@param {Object} params - { user, subject, text, html }
@description POSTs to Resend API with Bearer auth and timeout
@returns {Object|null} API response JSON or null if no API key
@throws {Error} On non-ok response with status and body

@async
@function sendPasswordResetEmail
@param {Object} params - { user, token }
@description
  1. Validates user.email
  2. Builds reset URL, email content (plain text + HTML)
  3. Tries Resend first, then SMTP, then falls back to logging
@returns {Object} { skipped: boolean, resetUrl, provider?, result? }
@throws {Error} If user.email missing

@async
@function sendEmail
@param {Object} params - { user, subject, text, html }
@description Generic email sender. Tries Resend, then SMTP, then logs.
@returns {Object} { skipped: boolean, provider?, result? }
@throws {Error} If user.email missing
```

---

## `services/suggestionPdf.js` — PDF Report Generator

```js
@function generateSuggestionReport
@param {Array<Object>} suggestions - Array with { statut, titre, contenu, anonyme, prenom, nom, justification }
@description Generates a styled PDF report using jsPDF:
  1. Navy header with gold accents, title, date, reference
  2. Summary section (4 cards: Acceptees, A approfondir, Refusees, Total)
  3. 3 category sections with colored accent bars and suggestion cards
  4. Footer on each page
  Categories suggestions into acceptes / aDiscuter / refuses
  Truncates long content to 150 chars
  Shows "Anonyme" for anonymous suggestions
  Shows justification box for refused suggestions
@returns {jsPDF} PDF document object
```

---

## Database Schema (`db/schema.sql`)

### Enums
- `user_role`: student, teacher, admin, bde, alumni
- `user_level`: L1, L2, L3
- `post_type`: cours, td, examen
- `submit_type`: TD, Examen

### Tables

**users** — Core user accounts
- ref: UNIQUE, format by role (STD\d{5,}/PROF\d{3,}/ADMIN\d{3,})
- email: UNIQUE, students must match hei.xxx@gmail.com
- pseudo: UNIQUE, checked on register and profile update
- avatar: VARCHAR (Cloudinary URL or local path)
- ues: TEXT[] (teacher UE assignments)
- first_login: BOOLEAN DEFAULT TRUE
- level: NULL for teacher/admin/alumni, required for student/bde

**password_reset_tokens** — Password reset flow
- token_hash: SHA-256, UNIQUE
- expires_at: 1 hour
- used_at: single-use

**invitations** — Registration codes (via migration)
- code: HEI-STD/PROF/ALUM-XXXXXX
- max_uses, use_count
- expires_at: 14 days

**posts** — Course materials
- ue: CHECK valid UE code
- type: cours/td/examen
- file_path OR link required

**supports** — External resource links
- ue: CHECK valid UE code
- url: CHECK http:// or https://

**submissions** — Homework submissions
- groupe: CHECK by level (L1:N1-N4, L2:K1-K3, L3:J1-J2)
- file_path OR link required

**messages** — Chat messages
- is_global: TRUE = no receiver, FALSE = has receiver
- sender_id != receiver_id

**push_subscriptions** — Web Push endpoints
- UNIQUE(user_id, endpoint)

**global_chat_read** — Per-user global chat read tracking
- user_id: PK, FK users ON DELETE CASCADE
- last_read_msg_id: INTEGER DEFAULT 0
- updated_at: TIMESTAMP

### Valid UE Codes
WEB1, WEB2, WEB3, PROG1, PROG2, PROG2-POO, PROG2-API, PROG3, PROG4, PROG5, SYS1, SYS2, SYS3, DONNEES1, DONNEES2, THEORIE1-P1, THEORIE1-P2, MGT2, IA1, MOB1, SECU1, SECU2

### Seed Data
- ADMIN001 / admin@hei.mg / admin
- STD25001 / hei.fatratra@gmail.com / student L1
- PROF001 / tester@gmail.com / teacher

### Migrations (apply in order)
1. `migration_invitations.sql` — invitations table
2. `migration_first_login.sql` — first_login column
3. `migration_student_email_suffix.sql` — email constraint update
4. `migration_multi_use_invitations.sql` — max_uses/use_count
5. `migration_alumni_support.sql` — alumni/bde roles
6. `migration_chat_seen_pseudo_unique.sql` — avatar/ues columns, unique pseudo,
   seen/seen_at columns, global_chat_read table
7. `migration_scale_500.sql` — performance indexes for 500+ users:
   GIN on users.ues, composite on messages(sender_id, receiver_id),
   composite on messages(is_global, created_at), indexes on
   suggestions(student_id, statut, created_at),
   invitations(expires_at, use_count), push_subscriptions(endpoint)
