import { useState, useEffect } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faInbox,
  faCheckCircle,
  faComments,
  faTimesCircle,
  faSpinner,
  faPaperPlane,
} from "@fortawesome/free-solid-svg-icons";
import api from "../api/axios";
import Navbar from "../components/layout/Navbar";
import Sidebar from "../components/layout/Sidebar";

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

export default function BDEPage() {
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
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
      setSent(true);
      setTimeout(() => setSent(false), 5000);
    } catch (err) {
      setError(
        err.response?.data?.error || "Erreur lors de l'envoi des emails.",
      );
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
                Glissez-déposez les suggestions dans les colonnes appropriées,
                puis confirmez pour notifier les étudiants par email.
              </p>
            </div>
            <div className="flex flex-col items-end gap-2 shrink-0">
              {sent && (
                <div className="flex items-center gap-2 text-emerald-600 text-sm font-semibold bg-emerald-50 px-3 py-2 rounded-xl border border-emerald-200">
                  <FontAwesomeIcon icon={faCheckCircle} />
                  Emails envoyés à tous les étudiants !
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
                  <FontAwesomeIcon icon={faPaperPlane} />
                )}
                Confirmer & notifier les étudiants
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
                            {s.prenom?.[0]}
                            {s.nom?.[0]}
                          </div>
                          <span className="text-xs text-gray-400 truncate flex-1">
                            {s.prenom} {s.nom}
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
              Cette justification sera visible par tous les étudiants dans
              l'email de retour.
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
