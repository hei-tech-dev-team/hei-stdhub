# HEI STDhub v2 — FOR_DEV

> See also:
> - `FOR_BACK_DEV.md` — Backend code documentation (all functions with @ notation)
> - `FOR_FRONT_DEV.md` — Frontend code documentation (all functions with @ notation)
> - `FOR_OPS.md` — Operations, deployment, environment variables
> - `FOR_QA.md` — Testing, QA checklist, how to add tests
> - `FOR_CONTRIBUTING.md` — Contribution guidelines, code style, Git workflow

## Project Overview

Full-stack web platform for **HEI Madagascar** (school). Students browse course materials, submit homework, chat in real-time, submit suggestions to BDE. Teachers publish materials, view submissions. BDE manages suggestions via Kanban. Admin manages users, invitations, and seasonal operations.

---

## Tech Stack

### Frontend
- React 19, Vite 7, Tailwind CSS 3, React Router 7
- Socket.IO Client 4 (real-time chat & BDE sync)
- Font Awesome 7, Lucide React (icons)
- jsPDF 4 + html2canvas (PDF reports)
- DOMPurify (XSS sanitization)
- Axios (HTTP with auth interceptor)
- @vercel/analytics

### Backend
- Express 5, Socket.IO 4, PostgreSQL (pg)
- JWT (jsonwebtoken + bcryptjs)
- Nodemailer + Resend API (email)
- Cloudinary + Multer (file uploads)
- express-rate-limit, web-push, compression, cors

### Testing
- Mocha + Chai + Supertest (144 tests)

### Deployment
- Frontend: Vercel (SPA rewrites in vercel.json)
- Backend: Render (keep-alive ping)

---

## Project Structure

```
hei-stdhub-v2/
├── package.json
├── README.md
├── FOR_DEV.md
├── .gitignore
├── backend/
│   ├── package.json
│   ├── server.js                    # Entry point
│   ├── .env
│   ├── .mocharc.json
│   ├── db/
│   │   ├── index.js                 # PostgreSQL pool
│   │   └── schema.sql               # Full database schema
│   ├── middleware/
│   │   └── auth.js                  # JWT verification middleware
│   ├── routes/
│   │   ├── auth.js                  # Auth routes
│   │   ├── admin.js                 # Admin routes
│   │   ├── posts.js                 # Course posts routes
│   │   ├── submissions.js           # Homework submissions routes
│   │   ├── supports.js              # Support links routes
│   │   ├── messages.js              # Chat messages routes
│   │   ├── suggestions.js           # Suggestions routes
│   │   └── push.js                  # Push notification routes
│   ├── services/
│   │   ├── mailer.js                # Nodemailer + Resend
│   │   └── suggestionPdf.js         # PDF report generator
│   ├── test/                        # 7 test files (144 tests)
│   └── uploads/                     # Local file uploads
├── frontend/
│   ├── package.json
│   ├── vite.config.js
│   ├── tailwind.config.js
│   ├── vercel.json
│   ├── postcss.config.js
│   ├── eslint.config.js
│   ├── index.html
│   ├── public/
│   │   ├── sw.js                    # Service worker (push + cache)
│   │   ├── manifest.json            # PWA manifest
│   │   └── logo.png
│   └── src/
│       ├── main.jsx                 # React entry
│       ├── App.jsx                  # Router with protected routes
│       ├── index.css                # Tailwind + custom styles
│       ├── api/
│       │   └── axios.js             # Axios instance + auth interceptor
│       ├── context/
│       │   └── AuthContext.jsx       # Auth provider
│       ├── socket.js                # Socket.IO client singleton
│       ├── push.js                  # Push subscription helpers
│       ├── utils/
│       │   └── roleFilter.js        # Role filtering utilities
│       ├── assets/
│       │   └── logos.js             # Logo URLs
│       ├── pages/                   # 12 pages
│       └── components/              # Reusable components
│           ├── layout/              # Sidebar, Navbar
│           ├── dashboard/           # StudentHome, TeacherHome, AlumniHome
│           ├── chat/                # ChatLayout, ContactList, MessagePanel
│           ├── archives/            # ArchiveGrid
│           ├── td/                  # StudentUpload, TeacherInbox
│           └── ui/                  # Avatar, Badge, OnboardingModal
└── database/
    ├── migration_alumni_support.sql
    ├── migration_first_login.sql
    ├── migration_invitations.sql
    ├── migration_multi_use_invitations.sql
    └── migration_student_email_suffix.sql
```

