# HEI STDhub v2 — FOR_DEV

> See also:
> - `FOR_BACK_DEV.md` — Backend code documentation
> - `FOR_FRONT_DEV.md` — Frontend code documentation
> - `FOR_OPS.md` — Operations, deployment, environment variables
> - `FOR_QA.md` — Testing, QA checklist
> - `FOR_CONTRIBUTING.md` — Contribution guidelines, code style, Git workflow
> - `ALL_ABOUT_API.md` — API reference with concepts explained

## Project Overview

Full-stack web platform for **HEI Madagascar** (school). Students browse course materials, submit homework, chat in real-time, submit suggestions to BDE. Teachers publish materials, view submissions. BDE manages suggestions via Kanban. Alumni share tips. Admin manages users, invitations, announcements, and seasonal operations.

---

## Tech Stack

### Frontend
- React 19, Vite 7, Tailwind CSS 3, React Router 7
- Socket.IO Client 4 (real-time chat & BDE sync)
- Font Awesome 7, Lucide React (icons)
- jsPDF 4 (PDF reports)
- DOMPurify (XSS sanitization)
- Axios (HTTP with auth interceptor)
- emoji-picker-react
- @vercel/analytics

### Backend
- Express 5, Socket.IO 4, PostgreSQL (pg)
- JWT (jsonwebtoken + bcryptjs)
- Cloudinary + Multer (file uploads)
- express-rate-limit, web-push, compression, cors
- jsPDF (server-side PDF generation)

### Testing
- Backend: Mocha + Chai + Supertest
- Frontend: Mocha + Chai

### Deployment
- Frontend: Vercel (SPA rewrites in vercel.json)
- Backend: Render (keep-alive ping via start.sh)

---

## Project Structure

```
hei-stdhub-v2/
├── package.json                         # Root scripts
├── README.md
├── docs/
│   ├── ALL_ABOUT_API.md                 # API concepts & reference
│   ├── FOR_DEV.md                       # This file
│   ├── FOR_BACK_DEV.md                  # Backend code documentation
│   ├── FOR_FRONT_DEV.md                 # Frontend code documentation
│   ├── FOR_OPS.md                       # Operations & deployment
│   ├── FOR_QA.md                        # Testing & QA
│   ├── FOR_CONTRIBUTING.md              # Contribution guidelines
│   └── EMAIL_SETUP.md                   # Email configuration
├── backend/
│   ├── package.json
│   ├── server.js                        # Entry point: Express, Socket.IO, rate limiting, VAPID, schema migrations
│   ├── start.sh                         # Production startup script
│   ├── .env.example
│   ├── .mocharc.json
│   ├── db/
│   │   ├── index.js                     # PostgreSQL pool
│   │   └── schema.sql                   # Full database schema + seed data
│   ├── middleware/
│   │   ├── auth.js                      # JWT verification middleware
│   │   └── profanity.js                 # Profanity filter (EN/FR/MG/leetspeak)
│   ├── routes/
│   │   ├── auth.js                      # 12 endpoints — register, login, password reset, profile, avatar
│   │   ├── admin.js                     # 10 endpoints — users, invitations, stats, class upgrade
│   │   ├── posts.js                     # 3 endpoints — course materials CRUD
│   │   ├── submissions.js               # 2 endpoints — homework submit/list
│   │   ├── supports.js                  # 3 endpoints — external links CRUD
│   │   ├── messages.js                  # 14 endpoints — chat, search, upload, favorites, seen, unread
│   │   ├── suggestions.js               # 5 endpoints — submit, list, patch, confirm, report
│   │   ├── announcements.js             # 5 endpoints — CRUD + reactions
│   │   ├── alumniSpotlight.js           # 5 endpoints — CRUD + reactions
│   │   ├── push.js                      # 5 endpoints — subscribe, unsubscribe, notifications
│   │   └── pings.js                     # 4 endpoints — send, list, accept, refuse
│   ├── services/
│   │   ├── notificationService.js       # Web Push notification sender (batched, concurrency 10)
│   │   └── suggestionPdf.js            # PDF report generator (jsPDF, navy/gold)
│   ├── test/                            # Backend test files
│   └── uploads/                         # Local file storage fallback
├── frontend/
│   ├── package.json
│   ├── vite.config.js
│   ├── tailwind.config.js
│   ├── vercel.json
│   ├── postcss.config.js
│   ├── eslint.config.js
│   ├── index.html
│   ├── public/
│   │   ├── sw.js                        # Service worker (push + cache)
│   │   ├── manifest.json                # PWA manifest
│   │   └── logo*.png
│   └── src/
│       ├── main.jsx                     # React entry + push notification fetch
│       ├── App.jsx                      # Router with route guards
│       ├── index.css                    # Tailwind + custom styles
│       ├── api/
│       │   └── axios.js                 # Axios instance + auth interceptor
│       ├── context/
│       │   └── AuthContext.jsx           # Auth provider
│       ├── socket.js                    # Socket.IO client singleton
│       ├── push.js                      # Push subscription helpers
│       ├── utils/
│       │   └── roleFilter.js            # Role expansion, registration helpers
│       ├── assets/
│       │   └── logos.js                 # Logo URLs
│       ├── pages/                       # 16 page components
│       └── components/                  # Reusable components
│           ├── layout/                  # Sidebar, Navbar
│           ├── dashboard/               # StudentHome, TeacherHome, AlumniHome, AdminHome
│           ├── chat/                    # ChatLayout, ContactList, MessagePanel, useLongPress
│           ├── archives/                # ArchiveGrid, ArchiveCard
│           ├── td/                      # StudentUpload, TeacherInbox
│           └── ui/                      # Avatar, Badge, OnboardingModal, GlassDomeLogo, etc.
└── database/
    ├── migration_invitations.sql
    ├── migration_first_login.sql
    ├── migration_student_email_suffix.sql
    ├── migration_multi_use_invitations.sql
    ├── migration_alumni_support.sql
    ├── migration_chat_seen_pseudo_unique.sql
    └── migration_scale_500.sql
```

