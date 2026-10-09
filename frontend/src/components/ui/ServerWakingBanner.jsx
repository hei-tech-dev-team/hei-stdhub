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
        <div role="status" className="fixed top-0 inset-x-0 z-50 bg-gold text-navy text-center text-sm font-semibold py-2 px-4">
            Le serveur démarre, merci de patienter…
        </div>
    )
}