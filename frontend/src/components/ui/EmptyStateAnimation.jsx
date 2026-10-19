import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faExternalLinkAlt,
  faBookOpen,
} from "@fortawesome/free-solid-svg-icons";

export default function EmptyStateAnimation() {
    return (
        <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="relative mb-8 animate-slide-up">
                <div className="absolute inset-0 bg-gold/20 rounded-full scale-[2] opacity-30 animate-ping"></div>
                <div className="absolute inset-0 bg-navy/10 rounded-full scale-150 blur-xl animate-pulse"></div>
                <div className="absolute -top-2 -right-2 w-4 h-4 bg-gold/40 rounded-full animate-bounce"></div>
                <div className="absolute -bottom-1 -left-1 w-3 h-3 bg-navy/30 rounded-full animate-bounce" style={{ animationDelay: '0.3s', animationDuration: '0.8s' }}></div>
                <div className="relative bg-white/80 backdrop-blur-sm border-2 border-gold/30 p-7 rounded-full shadow-lg hover:shadow-gold/20 hover:shadow-2xl transition-shadow duration-500">
                    <FontAwesomeIcon icon={faBookOpen} className="text-gold text-5xl animate-float" />
                </div>
            </div>
            <h2 className="text-2xl font-bold text-navy mb-3 animate-slide-up" style={{ animationDelay: '0.15s', animationFillMode: 'backwards' }}>
                Rien à afficher
            </h2>
            <p className="text-gray-400 max-w-xs leading-relaxed animate-slide-up" style={{ animationDelay: '0.25s', animationFillMode: 'backwards' }}>
                Aucun contenu disponible pour le moment.<br />
            </p>
        </div>
    )
}