# Frontend — FOR_FRONT_DEV

## Structure

```
frontend/src/
├── main.jsx                    # React entry, push notification fetch + mark read
├── App.jsx                     # Router with ProtectedRoute, AdminRoute, BDERoute guards
├── index.css                   # Tailwind + custom glassmorphism/card/animation styles
├── api/
│   └── axios.js                # Axios instance + auth interceptor (401 redirect skip auth routes)
├── context/
│   └── AuthContext.jsx          # Auth provider (login, register, logout, token verify on mount)
├── socket.js                   # Socket.IO client singleton (lazy connect, JWT auth, reconnect)
├── push.js                     # Push subscription helpers (VAPID, subscribe, unsubscribe)
├── utils/
│   └── roleFilter.js           # expandRoleFilter, determineRegisterRole, validateRegisterEmail
├── assets/
│   └── logos.js                # HEI_WHITE_LOGO, HEI_BLUE_LOGO
├── pages/                      # 16 page components
└── components/
    ├── layout/                 # Sidebar, Navbar
    ├── dashboard/              # StudentHome, TeacherHome, AlumniHome, AdminHome
    ├── chat/                   # ChatLayout, ContactList, MessagePanel, useLongPress, chat-utils
    ├── archives/               # ArchiveGrid, ArchiveCard
    ├── td/                     # StudentUpload, TeacherInbox
    └── ui/                     # Avatar, Badge, OnboardingModal, UserAvatar, GlassDomeLogo, JarvisScanAnimation, WaveAnimation
```

---

## Route Table

| Path | Component | Guard |
|------|-----------|-------|
| `/login` | LoginPage | none |
| `/register` | RegisterPage | none |
| `/forgot-password` | ForgotPasswordPage | none |
| `/reset-password` | ResetPasswordPage | none |
| `/` | HomePage | ProtectedRoute |
| `/archives` | ArchivesPage | ProtectedRoute |
| `/td` | TDPage | ProtectedRoute |
| `/chat` | ChatPage | ProtectedRoute |
| `/suggestions` | SuggestionPage | ProtectedRoute |
| `/bde` | BDEPage | BDERoute (bde only) |
| `/admin` | AdminPage | AdminRoute (admin only) |
| `/profile` | ProfilePage | ProtectedRoute |
| `/profile/:ref` | UserProfilePage | ProtectedRoute |
| `/ping-box` | PingBoxPage | ProtectedRoute |
| `/std-news` | STDnewsPage | ProtectedRoute |
| `/alumni-spotlight` | AlumniSpotlightPage | ProtectedRoute (alumni only) |

---

## Key Files

### `main.jsx` — Entry Point
- React 19 StrictMode root render
- Service worker registration (`/sw.js`) for PWA
- On mount: fetches `GET /push/notifications`, marks them read via `PATCH /push/notifications/read`

### `App.jsx` — Router & Guards
- `ProtectedRoute`: loading→spinner, no user→redirect `/login`, else→children
- `AdminRoute`: loading→null, not admin→redirect `/`, else→children
- `BDERoute`: loading→null, not bde→redirect `/`, else→children
- If `user.firstLogin`, renders `OnboardingModal` overlay
- 16 routes with guards

### `api/axios.js` — Axios Instance
- Base URL: `VITE_API_URL || "http://localhost:3001"` + `/api`
- Request interceptor: injects `Bearer <token>` from `localStorage("hei_token")`
- Response interceptor: on 401 (non-auth routes), clears token, redirects to `/login`

### `context/AuthContext.jsx` — Auth State
- On mount: reads token from localStorage, calls `GET /auth/me` to validate
- `login(ref, password)`: `POST /auth/login`, stores token+user, triggers push subscribe
- `register(formData)`: `POST /auth/register`, stores token+user, triggers push subscribe
- `logout()`: clears localStorage, sets user null
- `dismissOnboarding()`: sets firstLogin false

### `socket.js` — Socket.IO Client
- Lazy singleton: `getSocket()` creates connection on first call
- Auth via `handshake.auth.token`
- Transports: `["websocket", "polling"]`, 10s timeout
- `disconnectSocket()`, `refreshSocket()`, `onConnectionChange(listener)`
- Exports events: user:join, message:global/private, user:online/offline, message:seen, message:deleted, unread:update, typing:started/stopped, user:registered, bde:drag-*, bde:update