---

## All API Routes

### Auth Routes (`/api/auth`)
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/auth/register` | No | Register (requires invite code) |
| POST | `/api/auth/login` | No | Login (rate limited: 10/15min) |
| POST | `/api/auth/forgot-password` | No | Request reset email (rate limited) |
| GET | `/api/auth/reset-password/:token` | No | Verify reset token |
| POST | `/api/auth/reset-password` | No | Execute reset (rate limited) |
| GET | `/api/auth/me` | Yes | Get current user profile |
| POST | `/api/auth/verify-invite` | No | Verify invitation code |
| PATCH | `/api/auth/profile` | Yes | Update pseudo |
| PATCH | `/api/auth/password` | Yes | Change password |
| PATCH | `/api/auth/avatar` | Yes | Upload avatar (Cloudinary) |

### Posts Routes (`/api/posts`)
| Method | Path | Auth | Role | Description |
|--------|------|------|------|-------------|
| GET | `/api/posts` | No | Any | List posts (?ue=, ?type=, ?level=) |
| POST | `/api/posts` | Yes | teacher/admin | Create post (file or link) |
| DELETE | `/api/posts/:id` | Yes | teacher/admin | Delete post |

### Submissions Routes (`/api/submissions`)
| Method | Path | Auth | Role | Description |
|--------|------|------|------|-------------|
| POST | `/api/submissions` | Yes | Any | Submit homework (file or link) |
| GET | `/api/submissions` | Yes | teacher/admin | List submissions (filtered by teacher's UEs) |

### Supports Routes (`/api/supports`)
| Method | Path | Auth | Role | Description |
|--------|------|------|------|-------------|
| GET | `/api/supports/:ue` | No | Any | List support links for UE |
| POST | `/api/supports` | Yes | teacher/admin | Add support link |
| DELETE | `/api/supports/:id` | Yes | teacher/admin | Delete support link |

### Messages Routes (`/api/messages`)
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/messages/search?q=` | Yes | Search users by ref/pseudo |
| GET | `/api/messages/contacts` | Yes | List all users |
| GET | `/api/messages/global` | Yes | Last 200 global messages |
| GET | `/api/messages/private/:userId` | Yes | Private messages with user |
| POST | `/api/messages` | Yes | Send message (global/private) + push |
| PATCH | `/api/messages/:id/seen` | Yes | Mark message as seen |
| POST | `/api/messages/upload` | Yes | Upload chat file |

### Suggestions Routes (`/api/suggestions`)
| Method | Path | Auth | Role | Description |
|--------|------|------|------|-------------|
| POST | `/api/suggestions` | Yes | student/teacher/alumni/admin | Submit suggestion |
| GET | `/api/suggestions` | Yes | bde | List suggestions (anonymized) |
| PATCH | `/api/suggestions/:id` | Yes | bde | Update suggestion status |
| POST | `/api/suggestions/confirm` | Yes | bde | Confirm round: post summary to chat |
| POST | `/api/suggestions/report` | Yes | bde/admin | Generate PDF report |

### Admin Routes (`/api/admin`)
| Method | Path | Auth | Role | Description |
|--------|------|------|------|-------------|
| GET | `/api/admin/stats` | Yes | admin | Platform stats (polling 3s) |
| GET | `/api/admin/users` | Yes | admin | List users (?q=, ?role=) |
| PATCH | `/api/admin/users/:id/role` | Yes | admin | Change user role |
| DELETE | `/api/admin/users/:id` | Yes | admin | Delete user (not self) |
| POST | `/api/admin/invitations` | Yes | admin | Generate invitation (14d expiry) |
| POST | `/api/admin/invitations/bulk` | Yes | admin | Bulk generate (up to 1000) |
| GET | `/api/admin/invitations` | Yes | admin | List invitations |
| DELETE | `/api/admin/invitations/:id` | Yes | admin | Delete invitation |

### Push Routes (`/api/push`)
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/push/subscribe` | Yes | Subscribe to push |
| DELETE | `/api/push/subscribe` | Yes | Unsubscribe |

### Health & Misc
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/health` | No | Health check |
| GET | `/api/push/vapid-key` | No | Get VAPID public key |

---

## Frontend Pages

