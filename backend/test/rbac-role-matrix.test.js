const express = require("express");
const chai = require("chai");
const request = require("supertest");
const bcrypt = require("bcryptjs");
const app = require("../server");
const db = require("../db");
const { collectRoutes } = require("./helpers/appRoutes");
const { can } = require("../../shared/permissions");

const { expect } = chai;

const ROLES = ["student", "teacher", "bde", "admin", "developer"];
const LABELS = ["anonymous", ...ROLES];

// Temporary accounts, one per role, created and removed by this suite.
// They carry `nom = "RBAC Matrix"` so the cleanup can never touch an
// unrelated account that would happen to reuse one of our refs.
const FIXTURE_NOM = "RBAC Matrix";
const PASSWORD = "rbac-matrix-password";
const FIXTURES = [
  { role: "student", ref: "STD99001", pseudo: "RBACSTU", email: "hei.rbacmatrix.stu@gmail.com" },
  { role: "bde", ref: "STD99002", pseudo: "RBACBDE", email: "hei.rbacmatrix.bde@gmail.com" },
  { role: "teacher", ref: "PROF999", pseudo: "RBACPRO", email: "hei.rbacmatrix.prof@gmail.com" },
  { role: "admin", ref: "ADMIN999", pseudo: "RBACADM", email: "hei.rbacmatrix.adm@gmail.com" },
  { role: "developer", ref: "DEV999", pseudo: "RBACDEV", email: "hei.rbacmatrix.dev@gmail.com" },
];

/**
 * Routes whose handler writes destructively as soon as the guard lets the
 * request through (global chat purge, bulk suggestion confirmation). They are
 * exercised through a "guard only" app built from the very same middleware
 * chain, terminated by a 204: the authorization decision is still asserted
 * with real HTTP status codes, without ever reaching the handler.
 */
const GUARD_ONLY_ROUTES = new Set([
  "POST /api/messages/purge-test",
  "POST /api/suggestions/confirm",
]);

// Placeholder for path parameters: no resource with this id exists, so the
// handlers answer 400/404 instead of reading or writing real data.
const PARAM_PATTERN = /:[A-Za-z0-9_]+/g;
const MISSING_ID = "99999999";

const routes = collectRoutes(app);
const routeKey = (route) => `${route.method} ${route.path}`;
const targetPath = (route) => route.path.replace(PARAM_PATTERN, MISSING_ID);

/** Express app running the route middlewares but stopping before the handler. */
function buildGuardApp(route) {
  const guard = express();
  guard.use(express.json());
  const middlewares = route.handlers.slice(0, -1); // drop the terminal handler
  guard.all(route.path, ...middlewares, (req, res) => res.sendStatus(204));
  return guard;
}

const guardApps = new Map();

function clientFor(route) {
  if (!GUARD_ONLY_ROUTES.has(routeKey(route))) return app;
  if (!guardApps.has(routeKey(route))) {
    guardApps.set(routeKey(route), buildGuardApp(route));
  }
  return guardApps.get(routeKey(route));
}

/** Sends an empty-body request (validation-safe: the handler cannot write). */
async function send(route, token) {
  const method = route.method.toLowerCase();
  const client = request(clientFor(route));
  if (typeof client[method] !== "function") {
    throw new Error(`Unsupported HTTP method in matrix: ${route.method}`);
  }
  let pending = client[method](targetPath(route));
  if (token) pending = pending.set("Authorization", `Bearer ${token}`);
  if (method !== "get") pending = pending.send({});
  return pending;
}

/**
 * Expected outcome for one (route, role) pair.
 *
 * A route with no marker is public: everybody passes. Otherwise the request
 * must clear every declared permission — conditional guards are not triggered
 * by the neutral payload used here (the announcement condition has its own
 * test below), and a marker with a context resolves its context against the
 * non-existent resource, which leaves the plain role rule in force.
 */
function expectsAccess(route, label) {
  if (route.markers.length === 0) return true;
  if (label === "anonymous") return false;
  const user = { id: 1, role: label };
  return route.markers.every((marker) =>
    marker.conditional ? true : can(user, marker.action, marker.resource),
  );
}

function expectedStatus(route, label) {
  if (expectsAccess(route, label)) {
    return GUARD_ONLY_ROUTES.has(routeKey(route))
      ? "204 (guard passed, handler skipped)"
      : "any status except 401/403 (guard passed)";
  }
  return label === "anonymous" ? "401" : "403";
}

function actualStatusMatches(route, label, status) {
  const allowed = expectsAccess(route, label);
  if (GUARD_ONLY_ROUTES.has(routeKey(route))) {
    const expected = allowed ? 204 : label === "anonymous" ? 401 : 403;
    return status === expected;
  }
  if (allowed) return status !== 401 && status !== 403;
  return status === (label === "anonymous" ? 401 : 403);
}

