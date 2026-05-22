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

## Git Workflow

### Branch Naming
- `feat/description` — New features
- `fix/description` — Bug fixes
- `refactor/description` — Code restructuring
- `doc/description` — Documentation

### Commit Messages
- French or English commits (project uses French)
- Format: `type: brief description`
- Examples:
  - `feat: add drag-and-drop for BDE kanban`
  - `fix: correct September month detection`
  - `refactor: simplify message grouping logic`

### PR Convention
- Title: Brief summary in French
- Body: Describe what changed and why
- Reference related issues if any

---

## Adding a New Route

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
- Place test file in `backend/test/` with `.test.js` extension
- Run tests: `cd backend && npm test`

---

## Environment Variables

- Never commit `.env` files
- Document new env vars in FOR_OPS.md
- Add defaults where possible
- Use `process.env.VAR || default` pattern
