const path = require("path");
const chai = require("chai");
const { describe, it, before } = require("mocha");
const app = require("../server");
const { collectRoutes, readServerMounts } = require("./helpers/appRoutes");
const { can } = require("../../shared/permissions");

const { expect } = chai;

/**
 * Routes reachable without a token, by design (authentication flows,
 * health check, push public key, public UE catalogue). Everything else
 * must sit behind an explicit `requirePermission` marker.
 */
const PUBLIC_ROUTES = new Set([
  "GET /api/health",
  "GET /api/push/vapid-key",
  "GET /api/custom-ues",
  "POST /api/auth/login",
  "POST /api/auth/register",
  "POST /api/auth/verify-invite",
  "POST /api/auth/forgot-password",
  "POST /api/auth/forgot-password/send-email",
  "POST /api/auth/forgot-password/verify-code",
  "GET /api/auth/reset-password/:token",
  "POST /api/auth/reset-password",
]);

const ROLES = ["student", "teacher", "bde", "admin", "developer"];

const routeKey = (route) => `${route.method} ${route.path}`;

describe("RBAC — Route Guard Audit", function () {
  this.timeout(30000);

  let routes;
  let routesByKey;

  before(() => {
    routes = collectRoutes(app);
    routesByKey = new Map(routes.map((route) => [routeKey(route), route]));
  });

  it("inventories every router mounted by the app, plus the app-level routes", () => {
    expect(routes).to.be.an("array").that.is.not.empty;

    // Every `app.use("/api/x", require("./routes/x"))` mount must contribute
    // at least one route, otherwise a whole router silently escapes the audit.
    const expectedRouters = new Set(
      readServerMounts().map((mount) => path.basename(mount.request)),
    );
    expectedRouters.add("app"); // /api/health, /api/push/vapid-key

    expect(new Set(routes.map((route) => route.routerName))).to.deep.equal(
      expectedRouters,
    );
  });

  it("does not register the same method twice on the same path", () => {
    const seen = new Set();
    const duplicates = [];
    for (const route of routes) {
      const key = routeKey(route);
      if (seen.has(key)) duplicates.push(key);
      seen.add(key);
    }
    expect(duplicates, "duplicate routes").to.be.empty;
  });

  it("keeps the public allow-list in sync with the registered routes", () => {
    const stale = [...PUBLIC_ROUTES].filter((key) => !routesByKey.has(key));
    expect(stale, "allow-list entries matching no registered route").to.be.empty;

    const guardedPublic = [...PUBLIC_ROUTES]
      .filter((key) => routesByKey.has(key))
      .filter((key) => routesByKey.get(key).markers.length > 0)
      .map((key) => `${key} → ${routesByKey.get(key).markers.map((m) => m.action).join(",")}`);
    expect(guardedPublic, "public routes carrying requirePermission").to.be.empty;
  });

  it("guards every non-public route with an explicit requirePermission marker", () => {
    const unguarded = routes
      .filter((route) => !PUBLIC_ROUTES.has(routeKey(route)))
      .filter((route) => route.markers.length === 0)
      .map(routeKey);

    expect(
      unguarded,
      "these routes are neither public nor guarded by requirePermission",
    ).to.be.empty;
  });

  it("runs every non-public route behind the auth middleware", () => {
    // requirePermission without auth would deny every caller (can() is
    // deny-by-default for anonymous users), an availability bug as much as
    // an authorization one.
    const anonymous = routes
      .filter((route) => !PUBLIC_ROUTES.has(routeKey(route)))
      .filter((route) => !route.hasAuth)
      .map(routeKey);

    expect(anonymous, "guarded routes missing the auth middleware").to.be.empty;
  });

  it("declares only permissions the shared model knows about", () => {
    // An action missing from shared/permissions.js denies every role, so the
    // route would answer 403 to everybody — no role matrix assertion can see
    // it, this audit does.
    const unknown = [];
    for (const route of routes) {
      for (const marker of route.markers) {
        const granted = ROLES.some((role) =>
          can({ id: 1, role }, marker.action, marker.resource),
        );
        if (!granted) {
          unknown.push(`${routeKey(route)} → ${marker.action}:${marker.resource}`);
        }
      }
    }
    expect(unknown, "permissions granted to no role at all").to.be.empty;
  });

  it("exposes an inspectable marker for every guarded route", () => {
    for (const route of routes) {
      if (PUBLIC_ROUTES.has(routeKey(route))) continue;
      expect(route.markers, routeKey(route)).to.be.an("array").that.is.not.empty;
      for (const marker of route.markers) {
        expect(marker.action, routeKey(route)).to.be.a("string").that.is.not.empty;
        expect(marker.resource, routeKey(route)).to.be.a("string").that.is.not.empty;
        expect(marker, routeKey(route)).to.have.property("hasContext").that.is.a("boolean");
        expect(marker, routeKey(route)).to.have.property("conditional").that.is.a("boolean");
      }
    }
  });
});
