# Secret rotation runbook — C-02 / #127

`backend/.env` (23 commits) and `frontend/.env` (3 commits) were committed with
production credentials. Anyone with a clone or fork can read them, so **the only
fix that actually protects users is to revoke and replace every value**.
Purging git history (#130) is useful follow-up, but it does not invalidate
credentials that were already copied.

This document is the operational part of #127. The repository-side guardrails
are in place; the provider steps require access to Render, the database
provider, Cloudinary, the SMTP mailbox, Resend and Google Cloud. Until every
box below is checked, treat the matching credential as compromised.

## Rules

- Generate secrets on a trusted machine. Never reuse an old value.
- Store production values only in **Render → Environment** and, for CI/CD, in
  **GitHub → Settings → Environments → Production**. Never in a tracked file.
- Never paste a secret into an issue, PR, chat, screenshot or CI log.
- Rotate one provider at a time, deploy, verify, then revoke the old value.
- Assume every JWT and every push subscription is attacker-controlled until the
  JWT secret and the VAPID key pair have been replaced.
- The backend now refuses to start with `NODE_ENV=production` while a value
  known to be leaked is still configured (`backend/services/leakedSecrets.js`).

## Clean-slate path (hosting already deleted)

If the Render/Vercel projects have already been deleted and the database is
paused, the order changes but the work does not disappear:

1. **Deleting the hosts removes the runtime copies, not the leak.** Cloudinary,
   SMTP, Resend, Google and the VAPID key pair are independent of Render and
   Vercel. Revoke/regenerate them at the providers even though the old app is
   offline.
2. **A paused database is not a revoked database.** Keep it paused only while
   forensics (#129) needs it; export what is needed, then **delete the Supabase
   project**. Never unpause it and never reuse its password. The replacement
   database (#144) must have a new owner and a new password.
3. **Do not reuse anything from the old `.env`.** Generate a fresh JWT/VAPID
   pair and a fresh database password for the new deployment. The guard in
   `backend/services/leakedSecrets.js` blocks a boot that reintroduces one of
   the old values.
4. **GitHub `Production` is the source of truth for CI/CD secrets** until a new
   host exists. Store only new values there.
5. Old push subscriptions still live in users' browsers. Rotating VAPID
   invalidates them; users must re-subscribe when the new frontend is live.

## What was exposed

| Secret | Why it matters | Replace with |
|--------|----------------|--------------|
| `DATABASE_URL` password | Full read/write access to production data | New database password or new database (#144) |
| `JWT_SECRET` | Forge a token for any user/role | 32+ random bytes |
| `CLOUDINARY_API_SECRET` | Upload/delete/replace media | New Cloudinary API key/secret |
| `SMTP_PASS` | Send mail as the HEI mailbox | New app password, or remove the legacy flow |
| `RESEND_API_KEY` | Send mail through Resend | New API key, or remove the legacy flow |
| `VAPID_PRIVATE_KEY` | Send push notifications to every subscription | New VAPID key pair |
| `GOOGLE_API_KEY` | Billing/quota abuse on the Google project | Revoke; no replacement needed (#150 removes `doc_sync.py`) |

## 1. Prepare

1. Announce a short maintenance window. Socket.IO clients will reconnect.
2. Make sure you can reach the Render service, the database dashboard, the
   Cloudinary console, the Google account, the Resend dashboard and GitHub
   environment settings.
3. Generate the values that can be generated locally:

   ```bash
   node scripts/rotate-secrets.js
   ```

   This prints `JWT_SECRET`, `VAPID_PUBLIC_KEY` and `VAPID_PRIVATE_KEY`.
   Keep the terminal output private and clear it afterwards.

4. For local development only, rotate the local `.env` without printing values:

   ```bash
   node scripts/rotate-secrets.js --write-env .env
   node scripts/rotate-secrets.js --check .env
   ```

   The second command must report no leaked value. Never use production
   credentials in a local `.env`.

## 2. Rotate the JWT secret

1. Set `JWT_SECRET` to the new 32+ byte value in **Render → Environment**.
2. Deploy the backend (Render redeploys when the environment changes).
3. Every token signed with the old secret is now invalid: users are logged out
   and forged tokens stop working. No database change is required.
4. Optional belt-and-braces: bump the server-side token version so any token
   that somehow survives is rejected:

   ```sql
   UPDATE users SET token_version = token_version + 1;
   ```

5. Verify: an old token returns `401`, a fresh login works.

Checklist:

- [ ] New `JWT_SECRET` stored in Render
- [ ] Backend redeployed
- [ ] Old sessions invalidated
- [ ] Old `JWT_SECRET` no longer configured anywhere

## 3. Rotate the database password

Choose one path:

### A. Short term — reset the Supabase password

1. Supabase Dashboard → Project Settings → Database → **Reset database
   password**. This immediately drops existing connections.
2. Update `DATABASE_URL` in **Render → Environment** with the new password
   (use the pooled connection string for the app).
3. Redeploy and verify login + a write operation.
4. If CI runs migrations, update `DATABASE_URL_DIRECT` in the GitHub
   `Production` environment as well.

### B. Target — new database (#144)

1. Create the Neon project/database with a new owner role and password.
2. Migrate the data (after forensics, #129), keeping the old database read-only.
3. Point `DATABASE_URL` / `DATABASE_URL_DIRECT` at Neon.
4. Verify, then **delete the Supabase project**. Deleting the old project is
   the strongest revocation: the old password can no longer be used.

Checklist:

- [ ] New database password (or new database) in use
- [ ] Old password/project revoked
- [ ] `DATABASE_URL` updated in Render
- [ ] `DATABASE_URL_DIRECT` updated in GitHub `Production` (if used)

## 4. Rotate the VAPID key pair

1. Set the new `VAPID_PUBLIC_KEY` and `VAPID_PRIVATE_KEY` from step 1 in
   **Render → Environment**.
2. Redeploy. `GET /api/push/vapid-key` must return the new public key.
3. Clear old subscriptions so every device re-subscribes:

   ```sql
   DELETE FROM push_subscriptions;
   ```

   Existing browser subscriptions are tied to the old key. The frontend
   detects the key mismatch and re-subscribes on the next app load, but users
   must open the app and allow notifications again.
4. Verify a test push and the push-based password-reset code flow.

Checklist:

- [ ] New VAPID public/private pair in Render
- [ ] `/api/push/vapid-key` returns the new public key
- [ ] Old subscriptions cleared
- [ ] Users notified that they must re-enable push notifications

## 5. Rotate Cloudinary

1. In the Cloudinary console, create a new API key/secret pair (or regenerate
   the secret for the existing key).
2. Update `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY` and
   `CLOUDINARY_API_SECRET` in Render.
3. Delete or deactivate the old key/secret after the new one is verified.
4. Verify an avatar upload and a chat-file upload.

Checklist:

- [ ] New Cloudinary secret in Render
- [ ] Old key/secret deactivated
- [ ] Uploads verified

## 6. Revoke the email credentials (SMTP and Resend)

The main password-reset flow uses Web Push. The SMTP/Resend path is the legacy
`/forgot-password/send-email` flow and is scheduled for removal (#202).

- If the flow is still used:
  1. Revoke the old Gmail app password (Google Account → Security → 2-Step
     Verification → App passwords) and create a new one.
  2. Update `SMTP_PASS` in Render.
  3. In Resend, create a new API key, update `RESEND_API_KEY`, then delete the
     old key.
- If the flow is no longer used: remove `SMTP_*` and `RESEND_*` from Render
  and revoke the old credentials at the providers. Do not leave them dormant.

Checklist:

- [ ] Old SMTP app password revoked
- [ ] `SMTP_PASS` rotated in Render, or SMTP removed
- [ ] Old Resend key deleted
- [ ] `RESEND_API_KEY` rotated in Render, or Resend removed

## 7. Revoke the Google API key

`GOOGLE_API_KEY` was only used by `scripts/doc_sync.py`, which is removed by
#150. Revoke the key in Google Cloud Console → APIs & Services → Credentials.
No replacement is needed. Do not add a new Google key to `.env.example`.

Checklist:

- [ ] Old Google API key deleted
- [ ] No Google key in Render, GitHub or `.env.example`

## 8. Store the new values in the right place

- **Runtime secrets:** Render → Environment. This is what the backend reads.
- **CI/CD secrets:** GitHub → Settings → Environments → Production. Keep only
  what the workflows actually need (`DATABASE_URL_DIRECT`,
  `BACKEND_DEPLOY_HOOK_URL`, and any future deploy credentials).
- **Local development:** an ignored `.env` with local-only values. Never copy
  production values into it.
- **Password manager:** record which value was rotated, when, and by whom. Do
  not record the secret in the repository or in a ticket.

## 9. Verify before closing #127

Run through this list after the deployment:

- [ ] Render/Vercel projects are deleted and no old environment variables are
      recoverable from them
- [ ] Supabase was exported for forensics and then **deleted** (a paused project
      still keeps the old password valid if it is ever restored)
- [ ] The new deployment uses only new values; nothing was copied from an old
      `.env`, backup or dashboard
- [ ] `curl -fsS https://<backend>/api/health` returns `ok`
- [ ] A fresh login works and an old token returns `401`
- [ ] Creating a post/message writes to the new database
- [ ] Avatar and chat-file uploads reach Cloudinary
- [ ] `GET /api/push/vapid-key` returns the new VAPID public key
- [ ] Push notifications and push-based password reset work after re-subscribing
- [ ] The backend starts with `NODE_ENV=production` (the leaked-secret guard
      does not abort)
- [ ] `node scripts/rotate-secrets.js --check .env` reports no leaked value
- [ ] No `.env` file is tracked: `git ls-files | grep -E '(^|/)\.env'` only
      shows `.env.example` files
- [ ] The issue checklist has evidence for each rotated secret (names and
      dates only, never values)

## Follow-up

- **#130** — purge `backend/.env` and `frontend/.env` from all history and
  force-push; every contributor must re-clone.
- **#144** — Neon migration; delete the old Supabase project.
- **#189** — typed config validation, VAPID from env only, no hardcoded DB
  fallbacks.
- **#202** — remove the legacy SMTP/Resend flow.
- **#150** — remove `scripts/doc_sync.py` and `GOOGLE_API_KEY`.
