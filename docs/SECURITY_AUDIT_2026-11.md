# Security & Code Audit (November 2026)

Scope: whole repository (backend Express/Socket.IO, frontend React/Vite, database schema,
git history, CI). Context: production was compromised through the `developer` superuser
feature, whose frontend was never built. The app is being relaunched as HEI's official
internal social network.

Severity: **C** critical (exploitable now, full compromise) · **H** high · **M** medium · **L** low.
Each finding has a matching GitHub issue labelled `security`.

---

## 0. Incident: most likely entry points

| # | Finding | Evidence |
|---|---------|----------|
| C-01 | **Seeded superuser with a public password.** `DEV001`, `ADMIN001`, `PROF001` and a real student account are inserted by `schema.sql` with the bcrypt hash of `password`; the credentials are written in clear in the docs. Anyone who read the repo or guessed `DEV001`/`password` gets a **hidden** superuser (excluded from presence and contact lists, with all admin powers). | `backend/db/schema.sql:246-254`, `docs/FOR_DEV.md:172-175`, `backend/routes/auth.js` `REF_FORMAT` accepts `DEV…` |
| C-02 | **Secrets committed to git history.** `backend/.env` was committed 23 times, `frontend/.env` 3 times. They contain the production Supabase `DATABASE_URL` (with password), `JWT_SECRET`, `CLOUDINARY_API_SECRET`, `SMTP_PASS`, `RESEND_API_KEY`, VAPID private key. With the JWT secret anyone can **forge a token for any user and role**. | `git log --all -- backend/.env frontend/.env` (e.g. `491426c`, `0e32339`, `da4b304`) |
| C-03 | **Socket.IO room hijack.** `user:join` trusts a client-supplied `userId` and joins `user:<id>` without checking it against the authenticated JWT. Any logged-in user can read anyone's private messages, read receipts and notifications in real time. | `backend/server.js:197-215`, `frontend/src/components/chat/ChatLayout.jsx:272` |

**Immediate containment (before anything else):**
1. Rotate **every** secret listed in C-02 (new DB password or new DB, new `JWT_SECRET` which logs everyone out, Cloudinary, SMTP app password, Resend, VAPID, Google API key).
2. Delete or disable `DEV001`, `ADMIN001`, `PROF001` and every account still using a default password; force a password reset for all users.
3. Review DB audit data: users whose `role` is `admin`/`developer`, recent invitations, recently deleted users, posts/messages created by privileged accounts.
4. Purge the history (`git filter-repo --path backend/.env --path frontend/.env --invert-paths`), force-push, and ask every contributor to re-clone. Rotation is still mandatory: forks and clones keep the old history.

---

## 1. Authentication & sessions

| # | Sev | Finding | Location |
|---|-----|---------|----------|
| H-01 | H | JWT stored in `localStorage` (readable by any XSS), valid 7 days, **no revocation**: password change/reset, role change or account deletion do not invalidate existing tokens. Role and `ues` are baked into the token, so a demoted admin keeps admin rights for up to 7 days. | `routes/auth.js:makeToken`, `middleware/auth.js`, `frontend/src/context/AuthContext.jsx` |
| H-02 | H | `jwt.verify` without `algorithms`, `issuer` or `audience`. | `middleware/auth.js`, `server.js` socket auth, `routes/auth.js:tryGetAdminFromToken` |
| H-03 | H | Hardcoded default password `STDnew_UserPass` for every student created from the admin page, shown in the UI and shipped in the bundle. | `frontend/src/pages/AdminPage.jsx:410,890` |
| M-01 | M | Password policy: 6 characters minimum, bcrypt cost 10, no breached-password check. | `routes/auth.js` |
| M-02 | M | Account enumeration: `/forgot-password/verify-code` returns 404 "no account with this email". | `routes/auth.js` |
| M-03 | M | Password reset code delivered by **web push** to whatever device subscribed for that user, so whoever holds a logged-in session (or a stolen token) receives the reset code. The reset token is then put in the URL query string (history, Referer, analytics). | `routes/auth.js:/forgot-password`, `ForgotPasswordPage.jsx:275` |
| M-04 | M | Rate limiters use the in-memory store (reset on restart, not shared between instances); the verify-code limiter is keyed by email only. | `server.js`, `routes/auth.js` |
| L-01 | L | `io.emit("user:registered", newUser)` broadcasts the new user's email and full name to every connected client. | `routes/auth.js` register |

