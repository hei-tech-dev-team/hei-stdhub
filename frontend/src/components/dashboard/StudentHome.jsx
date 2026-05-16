import { useState, useEffect } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faSpinner,
  faExternalLinkAlt,
  faDownload,
  faBookOpen,
} from "@fortawesome/free-solid-svg-icons";
import api from "../../api/axios";
import Navbar from "../layout/Navbar";
import Badge from "../ui/Badge";
import Avatar from "../ui/Avatar";
import { useAuth } from "../../context/AuthContext";

const LEVELS = ["Tous", "L1", "L2", "L3"];

export default function StudentHome() {
  const { user } = useAuth();
  const [posts, setPosts] = useState([]);
  const [filter, setFilter] = useState(user?.level || "Tous");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const params = filter !== "Tous" ? { level: filter } : {};
    api
      .get("/posts", { params })
      .then(({ data }) => setPosts(data.posts || []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [filter]);

  const handleFilterChange = (level) => {
    setLoading(true);
    setFilter(level);
  };

  return (
    <div className="flex flex-col h-screen overflow-hidden">
      <Navbar />
      <div className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto custom-scrollbar">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-navy">
              Bonjour, {user?.prenom}
            </h1>
            <p className="text-sm text-gray-400 mt-0.5">
              {posts.length} contenu(s) disponible(s)
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {LEVELS.map((l) => (
              <button
                key={l}
                type="button"
                onClick={() => handleFilterChange(l)}
                className={
                  "px-4 py-1.5 rounded-full text-xs font-bold transition " +
                  (filter === l
                    ? "bg-navy text-white shadow-sm"
                    : "bg-white border border-contact text-navy hover:border-navy")
                }
              >
                {l}
              </button>
            ))}
          </div>
        </div>

        {loading && (
          <div className="flex justify-center py-20">
            <FontAwesomeIcon
              icon={faSpinner}
              className="text-navy text-3xl animate-spin"
            />
          </div>
        )}

        {!loading && posts.length === 0 && (
  <div className="flex flex-col items-center justify-center py-20 text-center">
    <div className="relative mb-8 animate-slide-up">
      <div className="absolute inset-0 bg-gold/20 rounded-full scale-[2] opacity-30 animate-ping"></div>
      <div className="absolute inset-0 bg-navy/10 rounded-full scale-150 blur-xl animate-pulse"></div>
      <div className="absolute -top-2 -right-2 w-4 h-4 bg-gold/40 rounded-full animate-bounce"></div>
      <div className="absolute -bottom-1 -left-1 w-3 h-3 bg-navy/30 rounded-full animate-bounce" style={{ animationDelay: '0.3s', animationDuration: '0.8s' }}></div>
      <div className="relative bg-white/80 backdrop-blur-sm border-2 border-gold/30 p-7 rounded-full shadow-lg hover:shadow-gold/20 hover:shadow-2xl transition-shadow duration-500">
        <FontAwesomeIcon icon={faBookOpen} className="text-gold text-5xl animate-float" />
      </div>
    </div>

    <h2 className="text-2xl font-bold text-navy mb-3 animate-slide-up" style={{ animationDelay: '0.15s', animationFillMode: 'backwards' }}>
      Rien à afficher
    </h2>
    <p className="text-gray-400 max-w-xs leading-relaxed animate-slide-up" style={{ animationDelay: '0.25s', animationFillMode: 'backwards' }}>
      Aucun contenu disponible pour le moment.<br />
      Les professeurs publieront bientôt des cours, TD et examens ici.
    </p>
  </div>
)}
        {!loading && (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
            {posts.map((post) => (
              <div
                key={post.id}
                className="bg-white rounded-2xl border border-contact/60 p-5
                              hover:shadow-lg hover:border-gold/20 hover:-translate-y-0.5
                              transition-all duration-300 group flex flex-col"
              >
                <div className="flex items-center gap-2 mb-3 flex-wrap">
                  <Badge type={post.type} />
                  <span className="bg-navy/10 text-navy text-xs font-bold px-3 py-1 rounded-full">
                    {post.ue}
                  </span>
                  <span className="ml-auto text-xs text-gray-300">
                    {new Date(post.created_at).toLocaleDateString("fr-FR")}
                  </span>
                </div>

                <h3
                  className="font-bold text-navy text-sm mb-1
                               group-hover:text-gold transition-colors line-clamp-2"
                >
                  {post.title}
                </h3>
                {post.description && (
                  <p className="text-gray-400 text-xs mb-4 line-clamp-2 leading-relaxed group-hover:text-gray-500 transition-colors">
                    {post.description}
                  </p>
                )}

                <div className="flex items-center justify-between mt-auto pt-3 border-t border-surface/80">
                  <div className="flex items-center gap-2 min-w-0">
                    <Avatar
                      name={post.author_pseudo || "?"}
                      size="sm"
                      color="bg-navy"
                    />
                    <span className="text-xs text-gray-400 truncate group-hover:text-gray-500 transition-colors">
                      {post.author_pseudo || "Professeur"}
                    </span>
                  </div>
                  {post.link ? (
                    <a
                      href={post.link}
                      target="_blank"
                      rel="noreferrer"
                      className="text-xs text-gold font-bold hover:text-gold-light hover:underline
                                  flex items-center gap-1 shrink-0 ml-2 transition-colors"
                    >
                      <FontAwesomeIcon
                        icon={faExternalLinkAlt}
                        className="text-xs"
                      />
                      Accéder
                    </a>
                  ) : post.file_path ? (
                    <a
                      href={`${import.meta.env.VITE_API_URL || "http://localhost:3001"}/${post.file_path}`}
                      target="_blank"
                      rel="noreferrer"
                      className="text-xs text-gold font-bold hover:text-gold-light hover:underline
                                  flex items-center gap-1 shrink-0 ml-2 transition-colors"
                    >
                      <FontAwesomeIcon icon={faDownload} className="text-xs" />
                      Télécharger
                    </a>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}