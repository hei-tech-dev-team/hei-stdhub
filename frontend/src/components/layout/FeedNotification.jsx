import { useEffect } from "react";
import { getSocket } from "../../socket";

function showNotification (title, body) {
    if (!("Notification" in window)) return;
    if (Notification.permission !== "granted") return;
    if (!document.hidden) return;

    try {
        const n = new Notification(title, {
            body,
            icon: "/logo.png",
            tag: "hei-feed",
        });
        setTimeout(() => n.close(), 5000);
    } catch {}
}

export default function FeedNotification() {
    useEffect(() => {
        let socket = null;
        let cancelled = false;

        getSocket()
        .then((s) => {
            if (cancelled || !s) return;
            socket = s;
            socket.on("feed:new", ({ type, title, author } = {}) => {
                const isAnnouncement = type === 'announcement';
                const authorName = author?.pseudo || "Inconnu";
                const beginWith = isAnnouncement
                    ? `${authorName}: ${title || ""}`
                    : `${authorName} a publié un nouveau contenu`;
                showNotification(
                    isAnnouncement ? "HEI STDhub - Annonces" : "HEI STDhub - Publication",
                    beginWith,
                );
            });
        })
        .catch(() => {});

        return () => {
            cancelled = true;
            if (socket) socket.off("feed:new");
        };
    }, []);

    return null;
}