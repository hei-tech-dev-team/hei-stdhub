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
| `PATCH` | Partial update | Update | `PATCH /api/messages/seen` |
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
| `429` | Too Many Requests | Rate limited |
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
| `message:seen` | Server → Sender | `{ messageId, readerId }` | Receiver read the message |
| `message:deleted` | Server → All | `{ messageId, isGlobal, receiverId, senderId }` | A message was deleted |
| `unread:update` | Server → Sender | `{ contactId, unread, pending }` | Unread count changed |
| `user:online` / `user:offline` | Server → All | `userId` | Online status change |
| `typing:started` / `typing:stopped` | Server → User/Room | `{ userId, pseudo }` | Typing indicators |
| `ping:new` | Server → Receiver | `{ id, sender, created_at }` | New ping received |
| `ping:accepted` | Server → Sender | `{ id, receiver_id }` | Ping accepted |
| `ping:refused` | Server → Sender | `{ id, receiver_id }` | Ping refused |
| `user:registered` | Server → All | `newUser` | New user registered |
| `bde:drag-*` | Client ↔ Server | various | Real-time Kanban drag sync |
| `bde:update` | Server → BDE room | `{ id, statut, justification }` | Suggestion status updated |

---

## Axios (HTTP client)

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

| Method | Path | Auth | Role | Description |
|--------|------|------|------|-------------|
| POST | `/register` | No (invite) | Any | Register with invite code (checks pseudo uniqueness) |
| POST | `/login` | No | Any | Login (3 req/15min rate limit) |
| GET | `/user/:ref` | Yes | Any | Get public profile by reference |
| POST | `/forgot-password` | No | Any | Request password reset code via push notification |
| POST | `/forgot-password/verify-code` | No | Any | Verify 6-char reset code, returns reset token |
| GET | `/reset-password/:token` | No | Any | Verify reset token validity |
| POST | `/reset-password` | No | Any | Execute password reset with token |
| GET | `/me` | Yes | Any | Get current authenticated user |
| POST | `/verify-invite` | No | Any | Validate invitation code, return role |
| PATCH | `/profile` | Yes | Any | Update pseudo (checks uniqueness) |
| PATCH | `/password` | Yes | Any | Change password (requires current) |
| PATCH | `/avatar` | Yes | Any | Upload avatar (Cloudinary/local, max 5MB) |

### Messages (`/api/messages`)

| Method | Path | Auth | Role | Description |
|--------|------|------|------|-------------|
| GET | `/search?q=` | Yes | Any | Search users by ref/pseudo (limit 10) |
| GET | `/contacts?q=&limit=&offset=` | Yes | Any | List all users with pagination (default 200) |
| GET | `/global?before=&limit=` | Yes | Any | Global messages (cursor pagination, max 500) |
| GET | `/private/:userId?before=&limit=` | Yes | Any | PM history (cursor pagination, max 500) |
| POST | `/` | Yes | Any | Send message (global/private) + push notification |
| PATCH | `/seen` | Yes | Any | Batch mark messages as seen `{ ids: number[] }` |
| PATCH | `/:id/seen` | Yes | Any | Mark single message as seen (legacy) |
| POST | `/upload` | Yes | Any | Upload file for chat sharing (max 10MB) |
| GET | `/unread` | Yes | Any | Unread counts (global + per-contact) |
| POST | `/global/read` | Yes | Any | Mark global chat read up to messageId |
| DELETE | `/:id` | Yes | Sender | Delete own message (sender only) + Cloudinary cleanup |
| GET | `/favorites` | Yes | Any | List favorite contact IDs |
| POST | `/favorites` | Yes | Any | Add contact to favorites |
| DELETE | `/favorites/:contactId` | Yes | Any | Remove contact from favorites |

### Posts (`/api/posts`)

| Method | Path | Auth | Role | Description |
|--------|------|------|------|-------------|
| GET | `/` | No | Any | List posts (?ue=, ?type=, ?level=, ?limit=, ?offset=) |
| POST | `/` | Yes | teacher/admin | Create post (file max 20MB or link) + push to all |
| DELETE | `/:id` | Yes | teacher/admin | Delete post |

### Submissions (`/api/submissions`)

| Method | Path | Auth | Role | Description |
|--------|------|------|------|-------------|
| POST | `/` | Yes | Any | Submit homework (file max 10MB or link) + push to all |
| GET | `/` | Yes | teacher/admin | List submissions (teachers see only their UEs) |

### Supports (`/api/supports`)

| Method | Path | Auth | Role | Description |
|--------|------|------|------|-------------|
| GET | `/:ue` | No | Any | List support links for UE |
| POST | `/` | Yes | teacher/admin | Add support link |
| DELETE | `/:id` | Yes | teacher/admin | Delete support link |

### Suggestions (`/api/suggestions`)

| Method | Path | Auth | Role | Description |
|--------|------|------|------|-------------|
| POST | `/` | Yes | student/teacher/alumni/admin | Submit suggestion (profanity filtered) |
| GET | `/` | Yes | bde | List suggestions (?limit=, ?offset=) |
| PATCH | `/:id` | Yes | bde | Update suggestion status (recu/accepte/a_discuter/refuse) |
| POST | `/confirm` | Yes | bde | Confirm round: post summary to global chat + delete all |
| POST | `/report` | Yes | bde/admin | Generate PDF report |

