import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faThumbsUp, faLaugh, faThumbsDown, faSadTear } from "@fortawesome/free-solid-svg-icons";

const REACTIONS = [
    { kind: "like", label: "J'aime", icon: faThumbsUp, color: "text-blue-500", bg: "bg-blue-50 border-blue-200" },
    { kind: "haha", label: "Haha", icon: faLaugh, color: "text-yellow-500", bg: "bg-yellow-50 border-yellow-200" },
    { kind: "dislike", label: "Je n'aime pas", icon: faThumbsDown, color: "text-red-500", bg: "bg-red-50 border-red-200" },
    { kind: "sad", label: "Triste", icon: faSadTear, color: "text-indigo-500", bg: "bg-indigo-50 border-indigo-200" },
];

export default function ReactionBar ({ summary = {}, userReaction, onToggleReaction }) {
    return (
        <div className="flex items-center gap-1.5 pt-3 border-t border-gray-100 flex-wrap">
            {REACTIONS.map((r) => {
                const isActive = userReaction === r.kind;
                const count = summary[r.kind] || 0;

                return (
                <button
                    key={r.kind}
                    type="button"
                    onClick={() => onToggleReaction(r.kind)}
                    className={`flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-semibold transition-all duration-200 border ${
                    isActive
                        ? `${r.bg}${r.color} shadow-xs font-bold scale-105`
                        : "border-transparent text-gray-500 hover:bg-surface hover:text-navy"
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
