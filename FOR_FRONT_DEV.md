# Frontend — FOR_FRONT_DEV

## Structure

```
frontend/src/
├── main.jsx                    # React entry, service worker registration
├── App.jsx                     # Router with protected/admin/BDE routes
├── index.css                   # Tailwind + custom glassmorphism/card styles
├── api/
│   └── axios.js                # Axios instance + auth interceptor
├── context/
│   └── AuthContext.jsx          # Auth provider (login, register, logout)
├── socket.js                   # Socket.IO client singleton
├── push.js                     # Push subscription helpers
├── utils/
│   └── roleFilter.js           # Role filtering utilities
├── assets/
│   └── logos.js                # Logo URLs
├── pages/                      # 12 page components
└── components/                 # Reusable components
    ├── layout/                 # Sidebar, Navbar
    ├── dashboard/              # StudentHome, TeacherHome, AlumniHome
    ├── chat/                   # ChatLayout, ContactList, MessagePanel
    ├── archives/               # ArchiveGrid
    ├── td/                     # StudentUpload, TeacherInbox
    └── ui/                     # Avatar, Badge, OnboardingModal
```

---

## `main.jsx` — Entry Point

```jsx
@function Service Worker Registration
@description Registers service worker at /sw.js on window load for PWA support
@side-effects Registers service worker for offline/push capabilities
```

---

## `App.jsx` — Router & Guards

```jsx
@function ProtectedRoute
@param {ReactNode} children
@description If loading, shows spinner. If no user, redirects to /login. Otherwise renders children.
@returns {ReactNode}

@function AdminRoute
@param {ReactNode} children
@description If loading, returns null. If not admin, redirects to /. Otherwise renders children.
@returns {ReactNode}

@function BDERoute
@param {ReactNode} children
@description If loading, returns null. If not bde, redirects to /. Otherwise renders children.
@returns {ReactNode}

@function App
@description Main app component. Renders all routes with appropriate guards.
  If user.firstLogin, renders OnboardingModal.
@returns {ReactNode}
```

### Route Table

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

---

## `api/axios.js` — Axios Instance

```js
@function getApiBaseUrl
@returns {string} VITE_API_URL or "http://localhost:3001" + "/api"

@type AxiosInstance
@name api
@description Axios instance with baseURL from getApiBaseUrl()

@description Request Interceptor
@param {Object} config
@description Reads hei_token from localStorage and sets Authorization header

@description Response Interceptor
@param {Object} response - pass through
@param {Object} error
@description On 401 (non-auth routes): clears token, redirects to /login
  Skips auth routes (login, register, forgot-password, reset-password, verify-invite)
```

---

## `context/AuthContext.jsx` — Auth State

```js
@function getSavedUser
@returns {Object|null} Parsed user from localStorage hei_user, or null on failure

@function AuthProvider
@param {ReactNode} children
@description Provides auth context: user, setUser, login, register, logout, loading, firstLogin, dismissOnboarding

@state user - User object from localStorage/API
@state firstLogin - boolean, triggers onboarding modal
@state loading - boolean, true while verifying token on mount

@effect Token Validation
@description On mount, reads token from localStorage. If exists, calls GET /auth/me to validate.
  On success: sets user state and localStorage. On 401: clears auth state.
  Finally: sets loading to false.

@async
@function login
@param {string} ref
@param {string} password
@description POST /auth/login. Stores token+user in localStorage. Sets firstLogin if true.
@returns {Object} User object

@async
@function register
@param {Object} formData
@description POST /auth/register with form data. Stores token+user in localStorage.
@returns {Object} User object

@function dismissOnboarding
@description Sets firstLogin to false

@function logout
@description Removes hei_token and hei_user from localStorage. Sets user to null.

@function useAuth
@returns {Object} AuthContext value
```

---

## `socket.js` — Socket.IO Client

```js
@async
@function getSocket
@description Returns singleton Socket.IO connection. Creates new connection if none exists.
  Uses VITE_API_URL or "http://localhost:3001" with websocket+polling transports.
  Resolves on "connect", rejects on "connect_error". Times out after 10s.
@returns {Promise<Socket>}

@function disconnectSocket
@description Disconnects socket and sets to null
```

