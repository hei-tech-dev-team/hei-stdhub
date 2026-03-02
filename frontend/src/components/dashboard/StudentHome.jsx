import { useState, useEffect } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faFilter,
  faSpinner,
  faExternalLinkAlt,
  faDownload,
} from "@fortawesome/free-solid-svg-icons";
import api from "../../api/axios";
import Navbar from "../layout/Navbar";
import Badge from "../ui/Badge";
import Avatar from "../ui/Avatar";
import { useAuth } from "../../context/AuthContext";

const LEVELS = ["Tous", "L1", "L2", "L3"];

const BAR_COLOR = {
  td: "bg-cyan-400",
  examen: "bg-red-500",
  cours: "bg-navy/30",
};

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

  return (
    <div className="flex flex-col h-full">
      <Navbar />
      <div className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto">
        {/* Header + Filtres */}
        <div
          className="flex flex-col sm:flex-row sm:items-center
                        justify-between gap-3 mb-6"
        >
          <div>
            <h1 className="text-lg sm:text-xl font-bold text-navy">
              Contenu disponible
            </h1>
            <p className="text-xs sm:text-sm text-gray-400 mt-0.5">
              {posts.length} élément(s)
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <FontAwesomeIcon
              icon={faFilter}
              className="text-gray-400 text-sm"
            />
            {LEVELS.map((l) => (
              <button
                key={l}
                type="button"
                onClick={() => setFilter(l)}
                className={
                  "px-3 sm:px-4 py-1.5 rounded-full text-xs sm:text-sm " +
                  "font-semibold transition " +
                  (filter === l
                    ? "bg-navy text-white"
                    : "bg-white border border-contact text-navy hover:bg-surface")
                }
              >
                {l}
              </button>
            ))}
          </div>
        </div>

        {/* Spinner */}
        {loading && (
          <div className="flex justify-center py-20">
            <FontAwesomeIcon
              icon={faSpinner}
              className="text-navy text-3xl animate-spin"
            />
          </div>
        )}

        {/* Vide */}
        {!loading && posts.length === 0 && (
          <div className="text-center py-20">
            <p className="text-gray-400 text-sm">Aucun contenu disponible.</p>
          </div>
        )}

        {/* Grille */}
        {!loading && (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3 sm:gap-4">
            {posts.map((post) => (
              <div
                key={post.id}
                className="card hover:shadow-md transition-shadow group"
              >
                <div
                  className={`h-1.5 rounded-full mb-4 ${BAR_COLOR[post.type] || "bg-gray-200"}`}
                />

                <div className="flex items-center gap-2 mb-3 flex-wrap">
                  <Badge type={post.type} />
                  <span className="bg-navy/10 text-navy text-xs font-bold px-3 py-1 rounded-full">
                    {post.ue}
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

                <div
                  className="flex items-center justify-between mt-auto pt-3
                                border-t border-surface"
                >
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
                      className="text-xs text-gold font-semibold hover:underline
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
                      className="text-xs text-gold font-semibold hover:underline
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