---

## Frontend Pages

| Route | Page | Access | Description |
|-------|------|--------|-------------|
| `/login` | LoginPage | Public | Login with ref/password, alumni toggle |
| `/register` | RegisterPage | Public | Two-step: invite code + form (role-based fields) |
| `/forgot-password` | ForgotPasswordPage | Public | Email input → 6-char code via push → new password |
| `/reset-password` | ResetPasswordPage | Public | Token + new password form |
| `/` | HomePage | Protected | Role-based dashboard (Student/Teacher/Alumni/AdminHome) |
| `/archives` | ArchivesPage | Protected | Course materials by UE with support links |
| `/td` | TDPage | Protected | Homework (student) / Inbox (teacher) |
| `/chat` | ChatPage | Protected | Real-time chat (global + private) |
| `/suggestions` | SuggestionPage | Protected | Submit anonymous suggestion to BDE |
| `/bde` | BDEPage | BDE only | Kanban for suggestion triage |
| `/admin` | AdminPage | Admin only | Users, invitations, stats, seasonal forms |
| `/profile` | ProfilePage | Protected | Avatar, pseudo, password |
| `/profile/:ref` | UserProfilePage | Protected | View any user's public profile |
| `/ping-box` | PingBoxPage | Protected | Manage incoming/outgoing pings |
| `/std-news` | STDnewsPage | Protected | Announcements + alumni spotlight feed with reactions |
| `/alumni-spotlight` | AlumniSpotlightPage | Alumni | Create alumni tips with optional image |

---

## Database Schema

### Enums
- `user_role`: `student`, `teacher`, `admin`, `bde`, `alumni`
- `user_level`: `L1`, `L2`, `L3`
- `post_type`: `cours`, `td`, `examen`
- `submit_type`: `TD`, `Examen`

### Valid UE Codes
WEB1, WEB2, WEB3, PROG1, PROG2-POO, PROG2-API, PROG3, PROG4, PROG5, SYS1, SYS2, SYS3, DONNEES1, DONNEES2, THEORIE1-P1, THEORIE1-P2, MGT2, IA1, MOB1, SECU1, SECU2

### Groups
- L1: N1, N2, N3, N4 (STD25)
- L2: K1, K2, K3 (STD24)
- L3: J1, J2 (STD23)
- Alumni: G prom (STD21), H prom (STD22)

### Seed Data
- Admin: `ADMIN001` / `password`
- Student: `STD25001` / `password` (L1)
- Teacher: `PROF001` / `password`
- Invitation codes: `HEI-STD-DEVTEST`, `HEI-PROF-DEVTEST`, `HEI-ALUM-DEVTEST`

---

## Authentication Flow