| Route | Page | Access | Description |
|-------|------|--------|-------------|
| `/login` | LoginPage.jsx | Public | Login with ref/password |
| `/register` | RegisterPage.jsx | Public | Two-step: invite code + form |
| `/forgot-password` | ForgotPasswordPage.jsx | Public | Email input for reset |
| `/reset-password` | ResetPasswordPage.jsx | Public | Token + new password |
| `/` | HomePage.jsx | Protected | Role-based dashboard |
| `/archives` | ArchivesPage.jsx | Protected | Course materials by UE |
| `/td` | TDPage.jsx | Protected | Homework (student) / Inbox (teacher) |
| `/chat` | ChatPage.jsx | Protected | Real-time chat (global + private) |
| `/suggestions` | SuggestionPage.jsx | Protected | Submit suggestion to BDE |
| `/bde` | BDEPage.jsx | BDE only | Kanban for suggestion triage |
| `/admin` | AdminPage.jsx | Admin only | Users, invitations, stats, seasonal forms |
| `/profile` | ProfilePage.jsx | Protected | Avatar, pseudo, password |

---

## Database Schema

### Tables

#### `users`
| Column | Type | Notes |
|--------|------|-------|
| id | SERIAL PK | |
| ref | VARCHAR(20) UNIQUE NOT NULL | STD\d{5,} / PROF\d{3,} / ADMIN\d{3,} |
| nom | VARCHAR(100) NOT NULL | |
| prenom | VARCHAR(100) NOT NULL | |
| email | VARCHAR(150) UNIQUE NOT NULL | Students: hei.*@gmail.com |
| pseudo | VARCHAR(100) NOT NULL | |
| password | VARCHAR(255) NOT NULL | bcrypt hash |
| role | ENUM(user_role) NOT NULL | student, teacher, admin, bde, alumni |
| level | ENUM(user_level) | L1, L2, L3 (student/bde only) |
| avatar | VARCHAR(500) | Cloudinary URL |
| ues | TEXT[] | Teacher UE codes |
| first_login | BOOLEAN DEFAULT TRUE | Triggers onboarding |
| created_at | TIMESTAMP DEFAULT NOW() | |
| updated_at | TIMESTAMP DEFAULT NOW() | Auto-updated via trigger |

#### `password_reset_tokens`
| Column | Type | Notes |
|--------|------|-------|
| id | SERIAL PK | |
| user_id | INT FK users | ON DELETE CASCADE |
| token_hash | VARCHAR(64) UNIQUE NOT NULL | SHA-256 |
| expires_at | TIMESTAMP NOT NULL | 1 hour |
| used_at | TIMESTAMP | |
| created_at | TIMESTAMP DEFAULT NOW() | |

#### `invitations`
| Column | Type | Notes |
|--------|------|-------|
| id | SERIAL PK | |
| code | VARCHAR(20) UNIQUE NOT NULL | HEI-STD/PROF/ALUM-XXXXXX |
| role | VARCHAR(20) NOT NULL | CHECK student/teacher/alumni |
| max_uses | INT DEFAULT 1 | |
| use_count | INT DEFAULT 0 | |
| used_by | INT FK users | |
| created_by | INT FK users | |
| expires_at | TIMESTAMP NOT NULL | 14 days |
| created_at | TIMESTAMP DEFAULT NOW() | |

#### `posts`
| Column | Type | Notes |
|--------|------|-------|
| id | SERIAL PK | |
| title | VARCHAR(255) NOT NULL | |
| description | TEXT | |
| ue | VARCHAR(30) NOT NULL | CHECK valid UE code |
| type | ENUM(post_type) NOT NULL | cours, td, examen |
| file_name | VARCHAR(255) | |
| file_path | VARCHAR(500) | |
| link | VARCHAR(500) | |
| author_id | INT FK users | |
| created_at | TIMESTAMP DEFAULT NOW() | |
| updated_at | TIMESTAMP DEFAULT NOW() | |

#### `supports`
| Column | Type | Notes |
|--------|------|-------|
| id | SERIAL PK | |
| ue | VARCHAR(30) NOT NULL | CHECK valid UE code |
| label | VARCHAR(255) NOT NULL | |
| url | VARCHAR(500) NOT NULL | CHECK ^https?:// |
| author_id | INT FK users | |
| created_at | TIMESTAMP DEFAULT NOW() | |

