import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";
import { AuthProvider } from "./context/AuthContext";
import ErrorBoundary from "./components/ui/ErrorBoundary";
import App from "./App";
import "./index.css";
import { Analytics } from "@vercel/analytics/react";

let swRegistration = null;

window.addEventListener("error", (e) => {
  console.error("Global error caught:", e.error || e.message);
});
window.addEventListener("unhandledrejection", (e) => {
  console.error("Unhandled promise rejection:", e.reason);
});

let lastTouchEnd = 0;
document.addEventListener("touchend", (e) => {
  const now = Date.now();
  if (now - lastTouchEnd <= 300 && e.target?.closest?.(".input-field, button, a")) {
    e.preventDefault();
  }
  lastTouchEnd = now;
}, false);

async function fetchMissedNotifications() {
  if (!localStorage.getItem("hei_token")) return;
  try {
    const { default: api } = await import("./api/axios");
    const { data } = await api.get("/push/notifications");
    if (data && data.length > 0) {
      const unread = data.filter((n) => !n.is_read);
      if (unread.length > 0) {
        for (const n of unread) {
          if (!("Notification" in window) || Notification.permission !== "granted") break;
          try {
            new Notification(n.title || "HEI STDhub", {
              body: n.body || "",
              icon: "/logo.png",
              tag: n.data?.tag || "hei-notification",
              data: { url: n.data?.url || "/" },
            });
          } catch {}
        }
        api.patch("/push/notifications/read", { ids: unread.map((n) => n.id) }).catch(() => {});
      }
    }
  } catch {
  }
}

function refreshSocketConnection() {
  import("./socket").then(({ refreshSocket }) => refreshSocket().catch(() => {})).catch(() => {});
}

function renewPushSubscription() {
  import("./push").then(({ subscribeToPush }) => subscribeToPush().catch(() => {})).catch(() => {});
}

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js", { updateViaCache: "none" }).then((reg) => {
      swRegistration = reg;

      reg.addEventListener("updatefound", () => {
        const newSW = reg.installing;
        if (newSW) {
          newSW.addEventListener("statechange", () => {
            if (newSW.state === "installed" && navigator.serviceWorker.controller) {
              navigator.serviceWorker.controller.postMessage({ type: "skip-waiting" });
            }
          });
        }
      });

      reg.pushManager.getSubscription().then((sub) => {
        if (sub) {
          renewPushSubscription();
        }
      }).catch(() => {});
    }).catch((err) => {
      console.error("SW registration failed:", err);
    });
  });

  navigator.serviceWorker.addEventListener("message", (e) => {
    if (e.data?.type === "socket-sync-request") {
      refreshSocketConnection();
    }
    if (e.data?.type === "push-subscription-change") {
      renewPushSubscription();
    }
  });

  fetchMissedNotifications();
  window.addEventListener("online", fetchMissedNotifications);

  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") {
      if (localStorage.getItem("hei_token")) {
        renewPushSubscription();
      }
    }
  });
}

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <BrowserRouter>
      <HelmetProvider>
        <ErrorBoundary>
          <AuthProvider>
            <App />
            <Analytics />
          </AuthProvider>
        </ErrorBoundary>
      </HelmetProvider>
    </BrowserRouter>
  </React.StrictMode>,
);
