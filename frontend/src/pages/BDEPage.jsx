import { useState, useEffect, useRef, useCallback } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faInbox,
  faCheckCircle,
  faComments,
  faTimesCircle,
  faSpinner,
  faFilePdf,
} from "@fortawesome/free-solid-svg-icons";
import api from "../api/axios";
import Navbar from "../components/layout/Navbar";
import Sidebar from "../components/layout/Sidebar";
import jsPDF from "jspdf";
import { getSocket } from "../socket";
import { HEI_BLUE_LOGO } from "../assets/logos";

const COLUMNS = [
  {
    id: "recu",
    label: "Reçu",
    icon: faInbox,
    color: "text-blue-500",
    bg: "bg-blue-50",
    border: "border-blue-200",
    dot: "bg-blue-400",
    cardBorder: "border-l-blue-400",
  },
  {
    id: "accepte",
    label: "Accepté",
    icon: faCheckCircle,
    color: "text-emerald-500",
    bg: "bg-emerald-50",
    border: "border-emerald-200",
    dot: "bg-emerald-400",
    cardBorder: "border-l-emerald-400",
  },
  {
    id: "a_discuter",
    label: "À discuter",
    icon: faComments,
    color: "text-amber-500",
    bg: "bg-amber-50",
    border: "border-amber-200",
    dot: "bg-amber-400",
    cardBorder: "border-l-amber-400",
  },
  {
    id: "refuse",
    label: "Refusé",
    icon: faTimesCircle,
    color: "text-red-500",
    bg: "bg-red-50",
    border: "border-red-200",
    dot: "bg-red-400",
    cardBorder: "border-l-red-400",
  },
];

const NAVY = [0, 25, 72];
const GOLD = [223, 164, 8];
const GOLD_LIGHT = [242, 201, 76];
const WHITE = [255, 255, 255];
const GREEN = [16, 185, 129];
const AMBER = [245, 158, 11];
const RED = [239, 68, 68];
const GRAY = [100, 116, 139];
const SURFACE = [242, 244, 248];