### `push.js` — Push Notifications
- `subscribeToPush()`: checks support, gets VAPID key from `GET /push/vapid-key`, subscribes via PushManager, `POST /push/subscribe`
- `unsubscribeFromPush()`: gets subscription, `DELETE /push/subscribe`, unsubscribes
- `urlBase64ToUint8Array(base64)`: VAPID key converter

### `utils/roleFilter.js`
- `expandRoleFilter(role)`: `"student"` → `"student,bde"`, else unchanged
- `determineRegisterRole(inviteRole, isAlumni)`: maps to teacher/alumni/student
- `validateRegisterEmail(email, role)`: student → `hei.xxx@gmail.com`, alumni → contains `@`, other → always true

---

## Pages

### `LoginPage.jsx`
- Alumni/student toggle, ref + password fields, show/hide password, error/loading states
- `handleSubmit`: calls `login()`, navigates to `/`

### `RegisterPage.jsx`
- Two-step: 1) verify invite code (`POST /auth/verify-invite`), 2) fill user details
- Role-specific fields: teacher → UE selection (multi-select), student → level auto, alumni → ref validation
- Password confirmation, email validation per role, pseudo availability checked on submit

### `ForgotPasswordPage.jsx`
- Email input → `POST /auth/forgot-password`
- 6-box code verification with staggered confirm animation → `POST /auth/forgot-password/verify-code`
- Receives reset token, navigates to `/reset-password?token=...`

### `ResetPasswordPage.jsx`
- 4 states: checking token, invalid, valid form, success
- `GET /auth/reset-password/:token` on mount
- `POST /auth/reset-password` with new password
- Auto-redirect to `/login` after 2.5s on success

### `HomePage.jsx`
- Role-based dashboard: alumni→AlumniHome, teacher/admin→TeacherHome, student/bde→StudentHome

### `ArchivesPage.jsx`
- Navbar("Archives de cours") + ArchiveGrid
- UEs grouped by year (L1/L2/L3), click opens side panel with support links

### `TDPage.jsx`
- Teacher/admin → TeacherInbox (submissions table)
- Others → StudentUpload (homework submission form)

### `ChatPage.jsx`
- Dark gradient full-height background + ChatLayout

### `SuggestionPage.jsx`
- Title + content + anonymous toggle, character counters (20+ for content)
- `POST /suggestions`, auto-clear success after 4s

### `BDEPage.jsx` — Kanban Board
- 4 columns: Reçu (blue), Accepté (green), À discuter (orange), Refusé (red)
- Drag-and-drop (mouse + touch), real-time sync via Socket.IO
- Justification modal for refusal, confirm round posts to global chat
- `GET /suggestions`, `PATCH /suggestions/:id`, `POST /suggestions/confirm`
- Client-side PDF generation via jsPDF with navy/gold branding

### `AdminPage.jsx`
- Tabs: Users, Invitations, Stats, Passage de classe (Sept), Nouveaux L1 (Nov)
- Users: paginated (50/page), search + role filter, role/email change, delete
- Invitations: paginated, create (single + bulk up to 1000), delete, copy to clipboard
- Stats: polling every 3s via `GET /admin/stats`
- Class upgrade: L1→L2, L2→L3 (redoublants stay); alumni upgrade: L3→alumni
- L1 registration: auto-generate STD ref, register via `POST /auth/register`
- Seasonal tabs: September (month 8), November (month 10)

### `ProfilePage.jsx`
- Avatar upload (PATCH /auth/avatar), pseudo edit (PATCH /auth/profile), password change (PATCH /auth/password)
- Glassmorphism redesign, staggered entrance animation, rotating border avatar, toast feedback

### `UserProfilePage.jsx`
- View any user's public profile from `/profile/:ref`
- `GET /auth/user/:ref`, send ping via `POST /pings`

### `PingBoxPage.jsx`
- Two tabs: Received (accept/refuse) + Sent (pending/accepted/refused)
- `GET /pings`, `PATCH /pings/:id/accept`, `PATCH /pings/:id/refuse`

### `STDnewsPage.jsx`
- Combined feed: announcements + alumni tips
- Reactions (like/haha/dont_like/sad) via POST/DELETE
- Alumni can delete own tips
- `GET /announcements`, `GET /alumni-spotlight`, reaction endpoints

### `AlumniSpotlightPage.jsx`
- Create alumni tips with optional image upload
- `POST /alumni-spotlight` with FormData

