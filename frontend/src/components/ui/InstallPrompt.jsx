import { useState } from "react";
import { useInstallPrompt } from "../../hooks/useInstallPrompt";

/**
 * Bottom-of-screen PWA install banner.
 *
 * - On browsers that fire `beforeinstallprompt` (Chromium/Android/desktop) we
 *   show an "Installer" action that triggers the captured native prompt.
 * - On iOS Safari we show short manual instructions, because Apple does not
 *   expose a programmatic install API (users must use Share > Add to Home Screen).
 * - The banner is hidden when the app already runs standalone, when the user
 *   dismissed it (persisted), or when no install path is available.
 *
 * `suppress` lets parents hide the banner in contexts where it would be noisy
 * (e.g. during the onboarding flow).
 */
export default function InstallPrompt({ suppress = false }) {
  const { canShow, canPrompt, iosSafari, promptInstall, dismiss } = useInstallPrompt();
  const [busy, setBusy] = useState(false);

  if (suppress || !canShow) return null;

  const handleInstall = async () => {
    setBusy(true);
    try {
      await promptInstall();
    } finally {
      // Whether accepted or dismissed, the hook clears the deferred prompt so the
      // banner will naturally disappear; resetting busy keeps the UI consistent.
      setBusy(false);
    }
  };

  return (
    <div
      className="fixed inset-x-0 bottom-0 z-40 pointer-events-none
                 pt-3 sm:pt-4
                 pl-[max(env(safe-area-inset-left,0px),0.75rem)]
                 pr-[max(env(safe-area-inset-right,0px),0.75rem)]
                 sm:pl-[max(env(safe-area-inset-left,0px),1rem)]
                 sm:pr-[max(env(safe-area-inset-right,0px),1rem)]
                 pb-[calc(env(safe-area-inset-bottom,0px)+0.75rem)]
                 sm:pb-[calc(env(safe-area-inset-bottom,0px)+1rem)]"
    >
      <div
        className="pointer-events-auto mx-auto max-w-lg bg-navy-dark text-white rounded-2xl shadow-modal border border-white/10 px-4 py-3 sm:px-5 sm:py-4 flex items-start gap-3"
        role="dialog"
        aria-label="Installer l'application"
      >
        {/* App icon: reinforces brand and makes the banner recognizable as an
            install affordance without taking much space. */}
        <img
          src="/pwa-192x192.png"
          alt=""
          aria-hidden="true"
          className="w-10 h-10 rounded-xl shrink-0 mt-0.5"
          width="40"
          height="40"
        />

        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold leading-snug">Installer HEI STDhub</p>

          {iosSafari ? (
            // iOS Safari cannot be prompted programmatically; give the exact
            // gesture path so users can install without guessing.
            <p className="text-xs text-white/70 mt-1 leading-relaxed">
              Pour installer l&apos;application sur iOS : appuyez sur <span className="font-semibold text-white/90">Partager</span> puis sur <span className="font-semibold text-white/90">«&nbsp;Sur l&apos;écran d&apos;accueil&nbsp;»</span>.
            </p>
          ) : (
            <p className="text-xs text-white/70 mt-1 leading-relaxed">
              Accédez plus vite à vos cours et messages, directement depuis votre écran d&apos;accueil.
            </p>
          )}

          <div className="mt-3 flex items-center gap-2 flex-wrap">
            {canPrompt && (
              <button
                type="button"
                onClick={handleInstall}
                disabled={busy}
                className="px-4 py-1.5 rounded-xl bg-gold text-navy-dark text-xs font-semibold hover:bg-gold-light transition disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {busy ? "Installation..." : "Installer"}
              </button>
            )}
            <button
              type="button"
              onClick={dismiss}
              className="px-3 py-1.5 rounded-xl text-xs font-medium text-white/70 hover:text-white hover:bg-white/10 transition"
            >
              {iosSafari ? "Fermer" : "Plus tard"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
