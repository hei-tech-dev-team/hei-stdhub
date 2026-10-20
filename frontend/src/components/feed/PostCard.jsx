import { useState } from "react";
import { Link } from "react-router-dom";
import AuthorAvatar from "../ui/AuthorAvatar";
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
    const hasAttachments = post.attachments && post.attachments.length > 0;

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
            setError("Le contenu ne peut pas être vide.");
            return;
        }
        setSaving(true);
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
        <div className="bg-white rounded-3xl shadow-card p-5 sm:p-6 border border-gray-100/50 hover:shadow-lg transition-all duration-300 relative">
            <div className={`grid gap-6 ${hasAttachments ? "grid-cols-1 lg:grid-cols-12" : "grid-cols-1"}`}>
                <div className={`${hasAttachments ? "lg:col-span-7" : "w-full"} flex flex-col justify-between`}>
                    <div>
                        <div className="flex items-start justify-between gap-3 mb-3">
                            <div className="flex items-center gap-3">
                                {!isDeletedUser && author.ref ? (
                                    <Link to={`/user/${author.ref}`} className="shrink-0">
                                        <AuthorAvatar name={authorName} avatar={author.avatar} />
                                    </Link>
                                ) : (
                                    <AuthorAvatar name={authorName} deleted={true} />
                                )}

                                <div>
                                    <div className="flex items-center gap-2">
                                        {!isDeletedUser && author.ref ? (
                                            <Link
                                                to={`/user/${author.ref}`}
                                                className="font-bold text-navy text-sm hover:text-gold transition-colors"
                                            >
                                                {authorName}
                                            </Link>
                                        ) : (
                                            <span className="font-bold text-gray-400 text-sm">{authorName}</span>
                                        )}
                                        {post.type === "announcement" && (
                                            <span className="px-2 py-0.5 rounded-full bg-gold/15 text-navy font-bold text-[10px] flex items-center gap-1">
                                                <FontAwesomeIcon icon={faBullhorn} className="text-gold" /> Annonce
                                            </span>
                                        )}
                                    </div>
                                    <p className="text-[11px] text-gray-400">Publié le {formattedDate}</p>
                                </div>
                            </div>

                            {canManage && (
                                <div className="relative shrink-0">
                                    <button
                                        type="button"
                                        onClick={() => setShowMenu((prev) => !prev)}
                                        className="w-8 h-8 rounded-xl hover:bg-surface text-gray-400 hover:text-navy flex items-center justify-center transition-all"
                                    >
                                        <FontAwesomeIcon icon={faEllipsisV} />
                                    </button>

                                    {showMenu && (
                                        <div className="absolute right-0 mt-1 w-36 bg-white rounded-2xl shadow-card border border-gray-100 py-1.5 z-20">
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setShowMenu(false);
                                                    setIsEditing(true);
                                                }}
                                                className="w-full px-3 py-1.5 text-left text-xs font-semibold text-navy hover:bg-surface flex items-center gap-2"
                                            >
                                                <FontAwesomeIcon icon={faEdit} className="text-gray-400" /> Modifier
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setShowMenu(false);
                                                    onDelete(post.id);
                                                }}
                                                className="w-full px-3 py-1.5 text-left text-xs font-semibold text-rose-600 hover:bg-rose-50 flex items-center gap-2"
                                            >
                                                <FontAwesomeIcon icon={faTrash} /> Supprimer
                                            </button>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        <div className="mt-2">
                            {isEditing ? (
                                <div className="space-y-3 bg-surface p-3 rounded-2xl border border-gray-200">
                                    {post.type === "announcement" && (
                                        <input
                                            type="text"
                                            value={editTitle}
                                            onChange={(e) => setEditTitle(e.target.value)}
                                            className="w-full px-3 py-2 rounded-xl bg-white border border-gray-200 text-sm font-bold text-navy"
                                        />
                                    )}
                                    <textarea
                                        rows={3}
                                        value={editContent}
                                        onChange={(e) => setEditContent(e.target.value)}
                                        className="w-full p-3 rounded-xl bg-white border border-gray-200 text-sm text-navy resize-none"
                                    />
                                    {error && <p className="text-xs text-rose-500 font-semibold">{error}</p>}
                                    <div className="flex justify-end gap-2">
                                        <button
                                            type="button"
                                            onClick={() => setIsEditing(false)}
                                            className="px-3 py-1.5 rounded-xl text-xs font-bold text-gray-500 hover:bg-gray-200"
                                        >
                                            Annuler
                                        </button>
                                        <button
                                            type="button"
                                            onClick={handleSaveEdit}
                                            className="px-3 py-1.5 rounded-xl text-xs font-bold bg-navy text-white hover:bg-navy-dark"
                                        >
                                            {saving ? <FontAwesomeIcon icon={faSpinner} className="animate-spin" /> : "Enregistrer"}
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <>
                                    {post.title && <h3 className="font-bold text-navy text-base mb-1">{post.title}</h3>}
                                    <p className="text-sm text-navy/90 whitespace-pre-wrap leading-relaxed">{post.content}</p>
                                </>
                            )}
                        </div>
                    </div>

                    <div className="mt-4">
                        <ReactionBar
                            summary={post.reactions_summary}
                            userReaction={post.user_reaction}
                            onToggleReaction={(kind) => onReactionChange(post.id, kind)}
                        />
                    </div>
                </div>

                {hasAttachments && (
                    <div className="lg:col-span-5 border-t lg:border-t-0 lg:border-l border-gray-100 pt-4 lg:pt-0 lg:pl-6">
                        <AttachmentList attachments={post.attachments} />
                    </div>
                )}

            </div>
        </div>
    );
}