---

## Components

### `Sidebar.jsx`
- Role-based nav: alumni→restricted (Accueil, Chat, Suggestions, Profile), others→full
- Conditional: Suggestions (student/teacher/alumni), BDE (bde), Admin (admin)
- Mobile hamburger drawer, active link highlighting
- Fetches pings + unread counts for badges

### `Navbar.jsx`
- Alumni badge (if alumni), page title pill, profile button

### `StudentHome.jsx`
- Course posts filtered by level (Tous/L1/L2/L3), card layout with type badge

### `TeacherHome.jsx`
- Post creation (drag-drop file upload, link input, UE from teacher's assigned UEs, type toggle)
- List existing posts with delete

### `AlumniHome.jsx`
- Hero section with graduation cap, promo info, quick links (Chat, BDE Suggestions, Profile)

### `AdminHome.jsx`
- Announcements CRUD + reactions, `POST /announcements`, `DELETE /announcements/:id`, reaction endpoints

### `ChatLayout.jsx`
- Manages contacts, messages, Socket.IO, push subscriptions
- Infinite scroll with cursor pagination (`before` param)
- Batch seen marking (`PATCH /messages/seen`)
- Favorites, unread counts, global read tracking
- `sendMessage`, `deleteMessage`, `loadOlderMessages`

### `ContactList.jsx`
- Contact sidebar with search, new conversation modal, online indicators, role badges, unread badges

### `MessagePanel.jsx`
- Grouped messages with date separators, file sharing (upload preview), image lightbox, emoji picker
- Infinite scroll, scroll-to-bottom button, delete confirmation
- `POST /messages/upload`, file download via fetch blob

### `chat-utils.js`
- `isSameDay`, `getDayDiff`, `formatTime`, `formatDateLabel`, `formatMessageTime`, `formatTooltipDate`
- `isFileMessage(content)`, `parseFileContent(content)` → `{ filename, url, isImage }`
- `shouldGroup(a, b)` — within 5 min gap

### `useLongPress.js`
- Custom hook for long-press gesture (touch + desktop), configurable delay, tap fallback

### `ArchiveGrid.jsx`
- UE grid grouped by year, side panel with support links (teachers can add/delete)
- `GET /supports/:ue`, `POST /supports`, `DELETE /supports/:id`

### `ArchiveCard.jsx`
- Single archive card with type badge, date, download link

### `StudentUpload.jsx`
- Homework form: pre-filled user info, level/group/UE/type selectors, file drag-drop or link

### `TeacherInbox.jsx`
- Paginated submission table (50/page), server-side search, type/UE filter, download links

### UI Components
- `Avatar.jsx` — Image with initial-letter fallback, sm/md/lg sizes
- `Badge.jsx` — Type badge (cours/td/examen) with color coding
- `OnboardingModal.jsx` — 5-step wizard with floating particles, spring transitions, gold sparkle
- `UserAvatar.jsx` — Avatar with role badge overlay
- `GlassDomeLogo.jsx` — Animated glass dome SVG logo
- `JarvisScanAnimation.jsx` — Sci-fi scanning animation
- `WaveAnimation.jsx` — Animated wave SVG

---

## Styling (`index.css`)

### Key Classes
- `.sidebar-link / .sidebar-link-active` — Navigation link styles
- `.card` — White rounded card with padding
- `.badge-td / .badge-examen / .badge-cours` — Type badge variants
- `.input-field` — Navy border + focus ring
- `.btn-primary / .btn-gold / .btn-danger / .btn-success` — Button variants
- `.glass / .glass-heavy / .glass-border / .glass-card` — Glassmorphism effects
- `.status-dot / .status-online / .status-offline` — Online indicators
- `.animate-message-in / .animate-fade-in / .animate-slide-up` — Animations
- `.touch-target` — Min 44px touch targets for mobile

### Tailwind Custom Theme (`tailwind.config.js`)
```js
colors: {
  navy: { DEFAULT: "#001948", dark: "#0A1A33" },
  gold: { DEFAULT: "#DFA408", light: "#F2C94C" },
  surface: "#F2F4F8",
  contact: "#D9DCE3",
}
fontFamily: { quicksand: ["Quicksand", "sans-serif"] }
boxShadow: {
  card: "0 2px 12px 0 rgba(0,25,72,0.08)",
  modal: "0 8px 32px 0 rgba(0,25,72,0.16)",
}
```
