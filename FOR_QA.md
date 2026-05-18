# Quality Assurance — FOR_QA

## Test Architecture

```
backend/
└── test/
    ├── api.test.js              # 27 tests — Auth, admin, messages, submissions, health
    ├── routes.test.js           # 41 tests — Posts, supports, suggestions, admin, auth, messages edge cases
    ├── messages.test.js         # 13 tests — Message search, contacts, CRUD, seen, upload, DELETE
    ├── security.test.js         # 38 tests — JWT attacks, SQL injection, XSS, authorization, input validation
    ├── socket.test.js           # 12 tests — Socket.io events, BDE sync, private messaging
    ├── mailer.test.js           # 14 tests — Email URL building, sending, fallbacks
    └── suggestionPdf.test.js    # 14 tests — PDF generation, content, sections, endpoint
```

**Total: 200 passing + 11 pending (conditional)**

### Test Runner & Config

```json
{
  "timeout": 10000,  // 10 seconds per test
  "exit": true       // Force exit when done (cleans up dangling handles)
}
```

Run with:
```bash
cd backend && npm test
# Sets NODE_ENV=test (disables rate limiting)
```

---

## Test Coverage

### `api.test.js` — Core API Smoke Tests

| Area | Test | What it verifies |
|------|------|------------------|
| AUTH | Login admin | Valid credentials return 200 + token |
| AUTH | Login wrong password | 401 |
| AUTH | Login unknown ref | 401 |
| AUTH | Login missing fields | 400 |
| AUTH | GET /me no token | 401 |
| AUTH | GET /me valid token | 200 with id + avatar |
| AUTH | GET /me invalid token | 401 |
| AUTH | Forgot password no email | 400 |
| AUTH | Forgot password long email | 400 |
| AUTH | Reset-password invalid token | 400 |
| AUTH | Reset-password missing fields | 400 |
| SECURITY | SQL injection login | 401 (not bypassed) |
| SECURITY | SQL injection password | 401 |
| SECURITY | XSS in message | 201 (stored as-is, not executed) |
| ADMIN | Stats no token | 401 |
| ADMIN | Stats admin token | 200 with total_users + total_messages |
| ADMIN | Users no token | 401 |
| ADMIN | Invitations admin token | 201 with code |
| MESSAGES | Global no token | 401 |
| MESSAGES | Global with token | 200 (array) |
| MESSAGES | Post empty content | 400 |
| MESSAGES | Post global | 201 with id |
| MESSAGES | Post private no receiver | 400 |
| MESSAGES | Search no token | 401 |
| MESSAGES | DELETE no token | 401 |
| MESSAGES | DELETE non-existent | 404 |
| SUBMISSIONS | List no token | 401 |
| SUBMISSIONS | List admin token | 200 (array) |
| SUBMISSIONS | Create missing fields | 400 |

### `routes.test.js` — Extended Route Tests

| Area | Test | What it verifies |
|------|------|------------------|
| POSTS | GET public | 200 or 500 (DB dependent) |
| POSTS | GET with UE filter | Filters correctly |
| POSTS | GET with type filter | Filters correctly |
| POSTS | GET with level filter | Filters correctly |
| POSTS | GET with invalid type | Graceful handling |
| POSTS | POST missing title | 400 |
| POSTS | POST missing UE | 400 |
| POSTS | DELETE no token | 401 |
| POSTS | GET combined filters | Multiple filters work |
| SUPPORTS | GET by UE | 200 or 500 |
| SUPPORTS | POST no token | 401 |
| SUPPORTS | POST missing UE | 400 |
| SUPPORTS | POST missing label | 400 |
| SUPPORTS | POST missing URL | 400 |
| SUPPORTS | DELETE no token | 401 |
| SUGGESTIONS | POST no token | 401 |
| SUGGESTIONS | POST missing titre | 400 or 403 |
| SUGGESTIONS | POST missing contenu | 400 or 403 |
| SUGGESTIONS | POST whitespace fields | 400 or 403 |
| SUGGESTIONS | GET no token | 401 |
| SUGGESTIONS | PATCH no token | 401 |
| SUGGESTIONS | CONFIRM no token | 401 |
| ADMIN | PATCH role no body | 400 |
| ADMIN | PATCH role invalid | 400 |
| ADMIN | GET invitations | 200 or 500 |
| AUTH (edge) | Login extra fields | 200 (ignores extra) |
| AUTH (edge) | Reset only token | 400 |
| AUTH (edge) | Reset only password | 400 |
| AUTH (edge) | Reset short password | 400 |
| AUTH (edge) | GET /me field check | Returns id, ref, email, role |
| MESSAGES (edge) | Private with user ID | 200 or 500 |
| MESSAGES (edge) | Seen non-existent | 404 |