---

## `push.js` — Push Notifications

```js
@async
@function subscribeToPush
@description
  1. Checks for serviceWorker + PushManager support
  2. Waits for service worker ready
  3. Skips if already subscribed
  4. Fetches VAPID key from GET /push/vapid-key
  5. Subscribes with userVisibleOnly: true
  6. POSTs subscription to /push/subscribe
@side-effects Registers browser push notifications
@error-handling Silently catches all errors

@async
@function unsubscribeFromPush
@description
  1. Gets existing push subscription
  2. DELETEs /push/subscribe with endpoint
  3. Calls sub.unsubscribe()
@error-handling Silently catches all errors

@function urlBase64ToUint8Array
@param {string} base64
@returns {Uint8Array} Decoded VAPID key
```

---

## `utils/roleFilter.js`

```js
@function expandRoleFilter
@param {string} role
@returns {string} "student,bde" if role is "student", otherwise unchanged

@function determineRegisterRole
@param {string} inviteRole
@param {boolean} isAlumni
@returns {string} "teacher", "alumni", or "student"

@function validateRegisterEmail
@param {string} email
@param {string} role
@returns {boolean} true if email is valid for the given role
  - student: must match hei.xxx@gmail.com
  - alumni: must contain "@"
  - other: always true
```

---

## Pages

### `LoginPage.jsx`

```jsx
@function LoginPage
@description Login form with alumni/student toggle, ref+password fields,
  show/hide password toggle, error display, loading state.
  On success, navigates to "/".

@state form: { ref, password }
@state error, loading, showPwd, isAlumni

@function set(key, val) - Updates form field
@async @function handleSubmit(e) - Validates, calls login(), navigates on success
```

### `RegisterPage.jsx`

```jsx
@function RegisterPage
@description Two-step registration: 1) verify invite code, 2) fill user details.
  Role-specific fields (teacher: UE selection, student: level).
  Password confirmation, email validation per role.

@state form: { nom, prenom, email, ref, pseudo, role, level, password, confirmPassword, inviteCode, ues }
@state codeVerified, codeLoading, codeError, isAlumni, showPwd, showConfirm

@function set(k, v) - Updates form field
@function toggleUE(ue) - Toggles UE selection for teachers
@async @function verifyCode() - POST /auth/verify-invite
@function validate() - Returns error string or null
@async @function handleSubmit(e) - Validates, calls register(), navigates on success
```

### `ForgotPasswordPage.jsx`

```jsx
@function ForgotPasswordPage
@description Email input for password reset. Shows success state with instructions.
@state email, loading, sent, error
@async @function handleSubmit(e) - POST /auth/forgot-password
```

### `ResetPasswordPage.jsx`

```jsx
@function ResetPasswordPage
@description 4 states: checking token, invalid token, valid token form, success.
  Token from URL search params. Auto-redirects to /login after 2.5s on success.

@state token, checking, validToken, password, confirmPassword, showPassword, showConfirmPassword
@state loading, done, error

@effect Token verification on mount - GET /auth/reset-password/:token
@function validateForm() - Checks non-empty, min 6 chars, password match
@async @function handleSubmit(e) - POST /auth/reset-password
```

### `HomePage.jsx`

```jsx
@function HomePage
@description Role-based dashboard:
  - alumni: AlumniHome
  - teacher/admin: TeacherHome
  - student/bde: StudentHome
@renders Sidebar + conditional dashboard component
```

### `ArchivesPage.jsx`

```jsx
@function ArchivesPage
@renders Sidebar + Navbar("Archives de cours") + ArchiveGrid
```

### `TDPage.jsx`

```jsx
@function TDPage
@description Renders TeacherInbox for teacher/admin, StudentUpload for others
@renders Sidebar + Navbar("TD / Examen") + conditional component
```

### `ChatPage.jsx`

```jsx
@function ChatPage
@renders Full-height dark gradient background + Sidebar + ChatLayout
```

