import { useState, useEffect } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faThumbsUp,
  faFaceLaugh,
  faThumbsDown,
  faFaceSadTear,
  faSpinner,
  faNewspaper,
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

export default function STDnewsPage() {
  const { user } = useAuth();
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [reacting, setReacting] = useState({});

  useEffect(() => {
    fetchAnnouncements();
  }, []);

  const fetchAnnouncements = async () => {
    try {
      const { data } = await api.get("/announcements");
      setAnnouncements(data);
    } catch (err) {
      console.error("Erreur lors du chargement des annonces:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleReact = async (announcementId, reactionType) => {
    const key = `${announcementId}-${reactionType}`;
    setReacting((prev) => ({ ...prev, [key]: true }));
    try {
      const ann = announcements.find((a) => a.id === announcementId);
      if (ann.user_reaction === reactionType) {
        await api.delete(`/announcements/${announcementId}/react`);
      } else {
        await api.post(`/announcements/${announcementId}/react`, { reaction_type: reactionType });
      }
      fetchAnnouncements();
    } catch (err) {
      console.error("Erreur lors de la réaction:", err);
    } finally {
      setReacting((prev) => ({ ...prev, [key]: false }));
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

  return (
    <div className="flex min-h-screen bg-surface">
      <Sidebar />
      <main className="flex-1 overflow-y-auto h-screen">
        <div className="max-w-3xl mx-auto p-4 sm:p-6 lg:p-8">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-10 h-10 rounded-xl bg-navy/10 text-navy flex items-center justify-center">
              <FontAwesomeIcon icon={faNewspaper} className="text-lg" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-navy">STDnews</h1>
              <p className="text-gray-400 text-sm">Annonces officielles</p>
            </div>
          </div>

          {loading && (
            <div className="flex justify-center py-16">
              <FontAwesomeIcon icon={faSpinner} className="text-navy text-3xl animate-spin" />
            </div>
          )}

          {!loading && announcements.length === 0 && (
            <div className="text-center py-16">
              <FontAwesomeIcon icon={faNewspaper} className="text-4xl text-gray-300 mb-3" />
              <p className="text-gray-400 text-sm">Aucune annonce pour le moment.</p>
            </div>
          )}

          <div className="flex flex-col gap-4">
            {announcements.map((ann) => (
              <div key={ann.id} className="bg-white rounded-2xl shadow-card overflow-hidden">
                {ann.image_url && (
                  <img
                    src={ann.image_url}
                    alt={ann.title}
                    className="w-full h-48 sm:h-64 object-cover"
                  />
                )}
                <div className="p-5">
                  <h2 className="text-lg font-bold text-navy mb-2">{ann.title}</h2>
                  <p className="text-gray-600 text-sm whitespace-pre-wrap mb-4">{ann.content}</p>
                  <div className="flex items-center justify-between gap-4 mb-4">
                    <p className="text-xs text-gray-400">
                      Publié le {formatDate(ann.created_at)}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap border-t border-surface pt-4">
                    {Object.entries(REACTION_ICONS).map(([type, icon]) => {
                      const count = ann.reactions?.[type] || 0;
                      const isActive = ann.user_reaction === type;
                      const key = `${ann.id}-${type}`;
                      return (
                        <button
                          key={type}
                          onClick={() => handleReact(ann.id, type)}
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
                    })}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
