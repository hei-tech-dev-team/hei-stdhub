/**
 * PWA install helpers.
 *
 * Kept in a plain module (no React) so the logic is easy to unit test and can
 * be reused by hooks/components. The install UX relies on browser APIs that are
 * not universally supported (notably `beforeinstallprompt` and standalone
 * detection), so every helper is defensive and safe to call in non-browser
 * environments (tests, SSR-like contexts).
 */

/** LocalStorage key used to remember a user dismissal.
 *  We persist dismissals so we never nag a user who explicitly declined the
 *  install prompt; the browser already rate-limits native prompts, but our
 *  custom banner would otherwise reappear on every navigation. */
export const INSTALL_DISMISSED_KEY = "hei_pwa_install_dismissed";

/** Legacy iOS Safari (pre-iPadOS 13) reports iPhone/iPod in the user agent. */
const LEGACY_IOS_UA = /iphone|ipod/i;
/** iPadOS 13+ identifies as a Mac with touch support, so UA alone is not enough. */
const IPADOS_UA = /macintosh/i;

/**
 * Returns true when the app is already running as an installed PWA.
 * `matchMedia('(display-mode: standalone)')` covers Chromium/Android/desktop
 * installs, while `navigator.standalone` covers iOS Safari's home-screen mode.
 */
export function isStandaloneMode(win = typeof window !== "undefined" ? window : undefined) {
  if (!win) return false;

  try {
    if (typeof win.matchMedia === "function" && win.matchMedia("(display-mode: standalone)").matches) {
      return true;
    }
  } catch {
    // matchMedia can throw in some embedded/test environments; fall through.
  }

  // iOS Safari exposes a non-standard `standalone` flag on navigator.
  return win.navigator?.standalone === true;
}

/**
 * Detects iOS/iPadOS Safari where programmatic install prompts are not
 * available. On these platforms users must install manually via the Share menu
 * ("Add to Home Screen"), so the UI must show instructions instead of a button.
 *
 * We exclude other iOS browsers (CriOS/FxiOS/EdgiOS/OPiOS) because they cannot
 * install PWAs from the web view in the same way Safari can.
 */
export function isIOSSafari(
  ua = typeof navigator !== "undefined" ? navigator.userAgent : "",
  platform = typeof navigator !== "undefined" ? navigator.platform : "",
  maxTouchPoints = typeof navigator !== "undefined" ? navigator.maxTouchPoints : 0,
) {
  const normalizedUa = String(ua || "");
  const isLegacyIOS = LEGACY_IOS_UA.test(normalizedUa);
  const isIPadOS = IPADOS_UA.test(normalizedUa) && Number(maxTouchPoints) > 1;
  const isAppleMobilePlatform = /iphone|ipad|ipod/i.test(String(platform || ""));

  if (!isLegacyIOS && !isIPadOS && !isAppleMobilePlatform) return false;

  // Non-Safari browsers on iOS embed their own engine markers; exclude them so
  // we don't show Safari-specific "Share > Add to Home Screen" instructions.
  return !/crios|fxios|edgios|opios/i.test(normalizedUa);
}

/** Read the persisted dismissal flag. */
export function isInstallDismissed(storage = typeof localStorage !== "undefined" ? localStorage : undefined) {
  if (!storage) return false;
  try {
    return storage.getItem(INSTALL_DISMISSED_KEY) === "1";
  } catch {
    // Access to storage can throw (private mode / blocked cookies).
    return false;
  }
}

/** Persist the dismissal flag so the banner stays hidden across sessions. */
export function dismissInstall(storage = typeof localStorage !== "undefined" ? localStorage : undefined) {
  if (!storage) return;
  try {
    storage.setItem(INSTALL_DISMISSED_KEY, "1");
  } catch {
    // Best-effort: if storage is unavailable we simply won't remember.
  }
}

/** Clear the dismissal flag (e.g. after a successful install on another device/profile). */
export function clearInstallDismissal(storage = typeof localStorage !== "undefined" ? localStorage : undefined) {
  if (!storage) return;
  try {
    storage.removeItem(INSTALL_DISMISSED_KEY);
  } catch {
    // Best-effort cleanup.
  }
}
