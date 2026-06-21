import api from "./api/axios";

export async function subscribeToPush() {
  if (!("serviceWorker" in navigator) || !("PushManager" in window)) return;

  if (Notification.permission === "denied") return;

  try {
    // Ensure the SW is fully registered and activated
    const reg = await navigator.serviceWorker.ready;

    // Re-subscribe if existing subscription is from a different SW scope
    const existing = await reg.pushManager.getSubscription();
    if (existing) {
      // Verify subscription is still valid by checking keys match
      const { data } = await api.get("/push/vapid-key");
      if (data.publicKey) {
        const existingKey = existing.options?.applicationServerKey;
        if (existingKey) {
          const expected = urlBase64ToUint8Array(data.publicKey);
          const match =
            existingKey instanceof ArrayBuffer
              ? arrayBuffersEqual(existingKey, expected)
              : JSON.stringify([...new Uint8Array(existingKey)]) ===
                JSON.stringify([...expected]);
          if (match) return;
        }
      }
      // Keys don't match or can't verify — unsubscribe and re-subscribe
      await existing.unsubscribe();
    }

    if (Notification.permission === "default") {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") return;
    }

    const { data } = await api.get("/push/vapid-key");
    const sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(data.publicKey),
    });

    await api.post("/push/subscribe", { subscription: sub.toJSON() });
  } catch (err) {
    console.error("subscribeToPush failed:", err);
  }
}

function arrayBuffersEqual(a, b) {
  if (a.byteLength !== b.byteLength) return false;
  const va = new Uint8Array(a);
  const vb = new Uint8Array(b);
  for (let i = 0; i < va.length; i++) if (va[i] !== vb[i]) return false;
  return true;
}

export async function unsubscribeFromPush() {
  if (!("serviceWorker" in navigator)) return;

  try {
    const reg = await navigator.serviceWorker.ready;
    const sub = await reg.pushManager.getSubscription();
    if (!sub) return;

    await api.delete("/push/subscribe", { data: { endpoint: sub.endpoint } });
    await sub.unsubscribe();
  } catch (err) {
    console.error("unsubscribeFromPush failed:", err);
  }
}

function urlBase64ToUint8Array(base64) {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const b64 = (base64 + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(b64);
  return Uint8Array.from([...raw].map((c) => c.charCodeAt(0)));
}