### `security.test.js` — Security Tests

| Area | Test | What it verifies |
|------|------|------------------|
| JWT | No Authorization header | 401 "Token manquant." |
| JWT | Malformed header (not Bearer) | 401 "Token manquant." |
| JWT | Empty token after Bearer | 401 |
| JWT | Wrong signing secret | 401 |
| JWT | Expired token | 401 (after 1s wait) |
| JWT | "none" algorithm | 401 |
| JWT | Non-existent user in token | Handled gracefully |
| JWT | Invalid JWT format | 401 |
| AUTH HEADER | Token in query string | Ignored (401) |
| AUTH HEADER | Token in body | Ignored (401) |
| AUTH HEADER | Spaces-only Authorization | 401 |
| AUTH HEADER | Bearer: colon separator | 401 |
| AUTH HEADER | Multiple headers | 401 |
| SQL INJECTION | Login: `' OR 1=1--` | Not bypassed |
| SQL INJECTION | Login: `' OR '1'='1` | Not bypassed |
| SQL INJECTION | Login: `'; DROP TABLE users--` | No injection |
| SQL INJECTION | Message search SQLi | Handled gracefully |
| SQL INJECTION | Message content SQLi | Handled gracefully |
| XSS | Script tag in message | Stored but not executed |
| XSS | Safe message | Works normally |
| XSS | HTML entities | Handled |
| AUTHORIZATION | Admin routes no token | 401 |
| AUTHORIZATION | Messages no token | 401 |
| AUTHORIZATION | Submissions no token | 401 |
| AUTHORIZATION | Auth/me no token | 401 |
| AUTHORIZATION | Admin stats with token | 200 or 500 |
| INPUT VALIDATION | Whitespace message | 400 |
| INPUT VALIDATION | Null content | 400 |
| INPUT VALIDATION | Object content | 400 or 500 |
| INPUT VALIDATION | Long content (10k chars) | 201 |
| INPUT VALIDATION | Unicode (French + Chinese) | 201 |
| INPUT VALIDATION | Empty pseudo update | 400 |
| INPUT VALIDATION | Whitespace pseudo | 400 |
| AUTH (pseudo) | Register duplicate pseudo | 409 |
| AUTH (pseudo) | PATCH /profile duplicate pseudo | 409 |
| AUTH (avatar) | PATCH /avatar no file | 400 |
| INPUT VALIDATION | Special chars message | 201 |
| HTTP TAMPERING | PUT on messages/global | 404 |
| HTTP TAMPERING | DELETE on auth/me | 404 |
| MALFORMED | Invalid JSON body | 400 |

### `socket.test.js` — Real-Time Tests

| Test | What it verifies |
|------|------------------|
| user:join creates room + private msg | Targeted delivery works |
| message:global reaches all clients | Broadcast works |
| message:seen notifies sender only | Correct targeting |
| disconnect cleans up | No errors on disconnect |
| user:online emitted | Online status broadcast |
| user:offline emitted | Offline status broadcast |
| Private message only to participants | 3rd client does NOT receive |
| BDE: drag-start reaches others | Room-based broadcast |
| BDE: drag-over reaches others | Column info relayed |
| BDE: drag-end reaches others | Cleanup signal |
| BDE: update reaches others | Status changes synced |
| Non-BDE don't receive BDE events | Room isolation |

