import { useState, useEffect, useRef } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faCloudUploadAlt,
  faLink,
  faTimes,
  faSpinner,
  faTrash,
  faBookOpen,
  faExternalLinkAlt,
  faDownload,
} from "@fortawesome/free-solid-svg-icons";
import api from "../../api/axios";
import Navbar from "../layout/Navbar";
import Badge from "../ui/Badge";
import Avatar from "../ui/Avatar";
import { useAuth } from "../../context/AuthContext";

export default function TeacherHome() {
  const { user } = useAuth();

  // UEs du prof connecté uniquement
  const teacherUes = user?.ues?.length > 0 ? user.ues : [];

  const EMPTY_FORM = {
    title: "",
    description: "",
    ue: teacherUes[0] || "",
    type: "cours",
    link: "",
    file: null,
  };

  const [posts, setPosts] = useState([]);
  const [form, setForm] = useState(EMPTY_FORM);
  const [dragOver, setDragOver] = useState(false);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [error, setError] = useState("");
  const fileRef = useRef();

  const set = (k, v) => setForm((p) => ({ ...p, [k]: v }));

  useEffect(() => {
    api
      .get("/posts")
      .then(({ data }) => setPosts(Array.isArray(data) ? data : data?.posts || []))
      .catch(console.error)
      .finally(() => setFetching(false));
  }, []);

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) {
      set("file", file);
      set("link", "");
    }
  };

  const handleFileInput = (e) => {
    const file = e.target.files[0];
    if (file) {
      set("file", file);
      set("link", "");
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.title.trim()) return setError("Le titre est requis.");
    if (!form.ue) return setError("Veuillez sélectionner une UE.");
    if (!form.file && !form.link.trim())
      return setError("Un fichier ou un lien est requis.");

    setLoading(true);
    setError("");
    try {
      const fd = new FormData();
      fd.append("title", form.title);
      fd.append("description", form.description);
      fd.append("ue", form.ue);
      fd.append("type", form.type);
      if (form.file) fd.append("file", form.file);
      if (form.link) fd.append("link", form.link);

      const { data } = await api.post("/posts", fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setPosts((p) => [data, ...p]);
      setForm(EMPTY_FORM);
    } catch (err) {
      setError(err.response?.data?.error || "Erreur lors de la publication.");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm("Supprimer ce post ?")) return;
    try {
      await api.delete(`/posts/${id}`);
      setPosts((p) => p.filter((post) => post.id !== id));
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="flex flex-col h-full">
      <Navbar />
      <div className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto">
        <div className="card mb-6">
          <h2 className="font-bold text-navy text-base mb-4">
            Publier un contenu
          </h2>

          {teacherUes.length === 0 && (
            <div className="bg-yellow-50 border border-yellow-200 text-yellow-700 text-sm px-4 py-3 rounded-xl mb-4">
              Aucune UE assignée à votre compte. Contactez l'administrateur.
            </div>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-600 text-sm px-4 py-2 rounded-xl mb-4">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="flex flex-col gap-3">
            <input
              className="input-field"
              placeholder="Titre du contenu *"
              value={form.title}
              onChange={(e) => {
                set("title", e.target.value);
                setError("");
              }}
            />

            <textarea
              className="input-field resize-none h-20"
              placeholder="Description (optionnel)"
              value={form.description}
              onChange={(e) => set("description", e.target.value)}
            />

            <div className="flex flex-col sm:flex-row gap-3">
              {/* Select UE — uniquement les UEs du prof */}
              <select
                className="input-field flex-1"
                value={form.ue}
                onChange={(e) => set("ue", e.target.value)}
                disabled={teacherUes.length === 0}
              >
                {teacherUes.length === 0 ? (
                  <option value="">Aucune UE disponible</option>
                ) : (
                  teacherUes.map((ue) => (
                    <option key={ue} value={ue}>
                      {ue}
                    </option>
                  ))
                )}
              </select>
              <div className="flex gap-2">
                {["cours", "td", "examen"].map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => set("type", t)}
                    className={
                      "flex-1 sm:flex-none px-4 py-2 rounded-xl text-xs " +
                      "font-bold border transition capitalize " +
                      (form.type === t
                        ? "bg-navy text-white border-navy"
                        : "bg-white text-navy border-contact hover:border-navy")
                    }
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>

            <div
              className={
                "flex flex-col items-center justify-center rounded-xl " +
                "border-2 border-dashed cursor-pointer p-4 sm:p-6 transition " +
                (dragOver
                  ? "border-gold bg-gold/5"
                  : "border-contact hover:border-navy/40")
              }
              onDragOver={(e) => {
                e.preventDefault();
                setDragOver(true);
              }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
              onClick={() => fileRef.current?.click()}
            >
              <FontAwesomeIcon
                icon={faCloudUploadAlt}
                className={
                  "text-3xl mb-2 " + (dragOver ? "text-gold" : "text-gray-300")
                }
              />
              {form.file ? (
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-navy truncate max-w-xs">
                    {form.file.name}
                  </span>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      set("file", null);
                    }}
                    className="text-red-400 hover:text-red-600"
                  >
                    <FontAwesomeIcon icon={faTimes} />
                  </button>
                </div>
              ) : (
                <p className="text-gray-400 text-sm text-center">
                  Déposer un fichier ou cliquer pour parcourir
                </p>
              )}
              <input
                ref={fileRef}
                type="file"
                className="hidden"
                onChange={handleFileInput}
              />
            </div>

            <div className="flex items-center gap-3">
              <hr className="flex-1 border-contact" />
              <span className="text-xs font-bold text-gray-400">OU</span>
              <hr className="flex-1 border-contact" />
            </div>

            <div className="relative">
              <FontAwesomeIcon
                icon={faLink}
                className="absolute left-4 top-1/2 -translate-y-1/2
                           text-gray-400 text-sm pointer-events-none"
              />
              <input
                className="input-field pl-10"
                placeholder="Lien Google Drive, GitHub..."
                value={form.link}
                onChange={(e) => {
                  set("link", e.target.value);
                  set("file", null);
                }}
              />
            </div>

            <div className="flex flex-col sm:flex-row gap-3 justify-end">
              <button
                type="button"
                onClick={() => {
                  setForm(EMPTY_FORM);
                  setError("");
                }}
                className="btn-danger sm:w-auto w-full text-center"
              >
                Annuler
              </button>
              <button
                type="submit"
                disabled={loading || teacherUes.length === 0}
                className="btn-primary sm:w-auto w-full text-center flex items-center justify-center gap-2 disabled:opacity-60"
              >
                {loading ? (
                  <FontAwesomeIcon icon={faSpinner} className="animate-spin" />
                ) : (
                  "Publier"
                )}
              </button>
            </div>
          </form>
        </div>

        <div className="flex flex-col gap-3">
          {fetching && (
            <div className="flex justify-center py-12">
              <FontAwesomeIcon
                icon={faSpinner}
                className="text-navy text-2xl animate-spin"
              />
            </div>
          )}
          {!fetching && posts.length === 0 && (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="relative mb-8 animate-slide-up">
                <div className="absolute inset-0 bg-gold/20 rounded-full scale-[2] opacity-30 animate-ping"></div>
                <div className="absolute inset-0 bg-navy/10 rounded-full scale-150 blur-xl animate-pulse"></div>
                <div className="relative bg-white/80 backdrop-blur-sm border-2 border-gold/30 p-7 rounded-full shadow-lg hover:shadow-gold/20 hover:shadow-2xl transition-shadow duration-500">
                  <FontAwesomeIcon icon={faCloudUploadAlt} className="text-gold text-5xl animate-float" />
                </div>
              </div>
              <h2 className="text-2xl font-bold text-navy mb-3 animate-slide-up" style={{ animationDelay: '0.15s', animationFillMode: 'backwards' }}>
                Aucun contenu publié
              </h2>
              <p className="text-gray-400 max-w-xs leading-relaxed animate-slide-up" style={{ animationDelay: '0.25s', animationFillMode: 'backwards' }}>
                Publiez votre premier cours, TD ou examen<br />
                en utilisant le formulaire ci-dessus.
              </p>
            </div>
          )}
          {!fetching &&
            posts.map((post) => (
              <div
                key={post.id}
                className="card flex flex-col sm:flex-row gap-3 hover:shadow-lg hover:border-gold/20 hover:-translate-y-0.5 transition-all duration-300 border border-contact/60 group"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2 flex-wrap">
                    <Badge type={post.type} />
                    <span
                      className="bg-navy/10 text-navy text-xs font-bold
                                   px-3 py-1 rounded-full"
                    >
                      {post.ue}
                    </span>
                    <span className="ml-auto text-xs text-gray-300">
                      {new Date(post.created_at).toLocaleDateString("fr-FR")}
                    </span>
                  </div>
                  <h3 className="font-bold text-navy text-sm truncate group-hover:text-gold transition-colors">
                    {post.title}
                  </h3>
                  {post.description && (
                    <p className="text-gray-400 text-xs mt-1 line-clamp-2 group-hover:text-gray-500 transition-colors">
                      {post.description}
                    </p>
                  )}
                  <div className="flex items-center gap-2 mt-2">
                    <Avatar
                      name={post.author_pseudo || "?"}
                      size="sm"
                      color="bg-navy"
                    />
                    <span className="text-xs text-gray-400 group-hover:text-gray-500 transition-colors">
                      {post.author_pseudo}
                    </span>
                    <span className="text-xs text-gray-300 ml-auto">
                      {new Date(post.created_at).toLocaleDateString("fr-FR")}
                    </span>
                  </div>
                </div>
                <div className="flex sm:flex-col gap-2 items-center sm:items-end justify-end">
                  {post.link && (
                    <a
                      href={post.link}
                      target="_blank"
                      rel="noreferrer"
                      className="text-xs text-gold font-bold hover:text-gold-light hover:underline transition-colors"
                    >
                      <FontAwesomeIcon icon={faExternalLinkAlt} className="text-xs mr-1" />
                      Voir
                    </a>
                  )}
                  {post.file_path && (
                    <a
                      href={`${import.meta.env.VITE_API_URL || "http://localhost:3001"}/${post.file_path}`}
                      target="_blank"
                      rel="noreferrer"
                      className="text-xs text-gold font-bold hover:text-gold-light hover:underline transition-colors"
                    >
                      <FontAwesomeIcon icon={faDownload} className="text-xs mr-1" />
                      Fichier
                    </a>
                  )}
                  <button
                    type="button"
                    onClick={() => handleDelete(post.id)}
                    className="text-red-400 hover:text-red-600 transition"
                  >
                    <FontAwesomeIcon icon={faTrash} className="text-sm" />
                  </button>
                </div>
              </div>
            ))}
        </div>
      </div>
    </div>
  );
}
