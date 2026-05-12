# ALL_ABOUT_API — API Concepts & Reference

## What is an API?

**API** (Application Programming Interface) is a set of rules that allows one software application to communicate with another. In web development, the term usually refers to **HTTP APIs** where a client (e.g., a React frontend) sends requests to a server (e.g., Express) and receives responses.

```
┌─────────────┐   HTTP Request   ┌─────────────┐   SQL Query   ┌────────────┐
│  Frontend   │ ───────────────→ │  Backend     │ ───────────→ │ PostgreSQL │
│  (React)    │ ←─────────────── │  (Express)   │ ←─────────── │ (Database) │
└─────────────┘   JSON Response  └─────────────┘   Result Rows └────────────┘
```

---

## HTTP Methods

| Method | Purpose | CRUD | Example in this project |
|--------|---------|------|------------------------|
| `GET` | Read data | Read | `GET /api/messages/global` |
| `POST` | Create data | Create | `POST /api/messages` |
| `PATCH` | Partial update | Update | `PATCH /api/messages/:id/seen` |
| `DELETE` | Remove data | Delete | `DELETE /api/messages/:id` |
| `PUT` | Full replace | Update | Not used (we use PATCH) |

### HTTP Status Codes

| Code | Meaning | When it happens |
|------|---------|-----------------|
| `200` | OK | Successful GET, PATCH, DELETE |
| `201` | Created | Successful POST (resource created) |
| `400` | Bad Request | Missing field, invalid input |
| `401` | Unauthorized | No token or invalid token |
| `403` | Forbidden | Wrong role (e.g., student on admin route) |
| `404` | Not Found | Resource doesn't exist |
| `409` | Conflict | Duplicate ref/email/pseudo |
| `429` | Too Many Requests | Rate limited (auth routes: 10 req/15min) |
| `500` | Server Error | Database down, uncaught exception |

---

## REST Principles

This API follows **REST** (Representational State Transfer) conventions:

1. **Resources mapped to URLs**: `/api/users`, `/api/messages`, `/api/posts`
2. **HTTP methods as actions**: GET to read, POST to create, PATCH to update, DELETE to remove
3. **Stateless**: Each request contains all info needed (auth token in header)
4. **JSON responses**: All responses are JSON objects
5. **Nested resources**: `/api/messages/private/:userId` — private messages for a user

---

## Express Route Handlers

Every route handler follows the same pattern:

```js
router.METHOD("/path", auth, async (req, res) => {
  try {
    // 1. Validate input (check req.body / req.params / req.query)
    if (!req.body.field) return res.status(400).json({ error: "Message en français." });

    // 2. Do the work (DB query, file upload, etc.)
    const { rows } = await db.query("SQL avec $1", [param]);

    // 3. Return success
    res.status(200).json(rows);
  } catch (err) {
    // 4. Log the real error
    console.error(err);
    // 5. Return safe user-friendly message
    res.status(500).json({ error: "Erreur serveur." });
  }
});
```

### Route Parameters

| Source | Access | Example |
|--------|--------|---------|
| URL path | `req.params.id` | `/api/messages/5` → `req.params.id = "5"` |
| Query string | `req.query.q` | `/api/messages/search?q=hello` → `req.query.q = "hello"` |
| Request body | `req.body.content` | `POST { "content": "hi" }` → `req.body.content = "hi"` |
| Auth user | `req.user.id` | Set by JWT middleware |

---

## WebSocket (Socket.IO)

### What is WebSocket?

WebSocket is a **full-duplex** communication protocol that keeps a persistent connection open between client and server. Unlike HTTP (request-response), the server can **push** data to clients at any time.

### HTTP vs WebSocket

| Aspect | HTTP | WebSocket |
|--------|------|-----------|
| Connection | Opens and closes per request | Stays open (long-lived) |
| Direction | Client → Server (request), Server → Client (response) | Bidirectional (both can send anytime) |
| Use case | CRUD operations, file uploads, authentication | Real-time chat, live updates, notifications |
| Overhead | Headers per request (cookies, auth, etc.) | Minimal after initial handshake |

### In this project