const generatePDF = (suggestions) => {
  const doc = new jsPDF();
  const date = new Date().toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });
  const year = new Date().getFullYear();
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 20;
  const contentW = pageW - margin * 2;

  const acceptes = suggestions.filter((s) => s.statut === "accepte");
  const aDiscuter = suggestions.filter((s) => s.statut === "a_discuter");
  const refuses = suggestions.filter((s) => s.statut === "refuse");
  const total = suggestions.length;

  const addFooter = (pageNum, totalPages) => {
    doc.setPage(pageNum);
    doc.setDrawColor(210, 215, 225);
    doc.setLineWidth(0.5);
    doc.line(margin, pageH - 16, pageW - margin, pageH - 16);
    doc.setTextColor(140, 150, 170);
    doc.setFontSize(7);
    doc.setFont("helvetica", "normal");
    doc.text(`Haute Ecole d'Informatique-HEI hei.school, BDE Bureau Des Etudiants — ${year}`, margin, pageH - 6);
    doc.text(`Page ${pageNum}/${totalPages}`, pageW - margin, pageH - 6, { align: "right" });
  };

  const checkPage = (y, needed = 30) => {
    if (y + needed > pageH - 24) {
      doc.addPage();
      return margin + 15;
    }
    return y;
  };

  let y = margin + 15;

  // ═══════════════════════════════════
  // HEADER — clean, minimal
  // ═══════════════════════════════════
  doc.setFillColor(...NAVY);
  doc.rect(0, 0, pageW, 50, "F");

  // School logo
  try {
    doc.addImage(HEI_BLUE_LOGO, "PNG", margin + 3, 8, 14, 14);
  } catch (_) {
    // fallback: simple icon
    doc.setFillColor(...GOLD);
    doc.circle(margin + 10, 15, 7, "F");
    doc.setTextColor(...NAVY);
    doc.setFontSize(8);
    doc.setFont("helvetica", "bold");
    doc.text("HEI", margin + 10, 17, { align: "center" });
  }

  doc.setTextColor(...GOLD);
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.text("HEI STDhub", margin + 22, 13);

  doc.setTextColor(...WHITE);
  doc.setFontSize(22);
  doc.setFont("helvetica", "bold");
  doc.text("Rapport BDE", margin, 34);

  doc.setFontSize(9);
  doc.setTextColor(...GOLD_LIGHT);
  doc.text(String(year), margin, 44);

  doc.setFontSize(7);
  doc.setTextColor(160, 180, 210);
  doc.text(date, pageW - margin, 13, { align: "right" });
  doc.text(`Ref: BDE-${year}`, pageW - margin, 22, { align: "right" });

  y = 62;

  // ═══════════════════════════════════
  // INTRO
  // ═══════════════════════════════════
  doc.setTextColor(...NAVY);
  doc.setFontSize(13);
  doc.setFont("helvetica", "bold");
  doc.text("Synthèse des suggestions", margin, y);
  y += 2;
  doc.setDrawColor(...GOLD);
  doc.setLineWidth(0.6);
  doc.line(margin, y, margin + 45, y);
  y += 8;

  doc.setTextColor(...GRAY);
  doc.setFontSize(8.5);
  doc.setFont("helvetica", "normal");
  const introText = "Ce rapport présente les suggestions reçues par le Bureau Des Étudiants. Chaque proposition a été examinée et classée selon son statut.";
  const introLines = doc.splitTextToSize(introText, contentW);
  doc.text(introLines, margin, y);
  y += introLines.length * 4.5 + 8;

  // ═══════════════════════════════════
  // STATISTIQUES
  // ═══════════════════════════════════
  doc.setTextColor(...NAVY);
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.text("Statistiques", margin, y);
  y += 2;
  doc.setDrawColor(...GOLD);
  doc.setLineWidth(0.5);
  doc.line(margin, y, margin + 35, y);
  y += 8;

  const statLines = [
    `Acceptées : ${acceptes.length}`,
    `À discuter : ${aDiscuter.length}`,
    `Refusées : ${refuses.length}`,
    `Total : ${total}`,
  ];

  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  statLines.forEach((line, i) => {
    const color = i === 0 ? GREEN : i === 1 ? AMBER : i === 2 ? RED : NAVY;
    doc.setTextColor(...color);
    doc.text(line, margin + 2, y);
    y += 5.5;
  });

  y += 6;

  // ═══════════════════════════════════
  // SECTIONS — simple listings
  // ═══════════════════════════════════
  const renderSection = (items, label, accentColor) => {
    if (items.length === 0) return;

    y = checkPage(y, 30 + items.length * 20);

    doc.setTextColor(...accentColor);
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text(`${label} (${items.length})`, margin, y);
    y += 2;
    doc.setDrawColor(...accentColor);
    doc.setLineWidth(0.5);
    doc.line(margin, y, pageW - margin, y);
    y += 8;

    items.forEach((s, idx) => {
      y = checkPage(y, 18);

      const author = s.anonyme ? "Anonyme" : `${s.prenom} ${s.nom}`;
      const line = `${idx + 1}. ${s.titre}`;
      doc.setTextColor(...NAVY);
      doc.setFontSize(9);
      doc.setFont("helvetica", "bold");
      const titleLines = doc.splitTextToSize(line, contentW - 5);
      doc.text(titleLines, margin + 2, y);
      y += titleLines.length * 4.5 + 1;

      // Short excerpt
      const excerpt = s.contenu.length > 80 ? s.contenu.substring(0, 80) + "..." : s.contenu;
      doc.setTextColor(...GRAY);
      doc.setFontSize(7.5);
      doc.setFont("helvetica", "normal");
      const excerptLines = doc.splitTextToSize(excerpt, contentW - 10);
      doc.text(excerptLines, margin + 4, y);
      y += excerptLines.length * 4 + 2;

      // Author + date
      doc.setTextColor(170, 180, 200);
      doc.setFontSize(6.5);
      doc.setFont("helvetica", "italic");
      doc.text(`— ${author}, ${new Date(s.created_at).toLocaleDateString("fr-FR")}`, margin + 4, y);
      y += 6;

      // Justification for refused
      if (s.justification) {
        y = checkPage(y, 16);
        doc.setTextColor(...RED);
        doc.setFontSize(7);
        doc.setFont("helvetica", "italic");
        const justLines = doc.splitTextToSize(`Justification : ${s.justification}`, contentW - 10);
        doc.text(justLines, margin + 6, y);
        y += justLines.length * 4 + 4;
      }

      y += 2;
    });

    y += 4;
  };

  renderSection(acceptes, "Suggestions acceptées", GREEN);
  renderSection(aDiscuter, "Suggestions à discuter", AMBER);
  renderSection(refuses, "Suggestions refusées", RED);

  // ═══════════════════════════════════
  // CLOSING
  // ═══════════════════════════════════
  y = checkPage(y, 30);

  doc.setDrawColor(210, 215, 225);
  doc.setLineWidth(0.5);
  doc.line(margin, y, pageW - margin, y);
  y += 8;

  doc.setTextColor(...NAVY);
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.text("Document généré par le Bureau Des Étudiants — HEI STDhub", margin, y);
  y += 5;
  doc.setTextColor(...GRAY);
  doc.setFontSize(8);
  doc.text(`Le ${date}`, margin, y);

  const totalPages = doc.internal.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    addFooter(i, totalPages);
  }

  doc.save(`BDE_Rapport_${new Date().toLocaleDateString("fr-FR").replace(/\//g, "-")}.pdf`);
};

