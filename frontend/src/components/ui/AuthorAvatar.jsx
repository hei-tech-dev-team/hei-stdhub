import Avatar from "../ui/Avatar";

export default function AuthorAvatar({ name, avatar, deleted = false }) {
    if (avatar && !deleted) {
        return (
            <div className="w-10 h-10 rounded-full overflow-hidden ring-2 ring-gold/20 shrink-0 bg-surface">
                <img src={avatar} alt={name} className="w-full h-full object-cover" />
            </div>
        );
    }

    return (
        <div className="shrink-0">
            <Avatar name={name || "Membre"} size="md" color={deleted ? "bg-gray-300" : "bg-gold"} />
        </div>
    );
}