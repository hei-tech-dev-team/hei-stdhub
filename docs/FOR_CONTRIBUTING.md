# Contributing — FOR_CONTRIBUTING

## Code Style

### General
- French UI labels and error messages
- English variable/function names
- camelCase for JS/JSX identifiers
- PascalCase for React components
- Semicolons required

### Backend (Express/Node)
- `async/await` for all database operations
- Route handlers: wrap in try/catch, return `res.status().json()`
- SQL: parameterized queries with `$1`, `$2` placeholders (no string interpolation)
- Error responses: `{ error: "French message." }`
- Success responses: `{ message: "French message." }` or JSON data

```js
// Good
router.get("/example", auth, async (req, res) => {
  try {
    const { rows } = await db.query("SELECT * FROM table WHERE id=$1", [id]);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: "Erreur serveur." });
  }
});
```

### Frontend (React/Vite)
- Functional components with hooks (no classes)
- State initialized with `useState`
- Side effects in `useEffect` with cleanup
- Axios instance from `api/axios.js` for HTTP calls
- Font Awesome for icons (or Lucide React for specific pages)
- Tailwind CSS with custom theme colors

```jsx
function MyComponent() {
  const [state, setState] = useState(null);
  const { user } = useAuth();

  useEffect(() => {
    api.get("/endpoint").then(setState).catch(console.error);
  }, []);

  return <div className="text-navy">{state}</div>;
}
```

### CSS/Tailwind
- Use Tailwind utility classes primarily
- Custom component classes in `index.css` only for repeated patterns
- Colors: `navy`, `navy-dark`, `gold`, `gold-light`, `surface`, `contact`
- Shadows: `shadow-card`, `shadow-modal`

---

## Git Workflow (mandatory, enforced by CI)

No direct pushes to `main`: everything goes through a PR that must be green
(`CI`, `Conventions` and `Security` workflows).

After cloning, run `npm install` once at the repository root. This enables the
local hooks (`.githooks/`) that reject invalid branch names and commit messages.

### Branch names

```
<type>/<issue-number>-<kebab-case-description>
```

| type | use |
|------|-----|
| `feat` | new feature |
| `fix` | bug fix |
| `hotfix` | urgent production fix |
| `security` | vulnerability fix |
| `refactor` | restructuring with no behavior change |
| `perf` | performance |
| `test` | tests only |
| `docs` | documentation |
| `chore` / `build` / `ci` / `style` | tooling, dependencies, pipeline, formatting |
| `release` | release preparation |

Examples: `feat/42-post-comments`, `security/12-jwt-revocation`, `fix/57-avatar-upload`.
Every branch maps to an issue (the number may be omitted only for `chore`/`ci`).

Feature branches target `dev`; `dev` is promoted to `main` through a `promotion: dev to main` PR (exempt from the branch-name and linked-issue checks).

### Commits: Conventional Commits

```
type(optional-scope): short description
```

Examples: `feat(feed): post comments`, `fix(auth): revoke JWTs after password reset`.
A `!` after the type marks a breaking change: `refactor(api)!: migrate to TypeScript`.

### Pull requests

- Title follows Conventional Commits (checked by CI).
- Body contains `Closes #N` (checked by CI) and follows the template.
- At least one review before merging; squash merge.

## CI/CD (GitHub Actions)

Every PR runs these workflows; all must be green before merging:

- **Conventions** (`conventions.yml`): branch name, Conventional Commits PR title, linked issue.
- **CI** (`ci.yml`):
  - backend: PostgreSQL 16 service seeded with `backend/db/schema.sql` + `backend/db/seed.dev.sql` (test-only accounts, never production), ephemeral `JWT_SECRET`/VAPID keys generated per run, lint and typecheck when configured, `npm test`;
  - frontend: lint, typecheck when `tsconfig.json` exists, tests, build;
  - e2e: Playwright, enabled automatically once `e2e/playwright.config.*` exists.
- **Security** (`security.yml`): gitleaks secret scan, a check that no `.env*` file is tracked, and `npm audit --omit=dev --audit-level=high`.
- **CD** (`cd.yml`): after green CI on `main`, runs migrations (once they exist) and triggers the backend deploy hook.

`keep-alive.yml` is a scheduled health ping, unrelated to PRs.

### Run tests locally (backend)
1. Create a test database, e.g. `createdb hei_stdhub_test`
2. Seed it: `psql "postgres://.../hei_stdhub_test" -f backend/db/schema.sql` then `-f backend/db/seed.dev.sql`
3. Create a root-level `.env` (the backend loads `../.env`) with `DATABASE_URL` pointing to it, `JWT_SECRET`, `CLIENT_URL`, `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY` and `NODE_ENV=test`
4. `cd backend && npm test`

### Run checks locally (frontend)
```bash
cd frontend && npm ci && npm run lint && npm test && npm run build
```

## Adding a New API Route

1. Create route file in `backend/routes/`
2. Import `express`, `db`, `auth`, and any other middleware
3. Define route handlers with `async/await`
4. Export `router` and register in `server.js`

```js
const express = require("express");
const db = require("../db");
const auth = require("../middleware/auth");
const router = express.Router();

router.get("/", auth, async (req, res) => {
  try {
    const { rows } = await db.query("SELECT * FROM items");
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: "Erreur serveur." });
  }
});

module.exports = router;
```

Then in `server.js`:
```js
app.use("/api/items", require("./routes/items"));
```

---

## Adding a New Page

1. Create page file in `frontend/src/pages/`
2. Import `Sidebar` and any needed components
3. Add route in `frontend/src/App.jsx` with appropriate guard

```jsx
import Sidebar from "../components/layout/Sidebar";

function MyPage() {
  return (
    <>
      <Sidebar />
      <main className="flex-1 p-6 overflow-y-auto">
        {/* Page content */}
      </main>
    </>
  );
}
```

Then in `App.jsx`:
```jsx
<Route path="/my-page" element={<ProtectedRoute><MyPage /></ProtectedRoute>} />
```

---

## Database Migrations

- Create new migration file in `database/` with descriptive name
- Use `IF NOT EXISTS` / `IF EXISTS` for idempotency
- Run against dev database before committing
- Document in FOR_DEV.md

```sql
-- migration_add_feature.sql
ALTER TABLE users ADD COLUMN IF NOT EXISTS new_column VARCHAR(100);
```

---

## Testing Guidelines

- Write tests for all new routes/features
- Test happy path + error cases
- Test authorization (no token, wrong role)
- Test input validation (empty, null, long, special chars)
- Backend: place test file in `backend/test/` with `.test.js` extension
- Frontend: place test file next to source with `.test.js` extension
- Run tests: `cd backend && npm test`

---

## Environment Variables

- Never commit `.env` files
- Use the repository-root `.env` (the backend loads `../.env`); there is no `backend/.env`
- The frontend only needs `VITE_API_URL`; production sets it in Vercel, and no `frontend/.env` is committed
- Production secrets live in Render and GitHub Environments, never in files
- Rotate a leaked credential with `docs/SECRET_ROTATION.md`; do not just delete the file
- Document new env vars in FOR_OPS.md and add them to `.env.example` without values
- Add defaults where possible
- Use `process.env.VAR || default` pattern
