import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";
import { AuthProvider } from "./context/AuthContext";
import App from "./App";
import "./index.css";
import { Analytics } from "@vercel/analytics/react";

// Block pinch-zoom and gesture zoom on mobile
document.addEventListener("gesturestart", (e) => e.preventDefault());
document.addEventListener("gesturechange", (e) => e.preventDefault());
document.addEventListener("gestureend", (e) => e.preventDefault());
document.addEventListener("touchstart", (e) => {
  if (e.touches.length > 1) e.preventDefault();
}, { passive: false });

let lastTouchEnd = 0;
document.addEventListener("touchend", (e) => {
  const now = Date.now();
  if (now - lastTouchEnd <= 300) {
    e.preventDefault();
  }
  lastTouchEnd = now;
}, false);

document.addEventListener("wheel", (e) => {
  if (e.ctrlKey) e.preventDefault();
}, { passive: false });

async function fetchMissedNotifications() {
  if (!localStorage.getItem("hei_token")) return;
  try {
    const { default: api } = await import("./api/axios");
    const { data } = await api.get("/push/notifications");
    if (data && data.length > 0) {
      const unread = data.filter((n) => !n.is_read);
      if (unread.length > 0) {
        api.patch("/push/notifications/read", { ids: unread.map((n) => n.id) }).catch(() => {});
      }
    }
  } catch {
    // Offline or not authenticated
  }
}

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js", { updateViaCache: "none" }).then((reg) => {
      reg.addEventListener("updatefound", () => {
        const newSW = reg.installing;
        if (newSW) {
          newSW.addEventListener("statechange", () => {
            if (newSW.state === "installed" && navigator.serviceWorker.controller) {
              console.log("New SW version available — reload to update");
            }
          });
        }
      });

      reg.pushManager.getSubscription().then((sub) => {
        if (sub) {
          import("./push").then(({ subscribeToPush }) => subscribeToPush().catch(() => {}));
        }
      }).catch(() => {});
    }).catch((err) => {
      console.error("SW registration failed:", err);
    });
  });

  navigator.serviceWorker.addEventListener("message", (e) => {
    if (e.data?.type === "socket-sync-request") {
      import("./socket").then(({ refreshSocket }) => refreshSocket().catch(() => {}));
    }
    if (e.data?.type === "push-subscription-change") {
      import("./push").then(({ subscribeToPush }) => subscribeToPush().catch(() => {}));
    }
  });

  fetchMissedNotifications();
  window.addEventListener("online", fetchMissedNotifications);

  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") {
      fetchMissedNotifications();
      if (localStorage.getItem("hei_token")) {
        import("./push").then(({ subscribeToPush }) => subscribeToPush().catch(() => {}));
      }
    }
  });
}

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <BrowserRouter>
      <HelmetProvider>
        <AuthProvider>
          <App />
          <Analytics />
        </AuthProvider>
      </HelmetProvider>
    </BrowserRouter>
  </React.StrictMode>,
);