#### `submissions`
| Column | Type | Notes |
|--------|------|-------|
| id | SERIAL PK | |
| student_id | INT FK users | |
| nom | VARCHAR(100) NOT NULL | |
| prenom | VARCHAR(100) NOT NULL | |
| email | VARCHAR(150) NOT NULL | |
| ref | VARCHAR(20) NOT NULL | |
| level | ENUM(user_level) NOT NULL | |
| groupe | VARCHAR(10) NOT NULL | L1: N1-N4, L2: K1-K3, L3: J1-J2 |
| ue | VARCHAR(30) NOT NULL | |
| type | ENUM(submit_type) NOT NULL | TD, Examen |
| file_name | VARCHAR(255) | |
| file_path | VARCHAR(500) | |
| link | VARCHAR(500) | |
| created_at | TIMESTAMP DEFAULT NOW() | |

#### `messages`
| Column | Type | Notes |
|--------|------|-------|
| id | SERIAL PK | |
| sender_id | INT FK users | |
| receiver_id | INT FK users | NULL for global |
| content | TEXT NOT NULL | |
| is_global | BOOLEAN DEFAULT FALSE | |
| seen | BOOLEAN DEFAULT FALSE | |
| seen_at | TIMESTAMP | |
| created_at | TIMESTAMP DEFAULT NOW() | |

#### `suggestions`
| Column | Type | Notes |
|--------|------|-------|
| id | SERIAL PK | |
| student_id | INT FK users | |
| titre | VARCHAR(255) NOT NULL | |
| contenu | TEXT NOT NULL | |
| anonyme | BOOLEAN DEFAULT FALSE | |
| statut | VARCHAR(20) DEFAULT 'recu' | recu/accepte/a_discuter/refuse |
| justification | TEXT | |
| created_at | TIMESTAMP DEFAULT NOW() | |
| updated_at | TIMESTAMP DEFAULT NOW() | |

#### `push_subscriptions`
| Column | Type | Notes |
|--------|------|-------|
| id | SERIAL PK | |
| user_id | INT FK users | ON DELETE CASCADE |
| endpoint | TEXT NOT NULL | |
| auth_key | TEXT NOT NULL | |
| p256dh_key | TEXT NOT NULL | |
| created_at | TIMESTAMP DEFAULT NOW() | |
| UNIQUE(user_id, endpoint) | | |

### Enums
- `user_role`: `student`, `teacher`, `admin`, `bde`, `alumni`
- `user_level`: `L1`, `L2`, `L3`
- `post_type`: `cours`, `td`, `examen`
- `submit_type`: `TD`, `Examen`

### Valid UE Codes
WEB1, WEB2, WEB3, PROG1, PROG2, PROG3, PROG4, PROG5, SYS1, SYS2, SYS3, DONNEES1, DONNEES2, THEORIE1-P1, THEORIE1-P2, MGT2, IA1, MOB1, SECU1, SECU2

### Groups
- L1: N1, N2, N3, N4 (STD25)
- L2: K1, K2, K3 (STD24)
- L3: J1, J2 (STD23)
- Alumni:G prom(STD21), H prom(STD22)

### Seed Data
- Admin: `ADMIN001` / `password`
- Student: `STD25001` / `password`
- Teacher: `PROF001` / `password`
- Invitation codes: `HEI-STD-DEVTEST`, `HEI-PROF-DEVTEST`, `HEI-ALUM-DEVTEST`

---

## Authentication Flow

1. **Registration**: Valid invitation code required (generated by admin). Code verified via `POST /api/auth/verify-invite`. Registration creates user, increments invite `use_count`, returns JWT.
2. **Login**: `ref` + `password`. Server verifies bcrypt hash, checks `first_login` flag, returns JWT + user data.
3. **JWT**: `{ id, ref, role }` signed with `JWT_SECRET`, expires in **7 days**. Sent as `Bearer <token>` in `Authorization` header.
4. **Auth Middleware**: Verifies JWT on protected routes, attaches `req.user`.
5. **Frontend**: Token in `localStorage` key `hei_token`. User object in `hei_user`. Axios interceptor adds `Authorization`. On 401 (non-auth routes), token cleared + redirect to `/login`.
6. **Rate Limiting**: Login, forgot-password, reset-password: 10 req/15min per IP.
7. **Password Reset**: Token-based (SHA-256 hash in DB). Link via email. 1 hour expiry, single-use.

---

## Real-Time Features (Socket.IO)

- **Global Chat**: Broadcast via `message:global` event.
- **Private Chat**: Sent to `user:{userId}` room + echo to sender.
- **Online/Offline**: `user:join` / `user:leave`, tracked in `onlineUsers` Map.
- **Seen Status**: `message:seen` event notifies sender.
- **BDE Sync**: BDE members join `bde` room. Drag-and-drop events (`bde:drag-start`, `bde:drag-over`, `bde:drag-end`, `bde:update`) broadcast in real-time.
- **Push Notifications**: Private messages trigger Web Push to all subscribed devices. Invalid subscriptions cleaned up.

