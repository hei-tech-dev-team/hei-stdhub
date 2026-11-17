import { useCallback, useEffect, useMemo, useState } from "react";
import {
  isStandaloneMode,
  isIOSSafari,
  isInstallDismissed,
  dismissInstall as persistDismiss,
  clearInstallDismissal,
} from "../pwa/install";

/**
 * Captures the browser's `beforeinstallprompt` event and exposes a small API
 * for the install UI.
 *
 * Why capture globally in a hook mounted high in the tree?
 * - The event fires once, early, and is consumed when `prompt()` is called.
 *   If no listener is attached in time the opportunity is lost for that page
 *   load, so we mount this near the app root.
 * - We stash the event in module-level state is not needed; React state inside a
 *   single mounted hook instance (in App) is enough for this SPA.
 *
 * We deliberately do NOT touch the service worker here; SW lifecycle/caching is
 * handled separately (task 2) and registration already lives in main.jsx.
 */
export function useInstallPrompt() {
  // The deferred native prompt event. Kept so we can trigger it later from our
  // own UI, which lets us control timing and wording (Chromium requirement).
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [installed, setInstalled] = useState(() => isStandaloneMode());
  const [dismissed, setDismissed] = useState(() => isInstallDismissed());

  // Feature-detect once: iOS Safari needs manual instructions, not prompt().
  const iosSafari = useMemo(() => isIOSSafari(), []);

  useEffect(() => {
    if (typeof window === "undefined") return undefined;

    const handleBeforeInstallPrompt = (event) => {
      // Prevent the mini-infobar on mobile Chrome; we show our own banner so the
      // experience is consistent and we can respect user dismissals.
      event.preventDefault();
      setDeferredPrompt(event);
    };

    const handleAppInstalled = () => {
      // The app is now installed; drop the stale prompt and hide the banner.
      setInstalled(true);
      setDeferredPrompt(null);
      // Clear any previous dismissal so a reinstall on a new profile/device is
      // not accidentally suppressed by a copied storage state.
      clearInstallDismissal();
      setDismissed(false);
    };

    // Keep `installed` in sync if the display mode changes without a reload
    // (e.g. some browsers toggle standalone when launched from the home screen).
    const standaloneQuery =
      typeof window.matchMedia === "function" ? window.matchMedia("(display-mode: standalone)") : null;
    const handleDisplayModeChange = () => {
      if (isStandaloneMode()) {
        setInstalled(true);
        setDeferredPrompt(null);
      }
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleAppInstalled);
    if (standaloneQuery) {
      if (typeof standaloneQuery.addEventListener === "function") {
        standaloneQuery.addEventListener("change", handleDisplayModeChange);
      } else if (typeof standaloneQuery.addListener === "function") {
        // Safari < 14 fallback.
        standaloneQuery.addListener(handleDisplayModeChange);
      }
    }

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      window.removeEventListener("appinstalled", handleAppInstalled);
      if (standaloneQuery) {
        if (typeof standaloneQuery.removeEventListener === "function") {
          standaloneQuery.removeEventListener("change", handleDisplayModeChange);
        } else if (typeof standaloneQuery.removeListener === "function") {
          standaloneQuery.removeListener(handleDisplayModeChange);
        }
      }
    };
  }, []);

  const promptInstall = useCallback(async () => {
    // Only Chromium-based browsers provide a deferred prompt we can trigger.
    if (!deferredPrompt) return { outcome: "unavailable" };

    try {
      await deferredPrompt.prompt();
      const choice = await deferredPrompt.userChoice;
      // A prompt can only be used once; discard it regardless of outcome.
      setDeferredPrompt(null);
      if (choice?.outcome === "accepted") {
        return { outcome: "accepted" };
      }
      return { outcome: "dismissed" };
    } catch {
      setDeferredPrompt(null);
      return { outcome: "error" };
    }
  }, [deferredPrompt]);

  const dismiss = useCallback(() => {
    // Persist so we respect the user's choice across sessions.
    persistDismiss();
    setDismissed(true);
  }, []);

  // The banner is relevant when:
  // - the app is not already installed/standalone,
  // - the user hasn't dismissed it,
  // - and we can either trigger the native prompt OR show iOS instructions.
  const canPrompt = Boolean(deferredPrompt);
  const canShow = !installed && !dismissed && (canPrompt || iosSafari);

  return {
    canShow,
    canPrompt,
    iosSafari,
    installed,
    dismissed,
    promptInstall,
    dismiss,
  };
}