describe("RBAC — route × role authorization matrix", function () {
  this.timeout(60000);

  const tokens = new Map();
  const exercised = new Set();

  before(async () => {
    const refs = FIXTURES.map((f) => f.ref);
    const pseudos = FIXTURES.map((f) => f.pseudo);
    const emails = FIXTURES.map((f) => f.email);

    const { rows: existing } = await db.query(
      "SELECT ref, nom FROM users WHERE ref = ANY($1) OR pseudo = ANY($2) OR email = ANY($3)",
      [refs, pseudos, emails],
    );
    const foreign = existing.filter((row) => row.nom !== FIXTURE_NOM);
    if (foreign.length > 0) {
      throw new Error(
        `RBAC matrix fixtures collide with existing accounts: ${foreign
          .map((row) => `${row.ref} (${row.nom})`)
          .join(", ")}`,
      );
    }
    // Remove leftovers of an interrupted previous run.
    await db.query("DELETE FROM users WHERE nom = $1 AND ref = ANY($2)", [
      FIXTURE_NOM,
      refs,
    ]);

    // `level` is not part of db/schema.sql (the CI baseline) but still exists
    // on databases that ran the level migrations: detect it instead of
    // assuming, otherwise the INSERT fails on CI.
    const { rows: levelColumns } = await db.query(
      "SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'level'",
    );
    const hasLevelColumn = levelColumns.length > 0;

    const hash = await bcrypt.hash(PASSWORD, 10);
    for (const fixture of FIXTURES) {
      const columns = ["ref", "nom", "prenom", "email", "pseudo", "password", "role", "first_login"];
      const values = [
        fixture.ref,
        FIXTURE_NOM,
        "Matrix",
        fixture.email,
        fixture.pseudo,
        hash,
        fixture.role,
        false,
      ];
      if (hasLevelColumn) {
        // chk_student_level: students and bde must carry a level, every other
        // role must leave it NULL.
        columns.push("level");
        values.push(["student", "bde"].includes(fixture.role) ? "L1" : null);
      }
      const placeholders = values.map((_, i) => `$${i + 1}`).join(", ");
      await db.query(
        `INSERT INTO users (${columns.join(", ")}) VALUES (${placeholders})`,
        values,
      );
    }

    for (const fixture of FIXTURES) {
      const res = await request(app)
        .post("/api/auth/login")
        .send({ ref: fixture.ref, password: PASSWORD });
      if (res.status !== 200 || !res.body.token) {
        throw new Error(
          `RBAC matrix: login failed for ${fixture.ref} (${res.status}): ${JSON.stringify(res.body)}`,
        );
      }
      tokens.set(fixture.role, res.body.token);
    }
  });

  after(async () => {
    await db.query("DELETE FROM users WHERE nom = $1 AND ref = ANY($2)", [
      FIXTURE_NOM,
      FIXTURES.map((f) => f.ref),
    ]);
    tokens.clear();
  });

  for (const route of routes) {
    it(`${routeKey(route)} — matches the expected status for every role`, async function () {
      const mismatches = [];
      for (const label of LABELS) {
        const token = label === "anonymous" ? null : tokens.get(label);
        const res = await send(route, token);
        exercised.add(`${routeKey(route)}|${label}`);
        if (!actualStatusMatches(route, label, res.status)) {
          mismatches.push(
            `${label} → HTTP ${res.status} (expected ${expectedStatus(route, label)})`,
          );
        }
      }
      expect(mismatches, `${routeKey(route)} [${targetPath(route)}]`).to.be.empty;
    });
  }

  it("applies the conditional announcement guard on POST /api/posts", async () => {
    const studentToken = tokens.get("student");
    const neutralBody = { type: "announcement" };

    // post:create:announcement is restricted to admin / bde / teacher — the
    // shared model deliberately excludes developers from this rule.
    const denied = await request(app)
      .post("/api/posts")
      .set("Authorization", `Bearer ${studentToken}`)
      .send(neutralBody);
    expect(denied.status).to.equal(403);

    const devDenied = await request(app)
      .post("/api/posts")
      .set("Authorization", `Bearer ${tokens.get("developer")}`)
      .send(neutralBody);
    expect(devDenied.status).to.equal(403);

    // The other roles clear the guard; the handler then rejects the payload
    // (no content, no title) with a validation error, so nothing is written.
    for (const role of ["teacher", "bde", "admin"]) {
      const res = await request(app)
        .post("/api/posts")
        .set("Authorization", `Bearer ${tokens.get(role)}`)
        .send(neutralBody);
      expect(
        res.status,
        `${role} creating an announcement should pass the guard`,
      ).to.not.be.oneOf([401, 403]);
    }

    const anonymous = await request(app).post("/api/posts").send(neutralBody);
    expect(anonymous.status).to.equal(401);
  });

  it("exercised every registered route with every role", () => {
    const missing = [];
    for (const route of routes) {
      for (const label of LABELS) {
        if (!exercised.has(`${routeKey(route)}|${label}`)) {
          missing.push(`${routeKey(route)} × ${label}`);
        }
      }
    }
    expect(missing, "unexercised route/role pairs").to.be.empty;
    expect(exercised.size).to.equal(routes.length * LABELS.length);
  });
});
