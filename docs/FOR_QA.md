# Quality Assurance — FOR_QA

## Test Architecture

```
backend/
└── test/
    ├── api.test.js              # Core API smoke tests
    ├── routes.test.js           # Extended route tests
    ├── messages.test.js         # Message CRUD, search, contacts, seen, upload, delete
    ├── security.test.js         # JWT attacks, SQL injection, XSS, authorization, input validation
    ├── socket.test.js           # Socket.IO events, BDE sync, private messaging
    ├── mailer.test.js           # Email URL building, sending, fallbacks
    └── suggestionPdf.test.js    # PDF generation, content, sections, endpoint
```

**Backend**: Mocha + Chai + Supertest  
**Frontend**: Mocha + Chai (chat utils, ContactList, roleFilter)

### Test Runner & Config
```json
{
  "timeout": 10000,  // 10 seconds per test
  "exit": true       // Force exit when done
}
```

Run with:
```bash
cd backend && npm test     # Sets NODE_ENV=test (disables rate limiting)
cd frontend && npm test    # Frontend tests
```

---

## Backend Test Coverage

### `api.test.js` — Core API Smoke Tests

| Area | Tests | What it verifies |
|------|-------|------------------|
| AUTH | 7 | Login valid/invalid/missing, GET /me token/no-token/invalid, forgot-password validation, reset-password validation |
| SECURITY | 3 | SQL injection login/password, XSS in message |
| ADMIN | 4 | Stats no-token/ok, users no-token, invitations create |
| MESSAGES | 6 | Global no-token/ok, post empty/ok/private-no-receiver, search no-token, delete no-token/not-found |
| SUBMISSIONS | 3 | List no-token/ok, create missing fields |

### `routes.test.js` — Extended Route Tests

| Area | Tests | What it verifies |
|------|-------|------------------|
| POSTS | 8 | GET public/filtered by UE/type/level/invalid-type, POST missing title/UE, DELETE no-token |
| SUPPORTS | 6 | GET by UE, POST no-token/missing-UE/label/URL, DELETE no-token |
| SUGGESTIONS | 7 | POST no-token/missing-titre/missing-contenu/whitespace, GET no-token, PATCH no-token, CONFIRM no-token |
| ADMIN | 4 | PATCH role no-body/invalid, GET invitations, edge cases |
| AUTH (edge) | 5 | Login extra fields, reset-password edge cases, GET /me field check |
| MESSAGES (edge) | 2 | Private with user ID, seen non-existent |

### `security.test.js` — Security Tests

| Area | Tests | What it verifies |
|------|-------|------------------|
| JWT | 9 | No header, malformed, empty token, wrong secret, expired, "none" alg, non-existent user, invalid format |
| AUTH HEADER | 5 | Token in query/body, spaces-only, colon separator, multiple headers |
| SQL INJECTION | 5 | Login: `' OR 1=1--`, `' OR '1'='1`, `'; DROP TABLE`, message search/content |
| XSS | 3 | Script tag in message, safe message, HTML entities |
| AUTHORIZATION | 5 | Admin/messages/submissions/auth/me no-token, admin stats with token |
| INPUT VALIDATION | 10 | Whitespace/null/object/long(10k)/unicode/duplicate-pseudo/special-chars, empty/whitespace pseudo, avatar no-file |
| HTTP TAMPERING | 2 | PUT on messages/global, DELETE on auth/me |
| MALFORMED | 1 | Invalid JSON body |

### `socket.test.js` — Real-Time Tests

| Test | What it verifies |
|------|------------------|
| user:join creates room + private msg | Targeted delivery |
| message:global reaches all clients | Broadcast works |
| message:seen notifies sender only | Correct targeting |
| disconnect cleans up | No errors |
| user:online emitted | Online status broadcast |
| user:offline emitted | Offline status broadcast |
| Private message only to participants | 3rd client does NOT receive |
| BDE: drag-start/over/end reaches others | Room-based broadcast |
| BDE: update reaches others | Status changes synced |
| Non-BDE don't receive BDE events | Room isolation |

### `mailer.test.js` — Email Tests

| Test | What it verifies |
|------|------------------|
| buildResetUrl correct/encoding/trailing-slash | URL format |
| Fallback to FRONTEND_URL/localhost | Multiple env var support |
| Undefined/missing/empty/whitespace email throws | Required validation |
| SMTP sends correctly | Nodemailer called correctly |
| No provider = skipped=true | Graceful fallback |
| Reset URL always valid | Even without email config |
| Resend API success/failure | Correct API call and error handling |

### `suggestionPdf.test.js` — PDF Tests

| Test | What it verifies |
|------|------------------|
| PDF is valid | Starts with `%PDF-`, size > 1000 bytes |
| Contains branding/content/sections | Title, suggestions, Acceptees/Refusees/A approfondir |
| Contains justification | For refused suggestions |
| Shows Anonyme | Anonymous suggestions handled |
| Summary section present | RESUME + counts |
| Multi-page for 25 suggestions | Pagination works |
| Empty sections handled | Graceful rendering |
| Returns Buffer | Correct output type |
| Endpoint: no token/missing/empty/valid | Full endpoint testing |

---

## Frontend Test Coverage

| File | Tests | What it verifies |
|------|-------|------------------|
| `chat-utils.test.js` | isSameDay, getDayDiff, formatTime, formatDateLabel, formatMessageTime, formatTooltipDate, isFileMessage, parseFileContent, shouldGroup |
| `ContactList.test.js` | Search input, filtered contact list, online indicator, role badges |
| `roleFilter.test.js` | expandRoleFilter, determineRegisterRole, validateRegisterEmail |

---

## How to Add Tests

### Backend
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

### Guidelines
- Test **happy path** (200/201) + **all error codes** (400, 401, 403, 404, 409)
- Test **edge cases** (empty, null, long, Unicode, SQLi, XSS)
- Test **authorization** (no token, wrong role, invalid token, expired token)
- Tests should be **independent** and **idempotent**
- Backend: use `request(app)` from supertest, `NODE_ENV=test` disables rate limiting
- Frontend: place test file next to source with `.test.js` extension

### Authentication for protected routes
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

---

## Pre-Production Checklist

- [ ] All backend tests pass: `cd backend && npm test`
- [ ] Frontend tests pass: `cd frontend && npm test`
- [ ] No lint errors: `cd frontend && npm run lint`
- [ ] Frontend builds: `cd frontend && npm run build`
- [ ] Database migrations applied
- [ ] Environment variables set in production
- [ ] CORS `origin` restricted to production URL
- [ ] `JWT_SECRET` is a production-worthy random string
- [ ] Rate limiting active (not in test mode)
- [ ] VAPID keys persisted in production
- [ ] Cloudinary uploads work (avatars, submissions, chat, announcements, alumni spotlight)
- [ ] Push notifications work (service worker + VAPID keys)
- [ ] Socket.IO connects in production (CORS config)
- [ ] Keep-alive ping configured (prevent Render sleep)
- [ ] Invitation codes generate and validate
- [ ] Role-based access control works (admin, bde, teacher, student, alumni)
- [ ] Seasonal features show at correct times (Sept upgrade, Nov L1 registration)
