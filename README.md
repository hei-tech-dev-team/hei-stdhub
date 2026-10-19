# HEI STDhub — v1.9.0

Full-stack web platform for HEI students, teachers, and admin. Access course materials (cours), submit homework, chat in real-time with role badges, suggest improvements to the BDE, browse school announcements, ping other users, and manage the school community — all with a navy/gold glassmorphism UI.

## Stack

**Frontend:** React 19, Vite, Tailwind CSS, React Router 7, Socket.IO Client, Font Awesome, Lucide React, jsPDF, DOMPurify, emoji-picker-react  
**Backend:** Express 5, Socket.IO 4, PostgreSQL, JWT (jsonwebtoken + bcryptjs), Cloudinary (file uploads), Multer, express-rate-limit, web-push  
**Testing:** Mocha + Chai (backend), Mocha + Chai (frontend chat utils)  
**Documentation:** `docs/` — FOR_DEV (overview), FOR_BACK_DEV (backend), FOR_FRONT_DEV (frontend), FOR_QA (testing), FOR_OPS (ops), FOR_CONTRIBUTING (contribute), ALL_ABOUT_API (API reference), EMAIL_SETUP (email config)  
**Deployment:** Vercel (frontend) + Render (backend via start.sh)

## Features

- **Auth** — Single-field login (student reference, teacher or admin code + password), register with invitation codes (role taken from the code); push-based password reset (6-char code via push notification); unique pseudo enforcement
- **Dashboard** — Role-based: StudentHome, TeacherHome, AdminHome (announcements + reactions)
- **Archives** — Course materials (cours) by UE with support links; teachers can add/delete support links
- **Chat** — Real-time global & private messaging with Socket.IO, online/offline indicators, file/image sharing (10MB), seen/delivered status with batch marking, message deletion (own messages only), unread badges (global + per-contact), role badges, favorites, push notifications via Web Push API, typing indicators, image lightbox
- **Suggestions** — Submit ideas (students, teachers, admin); BDE reviews with drag-and-drop Kanban, real-time sync via Socket.IO, generates PDF reports shared to global chat
- **BDE Kanban** — 4 columns (Reçu/Accepté/À discuter/Refusé), drag-and-drop with mouse/touch, real-time multi-user sync, justification required for refusal, confirm round posts summary to global chat
- **Pings** — Send pings to other users; accept or refuse; real-time notifications via Socket.IO
- **Announcements** — Admin creates announcements with optional level targeting (L1/L2/L3) and images; all users can react (like/haha/dont_like/sad)
- **STDnews** — Announcements feed with reactions
- **Admin** — User management (search, role/email change, delete), invitation management (single + bulk up to 1000), stats dashboard with live polling, class upgrade (L1→L2, L2→L3, redoublants stay), next-pseudo generator, L1 registration (November), real-time user updates via Socket.IO
- **Profile** — Avatar upload (Cloudinary/local fallback), unique pseudo update, password change with current password verification
- **User profiles** — View any user's public profile from chat; send pings from profile page
- **UI/UX** — Glassmorphism design, smooth micro-animations, responsive mobile layout, onboarding modal with 5-step wizard + floating particles, image lightbox in chat, file upload preview, scroll-to-bottom button, infinite scroll pagination
- **PWA** — Service worker for push notifications; works even when browser is closed (mobile); Web Push API with auto-generated VAPID keys; login/register triggers push subscription
- **Scalability (500+ users)** — Pagination on all list endpoints (limit/offset/before cursors), database indexes (GIN on users.ues, composite on messages), batch push notifications with concurrency control (10 parallel), batch bulk invitation INSERT (100/batch), DB pool config (max: 25)
- **Rate Limiting** — Login/register: 3 req/15min, general API: 50 req/15min, write operations: 15 req/15min, forgot-password: 2 req/15min, verify-code: 2 req/15min
- **Security** — JWT with 7-day expiry, parameterized SQL queries (no injection), bcrypt password hashing (salt: 10), profanity filter on messages/suggestions, DOMPurify XSS sanitization, CORS restricted origin, SHA-256 password reset tokens (1-hour expiry, single-use)
- **Error Handling** — Every route wrapped in try/catch, consistent error response format `{ error: "Message en français." }`, request timeout (30s), malformed JSON detection, Multer error handling

## Backend Hosting and Cold Starts (Render Free Tier)

The backend is hosted on Render's free tier. This plan comes with several limitations that must be kept in mind.

### Limitations

- **Spin Down (Sleep mode)** : The service spins down after 15 minutes of inactivity. The first incoming request after this triggers a cold start that takes about 1 minute (sometimes longer).
- **WebSocket Connections** :  Connections are dropped during every spin down, restart, or redeployment. Socket.io automatically attempts to reconnect.

### Implemented Measured

**1. Keep-alive**
An UptimeRobot monitor pings GET /api/health every 10 minutes. This route is intentionally lightweight and does not query the database. This method is not officially supported by Render: it reduces cold starts but does not completely eliminate them (restarts and redeployments will still occur).

**2. Frontend Resilience (`src/api/axios.js`)**
- Request timeout is set to 90 seconds.
- After a 4-second delay, a banner reading "The server is waking up, please wait..." is displayed (ServerWakingBanner). It disappears once there are no longer any slow requests.
- `GET` requests encountering 502, 503, 504, or network errors are retried up to 3 times, spaced 5 seconds apart, before an error page is shown. Write requests (POST, etc.) are never retried to prevent duplicate actions.
---

&copy; 2026 HEI STDhub. All rights reserved.