1. **Registration**: Valid invitation code required (generated by admin). Code verified via `POST /api/auth/verify-invite`. Registration creates user, increments invite `use_count`, returns JWT. Admin can also register users directly (L1 registration in November).
2. **Login**: `ref` + `password`. Server verifies bcrypt hash, checks `first_login` flag, returns JWT + user data.
3. **JWT**: `{ id, ref, role, ues, level }` signed with `JWT_SECRET`, expires in **7 days**. Sent as `Bearer <token>` in `Authorization` header.
4. **Auth Middleware**: Verifies JWT on protected routes, attaches `req.user`.
5. **Frontend**: Token in `localStorage` key `hei_token`. User object in `hei_user`. Axios interceptor adds `Authorization`. On 401 (non-auth routes), token cleared + redirect to `/login`.
6. **Rate Limiting**: Login/register: 3 req/15min. Forgot-password: 2 req/15min. Verify-code: 2 req/15min.
7. **Password Reset**: Push-based 6-char code flow. Email → receive code via push notification → verify code → receive reset token → set new password. Reset token: SHA-256 hash, 1-hour expiry, single-use.

---

## Real-Time Features (Socket.IO) — Optimized for 1000+ users

- **Global Chat**: Broadcast via `message:global` event to all.
- **Private Chat**: Sent to `user:{userId}` room + echo to sender.
- **Online/Offline**: `user:join` / `user:leave` broadcast via `socket.broadcast.emit`. Tracked in `onlineUsers` Map (max 5000).
- **Seen Status**: `message:seen` event notifies sender via `io.to(user:{senderId})`.
- **Message Deletion**: `message:deleted` event broadcast with metadata.
- **Unread Counts**: `unread:update` event sent to sender after private message.
- **Typing Indicators**: `typing:started`/`typing:stopped` — global chat uses `socket.to("global-chat")`, private uses `io.to(user:{contactId})`.
- **Pings**: `ping:new`, `ping:accepted`, `ping:refused` events sent to affected user rooms.
- **BDE Sync**: BDE members join `bde` room. Drag-and-drop events scoped via `socket.to("bde")`.
- **Push Notifications**: Sent via `sendPushToUser` (private messages) or `sendPushToAll` (posts, submissions, announcements, alumni tips) with concurrency control (10 parallel). Invalid subscriptions cleaned up on 410/404.
- **Connection Auth**: JWT verified via `socket.handshake.auth.token` on connection.
- **Performance**: `perMessageDeflate` compression (threshold: 1KB), `maxHttpBufferSize` (1MB), `connectionStateRecovery` (2 min window), `pingTimeout` (20s).
- **Reconnection**: Stale rooms cleaned on reconnect. `refreshSocket()` for token changes.

---

## File Storage

- **Avatars**: Cloudinary `hei-stdhub/avatars` folder, 200x200 crop (local fallback: `backend/uploads/avatars/`). Max 5MB.
- **Submissions**: Cloudinary `hei-stdhub/submissions` folder, auto resource type (local fallback: `backend/uploads/submissions/`). Max 10MB.
- **Chat files**: Cloudinary `hei-stdhub/chat` folder (local fallback: `backend/uploads/chat/`). Max 10MB. Supports docs, images, code files.
- **Course posts**: Local `backend/uploads/` with timestamp-prefixed filenames. Max 20MB.
- **Announcements**: Cloudinary `hei-stdhub/announcements` folder, 1200px width limit (local fallback). Max 10MB.
- **Alumni Spotlight**: Cloudinary `hei-stdhub/alumni-spotlight` folder, 1200px width limit (local fallback). Max 10MB.

---

## Environment Variables

### Backend (`backend/.env`)
| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| PORT | No | 3001 | Server port |
| DATABASE_URL | **Yes** | — | PostgreSQL connection string |
| JWT_SECRET | **Yes** | — | JWT signing secret |
| CLIENT_URL | **Yes** | — | Frontend URL for CORS |
| NODE_ENV | No | — | Set to `production` for prod |
| BACKEND_URL | No | — | Self-ping URL for Render keep-alive |
| VAPID_PUBLIC_KEY | No | auto-generated | VAPID public key (persist in prod) |
| VAPID_PRIVATE_KEY | No | auto-generated | VAPID private key (persist in prod) |
| CLOUDINARY_* | No | — | Cloudinary config (3 vars) |
| DB_POOL_MAX | No | 25 | Max pool connections |
| DB_IDLE_TIMEOUT | No | 30000 | Idle connection timeout |
| DB_CONNECT_TIMEOUT | No | 5000 | Connection timeout |
| REQUEST_TIMEOUT | No | 30000 | HTTP request timeout |
| PUSH_CONCURRENCY | No | 10 | Parallel push notifications |
| MAX_ONLINE_USERS | No | 5000 | Max tracked online users |
| SOCKET_* | No | various | Socket.IO tuning knobs |

