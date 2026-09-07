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
  faUsers,
  faChevronLeft,
  faChevronRight,
} from "@fortawesome/free-solid-svg-icons";
import { ImagePlus, Trash } from "lucide-react";
import api from "../../api/axios";
import Navbar from "../layout/Navbar";
import { Swiper, SwiperSlide } from "swiper/react";
import { Pagination, Navigation } from "swiper/modules";
import "swiper/css";
import "swiper/css/pagination";
import "swiper/css/navigation";

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

export default function AdminHome() {
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [images, setImages] = useState([]);
  const [targetLevel, setTargetLevel] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [activeSlide, setActiveSlide] = useState(0);
  useEffect(() => {
    fetchAnnouncements();
  }, []);

  const fetchAnnouncements = async () => {
    try {
      const { data } = await api.get("/announcements");
      setAnnouncements(data.announcements || []);
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
      await api.post("/announcements", {
        title: title.trim(),
        content: content.trim(),
        target_level: targetLevel || null,
      });
      setTitle("");
      setContent("");
      setImages([]);
      setTargetLevel("");
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
        await api.post(`/announcements/${announcementId}/react`, {
          reaction_type: reactionType,
        });
      }
      fetchAnnouncements();
    } catch (err) {
      console.error(err);
    }
  };

  const levelBadge = (level) => {
    if (!level) return null;
    const colors = {
      L1: "bg-cyan-100 text-cyan-700",
      L2: "bg-emerald-100 text-emerald-700",
      L3: "bg-amber-100 text-amber-700",
    };
    return (
      <span
        className={
          "text-xs font-bold px-2 py-0.5 rounded-full " +
          (colors[level] || "bg-gray-100 text-gray-600")
        }
      >
        {level}
      </span>
    );
  };

  return (
    <div className="flex flex-col h-full">
      <Navbar />
      <div className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto">
        <div className="max-w-3xl mx-auto">
          {/* Hero */}
          <div className="bg-gradient-to-br from-navy to-navy-dark rounded-2xl p-6 sm:p-8 mb-6 text-white relative overflow-hidden">
            <div className="absolute -top-10 -right-10 w-40 h-40 bg-gold/10 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute -bottom-12 -left-12 w-32 h-32 bg-white/5 rounded-full blur-3xl pointer-events-none" />
            <div className="flex items-center gap-4 relative">
              <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-white/10 backdrop-blur-sm ring-1 ring-white/20 flex items-center justify-center shrink-0">
                <FontAwesomeIcon
                  icon={faNewspaper}
                  className="text-gold text-xl sm:text-2xl"
                />
              </div>
              <div>
                <h1 className="text-xl sm:text-2xl font-bold">STDnews</h1>
                <p className="text-white/60 text-sm mt-0.5">
                  Publier et gérer les annonces
                </p>
              </div>
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
                <h2 className="font-bold text-navy text-base">
                  Nouvelle annonce
                </h2>
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
                <input
                  type="file"
                  className="hidden"
                  id="fileInput"
                  accept="image/jpeg, image/png"
                  multiple
                  onChange={(e) => {
                    setImages((currentImages) => [
                      ...currentImages,
                      ...Array.from(e.target.files),
                    ]);
                  }}
                />
                <label
                  htmlFor="fileInput"
                  className="text-xs font-bold mb-2 tracking-wide"
                >
                  {images.length > 0 ? (
                    <span className="flex w-fit items-center px-2 py-1.5 border rounded-full transition bg-white text-navy shadow-sm hover:border-navy">
                      <ImagePlus className="mr-1" />
                      Ajouter des images ({images.length} sélectionnées)
                    </span>
                  ) : (
                    <span className="flex w-fit items-center px-2 py-1.5 border rounded-full transition bg-white text-navy shadow-sm hover:border-navy">
                      <ImagePlus className="mr-1" />
                      Ajouter des images (optionnel)
                    </span>
                  )}
                </label>
                {images.length === 1 ? (
                  <div className="rounded-xl flex justify-center items-center overflow-hidden">
                    <img
                      src={URL.createObjectURL(images[0])}
                      alt={images[0].name}
                      className="max-w-full max-h-96"
                    />
                  </div>
                ) : images.length > 1 ? (
                  <div className="relative">
                    <button
                      className="custom-prev\ absolute left-2 top-1/2 z-10 -translate-y-1/2 flex h-9 w-9 items-center justify-center rounded-full opacity-10 bg-white/90 text-navy transition hover:bg-white hover:opacity-80"
                      aria-label="Previous image"
                      type="button"
                    >
                      <FontAwesomeIcon icon={faChevronLeft} />
                    </button>

                    <Swiper
                      slidesPerView={1}
                      spaceBetween={30}
                      modules={[Pagination, Navigation]}
                      pagination={{ clickable: true }}
                      navigation={{
                        prevEl: ".custom-prev",
                        nextEl: ".custom-next",
                      }}
                      loop={true}
                      onSlideChange={(slide) => setActiveSlide(slide.realIndex)}
                      className="h-96 rounded-xl overflow-hidden"
                    >
                      {images.map((image) => (
                        <SwiperSlide
                          key={image.name}
                          className="flex !h-full justify-center items-center overflow-hidden bg-navy"
                        >
                          <img
                            src={URL.createObjectURL(image)}
                            alt={image.name}
                            className="max-w-full h-full block object-contain mx-auto"
                          />
                        </SwiperSlide>
                      ))}
                    </Swiper>

                    <button
                      className="custom-next absolute right-2 top-1/2 z-10 -translate-y-1/2 flex h-9 w-9 items-center justify-center rounded-full opacity-10 bg-white/90 text-navy transition hover:bg-white hover:opacity-80"
                      aria-label="Next image"
                      type="button"
                    >
                      <FontAwesomeIcon icon={faChevronRight} />
                    </button>
                  </div>
                ) : null}
                {images.length > 0 && (
                  <button
                    className="flex w-fit items-center shadow-sm border rounded-full bg-white text-navy transition hover:bg-navy hover:text-white text-sm font-bold px-2 py-1.5 self-end"
                    aria-label="Delete image"
                    type="button"
                    onClick={() =>
                      images.length > 1
                        ? setImages(
                            images.filter((_, index) => index !== activeSlide),
                          )
                        : setImages([])
                    }
                  >
                    <Trash className="cursor-pointer" />
                    Retirer cette image
                  </button>
                )}
                {/* Level selector */}
                <div>
                  <p className="text-xs font-bold text-gray-500 mb-2 uppercase tracking-wide">
                    <FontAwesomeIcon icon={faUsers} className="mr-1" />
                    Visible par
                  </p>
                  <div className="flex gap-2">
                    {LEVELS.map((l) => (
                      <button
                        key={l}
                        type="button"
                        onClick={() => setTargetLevel(l === "Tous" ? "" : l)}
                        className={
                          "px-4 py-1.5 rounded-full text-xs font-bold transition " +
                          ((l === "Tous" && !targetLevel) || targetLevel === l
                            ? "bg-navy text-white shadow-sm"
                            : "bg-white border border-contact text-navy hover:border-navy")
                        }
                      >
                        {l === "Tous" ? "Tout le monde" : l}
                      </button>
                    ))}
                  </div>
                </div>

                <button
                  onClick={handlePublish}
                  disabled={submitting || !title.trim() || !content.trim()}
                  className="btn-primary self-end flex items-center gap-2 disabled:opacity-60"
                >
                  {submitting ? (
                    <FontAwesomeIcon
                      icon={faSpinner}
                      className="animate-spin"
                    />
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
              <FontAwesomeIcon
                icon={faSpinner}
                className="text-navy text-2xl animate-spin"
              />
            </div>
          )}

          {!loading && announcements.length === 0 && (
            <div className="text-center py-16">
              <FontAwesomeIcon
                icon={faNewspaper}
                className="text-4xl text-gray-300 mb-3"
              />
              <p className="text-gray-400 text-sm">
                Aucune annonce pour le moment.
              </p>
            </div>
          )}

          <div className="flex flex-col gap-4">
            {announcements.map((ann) => (
              <div
                key={ann.id}
                className="bg-white rounded-2xl shadow-card overflow-hidden"
              >
                <div className="p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2 flex-wrap">
                        <h2 className="text-lg font-bold text-navy">
                          {ann.title}
                        </h2>
                        {levelBadge(ann.target_level)}
                      </div>
                      <p className="text-gray-600 text-sm whitespace-pre-wrap mb-4">
                        {ann.content}
                      </p>
                      <p className="text-xs text-gray-400">
                        Publié le{" "}
                        {new Date(ann.created_at).toLocaleDateString("fr-FR", {
                          day: "numeric",
                          month: "long",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
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
                          <span className="hidden sm:inline">
                            {REACTION_LABELS[type]}
                          </span>
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
