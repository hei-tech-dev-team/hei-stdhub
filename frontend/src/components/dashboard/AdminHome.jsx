import { useState, useEffect } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faNewspaper,
  faSpinner,
  faTrash,
  faThumbsUp,
  faFaceLaugh,
  faThumbsDown,
  faFaceSadTear,
  faPaperPlane,
} from "@fortawesome/free-solid-svg-icons";
import api from "../../api/axios";
import Navbar from "../layout/Navbar";
import { useAuth } from "../../context/AuthContext";

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

export default function AdminHome() {
  const { user } = useAuth();
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    fetchAnnouncements();
  }, []);

  const fetchAnnouncements = async () => {
    try {
      const { data } = await api.get("/announcements");
      setAnnouncements(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handlePublish = async () => {
    if (!title.trim() || !content.trim()) return;
    setSubmitting(true);
    try {
      await api.post("/announcements", { title: title.trim(), content: content.trim() });
      setTitle("");
      setContent("");
      setShowForm(false);
      fetchAnnouncements();
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm("Supprimer cette annonce ?")) return;
    try {
      await api.delete(`/announcements/${id}`);
      fetchAnnouncements();
    } catch (err) {
      console.error(err);
    }
  };

  const handleReact = async (announcementId, reactionType) => {
    try {
      const ann = announcements.find((a) => a.id === announcementId);
      if (ann.user_reaction === reactionType) {
        await api.delete(`/announcements/${announcementId}/react`);
      } else {
        await api.post(`/announcements/${announcementId}/react`, { reaction_type: reactionType });
      }
      fetchAnnouncements();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="flex flex-col h-full">
      <Navbar />
      <div className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto">
        <div className="max-w-3xl mx-auto">
          {/* Header */}
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-navy/10 text-navy flex items-center justify-center">
              <FontAwesomeIcon icon={faNewspaper} className="text-lg" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-navy">STDnews</h1>
              <p className="text-sm text-gray-400">Publier et gérer les annonces</p>
            </div>
          </div>

          {/* Publish button / form */}
          {!showForm ? (
            <button
              onClick={() => setShowForm(true)}
              className="w-full mb-6 py-4 rounded-2xl border-2 border-dashed border-contact text-gray-400 hover:border-navy hover:text-navy transition-all font-bold text-sm flex items-center justify-center gap-2"
            >
              <FontAwesomeIcon icon={faNewspaper} />
              Nouvelle annonce
            </button>
          ) : (
            <div className="bg-white rounded-2xl shadow-card p-5 mb-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-bold text-navy text-base">Nouvelle annonce</h2>
                <button
                  onClick={() => setShowForm(false)}
                  className="text-gray-400 hover:text-navy transition text-sm font-bold"
                >
                  Annuler
                </button>
              </div>
              <div className="flex flex-col gap-3">
                <input
                  className="input-field"
                  placeholder="Titre de l'annonce"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                />
                <textarea
                  className="input-field min-h-[120px] resize-y"
                  placeholder="Contenu de l'annonce..."
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                />
                <button
                  onClick={handlePublish}
                  disabled={submitting || !title.trim() || !content.trim()}
                  className="btn-primary self-end flex items-center gap-2 disabled:opacity-60"
                >
                  {submitting ? (
                    <FontAwesomeIcon icon={faSpinner} className="animate-spin" />
                  ) : (
                    <FontAwesomeIcon icon={faPaperPlane} />
                  )}
                  Publier
                </button>
              </div>
            </div>
          )}

          {/* Announcements list */}
          {loading && (
            <div className="flex justify-center py-12">
              <FontAwesomeIcon icon={faSpinner} className="text-navy text-2xl animate-spin" />
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
                <div className="p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <h2 className="text-lg font-bold text-navy mb-2">{ann.title}</h2>
                      <p className="text-gray-600 text-sm whitespace-pre-wrap mb-4">{ann.content}</p>
                      <p className="text-xs text-gray-400">
                        Publié le {new Date(ann.created_at).toLocaleDateString("fr-FR", {
                          day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit",
                        })}
                      </p>
                    </div>
                    <button
                      onClick={() => handleDelete(ann.id)}
                      className="text-red-400 hover:text-red-600 transition shrink-0"
                    >
                      <FontAwesomeIcon icon={faTrash} />
                    </button>
                  </div>

                  {/* Reactions */}
                  <div className="flex items-center gap-2 flex-wrap border-t border-surface pt-4 mt-4">
                    {Object.entries(REACTION_ICONS).map(([type, icon]) => {
                      const count = ann.reactions?.[type] || 0;
                      const isActive = ann.user_reaction === type;
                      return (
                        <button
                          key={type}
                          onClick={() => handleReact(ann.id, type)}
                          className={
                            "flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition " +
                            (isActive
                              ? "bg-navy text-white"
                              : "bg-surface text-gray-500 hover:bg-navy/10 hover:text-navy")
                          }
                        >
                          <FontAwesomeIcon icon={icon} className="text-sm" />
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
      </div>
    </div>
  );
}
