import { useEffect, useState } from "react";

export default function ServerWakingBanner() {
    const [visible, setVisible] = useState(false);

    useEffect(() => {
        const handler = (e) => setVisible(e.detail.count > 0);
        window.addEventListener("api:slow", handler);
        return () => window.removeEventListener("api:slow", handler);
    }, []);

    if (visible) return null;

    return (
        <div role="status">
            Le serveur démarre, merci de patienter…
        </div>
    )
}