### Frontend (`frontend/.env`)
| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| VITE_API_URL | No | http://localhost:3001 | Backend API URL |

---

## Running the Project

### Development
```bash
# Backend (port 3001)
cd backend && npm install && npm run dev

# Frontend (port 5173)
cd frontend && npm install && npm run dev

# Database: run schema.sql then migrations in order
```

### Production
```bash
# Frontend build (Vercel)
cd frontend && npm run build

# Backend start (Render)
cd backend && npm start
```

### Testing
```bash
cd backend && npm test    # Mocha/Chai/Supertest
cd frontend && npm test   # Mocha/Chai (chat utils)
```

### Version Bumping
```bash
npm run release:patch   # 1.5.6 -> 1.5.7
npm run release:minor   # 1.5.6 -> 1.6.0
npm run release:major   # 1.5.6 -> 2.0.0
```

---

## Key Implementation Details

### PWA
- Service worker registers on window load, caches `/`, `/logo.png`, `/manifest.json`.
- Push notifications: payload data navigates to URL on click.
- Manifest: standalone display, portrait, 192x512 icons.
- Login/register triggers push subscription.

### Styling
- Colors: Navy (`#001948`, `#0A1A33`), Gold (`#DFA408`, `#F2C94C`), Surface (`#F2F4F8`), Contact (`#D9DCE3`).
- Font: Quicksand (sans-serif).
- Glassmorphism on auth pages, chat, onboarding modal.

### Seasonal Admin Features
- **September** (`month === 8`, 0-indexed): "Passage de classe" tab — promote L1→L2, L2→L3, L3→alumni with failed refs exclusion.
- **November** (`month === 10`, 0-indexed): "Nouveaux L1" tab — register new L1 students with auto-generated STD ref.

### BDE Workflow
1. Suggestions submitted (optionally anonymous) by students/teachers/alumni.
2. BDE Kanban: 4 columns (Reçu, Accepté, À discuter, Refusé).
3. Drag-and-drop with mouse/touch, real-time sync via Socket.IO.
4. Refuse requires justification.
5. "Confirm & generate report" posts summary to global chat + generates PDF + deletes all suggestions.

### Invitation Codes
- Format: `HEI-STD-XXXXXX`, `HEI-PROF-XXXXXX`, `HEI-ALUM-XXXXXX`
- Expire: 14 days
- Configurable `max_uses` (default 1)
- Bulk generation: up to 1000 codes, batch INSERT of 100

### Validation Rules
- Student emails: `hei.*@gmail.com` (format `hei.prenom.nom.chiffre@gmail.com`)
- Student refs: `STD\d{5,}`
- Teacher refs: `PROF\d{3,}`
- Admin refs: `ADMIN\d{3,}`
- Alumni refs: `STD21\d+` or `STD22\d+`
- Posts: 21 valid UE codes, types cours/td/examen
- Submissions: types TD/Examen, groups by level
- Messages: profanity filter on global chat
- Suggestions: profanity filter on title and content

### Security
- All SQL queries use parameterized placeholders (`$1`, `$2`) — no string interpolation
- Passwords bcrypt hashed (salt rounds: 10)
- Password reset tokens: SHA-256 hash, 1-hour expiry, single-use
- Chat content sanitized client-side with DOMPurify
- Profanity filter covers English, French, Malagasy, leetspeak
- Rate limiting on all auth-sensitive endpoints
- CORS restricted to known origins
- Request timeout (30s) prevents hanging connections

---

## Error Handling: `try/catch`

Every route handler follows this exact pattern:

```js
router.get("/example", auth, async (req, res) => {
  try {
    const { rows } = await db.query("SELECT * FROM table WHERE id=$1", [id]);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erreur serveur." });
  }
});
```

Frontend API calls also use try/catch to handle failures gracefully:

```js
try {
  const { data } = await api.post("/messages", payload);
} catch (err) {
  setError(err.response?.data?.error || "Erreur.");
}
```
