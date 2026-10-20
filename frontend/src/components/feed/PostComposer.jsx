import { useState, useRef, useEffect } from "react";
import api from "../../api/axios";
import AuthorAvatar from "../ui/AuthorAvatar";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faPaperclip, faPaperPlane, faTimes, faSpinner, faBullhorn } from "@fortawesome/free-solid-svg-icons";

const ALLOWED_ANNOUNCE_ROLES = ["admin", "bde", "teacher"];
const MAX_FILES = 5;
const MAX_FILE_SIZE = 10 * 1024 * 1024;

export default function PostComposer({ user, onPostCreated }) {
    const [content, setContent] = useState("");
    const [title, setTitle] = useState("");
    const [type, setType] = useState("post");
    const [selectedFiles, setSelectedFiles] = useState([]);
    const [previews, setPreviews] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    const fileInputRef = useRef(null);
    const canPublishAnnounce = ALLOWED_ANNOUNCE_ROLES.includes(user?.role);

    useEffect(() => {
        return () => {
            previews.forEach((p) => {
                if (p.url) URL.revokeObjectURL(p.url);
            });
        };
    }, [previews]);

    const handleFileSelect = (e) => {
        const files = Array.from(e.target.files || []);
        if (!files.length) return;

        if (selectedFiles.length + files.length > MAX_FILES) {
            setError(`Vous ne pouvez pas ajouter plus de ${MAX_FILES} fichiers.`);
            return;
        }

        const validFiles = [];
        const newPreviews = [];

        for (const file of files) {
            if (file.size > MAX_FILE_SIZE) {
                setError(`Le fichier "${file.name}" dépasse la limite de 10 Mo.`);
                return;
            }
            validFiles.push(file);

            const isImage = file.type.startsWith("image/");
            newPreviews.push({
                file,
                url: isImage ? URL.createObjectURL(file) : null,
                name: file.name,
                isImage,
            });
        }

        setError("");
        setSelectedFiles((prev) => [...prev, ...validFiles]);
        setPreviews((prev) => [...prev, ...newPreviews]);

        if (fileInputRef.current) fileInputRef.current.value = "";
    };

    const handleRemoveFile = (index) => {
        const target = previews[index];
        if (target && target.url) {
            URL.revokeObjectURL(target.url);
        }

        setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
        setPreviews((prev) => prev.filter((_, i) => i !== index));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!content.trim()) {
            setError("Le contenu de la publication ne peut pas être vide.");
            return;
        }
        if (type === "announcement" && !title.trim()) {
            setError("Le titre est obligatoire pour une annonce.");
            return;
        }

        setLoading(true);
        setError("");

        try {
            const formData = new FormData();
            formData.append("content", content.trim());
            formData.append("type", type);
            if (type === "announcement") {
                formData.append("title", title.trim());
            }
            selectedFiles.forEach((file) => {
                formData.append("files", file);
            });

            const { data } = await api.post("/posts", formData);

            setContent("");
            setTitle("");
            setType("post");
            previews.forEach((p) => p.url && URL.revokeObjectURL(p.url));
            setSelectedFiles([]);
            setPreviews([]);

            if (onPostCreated) onPostCreated(data);
        } catch (err) {
            setError(err.response?.data?.error || "Erreur lors de la publication.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="bg-white rounded-2xl shadow-card p-5 sm:p-6 mb-6 border border-gray-100/50">
            <form onSubmit={handleSubmit}>
                <div className="flex gap-4">
                    <AuthorAvatar name={user?.pseudo} avatar={user?.avatar} />

                    <div className="flex-1 min-w-0">
                        {canPublishAnnounce && (
                            <div className="flex gap-2 mb-3.5">
                                <button
                                    type="button"
                                    onClick={() => setType("post")}
                                    className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                                        type === "post"
                                            ? "bg-navy text-white shadow-xs"
                                            : "bg-surface text-gray-400 hover:text-navy hover:bg-gray-100"
                                    }`}
                                >
                                    Publication
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setType("announcement")}
                                    className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                                        type === "announcement"
                                            ? "bg-gold text-navy shadow-xs font-extrabold"
                                            : "bg-surface text-gray-400 hover:text-navy hover:bg-gray-100"
                                    }`}
                                >
                                    <FontAwesomeIcon icon={faBullhorn} /> Annonce
                                </button>
                            </div>
                        )}

                        {type === "announcement" && (
                            <input
                                type="text"
                                placeholder="Titre de l'annonce..."
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                className="w-full px-4 py-2.5 rounded-xl bg-surface border border-gray-200 font-bold text-sm text-navy mb-3 focus:outline-none focus:ring-2 focus:ring-gold/50 transition-all"
                            />
                        )}

                        <textarea
                            rows={3}
                            placeholder="Quoi de neuf ?"
                            value={content}
                            onChange={(e) => setContent(e.target.value)}
                            className="w-full p-4 rounded-xl bg-surface border border-gray-200 text-sm text-navy placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gold/50 transition-all resize-none"
                        />

                        {previews.length > 0 && (
                            <div className="flex flex-wrap gap-2.5 mt-3.5">
                                {previews.map((p, idx) => (
                                    <div
                                        key={idx}
                                        className="relative group rounded-xl overflow-hidden bg-surface border border-gray-200 p-1.5 flex items-center gap-2.5 pr-8 shadow-2xs"
                                    >
                                        {p.isImage ? (
                                            <img src={p.url} alt="Aperçu" className="w-9 h-9 object-cover rounded-lg" />
                                        ) : (
                                            <div className="w-9 h-9 rounded-lg bg-navy/10 flex items-center justify-center text-navy text-xs">
                                                <FontAwesomeIcon icon={faPaperclip} />
                                            </div>
                                        )}
                                        <span className="text-xs font-semibold text-navy truncate max-w-[130px]">
                                            {p.name}
                                        </span>
                                        <button
                                            type="button"
                                            onClick={() => handleRemoveFile(idx)}
                                            className="absolute right-1.5 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full bg-rose-500 text-white text-[10px] flex items-center justify-center opacity-80 hover:opacity-100 transition-opacity"
                                            title="Supprimer"
                                        >
                                            <FontAwesomeIcon icon={faTimes} />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}

                        {error && <p className="text-xs text-rose-500 font-semibold mt-2">{error}</p>}

                        <div className="flex items-center justify-between mt-4 pt-3.5 border-t border-gray-100">
                            <input
                                type="file"
                                multiple
                                ref={fileInputRef}
                                onChange={handleFileSelect}
                                className="hidden"
                            />
                            <button
                                type="button"
                                onClick={() => fileInputRef.current?.click()}
                                disabled={loading || selectedFiles.length >= MAX_FILES}
                                className="text-xs font-bold text-gray-500 hover:text-gold flex items-center gap-2 transition-colors disabled:opacity-50"
                            >
                                <FontAwesomeIcon icon={faPaperclip} className="text-sm" />
                                <span>Joindre des fichiers ({selectedFiles.length}/{MAX_FILES})</span>
                            </button>

                            <button
                                type="submit"
                                disabled={loading || !content.trim()}
                                className="px-5 py-2.5 rounded-xl bg-navy hover:bg-navy-dark text-white text-xs font-bold transition-all shadow-sm flex items-center gap-2 disabled:opacity-50 hover:scale-[1.02] active:scale-95"
                            >
                                {loading ? (
                                    <FontAwesomeIcon icon={faSpinner} className="animate-spin" />
                                ) : (
                                    <FontAwesomeIcon icon={faPaperPlane} />
                                )}
                                Publier
                            </button>
                        </div>
                    </div>
                </div>
            </form>
        </div>
    );
}