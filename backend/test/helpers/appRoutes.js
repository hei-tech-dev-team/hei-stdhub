/**
 * Route inventory of the running Express application.
 *
 * Both RBAC test suites (route guard audit, route × role matrix) need the
 * exact list of routes the app serves — including the mount prefix of every
 * router — so a route can never "disappear" from the checks just because a
 * test maintained its own copy of the route table.
 *
 * How it works:
 *   1. the `app.use("/api/x", require("./routes/x"))` mounts are parsed from
 *      `server.js` (the single place where routes are registered);
 *   2. each parsed router module is matched by identity against the router
 *      layers actually registered in the Express app, so a mount that is
 *      declared but not registered (or registered but not declared) fails
 *      loudly instead of silently shrinking the inventory;
 *   3. every route layer of every router, plus the app-level routes
 *      (`/api/health`, `/api/push/vapid-key`, ...), is flattened into
 *      `{ method, path, routerName, markers, hasAuth, handlers }` records.
 *
 * Convention: CommonJS, 2-space indent, double quotes, zero dependencies.
 */

const fs = require("fs");
const path = require("path");

const BACKEND_DIR = path.resolve(__dirname, "..", "..");
const SERVER_FILE = path.join(BACKEND_DIR, "server.js");

/** Normalizes a path built from several parts: slashes collapsed, no trailing slash. */
function norm(...parts) {
  return (
    parts
      .filter(Boolean)
      .join("/")
      .replace(/\/+/g, "/")
      .replace(/\/+$/, "") || "/"
  );
}

/**
 * Mounts declared in server.js as `app.use("<prefix>", require("./routes/<file>"))`.
 *
 * @returns {Array<{ prefix: string, request: string }>}
 */
function readServerMounts() {
  const source = fs.readFileSync(SERVER_FILE, "utf8");
  const mounts = [];
  const mountPattern =
    /app\.use\(\s*(["'])([^"']+)\1\s*,\s*require\(\s*(["'])(\.\/routes\/[^"']+)\3\s*\)\s*\)/g;
  let match;
  while ((match = mountPattern.exec(source)) !== null) {
    mounts.push({ prefix: match[2], request: match[4] });
  }
  return mounts;
}

/** Middleware handles of a route layer stack, in registration order. */
function handlersOf(routeStack) {
  return (Array.isArray(routeStack) ? routeStack : []).map(
    (layer) => (layer && layer.handle) || layer,
  );
}

/**
 * Flattens one Express route (all of its HTTP methods) into inventory records.
 *
 * @param {object} route    `layer.route` of a router/app layer
 * @param {string} prefix   Mount prefix of the owning router ("" for app-level)
 * @param {string} routerName
 * @returns {Array<object>}
 */
function inspectRoute(route, prefix, routerName) {
  const handlers = handlersOf(route.stack);
  const markers = handlers
    .map((handler) => (handler && handler.requiredPermission) || null)
    .filter(Boolean);
  const hasAuth = handlers.some((handler) => handler && handler.name === "auth");
  const methods = Object.keys(route.methods || {}).filter(
    (method) => route.methods[method],
  );

  return methods.map((method) => ({
    method: method.toUpperCase(),
    path: norm(prefix, route.path),
    routerName,
    markers,
    hasAuth,
    handlers,
  }));
}

/**
 * Walks one router, recursing into nested routers (none today: the helper
 * fails loudly if one appears, so the inventory stays complete).
 */
function walkRouter(router, prefix, routerName) {
  const routes = [];
  for (const layer of router.stack) {
    if (layer.route) {
      routes.push(...inspectRoute(layer.route, prefix, routerName));
    } else if (layer.handle && Array.isArray(layer.handle.stack)) {
      const nested = layer.handle.stack
        .map((inner) => (inner.route && inner.route.path) || null)
        .filter(Boolean)
        .join(", ");
      throw new Error(
        `test/helpers/appRoutes.js: nested router mounted inside "${routerName}" ` +
          `(routes: ${nested || "unknown"}). Extend the helper so the inventory stays complete.`,
      );
    }
  }
  return routes;
}

/**
 * Builds the full route inventory of a running Express app.
 *
 * @param {object} app Express application (`require("../server")`)
 * @returns {Array<{
 *   method: string,      // "GET", "POST", ...
 *   path: string,        // full path, e.g. "/api/suggestions/:id"
 *   routerName: string,  // route file basename, or "app" for app-level routes
 *   markers: Array<{ action: string, resource: string, hasContext: boolean, conditional: boolean }>,
 *   hasAuth: boolean,    // an `auth` middleware is part of the route chain
 *   handlers: Function[] // full middleware chain, final handler included
 * }>}
 */
function collectRoutes(app) {
  const routerObject = app.router || app._router;
  const stack = routerObject && routerObject.stack;
  if (!Array.isArray(stack)) {
    throw new Error("test/helpers/appRoutes.js: unable to read the Express route stack.");
  }

  const mounts = readServerMounts().map((mount) => ({
    ...mount,
    router: require(path.resolve(BACKEND_DIR, mount.request)),
  }));

  const routerLayers = stack.filter(
    (layer) => layer && layer.handle && Array.isArray(layer.handle.stack),
  );
  const consumed = new Set();
  const routes = [];

  for (const mount of mounts) {
    const layer = routerLayers.find(
      (candidate) => candidate.handle === mount.router && !consumed.has(candidate),
    );
    if (!layer) {
      throw new Error(
        `test/helpers/appRoutes.js: server.js declares app.use("${mount.prefix}", ` +
          `require("${mount.request}")) but that router is not registered in the Express app.`,
      );
    }
    consumed.add(layer);
    routes.push(...walkRouter(layer.handle, mount.prefix, path.basename(mount.request)));
  }

  const unregistered = routerLayers.filter((layer) => !consumed.has(layer));
  if (unregistered.length > 0) {
    const details = unregistered
      .map((layer) => {
        const declared = layer.handle.stack
          .map((inner) => (inner.route && inner.route.path) || null)
          .filter(Boolean)
          .join(", ");
        return `routes [${declared || "unknown"}]`;
      })
      .join("; ");
    throw new Error(
      "test/helpers/appRoutes.js: router(s) mounted in the Express app are not declared " +
        `in server.js as app.use("<prefix>", require("./routes/<file>")): ${details}. ` +
        "Update server.js or this helper so every route stays covered by the RBAC audits.",
    );
  }

  // App-level routes registered directly on the app (health check, VAPID key...).
  for (const layer of stack) {
    if (layer && layer.route) {
      routes.push(...inspectRoute(layer.route, "", "app"));
    }
  }

  return routes;
}

module.exports = { collectRoutes, norm, readServerMounts };
