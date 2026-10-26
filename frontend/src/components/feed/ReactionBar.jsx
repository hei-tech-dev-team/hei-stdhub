import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faThumbsUp, faLaugh, faThumbsDown, faSadTear } from "@fortawesome/free-solid-svg-icons";

const REACTIONS = [
    { kind: "like", label: "J'aime", icon: faThumbsUp, color: "text-blue-500", activeBg: "bg-blue-50 border-blue-200" },
    { kind: "haha", label: "Haha", icon: faLaugh, color: "text-amber-500", activeBg: "bg-amber-50 border-amber-200" },
    { kind: "dislike", label: "Je n'aime pas", icon: faThumbsDown, color: "text-rose-500", activeBg: "bg-rose-50 border-rose-200" },
    { kind: "sad", label: "Triste", icon: faSadTear, color: "text-indigo-500", activeBg: "bg-indigo-50 border-indigo-200" },
];

export default function ReactionBar({ summary = {}, userReaction, onToggleReaction }) {
    return (
        <div className="flex items-center gap-1.5 pt-3.5 mt-3.5 border-t border-gray-100/80 flex-wrap">
            {REACTIONS.map((r) => {
                const isActive = userReaction === r.kind;
                const count = summary[r.kind] || 0;

                return (
                    <button
                        key={r.kind}
                        type="button"
                        onClick={() => onToggleReaction(r.kind)}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-colors duration-200 ${
                            isActive ? "bg-surface text-navy" : "text-gray-500 hover:bg-surface hover:text-navy"
                        }`}
                        title={r.label}
                    >
                        <FontAwesomeIcon icon={r.icon} className={isActive ? r.color : "text-gray-400"} />
                        {count > 0 && <span>{count}</span>}
                    </button>
                );
            })}
        </div>
    );
}