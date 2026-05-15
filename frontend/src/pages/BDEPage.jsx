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

const NAVY = [10, 26, 47];
const GOLD = [212, 175, 55];
const WHITE = [255, 255, 255];
const GREEN = [16, 185, 129];
const AMBER = [245, 158, 11];
const RED = [239, 68, 68];
const GRAY = [100, 116, 139];
const LIGHT_GRAY = [148, 163, 184];

const generatePDF = (suggestions) => {
  const doc = new jsPDF();
  const date = new Date().toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });
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
    doc.setFillColor(...NAVY);
    doc.rect(0, pageH - 14, pageW, 14, "F");
    doc.setTextColor(...LIGHT_GRAY);
    doc.setFontSize(7);
    doc.setFont("helvetica", "normal");
    doc.text("HEI STDhub \u2014 Bureau Des Etudiants", margin, pageH - 5);
    doc.text(`Page ${pageNum}/${totalPages}`, pageW - margin, pageH - 5, { align: "right" });
  };

  const checkPage = (y, needed = 30) => {
    if (y + needed > pageH - 20) {
      doc.addPage();
      return margin + 10;
    }
    return y;
  };

  let y = margin + 5;

  // ═══════════════════════════════════════════════
  // HEADER
  // ═══════════════════════════════════════════════
  doc.setFillColor(...NAVY);
  doc.rect(0, 0, pageW, 46, "F");

  doc.setDrawColor(...GOLD);
  doc.setLineWidth(1.2);
  doc.line(0, 46, pageW, 46);

  doc.setTextColor(...GOLD);
  doc.setFontSize(22);
  doc.setFont("helvetica", "bold");
  doc.text("HEI STDhub", margin, 18);

  doc.setTextColor(...WHITE);
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text("Rapport officiel du Bureau Des Etudiants", margin, 32);

  doc.setFontSize(7);
  doc.setTextColor(...LIGHT_GRAY);
  doc.text(date, pageW - margin, 14, { align: "right" });
  doc.text(`R\xe9f: BDE-RPT-${Date.now().toString(36).toUpperCase()}`, pageW - margin, 24, { align: "right" });

  y = 56;

  // ═══════════════════════════════════════════════
  // SUMMARY SECTION
  // ═══════════════════════════════════════════════
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.setTextColor(...NAVY);
  doc.text("R\xc9SUM\xc9", margin, y);
  y += 3;
  doc.setDrawColor(...GOLD);
  doc.setLineWidth(0.4);
  doc.line(margin, y, margin + 35, y);
  y += 10;

  const summaryItems = [
    { label: "Accept\xe9es", count: acceptes.length, color: GREEN },
    { label: "\xc0 approfondir", count: aDiscuter.length, color: AMBER },
    { label: "Refus\xe9es", count: refuses.length, color: RED },
    { label: "Total", count: total, color: NAVY },
  ];

  const cardW = (contentW - 12) / 4;

  summaryItems.forEach((item, i) => {
    const cx = margin + i * (cardW + 4);

    doc.setFillColor(...item.color);
    doc.rect(cx, y, cardW, 2.5, "F");

    doc.setFillColor(248, 249, 253);
    doc.setDrawColor(...item.color);
    doc.setLineWidth(0.4);
    doc.roundedRect(cx, y + 2.5, cardW, 28, 2, 2, "FD");

    doc.setTextColor(...item.color);
    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    doc.text(String(item.count), cx + cardW / 2, y + 16, { align: "center" });

    doc.setTextColor(...GRAY);
    doc.setFontSize(7);
    doc.setFont("helvetica", "normal");
    doc.text(item.label, cx + cardW / 2, y + 26, { align: "center" });
  });

  y += 40;

  // ═══════════════════════════════════════════════
  // SECTION RENDERER
  // ═══════════════════════════════════════════════
  const renderSection = (items, label, accentColor, icon) => {
    if (items.length === 0) return;

    y = checkPage(y, 50 + items.length * 28);

    doc.setFillColor(...accentColor);
    doc.rect(margin, y, 3, 16, "F");

    doc.setTextColor(...NAVY);
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text(`${icon} ${label} (${items.length})`, margin + 10, y + 11);

    doc.setDrawColor(220, 225, 235);
    doc.setLineWidth(0.3);
    doc.line(margin, y + 20, pageW - margin, y + 20);

    y += 27;

    items.forEach((s, idx) => {
      y = checkPage(y, 36);

      const titleLines = doc.splitTextToSize(s.titre, contentW - 20);
      const titleH = titleLines.length * 4.5;
      const contentMax = s.contenu.length > 150 ? s.contenu.substring(0, 150) + "..." : s.contenu;
      const contentLines = doc.splitTextToSize(contentMax, contentW - 20);
      const contentH = contentLines.length * 3.8;
      const auteur = s.anonyme ? "Anonyme" : `${s.prenom} ${s.nom}`;

      let cardH = 12 + titleH + 3 + contentH + 10;

      if (s.justification) {
        const justLines = doc.splitTextToSize(s.justification, contentW - 36);
        const justBoxH = 16 + justLines.length * 3.8;
        cardH += justBoxH + 4;
      }

      doc.setFillColor(...WHITE);
      doc.setDrawColor(220, 225, 235);
      doc.setLineWidth(0.4);
      doc.roundedRect(margin, y, contentW, cardH, 3, 3, "FD");

      doc.setFillColor(...accentColor);
      doc.roundedRect(margin + 1, y + 3, 2.5, cardH - 6, 1, 1, "F");

      doc.setTextColor(...NAVY);
      doc.setFontSize(9.5);
      doc.setFont("helvetica", "bold");
      doc.text(titleLines, margin + 10, y + 9);

      doc.setTextColor(90, 100, 120);
      doc.setFontSize(7.5);
      doc.setFont("helvetica", "normal");
      doc.text(contentLines, margin + 10, y + 9 + titleH + 3);

      const authorY = y + 9 + titleH + 3 + contentH + 3;
      doc.setFillColor(245, 246, 250);
      doc.roundedRect(margin + 8, authorY, contentW - 16, 8, 2, 2, "F");
      doc.setTextColor(...LIGHT_GRAY);
      doc.setFontSize(6.5);
      doc.setFont("helvetica", "italic");
      doc.text(`Propos\xe9 par ${auteur}`, margin + 13, authorY + 5.5);

      y = authorY + 12;

      if (s.justification) {
        y = checkPage(y, 28);
        const justLines = doc.splitTextToSize(s.justification, contentW - 36);
        const justH = 14 + justLines.length * 3.8;

        doc.setFillColor(254, 245, 245);
        doc.setDrawColor(...RED);
        doc.setLineWidth(0.3);
        doc.roundedRect(margin + 8, y, contentW - 16, justH, 3, 3, "FD");

        doc.setFillColor(...RED);
        doc.rect(margin + 8, y, 2.5, justH, "F");

        doc.setTextColor(...RED);
        doc.setFontSize(6.5);
        doc.setFont("helvetica", "bold");
        doc.text("Justification du BDE :", margin + 17, y + 6);

        doc.setTextColor(160, 50, 50);
        doc.setFontSize(7);
        doc.setFont("helvetica", "normal");
        doc.text(justLines, margin + 17, y + 12);

        y += justH + 5;
      }

      y += 3;
    });

    y += 5;
  };

  renderSection(acceptes, "Suggestions accept\xe9es", GREEN, "1.");
  renderSection(aDiscuter, "\xc0 approfondir", AMBER, "2.");
  renderSection(refuses, "Suggestions refus\xe9es", RED, "3.");

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
  const [error, setError] = useState("");
  const [remoteDragId, setRemoteDragId] = useState(null);
  const [remoteDragOver, setRemoteDragOver] = useState(null);
  const boardRef = useRef(null);
  const dragCounter = useRef(1);

  useEffect(() => {
    api
      .get("/suggestions")
      .then(({ data }) => setSuggestions(data))
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
    <div className="flex h-screen bg-surface overflow-hidden">
      <Sidebar />
      <div className="flex flex-col flex-1 min-w-0">
        <Navbar title="Interface BDE" />
        <div className="flex-1 overflow-y-auto p-4 sm:p-6">
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
                      return (
                        <div
                          key={s.id}
                          draggable
                          onDragStart={(e) => handleDragStart(e, s.id)}
                          onTouchStart={(e) => handleTouchStart(e, s.id)}
                          className={`bg-white rounded-xl shadow-sm p-3 cursor-grab active:cursor-grabbing hover:shadow-md transition border-l-4 ${col.cardBorder} select-none touch-manipulation ${
                            isBeingDragged
                              ? "opacity-40 scale-95"
                              : ""
                          }`}
                        >
                          <p className="font-bold text-navy text-xs mb-1 leading-tight">
                            {s.titre}
                          </p>
                          <p className="text-gray-500 text-xs leading-relaxed line-clamp-2 mb-2">
                            {s.contenu}
                          </p>
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
                              <p className="text-xs text-red-400 mt-0.5 line-clamp-2">
                                {s.justification}
                              </p>
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
