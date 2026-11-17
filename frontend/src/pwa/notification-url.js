/**
 * Resolves a URL coming from a push payload to a safe, same-origin target.
 *
 * Push payloads are untrusted input: an attacker who can send a push message
 * (or tamper with a stored notification) must not be able to make the service
 * worker open an arbitrary external page. We therefore:
 *  - parse against the app origin so relative URLs work as expected,
 *  - reject any cross-origin target,
 *  - reject non-HTTP(S) schemes (e.g. `javascript:`),
 *  - fall back to the app root for malformed input.
 *
 * The helper is isolated from the service worker so it can be unit tested
 * without a ServiceWorkerGlobalScope.
 */
export function resolveSameOriginNotificationUrl(rawUrl, origin) {
  if (!origin) return "/";

  try {
    const base = new URL(origin);
    const target = new URL(String(rawUrl || "/"), base);

    // Comparing origins also covers protocol-relative URLs (`//evil.test`) and
    // absolute URLs pointing to another host.
    if (target.origin !== base.origin) return "/";

    // `new URL('javascript:...')` reports an opaque origin ("null"), which the
    // check above already rejects; this is an explicit extra guard for clarity.
    if (target.protocol !== "http:" && target.protocol !== "https:") return "/";

    return target.href;
  } catch {
    // Invalid URL input must never crash the notification handler.
    return "/";
  }
}