### `SuggestionPage.jsx`

```jsx
@function SuggestionPage
@description Form to submit suggestions to BDE. Anonymous toggle, character counters,
  BDE info card (different text for teachers vs students). Auto-clears success after 4s.

@state form: { titre, contenu, anonyme }
@state loading, submitted, error

@function set(k, v)
@async @function handleSubmit(e) - Validates (titre required, contenu >= 20 chars),
  POST /suggestions
```

### `BDEPage.jsx`

```jsx
@function BDEPage
@description Kanban board for suggestion triage. 4 columns: Recu, Accepte,
  A discuter, Refuse. Drag-and-drop (mouse + touch), real-time sync via Socket.IO,
  PDF report generation, confirmation with global chat post.

@constants COLUMNS - 4 column configs with colors, icons, labels
@state suggestions, loading, sending, done, dragId, dragOver, justModal, error
@state remoteDragId, remoteDragOver (for real-time sync)

@effect Initial fetch - GET /suggestions
@effect Socket setup - listens for bde:drag-*, bde:update

@function generatePDF(suggestions) - Client-side PDF via jsPDF with navy/gold branding
@function getByStatut(statut) - Filters suggestions by status
@function emitDragStart/DragOver/DragEnd/Update - Socket emit helpers
@function handleDragStart/DragOver/Drop - Mouse drag handlers
@function handleTouchStart/Move/End - Touch drag handlers
@async @function updateStatut(id, statut, justification) - PATCH /suggestions/:id
@function handleJustConfirm - Validates justification, calls updateStatut with "refuse"
@async @function handleConfirmAll - POST /suggestions/confirm + generate PDF
```

### `AdminPage.jsx`

```jsx
@function AdminPage
@description Full admin panel with tabs: Users, Invitations, Passage de classe (September),
  Nouveaux L1 (November). Stats polling every 3s.
  Users and invitations now paginated (50 per page) with server-side search.

@constants ROLE_CONFIG - Role to label/icon/color mapping
@constants PAGE_SIZE = 50

@function StatCard({ icon, label, value, color })
@param {Object} props - { icon: FontAwesomeIcon, label: string, value: number|string, color: string }
@renders A stat card with icon, value, and label

@state tab, stats, users, invitations, search, roleFilter, loading, copiedId
@state userPage, userTotal, invPage, invTotal (pagination)
@state failedRefs, failedInput, upgradeLoading, upgradeDone (class upgrade)
@state newL1, generatedRef, registerLoading, registerDone (L1 registration)
@state showInvModal, invRole, invMaxUses, invLoading, invError (invitation modal)
@state showBulkModal, bulkRole, bulkCount, bulkCodes (bulk invitation)
@computed isSeptember = month === 8 (0-indexed), isNovember = month === 10

@effect Scroll listener - show/hide scroll-to-top button
@effect Stats polling every 3s - GET /admin/stats
@effect Reset userPage on search/roleFilter change
@async @function loadUsers() - GET /admin/users?q=&role=&limit=50&offset=N
@async @function loadInvitations() - GET /admin/invitations?limit=50&offset=N
@async @function handleRoleChange(userId, newRole) - PATCH /admin/users/:id/role
@async @function handleDelete(userId, ref) - DELETE /admin/users/:id (with confirm)
@async @function handleCreateInvitation() - POST /admin/invitations
@async @function handleDeleteInvitation(id) - DELETE /admin/invitations/:id
@function handleAddFailedRef / handleRemoveFailedRef - Class upgrade helpers
@async @function handleUpgrade() - POST /admin/class-upgrade
@function getGroupFromChar(char) - Maps letter to X1-X4 group
@async @function handleRegisterL1(e) - POST /auth/register for new L1
@function handleCopy(id, code) - Clipboard copy with 2s feedback
```

### `ProfilePage.jsx`

