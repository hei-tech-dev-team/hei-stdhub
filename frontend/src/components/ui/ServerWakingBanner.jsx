import { useEffect, useState } from "react";

export default function ServerWakingBanner() {
    const [visible, setVisible] = useState(false);

    useEffect(() => {
        const handler = (e) => setVisible(e.detail.count > 0);
        window.addEventListener("api:slow", handler);
        return () => window.removeEventListener("api:slow", handler);
    }, []);

    if (!visible) return null;

    return (
        <div
            role="status"
            className="fixed top-0 inset-x-0 z-50 bg-gold text-navy text-center text-sm font-semibold
                       pt-[calc(env(safe-area-inset-top,0px)+0.5rem)] pb-2
                       pl-[calc(env(safe-area-inset-left,0px)+1rem)]
                       pr-[calc(env(safe-area-inset-right,0px)+1rem)]"
        >
            Le serveur démarre, merci de patienter…
        </div>
    )
}