```js
// Client (frontend) — send and listen
const socket = await getSocket();
socket.emit("user:join", userId);                    // Client → Server
socket.on("message:global", (msg) => setMessages()); // Server → Client

// Server (backend) — broadcast
const io = req.app.get("io");
io.emit("message:global", fullMsg);                   // Server → ALL clients
io.to(`user:${userId}`).emit("message:private", msg); // Server → specific user
```

### Events Reference

| Event | Direction | Payload | Description |
|-------|-----------|---------|-------------|
| `user:join` | Client → Server | `userId` | Joins socket room, tracks online |
| `message:global` | Server → All | `fullMsg` | New global chat message |
| `message:private` | Server → User | `fullMsg` | New private message |
| `message:seen` | Server → Sender | `{ messageId }` | Receiver read the message |
| `message:deleted` | Server → All | `{ messageId, isGlobal, receiverId, senderId }` | A message was deleted |
| `unread:update` | Server → Sender | `{ contactId, unread, pending }` | Unread count changed |
| `user:online` / `user:offline` | Server → All | `userId` | Online status change |
| `bde:drag-*` | Client ↔ Server | various | Real-time Kanban drag sync |

---

## Nodemailer / Email Service

### How it works

The email service (`backend/services/mailer.js`) tries multiple providers in order:

```
sendPasswordResetEmail({ user, token })
    │
    ├── 1. Resend API (if RESEND_API_KEY set)
    │        POST https://api.resend.com/emails
    │
    ├── 2. SMTP (if SMTP_HOST set)
    │        Nodemailer.createTransport({ host, port, auth })
    │
    └── 3. Fallback: log to console
             console.log("EMAIL would be sent:", ...)
```

### Key functions

| Function | Purpose |
|----------|---------|
| `sendPasswordResetEmail({ user, token })` | Sends password reset link |
| `sendEmail({ user, subject, text, html })` | Generic email sender |
| `getFrontendUrl()` | Builds frontend URL from env vars |
| `escapeHtml(value)` | Sanitizes user data for HTML emails |

### Security

- Reset tokens: 32-byte random hex, SHA-256 hashed in DB
- Expiry: 1 hour
- Single-use: marked `used_at` after consumption
- Generic responses prevent email enumeration

---

## try/catch in API Calls

See `FOR_DEV.md` for a detailed explanation. Quick reference:

```js
// Backend — every route uses try/catch
try {
  const { rows } = await db.query("SELECT * FROM users WHERE id=$1", [id]);
  res.json(rows);
} catch (err) {
  console.error(err);                                    // Debug log
  res.status(500).json({ error: "Erreur serveur." });   // Safe message
}

// Frontend — every API call uses try/catch
try {
  const { data } = await api.get("/messages/global");
  setMessages(data);
} catch (err) {
  setError(err.response?.data?.error || "Erreur.");
}
```

Without try/catch, a database error would crash the server (backend) or leave the UI in a broken state (frontend).

---

## Axios (HTTP client)

See `FOR_DEV.md` for a detailed comparison with `fetch`. Quick reference:

| Operation | Code |
|-----------|------|
| GET | `api.get("/messages/global")` |
| POST | `api.post("/messages", { content, is_global: true })` |
| PATCH | `api.patch("/auth/profile", { pseudo })` |
| DELETE | `api.delete("/messages/5")` |
| Upload | `api.post("/upload", formData, { headers: { "Content-Type": "multipart/form-data" } })` |

The configured instance (`api/axios.js`) automatically:
- Adds `Authorization: Bearer <token>` header
- Redirects to `/login` on 401 (non-auth routes)

---

## Complete API Route Reference

### Auth (`/api/auth`)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/register` | No | Register with invite code (checks pseudo uniqueness) |
| POST | `/login` | No | Login (10 req/15min rate limit) |
| POST | `/forgot-password` | No | Request password reset email |
| GET | `/reset-password/:token` | No | Verify reset token |
| POST | `/reset-password` | No | Execute password reset |
| GET | `/me` | Yes | Get current user profile |
| POST | `/verify-invite` | No | Validate invitation code |
| PATCH | `/profile` | Yes | Update pseudo (checks uniqueness) |
| PATCH | `/password` | Yes | Change password |
| PATCH | `/avatar` | Yes | Upload avatar (Cloudinary/local) |

