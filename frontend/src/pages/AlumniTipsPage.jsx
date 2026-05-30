import { useState, useEffect, useRef } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faGraduationCap,
  faSpinner,
  faXmark,
  faImage,
  faCheckCircle,
  faCircleExclamation,
} from "@fortawesome/free-solid-svg-icons";
import api from "../api/axios";
import Sidebar from "../components/layout/Sidebar";

export default function AlumniTipsPage() {
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");
  const fileRef = useRef(null);

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  const handleFile = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError("Seules les images sont acceptees.");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setError("Fichier trop volumineux (max 10 Mo).");
      return;
    }
    setSelectedFile(file);
    setPreviewUrl(URL.createObjectURL(file));
    setError("");
    e.target.value = "";
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) {
      setError("Le titre et le contenu sont requis.");
      return;
    }
    setSubmitting(true);
    setError("");
    setSuccess(false);
    try {
      const fd = new FormData();
      fd.append("title", title.trim());
      fd.append("content", content.trim());
      if (selectedFile) fd.append("image", selectedFile);
      await api.post("/alumni-tips", fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setSuccess(true);
      setTitle("");
      setContent("");
      setSelectedFile(null);
      setPreviewUrl(null);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      setError(err.response?.data?.error || "Erreur lors de l'envoi.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-surface">
      <Sidebar />
      <main className="flex-1 overflow-y-auto h-screen">
        <div className="max-w-2xl mx-auto p-4 sm:p-6 lg:p-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-navy/10 text-navy flex items-center justify-center">
              <FontAwesomeIcon icon={faGraduationCap} className="text-lg" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-navy">AlumniTips</h1>
              <p className="text-gray-400 text-sm">Partagez votre experience HEI</p>
            </div>
          </div>

          {success && (
            <div className="bg-green-50 border border-green-200 text-green-700 text-sm px-4 py-3 rounded-2xl mb-5 flex items-center gap-2">
              <FontAwesomeIcon icon={faCheckCircle} /> Votre tip a ete publie avec succes !
            </div>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-600 text-sm px-4 py-3 rounded-2xl mb-5 flex items-center gap-2">
              <FontAwesomeIcon icon={faCircleExclamation} /> {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-card p-5 space-y-4">
            <div>
              <label className="text-xs font-bold text-gray-500 mb-2 block uppercase tracking-wide">
                Titre de votre histoire
              </label>
              <input
                type="text"
                className="input-field"
                placeholder="Ex: Ma premiere annee a HEI..."
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                maxLength={255}
              />
            </div>

            <div>
              <label className="text-xs font-bold text-gray-500 mb-2 block uppercase tracking-wide">
                Votre temoignage
              </label>
              <textarea
                className="input-field resize-none"
                rows={6}
                placeholder="Racontez votre experience, vos souvenirs, vos conseils..."
                value={content}
                onChange={(e) => setContent(e.target.value)}
              />
            </div>

            <div>
              <label className="text-xs font-bold text-gray-500 mb-2 block uppercase tracking-wide">
                Image (optionnel)
              </label>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-contact text-sm text-navy hover:border-navy hover:bg-navy/5 transition"
                >
                  <FontAwesomeIcon icon={faImage} /> Ajouter une photo
                </button>
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleFile}
                />
                {selectedFile && (
                  <span className="text-xs text-gray-500 truncate">{selectedFile.name}</span>
                )}
              </div>

              {previewUrl && (
                <div className="relative mt-3 inline-block">
                  <img
                    src={previewUrl}
                    alt="Preview"
                    className="w-40 h-40 object-cover rounded-xl border border-contact"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedFile(null);
                      URL.revokeObjectURL(previewUrl);
                      setPreviewUrl(null);
                    }}
                    className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 rounded-full text-white text-xs flex items-center justify-center hover:bg-red-400 transition"
                  >
                    <FontAwesomeIcon icon={faXmark} />
                  </button>
                </div>
              )}
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-3 rounded-2xl font-bold text-sm text-white transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              style={{
                background: submitting ? "#94a3b8" : "linear-gradient(135deg, #0A1A33, #001948)",
                boxShadow: submitting ? "none" : "0 4px 16px rgba(0,25,72,0.25)",
              }}
            >
              {submitting ? (
                <>
                  <FontAwesomeIcon icon={faSpinner} className="animate-spin" /> Publication...
                </>
              ) : (
                "Publier mon temoignage"
              )}
            </button>
          </form>

          <div className="mt-6 bg-navy/5 rounded-2xl p-4 border border-navy/10">
            <p className="text-navy text-sm font-semibold mb-1">Comment ca marche ?</p>
            <p className="text-navy/60 text-xs leading-relaxed">
              Partagez vos souvenirs, anecdotes et conseils de votre temps a HEI.
              Votre temoignage sera visible par tous les membres sur la page STDnews.
              Vous pouvez ajouter une photo pour illustrer votre histoire.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