```jsx
@function ProfilePage
@description User profile with avatar upload, pseudo edit, password change.

@state pseudo, currentPwd, newPwd, confirmPwd
@state loadingPseudo, loadingPwd, loadingAvatar
@state successPseudo, successPwd, errorPseudo, errorPwd
@state showCurrent, showNew, showConfirm, visible (entrance animation)

@effect Entrance animation via requestAnimationFrame
@async @function handleAvatar(e) - PATCH /auth/avatar (multipart)
@async @function handlePseudo(e) - PATCH /auth/profile
@async @function handlePassword(e) - PATCH /auth/password (with confirm check)

@function PwdInput({ value, setValue, placeholder, show, toggle })
@param {Object} props - Password input with show/hide toggle
@renders Styled password field
```

---

## Components

### `components/layout/Sidebar.jsx`

```jsx
@function Sidebar
@description Navigation sidebar with role-based links, mobile hamburger menu.
  Alumni: only Accueil + Chat. Others: Accueil, Archives, TD/Examen, Chat.
  Conditional links: Suggestions (student/teacher/alumni), BDE (bde), Admin (admin).

@state open - mobile drawer toggle
@constants NAV_LINKS - standard nav links
@constants ALUMNI_NAV_LINKS - restricted alumni links

@function handleLogout() - Calls logout(), navigates to /login
@function handleNavClick() - Closes mobile drawer
```

### `components/layout/Navbar.jsx`

```jsx
@function Navbar
@param {string} title - Optional page title
@description Shows alumni badge (if user is alumni), page title pill, profile button.
@renders Header with conditional elements
```

### `components/dashboard/StudentHome.jsx`

```jsx
@function StudentHome
@description Course post cards filtered by level (Tous/L1/L2/L3).
  Each card shows type badge, UE, date, title, description, author, file/link.

@state posts, filter (defaults to user.level), loading
@effect Fetch posts on mount and filter change - GET /posts?level=
@function handleFilterChange(level) - Updates filter, shows loading
```

### `components/dashboard/TeacherHome.jsx`

```jsx
@function TeacherHome
@description Post creation form (drag-and-drop file upload, link input, UE select from
  teacher's assigned UEs, type toggle) + list of existing posts with delete.

@state teacherUes, form, posts, dragOver, loading, fetching, error
@effect Fetch all posts on mount - GET /posts
@function set(k, v) - Form field updater
@function handleDrop(e) - File drag-and-drop handler
@function handleFileInput(e) - File input change handler
@async @function handleSubmit(e) - POST /posts (multipart/form-data)
@async @function handleDelete(id) - DELETE /posts/:id (with confirm)
```

### `components/dashboard/AlumniHome.jsx`

```jsx
@function AlumniHome
@description Hero section with graduation cap, greeting, promo info.
  Quick links grid: Chat, Suggestions BDE, Mon Profil.
@constants QUICK_LINKS - 3 links with icons and descriptions
```

### `components/chat/ChatLayout.jsx`

```jsx
@function ChatLayout
@description Main chat orchestrator. Manages contacts, messages, Socket.IO connections,
  push subscriptions. Handles global + private messaging.
  Supports infinite scroll (loadOlderMessages with cursor pagination).
  Batch seen marking via PATCH /messages/seen (replaces N+1 individual calls).

@constants GLOBAL_CONTACT - { id: "global", name: "Chat global", isGlobal: true }

@state contacts, activeContact, messages, showContactList, loadingMessages, onlineUsers, isAtBottom, unread
@state unread: { global: number, contacts: { [contactId]: { unread, pending } } }
@state contactTotal - total number of contacts

@ref activeContactRef, isAtBottomRef, messagesRef - Refs to avoid stale closures in socket handlers

@function requestNotifyPermission() - Requests Notification API permission
@function showNotification(title, body) - Shows browser notification if tab is hidden

@effect Init - request notification permission, subscribe to push
@effect Fetch contacts - GET /messages/contacts?limit=500, then fetchUnread

@async @function fetchUnread() - GET /messages/unread, sets unread state
@async @function markGlobalRead(messageId) - POST /messages/global/read
@async @function markSeen(contact) - Batch marks messages as seen.
  For global: calls markGlobalRead(lastMsg.id), sets global unread to 0.
  For private: collects all unseen message IDs, sends single PATCH /messages/seen.
  Replaces individual PATCH /messages/:id/seen calls.

@function formatMsg(m) - Normalizes raw message shape (adds own, seen, senderAvatar, etc.)
@async @function loadMessages(contact, silent?) - GET /messages/global or /messages/private/:id
@async @function loadOlderMessages(contact) - Cursor-based: GET ?before={oldestId}&limit=100
  Prepends older messages to the list. Supports infinite scroll.
@effect Load messages on contact change
@effect Socket setup: listen for:
  - message:global — append to global chat, increment unread if not active tab
  - message:private — append to contact chat, increment unread if not active conversation
  - user:online / user:offline — update onlineUsers Set
  - message:seen — update seen flag in all message lists, decrement pending count
  - message:deleted — filter out deleted message from all lists
  - unread:update — update unread/pending for a contact (sent by server after sending)

@async @function sendMessage(content) - POST /messages (global or private)
@async @function deleteMessage(messageId) - DELETE /messages/:id, removes from local state
@function handleSelectContact(contact) - Switch active contact, scroll to bottom

@changelog 1.3.4
  - Chat contact toggle moved to right of chat name on mobile header
  - Avoids overlap with Sidebar hamburger menu on left side
  - Added shrink-0 to prevent button from collapsing on small screens
```