---

## File Storage

- **Avatars**: Cloudinary `hei-stdhub/avatars` folder, 200x200 resize.
- **Submissions**: Cloudinary `hei-stdhub/submissions` folder, auto resource type.
- **Chat files**: Cloudinary `hei-stdhub/chat` folder (fallback: local `backend/uploads/chat/`).
- **Course posts**: Local `backend/uploads/` with timestamp-prefixed filenames.

---

## Environment Variables

### Backend (`backend/.env`)
| Variable | Required | Description |
|----------|----------|-------------|
| PORT | No | Default 3001 |
| DATABASE_URL | Yes | PostgreSQL connection string |
| JWT_SECRET | Yes | JWT signing secret |
| CLIENT_URL | Yes | Frontend URL for CORS |
| RESEND_API_KEY | No | Resend email API key |
| SMTP_HOST / EMAIL_HOST | No | SMTP server |
| SMTP_PORT / EMAIL_PORT | No | Default 587 |
| SMTP_USER / EMAIL_USER | No | SMTP username |
| SMTP_PASS / EMAIL_PASS | No | SMTP password |
| SMTP_FROM / EMAIL_FROM / MAIL_FROM | No | Sender email |
| SMTP_SECURE / EMAIL_SECURE | No | TLS for port 465 |
| RESEND_FROM | No | Resend sender email |
| CLOUDINARY_CLOUD_NAME | No | Cloudinary cloud |
| CLOUDINARY_API_KEY | No | Cloudinary key |
| CLOUDINARY_API_SECRET | No | Cloudinary secret |
| VAPID_PUBLIC_KEY | No | Auto-generated if missing |
| VAPID_PRIVATE_KEY | No | Auto-generated if missing |
| BACKEND_URL | No | For keep-alive ping |
| NODE_ENV | No | test/production |

### Frontend (`frontend/.env`)
| Variable | Required | Description |
|----------|----------|-------------|
| VITE_API_URL | No | Default http://localhost:3001 |

---

## Running the Project

### Development
```bash
# Backend (port 3001)
cd backend && npm install && npm run dev

# Frontend (port 5173)
cd frontend && npm install && npm run dev

# Database: run schema.sql then migrations/ in order
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
cd backend && npm test    # 144 tests (Mocha/Chai/Supertest)
```

### Version Bumping
```bash
npm run release:patch   # 1.3.2 -> 1.3.3
npm run release:minor   # 1.3.2 -> 1.4.0
npm run release:major   # 1.3.2 -> 2.0.0
```

---

## Key Implementation Details

### PWA
- Service worker caches `/`, `/logo.png`, `/manifest.json`.
- Push notifications: payload data navigates to URL on click.
- Manifest: standalone display, portrait, 192x512 icons.

### Styling
- Colors: Navy (`#001948`, `#0A1A33`), Gold (`#DFA408`, `#F2C94C`), Surface (`#F2F4F8`), Contact (`#D9DCE3`).
- Font: Quicksand (sans-serif).
- Glassmorphism on auth pages, chat, onboarding modal.

### Seasonal Admin Features
- **September** (`month === 8`, 0-indexed): "Passage de classe" tab — promote students by level.
- **November** (`month === 10`, 0-indexed): "Nouveaux L1" tab — register new L1 students.

### BDE Workflow
1. Suggestions submitted (optionally anonymous) by students/teachers/alumni.
2. BDE Kanban: 4 columns (Recu, Accepte, A discuter, Refuse).
3. Drag-and-drop with mouse/touch, real-time sync via Socket.IO.
4. "Confirm & generate report" posts summary to global chat + generates PDF.

### Invitation Codes
- Format: `HEI-STD-XXXXXX`, `HEI-PROF-XXXXXX`, `HEI-ALUM-XXXXXX`
- Expire: 14 days
- Configurable `max_uses` (default 1)

### Validation Rules
- Student emails: `hei.*@gmail.com`
- Student refs: `STD\d{5,}` (auto-generated sequential)
- Teacher refs: `PROF\d{3,}`
- Admin refs: `ADMIN\d{3,}`
- Posts: 21 valid UE codes, types cours/td/examen
- Submissions: types TD/Examen, groups by level