### `mailer.test.js` — Email Tests

| Test | What it verifies |
|------|------------------|
| buildResetUrl correct | URL format |
| URL encoding special chars | Proper encoding |
| Strip trailing slash | Clean URLs |
| Fallback to FRONTEND_URL | Multiple env var support |
| Fallback to localhost | Default when no URL set |
| Undefined user throws | Required validation |
| Missing email throws | Required validation |
| Empty email throws | Required validation |
| Whitespace email throws | Required validation |
| SMTP sends correctly | Nodemailer called correctly |
| No provider = skipped=true | Graceful fallback |
| Reset URL always valid | Even without email config |
| Resend API success | Correct API call |
| Resend failure throws | Error handling |

### `suggestionPdf.test.js` — PDF Tests

| Test | What it verifies |
|------|------------------|
| PDF is valid | Starts with `%PDF-`, size > 1000 bytes |
| Contains HEI STDhub title | Branding present |
| Contains suggestion titles | Content rendered |
| Contains section headers | Acceptees, Refusees, A approfondir |
| Contains justification | For refused suggestions |
| Shows Anonyme | Anonymous suggestions handled |
| Summary section present | RESUME + counts |
| Multi-page for 25 suggestions | Pagination works |
| Empty sections handled | Graceful rendering |
| Returns Buffer | Correct output type |
| Endpoint: no token | 401 |
| Endpoint: missing suggestions | 400 |
| Endpoint: empty array | 400 |
| Endpoint: valid PDF returned | 200 + Content-Type: application/pdf |

---

## How to Add Tests

### 1. Create test file in `backend/test/`
```js
const request = require("supertest");
const app = require("../server");

describe("MY FEATURE", () => {
  it("does something", async () => {
    const res = await request(app)
      .get("/api/health")
      .expect(200);
    assert.equal(res.body.status, "ok");
  });
});
```

### 2. Follow existing patterns
- Use `request(app)` from supertest
- Use `describe`/`it` blocks (Mocha)
- Use `assert` or `expect` (Chai)
- Use `await` for async tests
- Set `NODE_ENV=test` to disable rate limiting

### 3. Authentication for protected routes
```js
let adminToken;
before(async () => {
  const res = await request(app)
    .post("/api/auth/login")
    .send({ ref: "ADMIN001", password: "password" });
  adminToken = res.body.token;
});

it("protected route", async () => {
  await request(app)
    .get("/api/admin/stats")
    .set("Authorization", `Bearer ${adminToken}`)
    .expect(200);
});
```

### 4. Test guidelines
- Test **happy path** (200/201)
- Test **all error codes** (400, 401, 403, 404, 409, 500)
- Test **edge cases** (empty strings, nulls, long strings, Unicode, SQLi, XSS)
- Test **authorization** (no token, wrong role, invalid token, expired token)
- Test **rate limiting** (for auth routes)
- Test **database constraints** (ref format, email format, level requirements)
- Tests should be **independent** and **idempotent**
- Sets `NODE_ENV=test` before running

---

## Pre-Production Checklist

- [ ] All 200 tests pass: `cd backend && npm test`
- [ ] No lint errors: `cd frontend && npm run lint`
- [ ] Frontend builds: `cd frontend && npm run build`
- [ ] Database migrations applied (including migration_chat_seen_pseudo_unique.sql)
- [ ] Environment variables set in production
- [ ] CORS `origin` restricted to production URL
- [ ] `JWT_SECRET` is a production-worthy random string
- [ ] Rate limiting active (not in test mode)
- [ ] Password reset emails work (check Resend/SMTP logs)
- [ ] Cloudinary uploads work (avatars, submissions, chat files)
- [ ] Push notifications work (service worker + VAPID keys persisted)
- [ ] Socket.IO connects in production (CORS config)
- [ ] Keep-alive ping configured (prevent Render sleep)
- [ ] Invitation codes generate and validate
- [ ] Role-based access control works (admin, bde, teacher, student, alumni)
- [ ] Seasonal features show at correct times (Sept upgrade, Nov L1 registration)
