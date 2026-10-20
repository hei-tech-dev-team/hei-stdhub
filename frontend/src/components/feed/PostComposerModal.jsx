import { useState, useRef, useEffect } from "react";
import api from "../../api/axios";
import AuthorAvatar from "../ui/AuthorAvatar";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faPaperclip, faPaperPlane, faTimes, faSpinner, faBullhorn } from "@fortawesome/free-solid-svg-icons";

const ALLOWED_ANNOUNCE_ROLES = ["admin", "bde", "teacher"];
const MAX_FILES = 5;
const MAX_FILE_SIZE = 10 * 1024 * 1024;

export default function PostComposerModal({ isOpen, onClose, user, onPostCreated }) {
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
            previews.forEach((p) => p.url && URL.revokeObjectURL(p.url));
        };
    }, [previews]);

    if (!isOpen) return null;

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
                setError(`Le fichier "${file.name}" dépasse 10 Mo.`);
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
        if (target?.url) URL.revokeObjectURL(target.url);

        setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
        setPreviews((prev) => prev.filter((_, i) => i !== index));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!content.trim()) {
            setError("Le contenu de la publication est requis.");
            return;
        }
        if (type === "announcement" && !title.trim()) {
            setError("Le titre est requis pour une annonce.");
            return;
        }

        setLoading(true);
        setError("");

        try {
            const formData = new FormData();
            formData.append("content", content.trim());
            formData.append("type", type);
            if (type === "announcement") formData.append("title", title.trim());
            selectedFiles.forEach((file) => formData.append("files", file));

            const { data } = await api.post("/posts", formData);

            setContent("");
            setTitle("");
            setType("post");
            previews.forEach((p) => p.url && URL.revokeObjectURL(p.url));
            setSelectedFiles([]);
            setPreviews([]);

            if (onPostCreated) onPostCreated(data);
            onClose();
        } catch (err) {
            setError(err.response?.data?.error || "Erreur lors de la publication.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-navy/40 backdrop-blur-xs animate-in fade-in duration-200">
            <div
                className="bg-white w-full max-w-lg rounded-3xl shadow-card overflow-hidden border border-gray-100 flex flex-col max-h-[90vh]"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-surface/50">
                    <h2 className="font-bold text-navy text-base">Créer une publication</h2>
                    <button
                        type="button"
                        onClick={onClose}
                        className="w-8 h-8 rounded-full bg-gray-100 text-gray-400 hover:text-navy flex items-center justify-center transition-colors"
                    >
                        <FontAwesomeIcon icon={faTimes} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 overflow-y-auto custom-scrollbar flex-1 space-y-4">
                    <div className="flex items-center gap-3">
                        <AuthorAvatar name={user?.pseudo} avatar={user?.avatar} />
                        <div>
                            <p className="font-bold text-navy text-sm">{user?.pseudo || "Utilisateur"}</p>
                            {canPublishAnnounce && (
                                <div className="flex gap-2 mt-1">
                                    <button
                                        type="button"
                                        onClick={() => setType("post")}
                                        className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold transition-all ${
                                            type === "post" ? "bg-navy text-white" : "bg-surface text-gray-400"
                                        }`}
                                    >
                                        Post
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setType("announcement")}
                                        className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold transition-all flex items-center gap-1 ${
                                            type === "announcement" ? "bg-gold text-navy font-bold" : "bg-surface text-gray-400"
                                        }`}
                                    >
                                        <FontAwesomeIcon icon={faBullhorn} /> Annonce
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>

                    {type === "announcement" && (
                        <input
                            type="text"
                            placeholder="Titre de l'annonce..."
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            className="w-full px-4 py-2.5 rounded-xl bg-surface border border-gray-200 font-bold text-sm text-navy focus:outline-none focus:ring-2 focus:ring-gold/50"
                        />
                    )}

                    <textarea
                        rows={4}
                        placeholder="Quoi de neuf ?"
                        value={content}
                        onChange={(e) => setContent(e.target.value)}
                        className="w-full p-4 rounded-xl bg-surface border border-gray-200 text-sm text-navy focus:outline-none focus:ring-2 focus:ring-gold/50 resize-none"
                    />

                    {previews.length > 0 && (
                        <div className="flex flex-wrap gap-2 pt-2">
                            {previews.map((p, idx) => (
                                <div
                                    key={idx}
                                    className="relative rounded-xl overflow-hidden bg-surface border border-gray-200 p-1 flex items-center gap-2 pr-7"
                                >
                                    {p.isImage ? (
                                        <img src={p.url} alt="Aperçu" className="w-8 h-8 object-cover rounded-lg" />
                                    ) : (
                                        <div className="w-8 h-8 rounded-lg bg-navy/10 flex items-center justify-center text-navy text-xs">
                                            <FontAwesomeIcon icon={faPaperclip} />
                                        </div>
                                    )}
                                    <span className="text-xs font-semibold text-navy truncate max-w-[120px]">{p.name}</span>
                                    <button
                                        type="button"
                                        onClick={() => handleRemoveFile(idx)}
                                        className="absolute right-1 w-5 h-5 rounded-full bg-rose-500 text-white text-[10px] flex items-center justify-center"
                                    >
                                        <FontAwesomeIcon icon={faTimes} />
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}

                    {error && <p className="text-xs text-rose-500 font-semibold">{error}</p>}

                    <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                        <input type="file" multiple ref={fileInputRef} onChange={handleFileSelect} className="hidden" />
                        <button
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            disabled={loading || selectedFiles.length >= MAX_FILES}
                            className="text-xs font-bold text-gray-500 hover:text-gold flex items-center gap-2"
                        >
                            <FontAwesomeIcon icon={faPaperclip} className="text-sm" />
                            <span>Joindre des fichiers ({selectedFiles.length}/{MAX_FILES})</span>
                        </button>

                        <button
                            type="submit"
                            disabled={loading || !content.trim()}
                            className="px-5 py-2.5 rounded-xl bg-navy text-white text-xs font-bold hover:bg-navy-dark transition-all flex items-center gap-2"
                        >
                            {loading ? <FontAwesomeIcon icon={faSpinner} className="animate-spin" /> : <FontAwesomeIcon icon={faPaperPlane} />}
                            Publier
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}