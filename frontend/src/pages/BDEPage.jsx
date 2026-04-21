import { useState, useEffect } from "react";
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

const generatePDF = (suggestions) => {
  const doc = new jsPDF();
  const date = new Date().toLocaleDateString("fr-FR");
  const pageW = doc.internal.pageSize.getWidth();

  // Header
  doc.setFillColor(15, 30, 51);
  doc.rect(0, 0, pageW, 35, "F");
  doc.setTextColor(245, 166, 35);
  doc.setFontSize(20);
  doc.setFont("helvetica", "bold");
  doc.text("HEI STDhub", pageW / 2, 15, { align: "center" });
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(11);
  doc.setFont("helvetica", "normal");
  doc.text(`Retour officiel du BDE — ${date}`, pageW / 2, 25, {
    align: "center",
  });

  let y = 45;

  const acceptes = suggestions.filter((s) => s.statut === "accepte");
  const aDiscuter = suggestions.filter((s) => s.statut === "a_discuter");
  const refuses = suggestions.filter((s) => s.statut === "refuse");

  const addSection = (items, label, r, g, b) => {
    if (items.length === 0) return;

    // Nouvelle page si besoin
    if (y > 240) {
      doc.addPage();
      y = 20;
    }

    // Titre section
    doc.setFillColor(r, g, b);
    doc.rect(14, y, 4, 8, "F");
    doc.setTextColor(r, g, b);
    doc.setFontSize(13);
    doc.setFont("helvetica", "bold");
    doc.text(`${label} (${items.length})`, 22, y + 6);
    y += 14;

    items.forEach((s) => {
      if (y > 260) {
        doc.addPage();
        y = 20;
      }

      // Card fond
      doc.setFillColor(248, 250, 252);
      doc.setDrawColor(r, g, b);
      doc.setLineWidth(0.5);
      doc.roundedRect(14, y, pageW - 28, 0, 3, 3);

      // Titre suggestion
      doc.setTextColor(15, 30, 51);
      doc.setFontSize(11);
      doc.setFont("helvetica", "bold");
      const titreLines = doc.splitTextToSize(s.titre, pageW - 40);
      doc.text(titreLines, 18, y + 7);
      y += 7 + titreLines.length * 5;

      // Contenu
      doc.setTextColor(100, 116, 139);
      doc.setFontSize(9);
      doc.setFont("helvetica", "normal");
      const contenuLines = doc.splitTextToSize(s.contenu, pageW - 40);
      doc.text(contenuLines, 18, y + 2);
      y += 2 + contenuLines.length * 4;

      // Auteur
      const auteur = s.anonyme ? "Anonyme" : `${s.prenom} ${s.nom}`;
      doc.setTextColor(148, 163, 184);
      doc.setFontSize(8);
      doc.text(`— ${auteur}`, 18, y + 3);
      y += 5;

      // Justification si refusé
      if (s.justification) {
        doc.setFillColor(254, 242, 242);
        doc.setTextColor(239, 68, 68);
        doc.setFontSize(8);
        doc.setFont("helvetica", "bold");
        doc.text("Justification BDE :", 18, y + 4);
        doc.setFont("helvetica", "normal");
        const justLines = doc.splitTextToSize(s.justification, pageW - 44);
        doc.text(justLines, 18, y + 9);
        y += 9 + justLines.length * 4;
      }

      y += 6;
    });

    y += 4;
  };

  addSection(acceptes, "✓ Suggestions acceptées", 16, 185, 129);
  addSection(aDiscuter, "? À approfondir", 245, 158, 11);
  addSection(refuses, "✗ Suggestions refusées", 239, 68, 68);

  // Footer
  const pageCount = doc.internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFillColor(15, 30, 51);
    doc.rect(0, doc.internal.pageSize.getHeight() - 12, pageW, 12, "F");
    doc.setTextColor(100, 116, 139);
    doc.setFontSize(7);
    doc.text(
      `HEI STDhub — Bureau Des Étudiants — ${date} — Page ${i}/${pageCount}`,
      pageW / 2,
      doc.internal.pageSize.getHeight() - 4,
      { align: "center" },
    );
  }

  doc.save(`BDE_Rapport_${date.replace(/\//g, "-")}.pdf`);
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

  useEffect(() => {
    api
      .get("/suggestions")
      .then(({ data }) => setSuggestions(data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const getByStatut = (statut) =>
    suggestions.filter((s) => s.statut === statut);

  const handleDragStart = (e, id) => {
    setDragId(id);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e, colId) => {
    e.preventDefault();
    setDragOver(colId);
  };

  const handleDrop = async (e, newStatut) => {
    e.preventDefault();
    setDragOver(null);
    if (!dragId) return;

    const suggestion = suggestions.find((s) => s.id === dragId);
    if (!suggestion || suggestion.statut === newStatut) {
      setDragId(null);
      return;
    }

    if (newStatut === "refuse") {
      setJustModal({ id: dragId, justification: "" });
      setDragId(null);
      return;
    }

    await updateStatut(dragId, newStatut, null);
    setDragId(null);
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

      // Générer et télécharger le PDF
      generatePDF(data.suggestions);

      // Vider les suggestions du state
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
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 items-start">
              {COLUMNS.map((col) => (
                <div
                  key={col.id}
                  onDragOver={(e) => handleDragOver(e, col.id)}
                  onDragLeave={() => setDragOver(null)}
                  onDrop={(e) => handleDrop(e, col.id)}
                  className={`rounded-2xl border-2 border-dashed ${col.border} ${col.bg} p-3 min-h-64 transition-all ${
                    dragOver === col.id ? "scale-[1.02] shadow-lg" : ""
                  }`}
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
                      <div className="flex flex-col items-center justify-center py-10 text-gray-300">
                        <FontAwesomeIcon
                          icon={col.icon}
                          className="text-2xl mb-2"
                        />
                        <p className="text-xs">Glisser ici</p>
                      </div>
                    )}
                    {getByStatut(col.id).map((s) => (
                      <div
                        key={s.id}
                        draggable
                        onDragStart={(e) => handleDragStart(e, s.id)}
                        className={`bg-white rounded-xl shadow-sm p-3 cursor-grab active:cursor-grabbing hover:shadow-md transition border-l-4 ${col.cardBorder} select-none`}
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
                    ))}
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
