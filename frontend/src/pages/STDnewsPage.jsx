import { useState, useEffect, useCallback } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faThumbsUp,
  faFaceLaugh,
  faThumbsDown,
  faFaceSadTear,
  faSpinner,
  faNewspaper,
  faFilter,
  faGraduationCap,
  faTrash,
  faSearch,
  faXmark,
  faCalendarDays,
} from "@fortawesome/free-solid-svg-icons";
import api from "../api/axios";
import { useAuth } from "../context/AuthContext";
import Sidebar from "../components/layout/Sidebar";
import Navbar from "../components/layout/Navbar";

const REACTION_ICONS = {
  like: faThumbsUp,
  haha: faFaceLaugh,
  dont_like: faThumbsDown,
  sad: faFaceSadTear,
};

const REACTION_LABELS = {
  like: "J'aime",
  haha: "Haha",
  dont_like: "Je n'aime pas",
  sad: "Triste",
};

const LEVELS = ["Tous", "L1", "L2", "L3"];

export default function STDnewsPage() {
  const { user } = useAuth();
  const [announcements, setAnnouncements] = useState([]);
  const [alumniSpotlight, setAlumniSpotlight] = useState([]);
  const [loading, setLoading] = useState(true);
  const [reacting, setReacting] = useState({});
  const [levelFilter, setLevelFilter] = useState("Tous");
  const [searchQuery, setSearchQuery] = useState("");
  const [showAlumniOnly, setShowAlumniOnly] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [annRes, tipsRes] = await Promise.all([
        api.get("/announcements", { params: levelFilter !== "Tous" ? { level: levelFilter } : {} }),
        api.get("/alumni-spotlight"),
      ]);
      setAnnouncements(annRes.data?.announcements || []);
      setAlumniSpotlight(tipsRes.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [levelFilter]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    if (!selectedItem) return;
    const onKeyDown = (e) => {
      if (e.key === "Escape") setSelectedItem(null);
    };
    document.addEventListener("keydown", onKeyDown);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = "";
    };
  }, [selectedItem]);

  // Keep the modal in sync with fresh data (e.g. after a reaction updates counts)
  useEffect(() => {
    if (!selectedItem) return;
    const items = selectedItem.source === "tip" ? alumniSpotlight : announcements;
    const fresh = items.find((i) => i.id === selectedItem.id);
    if (fresh) setSelectedItem({ ...fresh, source: selectedItem.source });
  }, [announcements, alumniSpotlight]);

  const handleReact = async (id, reactionType, source) => {
    const key = `${source}-${id}-${reactionType}`;
    setReacting((prev) => ({ ...prev, [key]: true }));
    try {
      const endpoint = source === "tip" ? `/alumni-spotlight/${id}/react` : `/announcements/${id}/react`;
      const items = source === "tip" ? alumniSpotlight : announcements;
      const item = items.find((a) => a.id === id);
      if (item.user_reaction === reactionType) {
        await api.delete(endpoint);
      } else {
        await api.post(endpoint, { reaction_type: reactionType });
      }
      fetchData();
    } catch (err) {
      console.error("Erreur lors de la reaction:", err);
    } finally {
      setReacting((prev) => ({ ...prev, [key]: false }));
    }
  };

  const handleDeleteTip = async (id) => {
    try {
      await api.delete(`/alumni-spotlight/${id}`);
      setAlumniSpotlight((prev) => prev.filter((t) => t.id !== id));
    } catch (err) {
      console.error("Erreur lors de la suppression:", err);
    }
  };

  const formatDate = (dateStr) => {
    return new Date(dateStr).toLocaleDateString("fr-FR", {
      day: "numeric",
      month: "long",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const levelBadge = (level) => {
    if (!level) return null;
    const colors = { L1: "bg-cyan-100 text-cyan-700", L2: "bg-emerald-100 text-emerald-700", L3: "bg-amber-100 text-amber-700" };
    return (
      <span className={"text-xs font-bold px-2 py-0.5 rounded-full " + (colors[level] || "bg-gray-100 text-gray-600")}>
        {level}
      </span>
    );
  };

  const alumniBadge = () => (
    <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-gold/20 text-gold border border-gold/30">
      AlumniTip
    </span>
  );

  const CardVisual = ({ item, className = "" }) => {
    if (item.image_url) {
      return (
        <img
          src={item.image_url}
          alt={item.title}
          className={`${className} object-cover`}
        />
      );
    }
    const isTip = item.source === "tip";
    return (
      <div
        className={`${className} bg-gradient-to-br from-navy via-navy-dark to-navy flex items-center justify-center relative overflow-hidden`}
      >
        <div className="absolute -top-8 -right-8 w-28 h-28 bg-gold/10 rounded-full blur-2xl" />
        <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-white/5 rounded-full blur-2xl" />
        <FontAwesomeIcon
          icon={isTip ? faGraduationCap : faNewspaper}
          className="text-white/20 text-4xl sm:text-5xl relative"
        />
      </div>
    );
  };

  const mergedItems = showAlumniOnly
    ? alumniSpotlight.map((t) => ({ ...t, source: "tip" })).filter((t) => searchQuery === "" || t.title.toLowerCase().includes(searchQuery.toLowerCase()) || t.content.toLowerCase().includes(searchQuery.toLowerCase()))
    : [
        ...announcements.map((a) => ({ ...a, source: "announcement" })),
        ...alumniSpotlight.map((t) => ({ ...t, source: "tip" })),
      ].filter((item) => searchQuery === "" || item.title.toLowerCase().includes(searchQuery.toLowerCase()) || item.content.toLowerCase().includes(searchQuery.toLowerCase())).sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

  const renderReactions = (item) => {
    return Object.entries(REACTION_ICONS).map(([type, icon]) => {
      const count = item.reactions?.[type] || 0;
      const isActive = item.user_reaction === type;
      const key = `${item.source}-${item.id}-${type}`;
      return (
        <button
          key={type}
          onClick={() => handleReact(item.id, type, item.source)}
          disabled={reacting[key]}
          className={
            "flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition " +
            (isActive
              ? "bg-navy text-white"
              : "bg-surface text-gray-500 hover:bg-navy/10 hover:text-navy")
          }
        >
          {reacting[key] ? (
            <FontAwesomeIcon icon={faSpinner} className="animate-spin text-xs" />
          ) : (
            <FontAwesomeIcon icon={icon} className="text-sm" />
          )}
          <span>{count > 0 ? count : ""}</span>
          <span className="hidden sm:inline">{REACTION_LABELS[type]}</span>
        </button>
      );
    });
  };

  return (
    <>
    <div className="flex h-screen bg-surface overflow-hidden">
      <Sidebar />
      <main className="flex-1 flex flex-col lg:overflow-hidden overflow-y-auto">
        <Navbar title="STDnews" />
        {/* Fixed header + filters */}
        <div className="overflow-y-auto overflow-x-hidden">
          <div className="relative">
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
              <div className="absolute -top-24 -right-24 w-96 h-96 bg-gold/5 rounded-full blur-3xl" />
              <div className="absolute -bottom-32 -left-32 w-80 h-80 bg-navy/[0.03] rounded-full blur-3xl" />
            </div>
            <div className={`relative transition-all duration-700 ${loading ? "opacity-0 translate-y-6" : "opacity-100 translate-y-0"}`}>
              <div className="bg-gradient-to-br from-navy via-navy-dark to-navy px-4 sm:px-6 lg:px-8 pt-8 pb-10 sm:pt-10 sm:pb-12 lg:pt-12 lg:pb-14">
                <div className="flex items-center gap-4 sm:gap-5">
                  <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-white/10 backdrop-blur-sm flex items-center justify-center shrink-0 ring-1 ring-white/20">
                    <FontAwesomeIcon icon={faNewspaper} className="text-base text-gold text-[1.5rem] sm:text-[1.55rem]" />
                  </div>
                  <div>
                    <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-white tracking-tight">
                      STDnews
                    </h1>
                    <p className="text-sm sm:text-base text-white/60 mt-1 font-medium">
                      Annonces et temoignages
                    </p>
                  </div>
                </div>
                <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-gold/30 to-transparent" />
              </div>
              <div className="px-4 sm:px-6 lg:px-8 -mt-4 sm:-mt-5 pb-6 sm:pb-8">
                <div className="flex flex-col sm:flex-row gap-3">
                  <div className="relative flex-1">
                    <FontAwesomeIcon
                      icon={faSearch}
                      className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 text-sm pointer-events-none"
                    />
                      <input
                        className="w-full bg-white border border-contact/60 rounded-xl pl-10 pr-4 py-3 text-sm text-navy
                        placeholder:text-gray-400 focus:outline-none focus:border-navy/40 focus:ring-2 focus:ring-navy/5
                        transition-all duration-200 shadow-sm"
                        placeholder="Rechercher un mot-clé..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                      />
                  </div>
                  <div className="flex items-center gap-3 pb-3 border-b border-contact/30 flex-wrap">
                    <div className="flex items-center gap-2 flex-wrap">
                      {LEVELS.map((l) => (
                      <button
                        key={l}
                        type="button"
                        onClick={() => { setLevelFilter(l); setShowAlumniOnly(false); }}
                        className={
                          "px-4 py-1.5 rounded-full text-xs font-bold transition " +
                          (levelFilter === l && !showAlumniOnly
                            ? "bg-navy text-white shadow-sm"
                            : "bg-white border border-contact text-navy hover:border-navy")
                        }
                      >
                        {l}
                      </button>
                      ))}
                      <button
                        type="button"
                        onClick={() => setShowAlumniOnly((v) => { if (!v) setLevelFilter("Tous"); return !v; })}
                        className={
                          "flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-bold transition " +
                          (showAlumniOnly
                            ? "bg-gold text-navy shadow-sm"
                            : "bg-white border border-contact text-navy hover:border-gold")
                        }
                      >
                        <FontAwesomeIcon icon={faGraduationCap} className="text-[10px]" />
                        AlumniSpotlight
                      </button>
                    </div>
                  </div>
                </div>
              </div>
              {/* Scrollable list */}
              <div className="lg:flex-1 lg:overflow-y-auto px-4 sm:px-6 lg:px-8 py-3 sm:py-4">
                <div className="w-full">
                  {loading && (
                    <div className="flex justify-center py-16">
                      <FontAwesomeIcon icon={faSpinner} className="text-navy text-3xl animate-spin" />
                    </div>
                  )}

                  {!loading && mergedItems.length === 0 && (
                    <div className="text-center py-16">
                      <FontAwesomeIcon icon={showAlumniOnly ? faGraduationCap : faNewspaper} className="text-4xl text-gray-300 mb-3" />
                      <p className="text-gray-400 text-sm">
                        {showAlumniOnly
                          ? "Aucun temoignage alumni pour le moment."
                          : levelFilter === "Tous"
                            ? "Aucune annonce pour le moment."
                            : `Aucune annonce pour le niveau ${levelFilter}.`}
                      </p>
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 w-full h-auto">
                    {mergedItems.map((item) => (
                      <div key={`${item.source}-${item.id}`} className="bg-white rounded-2xl shadow-card overflow-hidden relative flex flex-col">
                        <button
                          type="button"
                          onClick={() => setSelectedItem(item)}
                          className="text-left group"
                        >
                          <div className="overflow-hidden">
                            <CardVisual
                              item={item}
                              className="w-full h-40 sm:h-48 transition-transform duration-300 group-hover:scale-[1.03]"
                            />
                          </div>
                          <div className="px-4 sm:px-5 pt-4 sm:pt-5">
                            <div className="flex items-center gap-2 mb-2 flex-wrap">
                              <h2 className="text-base sm:text-lg font-bold text-navy group-hover:text-gold transition-colors">
                                {item.title}
                              </h2>
                              {item.source === "tip" ? alumniBadge() : levelBadge(item.target_level)}
                              {item.source === "tip" && (
                                <span className="text-xs text-gray-400">
                                  par {item.author_pseudo}
                                </span>
                              )}
                            </div>
                            <p className="text-gray-600 lg:h-[2.75rem] overflow-hidden text-sm whitespace-pre-wrap break-words mb-1 line-clamp-2">
                              {item.content}
                            </p>
                            <span className="text-xs font-bold text-gold group-hover:underline">
                              Lire la suite
                            </span>
                          </div>
                        </button>

                        <div className="px-4 sm:px-5 pb-4 sm:pb-5">
                          <div className="flex items-center justify-between gap-4 mb-3 mt-2">
                            <p className="text-xs text-gray-400">
                              Publie le {formatDate(item.created_at)}
                            </p>
                            {item.source === "tip" && item.author_id === user?.id && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteTip(item.id);
                                }}
                                className="text-xs text-red-400 hover:text-red-600 transition flex items-center gap-1"
                              >
                                <FontAwesomeIcon icon={faTrash} /> Supprimer
                              </button>
                            )}
                          </div>

                          <div className="flex items-center gap-2 flex-wrap border-t border-surface pt-3">
                            {renderReactions(item)}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>

    {selectedItem && (
      <div
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-navy/40 backdrop-blur-sm"
        onClick={() => setSelectedItem(null)}
      >
        <div
          className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[85vh] overflow-y-auto overflow-x-hidden relative"
          onClick={(e) => e.stopPropagation()}
        >
          <button
            type="button"
            onClick={() => setSelectedItem(null)}
            className="absolute top-3 right-3 w-9 h-9 rounded-full bg-white/90 backdrop-blur-sm shadow-sm text-navy flex items-center justify-center hover:bg-white hover:scale-105 active:scale-95 transition-all z-10"
            title="Fermer"
          >
            <FontAwesomeIcon icon={faXmark} />
          </button>

          <CardVisual
            item={selectedItem}
            className="w-full h-48 sm:h-64 rounded-t-2xl"
          />

          <div className="p-5 sm:p-7">
            <div className="flex items-center gap-2 mb-3 flex-wrap">
              {selectedItem.source === "tip" ? alumniBadge() : levelBadge(selectedItem.target_level)}
              {selectedItem.source === "tip" && (
                <span className="text-xs text-gray-400">par {selectedItem.author_pseudo}</span>
              )}
            </div>

            <h2 className="text-xl sm:text-2xl font-bold text-navy mb-2">{selectedItem.title}</h2>

            <p className="text-xs text-gray-400 flex items-center gap-1.5 mb-5">
              <FontAwesomeIcon icon={faCalendarDays} />
              Publié le {formatDate(selectedItem.created_at)}
            </p>

            <p className="text-gray-700 text-sm sm:text-base leading-relaxed whitespace-pre-wrap break-words mb-6">
              {selectedItem.content}
            </p>

            <div className="flex items-center justify-between gap-4 border-t border-surface pt-4">
              <div className="flex items-center gap-2 flex-wrap">
                {renderReactions(selectedItem)}
              </div>
              {selectedItem.source === "tip" && selectedItem.author_id === user?.id && (
                <button
                  onClick={() => {
                    handleDeleteTip(selectedItem.id);
                    setSelectedItem(null);
                  }}
                  className="text-xs text-red-400 hover:text-red-600 transition flex items-center gap-1 shrink-0"
                >
                  <FontAwesomeIcon icon={faTrash} /> Supprimer
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    )}
    </>
  );
}