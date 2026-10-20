import { useState, useRef, useEffect } from "react";
import api from "../../api/axios";
import Avatar from "../ui/Avatar";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faPaperclip, faPaperPlane, faTimes, faSpinner, faBullhorn } from "@fortawesome/free-solid-svg-icons";

const ALLOWED_ANNOUNCE_ROLES = ["admin", "bde", "teacher"];
const MAX_FILES = 5;
const MAX_FILE_SIZE = 10 * 1024 * 1024;

export default function PostComposer ({ user, onPostCreated }) {
    const [content, setContent] = useState("");
    const [title, setTitle] = useState("");
    const [type, setType] = useState("post");
    const [selectedFiles, setSelectedFiles] = useState([]);
    const [preview, setPreview] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    const fileInputRef = useRef(null);
    const canPublishAnnounce = ALLOWED_ANNOUNCE_ROLES.includes(user?.role);

    useEffect(() => {
        return () => {
            preview.forEach((p) => {
                if (p.url) URL.revokeObjectURL(p.url);
            });
        };
    }, [preview]);

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
                setError(`Le fichier "${file.name} dépasse la limite de 10 Mo."`);
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
        setPreview((prev) => [...prev, ...newPreviews]);

        if (fileInputRef.current) fileInputRef.current.value = "";
    };

    const handleRemoveFile = (index) => {
        const targetPreview = preview[index];
        if (targetPreview && targetPreview.url) {
            URL.revokeObjectURL(targetPreview.url);
        }
        setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
        setPreview((prev) => prev.filter((_, i) => i !== index));
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
        <div className="bg-white rounded-2xl shadow-card p-4 sm:p-5 mb-6">
            <form onSubmit={handleSubmit}>
                <div className="flex gap-3">
                    <div className="shrink-0">
                        {user?.avatar ? (
                        <div className="w-10 h-10 rounded-full overflow-hidden ring-2 ring-gold/20">
                            <img src={user.avatar} alt={user.pseudo} className="w-full h-full object-cover" />
                        </div>
                        ) : (
                            <Avatar name={user?.pseudo || "M"} size="md" color="bg-gold" />
                        )}
                    </div>

                    <div className="flex-1">
                        {canPublishAnnounce && (
                            <div className="flex gap-2 mb-3">
                                <button
                                    type="button"
                                    onClick={() => setType("post")}
                                    className={`px-3 py-1 rounded-full text-xs font-bold transition-all ${
                                        type === "post"
                                        ? "bg-navy text-white"
                                        : "bg-surface text-gray-400 hover:text-navy"
                                    }`}
                                >
                                    Publication
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setType("announcement")}
                                    className={`px-3 py-1 rounded-full text-xs font-bold transition-all flex items-center gap-1 ${
                                        type === "announcement"
                                        ? "bg-gold text-navy shadow-sm"
                                        : "bg-surface text-gray-400 hover:text-navy"
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
                            className="w-full px-3 py-2 rounded-xl bg-surface border border-gray-100 font-bold text-sm text-navy mb-2 focus:outline-none focus:ring-2 focus:ring-gold/50"
                        />
                        )}

                        <textarea
                            rows={3}
                            placeholder="Quoi de neuf ?"
                            value={content}
                            onChange={(e) => setContent(e.target.value)}
                            className="w-full p-3 rounded-xl bg-surface border border-gray-100 text-sm text-navy placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gold/50 resize-none"
                        />

                        {preview.length > 0 && (
                            <div className="flex flex-wrap gap-2 mt-3">
                                {preview.map((p, idx) => (
                                    <div
                                        key={idx}
                                        className="relative group rounded-xl overflow-hidden bg-surface border border-gray-200 p-1 flex items-center gap-2 pr-7"
                                    >
                                        {p.isImage ? (
                                            <img src={p.url} alt="Aperçu" className="w-8 h-8 object-cover rounded-lg" />
                                        ) : (
                                            <div className="w-8 h-8 rounded-lg bg-navy/10 flex items-center justify-center text-navy text-xs">
                                                <FontAwesomeIcon icon={faPaperclip} />
                                            </div>
                                        )}
                                        <span className="text-xs font-medium text-navy truncate max-w-[120px]">
                                            {p.name}
                                        </span>
                                        <button
                                            type="button"
                                            onClick={() => handleRemoveFile(idx)}
                                            className="absolute right-1 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full bg-red-500 text-white text-[10px] flex items-center justify-center opacity-80 hover:opacity-100 transition-opacity"
                                        >
                                            <FontAwesomeIcon icon={faTimes} />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}

                        {error && <p className="text-xs text-red-500 font-medium mt-2">{error}</p>}

                        <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100">
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
                                className="text-xs font-bold text-gray-500 hover:text-gold flex items-center gap-1.5 transition-colors disabled:opacity-50"
                            >
                                <FontAwesomeIcon icon={faPaperclip} className="text-sm" />
                                <span>Joindre des fichiers ({selectedFiles.length}/{MAX_FILES})</span>
                            </button>

                            <button
                                type="submit"
                                disabled={loading || !content.trim()}
                                className="px-4 py-2 rounded-xl bg-navy hover:bg-navy-dark text-white text-xs font-bold transition-all shadow-sm flex items-center gap-2 disabled:opacity-50"
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