### Admin (`/api/admin`)

| Method | Path | Auth | Role | Description |
|--------|------|------|------|-------------|
| GET | `/stats` | Yes | admin | Platform stats (users, posts, submissions, messages, by_role) |
| GET | `/users?q=&role=&limit=&offset=` | Yes | admin | List users with search and role filter (max 200) |
| PATCH | `/users/:id/role` | Yes | admin | Change user role |
| PATCH | `/users/:id/email` | Yes | admin | Change user email |
| DELETE | `/users/:id` | Yes | admin | Delete user (cannot delete self) |
| POST | `/class-upgrade` | Yes | admin | Upgrade all students L1→L2→L3→alumni (exclude failed refs) |
| POST | `/invitations` | Yes | admin | Generate single invitation code (14d expiry) |
| POST | `/invitations/bulk` | Yes | admin | Bulk generate up to 1000 codes (batch INSERT) |
| GET | `/invitations?limit=&offset=` | Yes | admin | List invitations (max 200) |
| DELETE | `/invitations/:id` | Yes | admin | Delete invitation |

### Announcements (`/api/announcements`)

| Method | Path | Auth | Role | Description |
|--------|------|------|------|-------------|
| GET | `/` | Yes | Any | List announcements (?level=, ?limit=, ?offset=) + reactions |
| POST | `/` | Yes | admin | Create announcement (optional image, target_level, max 10MB) + push |
| DELETE | `/:id` | Yes | admin | Delete announcement |
| POST | `/:id/react` | Yes | Any | Upsert reaction (like/haha/dont_like/sad) |
| DELETE | `/:id/react` | Yes | Any | Remove reaction |

### Alumni Spotlight (`/api/alumni-spotlight`)

| Method | Path | Auth | Role | Description |
|--------|------|------|------|-------------|
| GET | `/` | Yes | Any | List all tips + reactions |
| POST | `/` | Yes | alumni | Create tip (optional image, max 10MB) + push |
| DELETE | `/:id` | Yes | owner | Delete own tip |
| POST | `/:id/react` | Yes | Any | Upsert reaction (like/haha/dont_like/sad) |
| DELETE | `/:id/react` | Yes | Any | Remove reaction |

### Push Notifications (`/api/push`)

| Method | Path | Auth | Role | Description |
|--------|------|------|------|-------------|
| POST | `/subscribe` | Yes | Any | Subscribe to push notifications |
| DELETE | `/subscribe` | Yes | Any | Unsubscribe |
| GET | `/notifications` | Yes | Any | Get last 50 push notifications |
| PATCH | `/notifications/read` | Yes | Any | Mark notifications as read |
| GET | `/notifications/unread-count` | Yes | Any | Get unread push notification count |

### Pings (`/api/pings`)

| Method | Path | Auth | Role | Description |
|--------|------|------|------|-------------|
| POST | `/` | Yes | Any | Send ping to another user (cannot ping self) |
| GET | `/` | Yes | Any | Get all pings (sent and received) |
| PATCH | `/:id/accept` | Yes | receiver | Accept a pending ping |
| PATCH | `/:id/refuse` | Yes | receiver | Refuse a pending ping |

### Health & Misc

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/health` | No | Health check `{ status: "ok", time: Date }` |
| GET | `/api/push/vapid-key` | No | Get VAPID public key |
| GET | `/uploads/*` | No | Static file serving (avatars, announcements, chat, submissions) 7d cache |

---

## Database Tables Reference

| Table | Purpose | Key columns |
|-------|---------|-------------|
| `users` | User accounts | id, ref (UNIQUE), pseudo (UNIQUE), email, password (bcrypt), role (ENUM), level, avatar, ues (TEXT[]), first_login |
| `messages` | Chat messages | id, sender_id, receiver_id, content, is_global, seen, seen_at |
| `global_chat_read` | Per-user global chat read tracking | user_id (PK), last_read_msg_id |
| `push_subscriptions` | Web Push endpoints | user_id, endpoint (UNIQUE combo), auth_key, p256dh_key |
| `push_notifications` | Persistent notification history | user_id, type, title, body, data (JSONB), is_read |
| `posts` | Course materials | id, title, ue, type (cours/td/examen), file_path, link, author_id |
| `submissions` | Homework submissions | id, student_id, ref, level, groupe, ue, type (TD/Examen), file_path |
| `supports` | External resource links | id, ue, label, url (https://), author_id |
| `suggestions` | BDE suggestions | id, student_id, titre, contenu, anonyme, statut, justification |
| `announcements` | Admin announcements | id, title, content, image_url, target_level, author_id |
| `announcement_reactions` | Announcement reactions | announcement_id, user_id (UNIQUE), reaction_type |
| `alumni_spotlight` | Alumni tips | id, title, content, image_url, author_id |
| `alumni_spotlight_reactions` | Alumni tip reactions | tip_id, user_id (UNIQUE), reaction_type |
| `invitations` | Registration codes | code (UNIQUE), role, max_uses, use_count, expires_at, created_by |
| `password_reset_tokens` | Password reset | user_id, token_hash (SHA-256), expires_at, used_at |
| `pings` | Peer-to-peer pings | sender_id, receiver_id, status (pending/accepted/refused) |
| `chat_favorites` | Favorite contacts | user_id, contact_id (PK combo) |
