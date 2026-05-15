import { useState, useEffect, useMemo } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faSpinner,
  faExternalLinkAlt,
  faDownload,
  faBookOpen,
  faSearch,
  faLayerGroup,
  faClipboardList,
  faFileCircleCheck,
} from "@fortawesome/free-solid-svg-icons";
import api from "../../api/axios";
import Navbar from "../layout/Navbar";
import Badge from "../ui/Badge";
import UserAvatar from "../ui/UserAvatar";
import { useAuth } from "../../context/AuthContext";

const LEVELS = ["Tous", "L1", "L2", "L3"];
const TYPES = [
  { value: "Tous", label: "Tous", icon: faLayerGroup },
  { value: "cours", label: "Cours", icon: faBookOpen },
  { value: "td", label: "TD", icon: faClipboardList },
  { value: "examen", label: "Examens", icon: faFileCircleCheck },
];

const TYPE_ICON = {
  cours: faBookOpen,
  td: faClipboardList,
  examen: faFileCircleCheck,
};

export default function StudentHome() {
  const { user } = useAuth();
  const [posts, setPosts] = useState([]);
  const [filter, setFilter] = useState(user?.level || "Tous");
  const [typeFilter, setTypeFilter] = useState("Tous");
  const [search, setSearch] = useState("");
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

  const visiblePosts = useMemo(() => {
    const q = search.trim().toLowerCase();
    return posts.filter((post) => {
      const matchesType =
        typeFilter === "Tous" || post.type?.toLowerCase() === typeFilter;
      const haystack = [
        post.title,
        post.description,
        post.ue,
        post.author_pseudo,
        post.type,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return matchesType && (!q || haystack.includes(q));
    });
  }, [posts, search, typeFilter]);

  return (
    <div className="flex flex-col h-full">
      <Navbar />
      <div className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto">
        <div className="flex flex-col xl:flex-row xl:items-end justify-between gap-4 mb-6">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-navy">
              Bonjour, {user?.prenom}
            </h1>
            <p className="text-sm text-gray-400 mt-0.5">
              {visiblePosts.length} contenu(s) affiché(s) sur {posts.length}
            </p>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
            <div className="relative min-w-0 sm:w-64">
              <FontAwesomeIcon
                icon={faSearch}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-300 text-xs"
              />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Rechercher un cours, une UE..."
                className="w-full rounded-lg border border-contact bg-white pl-9 pr-3 py-2 text-sm text-navy placeholder:text-gray-300 focus:outline-none focus:border-gold"
              />
            </div>

            <div className="inline-flex bg-white border border-contact rounded-lg p-1 w-fit">
              {LEVELS.map((l) => (
                <button
                  key={l}
                  type="button"
                  onClick={() => handleFilterChange(l)}
                  className={
                    "px-3 py-1.5 rounded-md text-xs font-bold transition " +
                    (filter === l
                      ? "bg-navy text-white"
                      : "text-navy hover:bg-surface")
                  }
                >
                  {l}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-2 mb-4">
          {TYPES.map((type) => (
            <button
              key={type.value}
              type="button"
              onClick={() => setTypeFilter(type.value)}
              className={
                "inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-xs font-bold whitespace-nowrap transition " +
                (typeFilter === type.value
                  ? "bg-navy text-white border-navy"
                  : "bg-white text-navy border-contact hover:border-gold")
              }
            >
              <FontAwesomeIcon icon={type.icon} className="text-xs" />
              {type.label}
            </button>
          ))}
        </div>

        {loading && (
          <div className="flex justify-center py-20">
            <FontAwesomeIcon
              icon={faSpinner}
              className="text-navy text-3xl animate-spin"
            />
          </div>
        )}

        {!loading && visiblePosts.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="mb-5 bg-white border border-contact p-5 rounded-xl">
              <FontAwesomeIcon icon={faBookOpen} className="text-gold text-3xl" />
            </div>
            <h2 className="text-xl font-bold text-navy mb-2">
              Rien à afficher
            </h2>
            <p className="text-gray-400 max-w-sm leading-relaxed text-sm">
              Aucun contenu ne correspond à ces filtres. Les professeurs publieront bientôt des cours, TD et examens ici.
            </p>
          </div>
        )}

        {!loading && visiblePosts.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
            {visiblePosts.map((post) => (
              <div
                key={post.id}
                className="bg-white rounded-lg border border-contact/70 p-5
                              hover:border-gold/40 transition-all duration-200 group flex flex-col"
              >
                <div className="flex items-center gap-2 mb-3 flex-wrap">
                  <Badge type={post.type} />
                  <span className="w-7 h-7 rounded-lg bg-surface text-navy flex items-center justify-center">
                    <FontAwesomeIcon
                      icon={TYPE_ICON[post.type?.toLowerCase()] || faLayerGroup}
                      className="text-xs"
                    />
                  </span>
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
                    <UserAvatar
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
