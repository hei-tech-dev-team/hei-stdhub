import { useState } from "react";
import { Link } from "react-router-dom";
import Avatar from "../ui/Avatar";
import AttachmentList from "./AttachmentList";
import ReactionBar from "./ReactionBar";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faEllipsisV, faEdit, faTrash, faBullhorn, faCheck, faTimes, faSpinner } from "@fortawesome/free-solid-svg-icons";

export default function PostCard({ post, currentUser, onUpdate, onDelete, onReactionChange }) {
    const [showMenu, setShowMenu] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [editContent, setEditContent] = useState(post.content || "");
    const [editTitle, setEditTitle] = useState(post.title || "");
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");

    const author = post.author || {};
    const isDeletedUser = !post.author_id || !author.id;
    const authorName = isDeletedUser ? "Utilisateur supprimé" : author.pseudo || "Membre";

    const canManage = !isDeletedUser && (currentUser?.id === post.author_id || currentUser?.role === "admin");

    const formattedDate = post.created_at
        ? new Intl.DateTimeFormat("fr-FR", {
            day: "numeric",
            month: "short",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit", 
        }).format(new Date(post.created_at))
        : "";

    const handleSaveEdit = async () => {
        if (!editContent.trim()) {
            setError("Le contenu ne peut être vide.");
            return;
        }
        if (post.type === "announcement" && !editTitle.trim()) {
            setError("Le titre d'une annonce est obligatoire");
            return;
        }
        setSaving(true);
        setError("");
        try {
            await onUpdate(post.id, {
                content: editContent.trim(),
                title: post.type === "announcement" ? editTitle.trim() : undefined,
            });
            setIsEditing(false);
        } catch (err) {
            setError(err.response?.data?.error || "Erreur lors de la modification");
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="bg-white rounded-2xl shadow-card p-4 sm:p-5 relative transition-all">
            {post.type === "announcement" && (
                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-gold/15 text-gold font-bold text-[11px] mb-3">
                    <FontAwesomeIcon icon={faBullhorn} />
                    <span>Annonce</span>
                </div>
            )}

            <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                    {!isDeletedUser && author.ref ? (
                        <Link to={`/user/${author.ref}`} className="shrink-0">
                            {author.avatar ? (
                                <div className="w-10 h-10 rounded-full overflow-hidden ring-2 ring-gold/20">
                                    <img src={author.avatar} alt={authorName} className="w-full h-full object-cover" />
                                </div>
                            ) : (
                                <Avatar name={authorName} size="md" color="bg-gold" />
                            )}
                        </Link>
                        ) : (
                            <div className="shrink-0">
                                <Avatar name={authorName} size="md" color="bg-gray-300" />
                            </div>
                    )}

                    <div>
                        {!isDeletedUser && author.ref ? (
                        <Link
                            to={`/user/${author.ref}`}
                            className="font-bold text-navy text-sm hover:text-gold transition-colors block leading-snug"
                        >
                            {authorName}
                        </Link>
                        ) : (
                        <span className="font-bold text-gray-500 text-sm block leading-snug">
                            {authorName}
                        </span>
                        )}
                        <p className="text-[11px] text-gray-400">Publié le {formattedDate}</p>
                    </div>
                </div>

                {canManage && (
                <div className="relative shrink-0">
                    <button
                        type="button"
                        onClick={() => setShowMenu((prev) => !prev)}
                        className="w-8 h-8 rounded-xl hover:bg-surface text-gray-400 hover:text-navy flex items-center justify-center transition-colors"
                    >
                        <FontAwesomeIcon icon={faEllipsisV} />
                    </button>

                    {showMenu && (
                    <div className="absolute right-0 mt-1 w-36 bg-white rounded-xl shadow-card border border-gray-100 py-1.5 z-20">
                        <button
                            type="button"
                            onClick={() => {
                                setShowMenu(false);
                                setIsEditing(true);
                            }}
                            className="w-full px-3 py-1.5 text-left text-xs font-semibold text-navy hover:bg-surface flex items-center gap-2"
                        >
                            <FontAwesomeIcon icon={faEdit} className="text-gray-400" />
                            Modifier
                        </button>
                        <button
                            type="button"
                            onClick={() => {
                                setShowMenu(false);
                                onDelete(post.id);
                            }}
                            className="w-full px-3 py-1.5 text-left text-xs font-semibold text-red-500 hover:bg-red-50 flex items-center gap-2"
                        >
                            <FontAwesomeIcon icon={faTrash} />
                            Supprimer
                        </button>
                    </div>
                    )}
                </div>
                )}
            </div>

            <div className="mt-3">
                {isEditing ? (
                    <div className="space-y-3 bg-surface p-3 rounded-xl border border-gray-200">
                        {post.type === "announcement" && (
                            <input
                                type="text"
                                value={editTitle}
                                onChange={(e) => setEditTitle(e.target.value)}
                                placeholder="Titre de l'annonce..."
                                className="w-full px-3 py-2 rounded-lg bg-white border border-gray-200 text-sm font-bold text-navy focus:outline-none focus:ring-2 focus:ring-gold/50"
                            />
                        )}
                        <textarea
                            rows={3}
                            value={editContent}
                            onChange={(e) => setEditContent(e.target.value)}
                            className="w-full p-3 rounded-lg bg-white border border-gray-200 text-sm text-navy focus:outline-none focus:ring-2 focus:ring-gold/50 resize-none"
                        />
                        {error && <p className="text-xs text-red-500 font-medium">{error}</p>}
                        <div className="flex justify-end gap-2">
                            <button
                                type="button"
                                onClick={() => {
                                setIsEditing(false);
                                setError("");
                                }}
                                disabled={saving}
                                className="px-3 py-1.5 rounded-lg text-xs font-bold text-gray-500 hover:bg-gray-200 transition-colors"
                            >
                                <FontAwesomeIcon icon={faTimes} className="mr-1" /> Annuler
                            </button>
                            <button
                                type="button"
                                onClick={handleSaveEdit}
                                disabled={saving}
                                className="px-3 py-1.5 rounded-lg text-xs font-bold bg-navy text-white hover:bg-navy-dark transition-colors flex items-center gap-1"
                            >
                                {saving ? (
                                    <FontAwesomeIcon icon={faSpinner} className="animate-spin" />
                                        ) : (
                                    <FontAwesomeIcon icon={faCheck} />
                                )}
                                Enregistrer
                            </button>
                        </div>
                    </div>
                    ) : (
                    <>
                        {post.title && (
                        <h3 className="font-bold text-navy text-base mb-1">{post.title}</h3>
                        )}
                        <p className="text-sm text-navy/90 whitespace-pre-wrap leading-relaxed">
                        {post.content}
                        </p>
                    </>
                )}
            </div>

            <AttachmentList attachments={post.attachments} />

            <div className="mt-3">
                <ReactionBar
                summary={post.reactions_summary}
                userReaction={post.user_reaction}
                onToggleReaction={(kind) => onReactionChange(post.id, kind)}
                />
            </div>
        </div>
    );
}