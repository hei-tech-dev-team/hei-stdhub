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
      .then(({ data }) => setPosts(data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [filter]);

  const handleFilterChange = (level) => {
    setLoading(true);
    setFilter(level);
  };

  return (
    <div className="flex flex-col h-full">
      <Navbar />
      <div className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto">
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
  <div className="flex flex-col items-center justify-center py-20 text-center animate-fadeIn">
    {/* L'icône stylisée avec les cercles concentriques */}
    <div className="relative mb-6">
      <div className="absolute inset-0 bg-blue-100 rounded-full scale-150 opacity-20 animate-pulse"></div>
      <div className="absolute inset-0 bg-blue-50 rounded-full scale-125 opacity-50"></div>
      <div className="relative bg-white border-4 border-blue-100 p-6 rounded-full shadow-sm">
        <FontAwesomeIcon icon={faBookOpen} className="text-blue-500 text-4xl" />
      </div>
    </div>

    {/* Textes */}
    <h2 className="text-2xl font-bold text-navy mb-2">Rien à afficher</h2>
    <p className="text-gray-400 max-w-xs mb-8 leading-relaxed">
      Il n'y a pas encore de contenu ici.<br />
      Commencez par explorer les options du menu.
    </p>

    {/* Bouton bleu stylisé */}
    <button 
      onClick={() => {/* Ton action ici, ex: handleFilterChange("Tous") */}}
      className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-10 rounded-xl shadow-lg shadow-blue-200 transition-all active:scale-95"
    >
      Commencer
    </button>
  </div>
)}
        {!loading && (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
            {posts.map((post) => (
              <div
                key={post.id}
                className="bg-white rounded-2xl border border-contact p-5
                              hover:shadow-md transition-shadow group flex flex-col"
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
                  <p className="text-gray-400 text-xs mb-4 line-clamp-2 leading-relaxed">
                    {post.description}
                  </p>
                )}

                <div className="flex items-center justify-between mt-auto pt-3 border-t border-surface">
                  <div className="flex items-center gap-2 min-w-0">
                    <Avatar
                      name={post.author_pseudo || "?"}
                      size="sm"
                      color="bg-navy"
                    />
                    <span className="text-xs text-gray-500 truncate">
                      {post.author_pseudo || "Professeur"}
                    </span>
                  </div>
                  {post.link ? (
                    <a
                      href={post.link}
                      target="_blank"
                      rel="noreferrer"
                      className="text-xs text-gold font-bold hover:underline
                                  flex items-center gap-1 shrink-0 ml-2"
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
                      className="text-xs text-gold font-bold hover:underline
                                  flex items-center gap-1 shrink-0 ml-2"
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
