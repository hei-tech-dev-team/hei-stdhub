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
} from "@fortawesome/free-solid-svg-icons";
import api from "../api/axios";
import { useAuth } from "../context/AuthContext";
import Sidebar from "../components/layout/Sidebar";

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
  const [showAlumniOnly, setShowAlumniOnly] = useState(false);

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

  const mergedItems = showAlumniOnly
    ? alumniSpotlight.map((t) => ({ ...t, source: "tip" }))
    : [
        ...announcements.map((a) => ({ ...a, source: "announcement" })),
        ...alumniSpotlight.map((t) => ({ ...t, source: "tip" })),
      ].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

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
    <div className="flex h-screen bg-surface overflow-hidden">
      <Sidebar />
      <main className="flex-1 flex flex-col lg:overflow-hidden overflow-y-auto">
        {/* Fixed header + filters */}
        <div className="lg:shrink-0 px-4 sm:px-6 lg:px-8 pt-3 sm:pt-4 lg:pt-5 pb-0">
          <div className="max-w-3xl mx-auto w-full">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-9 h-9 rounded-xl bg-navy/10 text-navy flex items-center justify-center">
                <FontAwesomeIcon icon={faNewspaper} className="text-base" />
              </div>
              <div>
                <h1 className="text-lg sm:text-xl font-bold text-navy">STDnews</h1>
                <p className="text-gray-400 text-xs">Annonces et temoignages</p>
              </div>
            </div>

            <div className="flex items-center gap-3 pb-3 border-b border-contact/30 flex-wrap">
              <div className="flex items-center gap-2 text-navy/60">
                <FontAwesomeIcon icon={faFilter} className="text-[10px]" />
                <span className="text-[10px] font-bold uppercase tracking-wider">Filtrer</span>
              </div>
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
          <div className="max-w-3xl mx-auto w-full">
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

            <div className="flex flex-col gap-3">
              {mergedItems.map((item) => (
                <div key={`${item.source}-${item.id}`} className="bg-white rounded-2xl shadow-card overflow-hidden">
                  {item.image_url && (
                    <img
                      src={item.image_url}
                      alt={item.title}
                      className="w-full h-40 sm:h-48 object-cover"
                    />
                  )}
                  <div className="p-4 sm:p-5">
                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                      <h2 className="text-base sm:text-lg font-bold text-navy">{item.title}</h2>
                      {item.source === "tip" ? alumniBadge() : levelBadge(item.target_level)}
                      {item.source === "tip" && (
                        <span className="text-xs text-gray-400">
                          par {item.author_pseudo}
                        </span>
                      )}
                    </div>
                    <p className="text-gray-600 text-sm whitespace-pre-wrap mb-3">{item.content}</p>
                    <div className="flex items-center justify-between gap-4 mb-3">
                      <p className="text-xs text-gray-400">
                        Publie le {formatDate(item.created_at)}
                      </p>
                      {item.source === "tip" && item.author_id === user?.id && (
                        <button
                          onClick={() => handleDeleteTip(item.id)}
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
      </main>
    </div>
  );
}
