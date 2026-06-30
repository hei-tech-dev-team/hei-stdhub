import { useState, useEffect, useMemo } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faExternalLinkAlt,
  faDownload,
  faBookOpen,
  faSearch,
  faFilter,
  faSortAmountDown,
  faSortAmountUp,
  faTimes,
} from "@fortawesome/free-solid-svg-icons";
import api from "../../api/axios";
import Navbar from "../layout/Navbar";
import Badge from "../ui/Badge";
import Avatar from "../ui/Avatar";
import { useAuth } from "../../context/AuthContext";

const SkeletonPostCard = () => (
  <div className="bg-white rounded-2xl border border-contact/60 p-5 animate-pulse">
    <div className="flex items-center gap-2 mb-3 flex-wrap">
      <div className="h-5 w-16 bg-gray-200 rounded-full"></div>
      <div className="h-5 w-12 bg-gray-200 rounded-full"></div>
      <div className="ml-auto h-4 w-20 bg-gray-200 rounded"></div>
    </div>

    <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
    <div className="h-3 bg-gray-200 rounded w-full mb-1"></div>
    <div className="h-3 bg-gray-200 rounded w-5/6 mb-4"></div>

    <div className="flex items-center justify-between mt-auto pt-3 border-t border-surface/80">
      <div className="flex items-center gap-2 min-w-0">
        <div className="w-7 h-7 rounded-full bg-gray-200"></div>
        <div className="h-3 bg-gray-200 rounded w-24"></div>
      </div>
      <div className="h-6 w-20 bg-gray-200 rounded-full"></div>
    </div>
  </div>
);

const EmptyStateAnimation = () => (
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
);

const LEVELS = ["Tous", "L1", "L2", "L3"];
const TYPES = ["Tous", "Cours", "TD", "Examen"];

export default function StudentHome() {
  const { user } = useAuth();
  const [posts, setPosts] = useState([]);
  const [filter, setFilter] = useState(user?.level || "Tous");
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("Tous");
  const [ueFilter, setUeFilter] = useState("Tous");
  const [sortOrder, setSortOrder] = useState("desc");
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

  const uniqueUEs = useMemo(() => {
    const ues = posts.map((p) => p.ue).filter(Boolean);
    return ["Tous", ...new Set(ues)].sort();
  }, [posts]);

  const filteredPosts = useMemo(() => {
    let result = [...posts];

    // Recherche textuelle
    const q = search.toLowerCase().trim();
    if (q) {
      result = result.filter(
        (p) =>
          (p.title || "").toLowerCase().includes(q) ||
          (p.ue || "").toLowerCase().includes(q) ||
          (p.description || "").toLowerCase().includes(q)
      );
    }

    // Filtre par Type
    if (typeFilter !== "Tous") {
      result = result.filter((p) => p.type?.toLowerCase() === typeFilter.toLowerCase());
    }

    if (ueFilter !== "Tous" && uniqueUEs.includes(ueFilter)) {
      result = result.filter((p) => p.ue === ueFilter);
    }

    
    result.sort((a, b) => {
      const dateA = new Date(a.created_at);
      const dateB = new Date(b.created_at);
      return sortOrder === "desc" ? dateB - dateA : dateA - dateB;
    });

    return result;
  }, [posts, search, typeFilter, ueFilter, sortOrder, uniqueUEs]);

  return (
    <div className="flex flex-col h-screen overflow-y-hidden">
      <Navbar />
      <div className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto custom-scrollbar">
        {/* Header */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-navy">
              Bonjour, {user?.prenom}
            </h1>
            <p className="text-sm text-gray-400 mt-0.5">
              {filteredPosts.length} contenu(s) disponible(s)
            </p>
          </div>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <div className="relative">
              <FontAwesomeIcon
                icon={faSearch}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs pointer-events-none"
              />
              <input
                type="text"
                placeholder="Rechercher un cours, une UE..."
                className="w-full sm:w-64 bg-white border border-contact rounded-full pl-9 pr-4 py-2 text-xs focus:outline-none focus:border-navy transition-all shadow-sm"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <div className="flex items-center gap-2">
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
        </div>

        {/* Filtres Avancés & Tri */}
        <div className="flex flex-wrap items-center gap-3 py-3 mb-6 border-y border-contact/30">
          <div className="flex items-center gap-2 text-navy/60">
            <FontAwesomeIcon icon={faFilter} className="text-[10px]" />
            <span className="text-[10px] font-bold uppercase">Filtres</span>
          </div>

          <select
            className="bg-white border border-contact rounded-lg px-2 py-1 text-xs focus:outline-none focus:border-navy cursor-pointer"
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
          >
            {TYPES.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>

          <div className="relative flex items-center">
            <input
              list="ue-list"
              className="bg-white border border-contact rounded-lg pl-2 pr-7 py-1 text-xs focus:outline-none focus:border-navy w-32 outline-none"
              placeholder="UE..."
              value={ueFilter === "Tous" ? "" : ueFilter}
              onChange={(e) => setUeFilter(e.target.value || "Tous")}
            />
            <datalist id="ue-list">
              {uniqueUEs.filter(u => u !== "Tous").map((ue) => (
                <option key={ue} value={ue} />
              ))}
            </datalist>
            {ueFilter !== "Tous" && (
              <button
                type="button"
                onClick={() => setUeFilter("Tous")}
                className="absolute right-1.5 text-gray-300 hover:text-red-500 transition-colors"
              >
                <FontAwesomeIcon icon={faTimes} className="text-[10px]" />
              </button>
            )}
          </div>

          <div className="sm:ml-auto flex items-center gap-2">
            <button
              onClick={() => setSortOrder(sortOrder === "desc" ? "asc" : "desc")}
              className="flex items-center gap-1.5 bg-navy/5 hover:bg-navy/10 text-navy px-2.5 py-1 rounded-lg transition-all text-xs font-medium"
            >
              <FontAwesomeIcon icon={sortOrder === "desc" ? faSortAmountDown : faSortAmountUp} className="text-[10px]" />
              <span>{sortOrder === "desc" ? "Plus récents" : "Plus anciens"}</span>
            </button>
          </div>
        </div>

        {loading && (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
            {[...Array(6)].map((_, i) => (
              <SkeletonPostCard key={i} />
            ))}
          </div>
        )}
        {!loading && posts.length === 0 && <EmptyStateAnimation />}

        {!loading && posts.length > 0 && filteredPosts.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 text-center text-gray-400">
            <FontAwesomeIcon icon={faSearch} className="text-5xl mb-4 opacity-20" />
            <p className="text-lg font-medium">Aucun résultat pour &quot;{search}&quot;</p>
          </div>
        )}

        {!loading && filteredPosts.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
            {filteredPosts.map((post) => (
              <div
                key={post.id}
                className="bg-white rounded-2xl border border-contact/60 p-5
                              hover:shadow-[0_20px_50px_rgba(0,0,0,0.05),0_0_20px_rgba(212,175,55,0.15)] hover:border-gold/40 hover:-translate-y-1.5
                              transition-all duration-500 group flex flex-col cursor-pointer"
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