**Target design:** short-lived access token (≈15 min) in memory plus a rotating refresh token in an
`HttpOnly; Secure; SameSite=Strict` cookie, stored hashed in a `sessions` table (revocable per device);
`token_version` on `users` checked on every request; role read from the DB, not the token;
explicit `HS256`/`EdDSA` algorithm, `iss`/`aud`; argon2id or bcrypt cost 12; reset via email link only.

## 2. Authorization

| # | Sev | Finding | Location |
|---|-----|---------|----------|
| C-04 | C | **Privilege escalation:** any `admin` (or `developer`) can set any user's role to `admin` or `developer` (including their own as admin). No audit trail. | `routes/admin.js` `PATCH /users/:id/role` |
| H-04 | H | The `developer` role is a hidden superuser: invisible in presence and contact lists, receives every support ticket, can purge chat, manage users and invitations. It has no product purpose and must be removed. | `middleware/developer*.js`, `server.js`, `routes/messages.js`, `routes/admin.js`, `routes/supportTickets.js`, `routes/bugReports.js` |
| H-05 | H | Socket events trusted from clients: `message:global` and `message:private` re-broadcast **any client-crafted payload** (sender spoofing, fake messages to everyone); `bde:join` and `bde:update` are open to every user; `typing:*` and `message:seen` can target anyone. | `server.js:227-290` |
| H-06 | H | IDOR via `reply_to_id`: replying with the id of someone else's private message returns its content to you. | `routes/messages.js` `POST /` |
| M-05 | M | Reactions can be added to any message (including others' DMs) and the result is `io.emit`'d to everyone; `message:deleted` is broadcast globally. | `routes/messages.js` |
| M-06 | M | Any teacher can delete any other teacher's support links; support URLs are not validated. | `routes/supports.js` |
| M-07 | M | `GET /api/supports/:ue` and `GET /api/custom-ues` are unauthenticated. | `routes/supports.js`, `routes/custom-ues.js` |
| M-08 | M | Admin can change any user's email with no confirmation, which enables account takeover through password reset. | `routes/admin.js` `PATCH /users/:id/email` |
| L-02 | L | Invitation codes generated with `Math.random()` (not a CSPRNG), 6 characters. | `routes/admin.js:generateInviteCode` |

## 3. Input handling, uploads, XSS

| # | Sev | Finding | Location |
|---|-----|---------|----------|
| H-07 | H | Upload type check relies on the **client-declared MIME type**; local-disk mode keeps the original extension and serves `/uploads` statically from the API origin, so a `text/plain` file named `x.html` becomes stored XSS. Avatar upload in local mode has no type filter at all. | `services/storage.js`, `routes/auth.js` avatarUpload, `server.js` static `/uploads` |
| H-08 | H | User-controlled URLs rendered without scheme validation: chat `[FILE:name:<url>]` markup (`<img src>`, `fetch`, `window.open`), post attachments `href`, archive support links `href`. `javascript:` URLs are possible. | `chat-utils.js:81-92`, `MessagePanel.jsx:160,404,448,459,853,1366`, `AttachmentList.jsx:57`, `ArchiveGrid.jsx:348` |
| M-09 | M | `dangerouslySetInnerHTML` for chat text (DOMPurify default config still allows links, images and styles); the content is plain text and should be rendered as text. | `MessagePanel.jsx:639` |
| M-10 | M | No length limits on chat messages, pseudo, support labels or ticket text; JSON body limit is 10 MB on every route. | `server.js`, `routes/*` |
| M-11 | M | No schema validation layer: every route hand-checks `req.body`. | backend-wide |

## 4. Transport, headers, infrastructure

| # | Sev | Finding | Location |
|---|-----|---------|----------|
| H-09 | H | No security headers on either origin: no CSP, HSTS, `frame-ancestors`, `X-Content-Type-Options`, `Referrer-Policy`. No `helmet` on the API. | `vercel.json`, `frontend/vercel.json`, `server.js` |
| H-10 | H | Database TLS with `rejectUnauthorized: false` (MITM-able). | `backend/db/index.js` |
| M-12 | M | CORS hardcodes `localhost` origins in production. | `server.js` |
| M-13 | M | Service worker opens any URL from the push payload (`notificationclick`), and accepts `skip-waiting` from any client. | `frontend/public/sw.js:120-129` |
| M-14 | M | Schema mutated at **runtime** on every boot (`CREATE TABLE`, `ALTER`, `CREATE TRIGGER` in `server.js` and `db/index.js`) alongside 16 unordered `database/migration_*.sql` files: no migration tool, no history, drift between environments. | `server.js:300-420`, `db/index.js`, `database/` |
| M-15 | M | Dependency vulnerabilities (`npm audit --omit=dev`): backend 1 critical, 9 high, 3 moderate; frontend 7 high, 2 moderate, 1 low. | `package-lock.json` |
| M-16 | M | CI committed a real-looking VAPID private key; tests ran against a fixed `JWT_SECRET`. (Fixed in the CI PR.) | old `.github/workflows/run_tests.yml` |
| L-03 | L | Hosting inconsistency: README says Render, the keep-alive workflow pings a Vercel URL. Socket.IO needs a long-lived process, so Vercel serverless can't host it. | `README.md`, `.github/workflows/keep-alive.yml` |
| L-04 | L | Verbose logging of request bodies and user objects (`PATCH ROLE appelé — user: …`). | `routes/admin.js` |
| L-05 | L | No branch protection possible on the current plan (private repo, free org). Conventions are enforced by required CI checks plus local hooks only. Fix: GitHub Team for the org (free for schools through GitHub Education) to enable rulesets and required reviews. | GitHub settings |

## 5. Code quality / "AI slop"

- `scripts/doc_sync.py` + `make docsync`: docs regenerated by Gemini from source code. Docs are partly
  hallucinated (e.g. README claims "login 3 req/15min" while code says 20/5min; claims of "1000+ concurrent
  connections", "Scalability (500+ users)"). Remove the script, `GOOGLE_API_KEY`, and rewrite docs by hand.
- Dead or gimmick UI: `JarvisScanAnimation` (unused, 404 lines), `WaveAnimation`, `TeapotError` + `/teapot`
  route, `Maintenance`, `OnboardingModal` particles, unused `Badge`, `ArchiveCard`, duplicate `PostComposer`.
- Dead backend code: `SECURITY_QUESTIONS` + `user_security_questions` table (feature removed), Flask-Mail
  references in `Makefile` (folder no longer exists), `services/mailer.js` unused for reset, `bug_reports`
  vs `support_tickets` duplicates, `/messages/purge-test` debug endpoint in production.
- Copy-paste error handling (`avatar` upload logs "Security questions save error").
- Giant components: `MessagePanel.jsx` (1375 lines, ~17 inline components), `AdminPage.jsx` (1271 lines,
  48 `useState`), `BDEPage.jsx` (767 lines). Five avatar components, three role-label maps.
- Chat attachments encoded as a string protocol inside message content (`[FILE:name:url:img]`) instead of
  structured data.
- Mixed French/English identifiers (`nom`, `prenom`, `statut`, `anonyme`); the codebase standard becomes English.
- Unused deps: `swiper`, `@fortawesome/free-regular-svg-icons`; two icon libraries.
- Frontend bug: `isNetwordError` condition inverted in `src/api/axios.js`.
- Version drift: root 1.9.2, backend 1.9.6, frontend 1.9.3, README v1.9.0.

## 6. Database

- No `promotions` / cohort entity (removed in #92); useful as profile data.
- `messages` mixes global and private chat with nullable `receiver_id` and an `is_global` flag. Replace with
  `conversations` (type: `global` | `dm` | `group`) + `conversation_members` + `messages` + `message_attachments`.
- `TIMESTAMP` without time zone everywhere; use `TIMESTAMPTZ`.
- `SERIAL` integer ids exposed in URLs (enumerable); consider UUIDv7 for public ids.
- `users.ues TEXT[]` should be a join table; `custom_ues` naming.
- Student email constraint hardcodes `hei.*@gmail.com`; make the allowed domain configurable.
- Missing: `sessions`, `audit_log`, `follows`, `post_comments`, `post_likes`, `stories`, `blocks`, `reports`.

## 7. Neon migration: feasibility

Neon Free plan (official FAQ, Oct 2026): 1 GB storage per project, 100 CU-hours of compute per
project per month, scale-to-zero after 5 min idle, 10 branches, no credit card, no overage billing.

- **Storage:** text data for ~1–2k users (posts, messages, metadata) fits comfortably in 1 GB. Media must
  stay in object storage (Cloudinary / Neon Object Storage), never in Postgres.
- **Compute:** 0.25 CU always-on would be ~180 CU-h/month, over the limit. With scale-to-zero and school-day
  traffic (~12 h/day) it's ~90 CU-h: workable but tight. **The keep-alive cron must never touch the DB**
  (`/api/health` currently doesn't; keep it that way). If the quota runs out, Launch is pay-as-you-go
  (~$0.106/CU-h).
- **Wins:** branch-per-PR databases for e2e tests and previews, instant restore, pooled connections.
- **Verdict:** yes, migrate. Use the pooled connection string for the app and the direct one for
  migrations, with `sslmode=require` and proper certificate verification.