export default function BDEPage() {
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [done, setDone] = useState(false);
  const [dragId, setDragId] = useState(null);
  const [dragOver, setDragOver] = useState(null);
  const [justModal, setJustModal] = useState(null);
  const [expandedCards, setExpandedCards] = useState(new Set());
  const [error, setError] = useState("");
  const [remoteDragId, setRemoteDragId] = useState(null);
  const [remoteDragOver, setRemoteDragOver] = useState(null);
  const boardRef = useRef(null);

  useEffect(() => {
    api
      .get("/suggestions")
      .then(({ data }) => setSuggestions(data.suggestions || []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    let socket;
    getSocket()
      .then((s) => {
        socket = s;
        s.emit("bde:join");
        s.on("bde:drag-start", ({ suggestionId, bySocket }) => {
          if (bySocket !== s.id) setRemoteDragId(suggestionId);
        });
        s.on("bde:drag-over", ({ columnId, bySocket }) => {
          if (bySocket !== s.id) setRemoteDragOver(columnId);
        });
        s.on("bde:drag-end", ({ bySocket }) => {
          if (bySocket !== s.id) {
            setRemoteDragId(null);
            setRemoteDragOver(null);
          }
        });
        s.on("bde:update", ({ id, statut, justification }) => {
          setSuggestions((prev) =>
            prev.map((s) =>
              s.id === id ? { ...s, statut, justification } : s,
            ),
          );
        });
      })
      .catch(console.error);
    return () => {
      if (socket) {
        socket.off("bde:drag-start");
        socket.off("bde:drag-over");
        socket.off("bde:drag-end");
        socket.off("bde:update");
      }
    };
  }, []);

  const getByStatut = (statut) =>
    Array.isArray(suggestions) ? suggestions.filter((s) => s.statut === statut) : [];

  const emitDragStart = useCallback((id) => {
    getSocket().then((s) => s.emit("bde:drag-start", { suggestionId: id }));
  }, []);

  const emitDragOver = useCallback((colId) => {
    getSocket().then((s) => s.emit("bde:drag-over", { columnId: colId }));
  }, []);

  const emitDragEnd = useCallback(() => {
    getSocket().then((s) => s.emit("bde:drag-end"));
  }, []);

  const toggleExpand = useCallback((id) => {
    setExpandedCards((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const emitUpdate = useCallback((id, statut, justification) => {
    getSocket().then((s) => s.emit("bde:update", { id, statut, justification }));
  }, []);

  const handleDragStart = (e, id) => {
    setDragId(id);
    if (e.dataTransfer) {
      e.dataTransfer.effectAllowed = "move";
    }
    emitDragStart(id);
  };

  const handleDragOver = (e, colId) => {
    e.preventDefault();
    setDragOver(colId);
    emitDragOver(colId);
  };

  const handleDrop = async (e, newStatut) => {
    e.preventDefault();
    setDragOver(null);
    if (!dragId) return;

    const suggestion = suggestions.find((s) => s.id === dragId);
    if (!suggestion || suggestion.statut === newStatut) {
      setDragId(null);
      emitDragEnd();
      return;
    }

    if (newStatut === "refuse") {
      setJustModal({ id: dragId, justification: "" });
      setDragId(null);
      emitDragEnd();
      return;
    }

    await updateStatut(dragId, newStatut, null);
    setDragId(null);
    emitDragEnd();
  };

  // Touch drag-and-drop for mobile
  const touchDrag = useRef(null);

  const handleTouchStart = (e, id) => {
    const touch = e.touches[0];
    touchDrag.current = { id, startX: touch.clientX, startY: touch.clientY };
    setDragId(id);
    emitDragStart(id);
  };

  const handleTouchMove = (e) => {
    if (!touchDrag.current) return;
    e.preventDefault();
    const touch = e.touches[0];
    const el = document.elementFromPoint(touch.clientX, touch.clientY);
    if (el) {
      const colEl = el.closest("[data-column-id]");
      if (colEl) {
        const colId = colEl.getAttribute("data-column-id");
        setDragOver(colId);
        emitDragOver(colId);
      } else {
        setDragOver(null);
      }
    }
  };

  const handleTouchEnd = async (e) => {
    if (!touchDrag.current) return;
    const id = touchDrag.current.id;
    touchDrag.current = null;
    const touch = e.changedTouches[0];
    const el = document.elementFromPoint(touch.clientX, touch.clientY);
    if (el) {
      const colEl = el.closest("[data-column-id]");
      if (colEl) {
        const newStatut = colEl.getAttribute("data-column-id");
        const suggestion = suggestions.find((s) => s.id === id);
        if (suggestion && suggestion.statut !== newStatut) {
          if (newStatut === "refuse") {
            setJustModal({ id, justification: "" });
            setDragId(null);
            setDragOver(null);
            emitDragEnd();
            return;
          }
          await updateStatut(id, newStatut, null);
        }
      }
    }
    setDragId(null);
    setDragOver(null);
    emitDragEnd();
  };

  const updateStatut = async (id, statut, justification) => {
    try {
      const { data } = await api.patch(`/suggestions/${id}`, {
        statut,
        justification,
      });
      setSuggestions((prev) =>
        prev.map((s) => (s.id === id ? { ...s, ...data } : s)),
      );
      emitUpdate(id, statut, justification);
    } catch (err) {
      setError(err.response?.data?.error || "Erreur lors de la mise à jour.");
    }
  };

  const handleJustConfirm = async () => {
    if (!justModal.justification.trim()) {
      setError("La justification est requise pour un refus.");
      return;
    }
    await updateStatut(justModal.id, "refuse", justModal.justification);
    setJustModal(null);
    setError("");
  };

  const handleConfirmAll = async () => {
    const treated = suggestions.filter((s) => s.statut !== "recu");
    if (treated.length === 0) {
      setError("Aucune suggestion traitée à confirmer.");
      return;
    }

    setSending(true);
    setError("");
    try {
      const { data } = await api.post("/suggestions/confirm");

      generatePDF(data.suggestions);

      setSuggestions([]);
      setDone(true);
      setTimeout(() => setDone(false), 5000);
    } catch (err) {
      setError(err.response?.data?.error || "Erreur lors de la confirmation.");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="flex h-screen bg-surface overflow-y-hidden">
      <Sidebar />
      <div className="flex flex-col flex-1 min-w-0">
        <Navbar title="Interface BDE" />
        <div className="flex-1 overflow-y-auto custom-scrollbar p-4 sm:p-6">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <div>
              <h1 className="text-xl font-bold text-navy">
                Gestion des suggestions
              </h1>
              <p className="text-gray-400 text-sm mt-0.5">
                Glissez-déposez les suggestions dans les colonnes, puis
                confirmez pour générer le rapport PDF et le partager dans le
                chat.
              </p>
            </div>
            <div className="flex flex-col items-end gap-2 shrink-0">
              {done && (
                <div className="flex items-center gap-2 text-emerald-600 text-sm font-semibold bg-emerald-50 px-3 py-2 rounded-xl border border-emerald-200">
                  <FontAwesomeIcon icon={faCheckCircle} />
                  PDF téléchargé & partagé dans le chat !
                </div>
              )}
              <button
                onClick={handleConfirmAll}
                disabled={sending}
                className="btn-primary flex items-center gap-2 disabled:opacity-50"
              >
                {sending ? (
                  <FontAwesomeIcon icon={faSpinner} className="animate-spin" />
                ) : (
                  <FontAwesomeIcon icon={faFilePdf} />
                )}
                Confirmer & générer le rapport
              </button>
            </div>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-600 text-sm px-4 py-3 rounded-xl mb-4">
              {error}
            </div>
          )}

          {loading ? (
            <div className="flex justify-center py-20">
              <FontAwesomeIcon
                icon={faSpinner}
                className="text-navy text-3xl animate-spin"
              />
            </div>
          ) : suggestions.length === 0 && !loading ? (
            <div className="flex flex-col items-center justify-center py-24 text-gray-300">
              <FontAwesomeIcon icon={faInbox} className="text-5xl mb-3" />
              <p className="text-gray-400 font-semibold text-sm">
                Aucune suggestion pour le moment
              </p>
            </div>
          ) : (
            <div
              ref={boardRef}
              className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3 sm:gap-4 items-start"
            >
              {COLUMNS.map((col) => (
                <div
                  key={col.id}
                  data-column-id={col.id}
                  onDragOver={(e) => handleDragOver(e, col.id)}
                  onDragLeave={() => setDragOver(null)}
                  onDrop={(e) => handleDrop(e, col.id)}
                  className={`rounded-2xl border-2 border-dashed ${col.border} ${col.bg} p-3 min-h-48 sm:min-h-64 transition-all ${
                    dragOver === col.id || remoteDragOver === col.id
                      ? "scale-[1.02] shadow-lg"
                      : ""
                  }`}
                  onTouchMove={handleTouchMove}
                  onTouchEnd={handleTouchEnd}
                >
                  {/* Header colonne */}
                  <div className="flex items-center gap-2 mb-3 px-1">
                    <div className={`w-2.5 h-2.5 rounded-full ${col.dot}`} />
                    <FontAwesomeIcon
                      icon={col.icon}
                      className={`${col.color} text-sm`}
                    />
                    <span className={`font-bold text-sm ${col.color}`}>
                      {col.label}
                    </span>
                    <span className="ml-auto bg-white text-gray-500 text-xs font-bold px-2 py-0.5 rounded-full border border-gray-200">
                      {getByStatut(col.id).length}
                    </span>
                  </div>

                  {/* Cards */}
                  <div className="flex flex-col gap-2">
                    {getByStatut(col.id).length === 0 && (
                      <div className="flex flex-col items-center justify-center py-8 sm:py-10 text-gray-300">
                        <FontAwesomeIcon
                          icon={col.icon}
                          className="text-2xl mb-2"
                        />
                        <p className="text-xs">Glisser ici</p>
                      </div>
                    )}
                    {getByStatut(col.id).map((s) => {
                      const isBeingDragged =
                        dragId === s.id || remoteDragId === s.id;
                      const isExpanded = expandedCards.has(s.id);
                      const isLong = s.contenu && s.contenu.length > 100;
                      return (
                        <div
                          key={s.id}
                          draggable
                          onDragStart={(e) => handleDragStart(e, s.id)}
                          onTouchStart={(e) => handleTouchStart(e, s.id)}
                          className={`bg-white rounded-xl shadow-sm p-3 cursor-grab active:cursor-grabbing hover:shadow-[0_15px_40px_rgba(0,0,0,0.04),0_0_15px_rgba(212,175,55,0.1)] hover:-translate-y-1 transition-all duration-300 border-l-4 ${col.cardBorder} select-none touch-manipulation ${
                            isBeingDragged
                              ? "opacity-40 scale-95"
                              : ""
                          }`}
                        >
                          <p className="font-bold text-navy text-xs mb-1 leading-tight">
                            {s.titre}
                          </p>
                          <p className={`text-gray-500 text-xs leading-relaxed mb-0.5 ${isExpanded || !isLong ? "" : "line-clamp-2"}`}>
                            {s.contenu}
                          </p>
                          {isLong && (
                            <button
                              type="button"
                              onClick={(e) => { e.stopPropagation(); toggleExpand(s.id); }}
                              className="text-[10px] font-semibold text-gold hover:text-gold/80 transition-colors mb-2 block"
                            >
                              {isExpanded ? "Voir moins" : "Voir plus"}
                            </button>
                          )}
                          <div className="flex items-center gap-1.5 pt-2 border-t border-surface">
                            <div className="w-5 h-5 rounded-full bg-navy flex items-center justify-center text-white text-xs font-bold shrink-0">
                              {s.anonyme ? "?" : `${s.prenom?.[0]}${s.nom?.[0]}`}
                            </div>
                            <span className="text-xs text-gray-400 truncate flex-1">
                              {s.anonyme ? "Anonyme" : `${s.prenom} ${s.nom}`}
                            </span>
                            <span className="text-xs text-gray-300 shrink-0">
                              {new Date(s.created_at).toLocaleDateString("fr-FR")}
                            </span>
                          </div>
                          {s.statut === "refuse" && s.justification && (
                            <div className="mt-2 bg-red-50 rounded-lg px-2 py-1.5">
                              <p className="text-xs text-red-500 font-semibold">
                                Justification :
                              </p>
                              <p className={`text-xs text-red-400 mt-0.5 ${isExpanded ? "" : "line-clamp-2"}`}>
                                {s.justification}
                              </p>
                              {s.justification.length > 100 && (
                                <button
                                  type="button"
                                  onClick={(e) => { e.stopPropagation(); toggleExpand(s.id); }}
                                  className="text-[10px] font-semibold text-red-400 hover:text-red-300 transition-colors mt-0.5 block"
                                >
                                  {isExpanded ? "Voir moins" : "Voir plus"}
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Modal justification refus */}
      {justModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-modal p-6 w-full max-w-md">
            <h3 className="font-bold text-navy text-base mb-1">
              Justification du refus
            </h3>
            <p className="text-gray-400 text-sm mb-4">
              Cette justification apparaîtra dans le rapport PDF partagé dans le
              chat.
            </p>
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-600 text-xs px-3 py-2 rounded-lg mb-3">
                {error}
              </div>
            )}
            <textarea
              className="input-field resize-none h-32 mb-4"
              placeholder="Expliquez la raison du refus..."
              value={justModal.justification}
              onChange={(e) =>
                setJustModal((p) => ({ ...p, justification: e.target.value }))
              }
            />
            <div className="flex gap-3 justify-end">
              <button
                type="button"
                onClick={() => {
                  setJustModal(null);
                  setError("");
                }}
                className="btn-danger"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={handleJustConfirm}
                className="btn-primary"
              >
                Confirmer le refus
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