### Messages (`/api/messages`)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/search?q=` | Yes | Search users by ref/pseudo |
| GET | `/contacts` | Yes | List all users for contact list |
| GET | `/global` | Yes | Last 200 global messages |
| GET | `/private/:userId` | Yes | PM history between current user and userId |
| POST | `/` | Yes | Send message (global/private) + push notification |
| PATCH | `/:id/seen` | Yes | Mark message as seen |
| POST | `/upload` | Yes | Upload file for chat sharing |
| GET | `/unread` | Yes | Unread counts (global + per-contact) |
| POST | `/global/read` | Yes | Mark global chat read up to messageId |
| DELETE | `/:id` | Yes | Delete own message (sender only) |

### Posts (`/api/posts`)

| Method | Path | Auth | Role | Description |
|--------|------|------|------|-------------|
| GET | `/` | No | Any | List posts (?ue=, ?type=, ?level=) |
| POST | `/` | Yes | teacher/admin | Create post (file or link) |
| DELETE | `/:id` | Yes | teacher/admin | Delete post |

### Submissions (`/api/submissions`)

| Method | Path | Auth | Role | Description |
|--------|------|------|------|-------------|
| POST | `/` | Yes | Any | Submit homework (file or link) |
| GET | `/` | Yes | teacher/admin | List submissions (filtered by teacher's UEs) |

### Supports (`/api/supports`)

| Method | Path | Auth | Role | Description |
|--------|------|------|------|-------------|
| GET | `/:ue` | No | Any | List support links for UE |
| POST | `/` | Yes | teacher/admin | Add support link |
| DELETE | `/:id` | Yes | teacher/admin | Delete support link |

### Suggestions (`/api/suggestions`)

| Method | Path | Auth | Role | Description |
|--------|------|------|------|-------------|
| POST | `/` | Yes | student/teacher/alumni/admin | Submit suggestion |
| GET | `/` | Yes | bde | List suggestions (anonymized) |
| PATCH | `/:id` | Yes | bde | Update suggestion status |
| POST | `/confirm` | Yes | bde | Confirm round: post summary to global chat |
| POST | `/report` | Yes | bde/admin | Generate PDF report |

### Admin (`/api/admin`)

| Method | Path | Auth | Role | Description |
|--------|------|------|------|-------------|
| GET | `/stats` | Yes | admin | Platform stats (polled every 3s) |
| GET | `/users` | Yes | admin | List users (?q=, ?role=) |
| PATCH | `/users/:id/role` | Yes | admin | Change user role |
| DELETE | `/users/:id` | Yes | admin | Delete user (not self) |
| POST | `/invitations` | Yes | admin | Generate invitation (14d expiry) |
| POST | `/invitations/bulk` | Yes | admin | Bulk generate (up to 1000) |
| GET | `/invitations` | Yes | admin | List invitations |
| DELETE | `/invitations/:id` | Yes | admin | Delete invitation |

### Push (`/api/push`)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/subscribe` | Yes | Subscribe to push notifications |
| DELETE | `/subscribe` | Yes | Unsubscribe |

### Health & Misc

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/health` | No | Health check |
| GET | `/push/vapid-key` | No | Get VAPID public key |

---

## Database Tables Reference

| Table | Purpose | Key columns |
|-------|---------|-------------|
| `users` | User accounts | id, ref, pseudo (UNIQUE), email, password, role, level, avatar, ues, first_login |
| `messages` | Chat messages | id, sender_id, receiver_id, content, is_global, seen, seen_at |
| `global_chat_read` | Per-user global chat read tracking | user_id (PK), last_read_msg_id |
| `push_subscriptions` | Web Push endpoints | user_id, endpoint (UNIQUE combo), auth_key, p256dh_key |
| `posts` | Course materials | id, title, ue, type, file_path, link, author_id |
| `submissions` | Homework submissions | id, student_id, ref, level, groupe, ue, type, file_path |
| `supports` | External resource links | id, ue, label, url, author_id |
| `suggestions` | BDE suggestions | id, student_id, titre, contenu, anonyme, statut, justification |
| `invitations` | Registration codes | code, role, max_uses, use_count, expires_at |
| `password_reset_tokens` | Password reset | user_id, token_hash (SHA-256), expires_at, used_at |