### `components/chat/ContactList.jsx`

```jsx
@function ContactList
@param {Array} contacts
@param {string|number} activeId
@param {Function} onSelect
@param {Set} onlineUsers
@description Contact sidebar with search, new conversation modal, online indicators, role badges.

@state search, showSearch, searchQuery, searchResults, searching

@function RoleBadge({ role }) - Role badge component
@function StatusDot({ online }) - Online/offline dot component
@function ContactAvatar({ contact, isActive }) - Avatar with fallback
@param {Object} unread - { global: number, contacts: { [contactId]: { unread, pending } } }

@function getUnreadCount(contact) - Returns total unread (unread + pending) for a contact
@computed sorted - Contacts sorted by unread count (highest first), then alphabetically
@function handleSearch(q) - GET /messages/search?q=
@function handleStartConversation(u) - Starts private chat with searched user

_unread badge:_ Gold pill badge showing unread count (capped at 99+) next to contact name
```

### `components/chat/MessagePanel.jsx`

```jsx
@function MessagePanel
@param {Object} contact
@param {Array} messages
@param {boolean} loading
@param {Function} onSend
@param {Function} onDelete
@param {Function} onOpenContacts
@param {boolean} isAtBottom
@param {Function} onAtBottomChange
@param {Function} onScrollToBottom
@param {Set} onlineUsers
@param {Function} onLoadOlder - Callback for infinite scroll (triggered when scrollTop < 80)
@description Full message panel with grouped messages, date separators, file sharing,
  image preview, read receipts, message deletion (trash icon on hover for own messages),
  scroll-to-bottom button, auto-scroll, infinite scroll (load older on scroll to top).

@state text, sending, loadingOlder
@ref bottomRef, fileRef, scrollRef, prevScrollHeight

@useMemo grouped - Groups by sender within 5min gap, inserts date separators
@effect Auto-scroll on new messages (if already at bottom)
@effect Preserve scroll position when older messages loaded (prevScrollHeight)
@function handleScroll() - Detects scroll position + triggers loadOlder at top
@function handleSend() - Trims and sends message
@function handleKey(e) - Send on Enter (not Shift+Enter)
@async @function handleFile(e) - POST /messages/upload, sends [FILE:...] message

_Scroll-to-bottom button:_ Fixed position chevron-down button appears when not at bottom,
  scrolls to latest messages on click.

@function RoleBadge({ role }) - Role badge in chat header
@function ChatAvatar({ avatar, name }) - Avatar with error fallback
@function DateSeparator({ date }) - Horizontal line with date label
@function renderContent(content) - Renders file/image or sanitized HTML (DOMPurify)
@function MessageGroup({ messages, isOwn, onDelete }) - Renders message group with bubbles.
  Shows trash icon on hover for own messages with confirmation dialog (Supprimer ce message ?).
@function handleDelete(msgId) - Calls onDelete after user confirmation
@function HeaderAvatar({ avatar, name }) - Header avatar
@function ContactAvatar({ contact, onlineUsers }) - Contact avatar with status dot
```

### `components/chat/chat-utils.js`

```js
@constants SECOND, MINUTE, HOUR, DAY, GROUP_GAP (5 minutes)

@function isSameDay
@param {Date} a, b
@returns {boolean} true if same year, month, day

@function getDayDiff
@param {Date} a, b
@returns {number} Days between a and b

@function formatTime
@param {Date} date
@returns {string} "HH:MM" in French locale

@function formatDateLabel
@param {Date} date
@returns {string} "Aujourd'hui" / "Hier" / weekday / "day month" / "day month year"

@function formatMessageTime
@param {Date} date
@returns {string} Smart time label based on distance from now

@function formatTooltipDate
@param {Date} date
@returns {string} Full date-time string

@function isFileMessage
@param {string} content
@returns {boolean} true if content matches [FILE:...] pattern

@function parseFileContent
@param {string} content
@returns {Object|null} { filename, url, isImage } or null
```

### `components/archives/ArchiveGrid.jsx`

```jsx
@function ArchiveGrid
@description Grid of UEs grouped by year. Clicking opens side panel with support links.
  Teachers can add/delete support links.
@state selectedUe, supports, showSupports, adding, newLabel, newUrl
@effect Fetch supports when selectedUe changes
@async @function handleAddSupport() - POST /supports
@async @function handleDeleteSupport() - DELETE /supports/:id
```

### `components/td/StudentUpload.jsx`

```jsx
@function StudentUpload
@description Homework submission form with pre-filled user info,
  level/group/UE/type selection, file drag-and-drop or link input.
@state form with student info + file/link
@async @function handleSubmit(e) - POST /submissions
```

### `components/td/TeacherInbox.jsx`

```jsx
@function TeacherInbox
@description Filterable paginated table of student submissions with server-side search,
  type/UE filters, download links. 50 per page, pagination controls.
@state submissions, search, typeFilter, ueFilter, loading, page, total
@effect Fetch submissions - GET /submissions?search=&type=&ue=&limit=50&offset=N
@effect Reset page to 0 on filter/search change
```

### `components/ui/Avatar.jsx`

```jsx
@function Avatar
@param {string} src - Image URL
@param {string} name - Fallback initials text
@param {string} size - "sm" | "md" | "lg" (default)
@description Circular avatar with image or letter fallback.
@state error - tracks image load failure
@renders img or initial letter circle
```

### `components/ui/Badge.jsx`

```jsx
@function Badge
@param {string} type - "cours" | "td" | "examen"
@description Colored badge matching post type. Green for cours, blue for td, red for examen.
@renders Styled badge with label
```

### `components/ui/OnboardingModal.jsx`

```jsx
@function OnboardingModal
@description 5-step onboarding wizard with animated transitions, floating particles,
  gold sparkle effects, progressive disclosure of app features.
@state step - current onboarding step (1-5)
@state dismissed - true after completion
@function next / prev - Navigation
@function handleDismiss - Calls dismissOnboarding from AuthContext, sets dismissed
@renders Full-screen modal overlay with step content
```

---

## Styling (`index.css`)

```css
@description Custom styles extending Tailwind. Key classes:

@class .sidebar-link / .sidebar-link-active - Navigation link styles
@class .card - White rounded card with padding
@class .badge-td / .badge-examen / .badge-cours - Type badge variants
@class .input-field - Form input with navy border and focus ring
@class .btn-primary - Navy button with hover darkening
@class .btn-gold - Gold button with hover darkening
@class .btn-danger - Red button
@class .btn-success - Green button
@class .glass / .glass-heavy / .glass-border / .glass-card - Glassmorphism effects
@class .status-dot / .status-online / .status-offline - Online indicators
@class .animate-message-in / .animate-fade-in / .animate-slide-up - Animation utilities
@class .touch-target - Min 44px touch targets for mobile
```

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
