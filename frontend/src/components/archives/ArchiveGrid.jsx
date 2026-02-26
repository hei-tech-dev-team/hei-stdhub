import { useState, useEffect } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faFolderOpen,
  faPlus,
  faTimes,
  faLink,
  faExternalLinkAlt,
  faSpinner,
  faTrash,
} from "@fortawesome/free-solid-svg-icons";
import api from "../../api/axios";
import { useAuth } from "../../context/AuthContext";

const YEARS = [
  {
    id: "L1",
    label: "PREMIERE ANNEE – SEMESTRE 1 ET 2",
    ues: [
      "WEB1",
      "PROG1",
      "SYS1",
      "DONNEES1",
      "THEORIE1-P1",
      "THEORIE1-P2",
      "WEB2",
      "PROG2-POO",
      "PROG2-API",
      "SYS2",
      "DONNEES2",
      "IA1",
    ],
  },
  {
    id: "L2",
    label: "DEUXIEME ANNEE – SEMESTRE 3 ET 4",
    ues: ["WEB3", "PROG3", "MGT2", "PROG4", "SYS3"],
  },
  {
    id: "L3",
    label: "TROISIEME ANNEE – SEMESTRE 5 ET 6",
    ues: ["MOB1", "PROG5", "SECU1", "SECU2"],
  },
];

export default function ArchiveGrid() {
  const { user } = useAuth();
  const isTeacher = user?.role === "teacher" || user?.role === "admin";

  const [selectedUE, setSelectedUE] = useState(null);
  const [supports, setSupports] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [showPanel, setShowPanel] = useState(false);
  const [addForm, setAddForm] = useState({ label: "", url: "" });
  const [saving, setSaving] = useState(false);
  const [addError, setAddError] = useState("");

  const setAdd = (k, v) => setAddForm((p) => ({ ...p, [k]: v }));

  // Charger les supports quand on sélectionne une UE
  const handleSelectUE = async (ue) => {
    setSelectedUE(ue);
    setShowPanel(true);
    setShowAdd(false);
    setAddForm({ label: "", url: "" });
    setAddError("");
    setLoading(true);
    try {
      const { data } = await api.get(`/supports/${ue}`);
      setSupports(data);
    } catch (err) {
      console.error(err);
      setSupports([]);
    } finally {
      setLoading(false);
    }
  };

  const handleClosePanel = () => {
    setSelectedUE(null);
    setShowPanel(false);
    setShowAdd(false);
    setSupports([]);
  };

  // Ajouter un support
  const handleAdd = async (e) => {
    e.preventDefault();
    if (!addForm.label.trim() || !addForm.url.trim()) return;
    if (!addForm.url.startsWith("http")) {
      setAddError("L'URL doit commencer par http:// ou https://");
      return;
    }
    setSaving(true);
    setAddError("");
    try {
      const { data } = await api.post("/supports", {
        ue: selectedUE,
        label: addForm.label,
        url: addForm.url,
      });
      setSupports((prev) => [...prev, data]);
      setAddForm({ label: "", url: "" });
      setShowAdd(false);
    } catch (err) {
      setAddError(err.response?.data?.error || "Erreur lors de l'ajout.");
    } finally {
      setSaving(false);
    }
  };

  // Supprimer un support
  const handleDelete = async (id) => {
    if (!confirm("Supprimer ce support ?")) return;
    try {
      await api.delete(`/supports/${id}`);
      setSupports((prev) => prev.filter((s) => s.id !== id));
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="flex flex-col lg:flex-row gap-4 lg:gap-6 h-full">
      {/* Grille UE */}
      <div className="flex-1 overflow-y-auto">
        <div className="flex flex-col gap-6 sm:gap-8">
          {YEARS.map((year) => (
            <div key={year.id}>
              <div
                className="bg-gold-light text-navy font-bold text-xs
                              py-3 px-4 sm:px-5 rounded-xl mb-3 sm:mb-4
                              uppercase tracking-wider"
              >
                {year.label}
              </div>
              <div className="flex flex-wrap gap-2">
                {year.ues.map((ue) => (
                  <button
                    key={ue}
                    type="button"
                    onClick={() => handleSelectUE(ue)}
                    className={
                      "px-3 sm:px-5 py-2 sm:py-2.5 rounded-full " +
                      "text-xs sm:text-sm font-bold border transition-all " +
                      (selectedUE === ue
                        ? "bg-navy text-white border-navy shadow-md"
                        : "bg-white text-navy border-contact hover:border-navy hover:bg-navy/5 shadow-sm")
                    }
                  >
                    {ue}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Panneau supports */}
      {selectedUE && (
        <>
          {/* Overlay mobile */}
          <div
            className="lg:hidden fixed inset-0 bg-black/40 z-30"
            onClick={handleClosePanel}
          />

          <div
            className={
              "fixed lg:static inset-x-0 bottom-0 lg:inset-auto z-40 " +
              "lg:w-80 lg:shrink-0 " +
              "max-h-[80vh] lg:max-h-none lg:h-full " +
              "rounded-t-2xl lg:rounded-2xl " +
              "bg-white shadow-modal lg:shadow-card " +
              "flex flex-col " +
              "transition-transform duration-300 " +
              (showPanel
                ? "translate-y-0"
                : "translate-y-full lg:translate-y-0")
            }
          >
            <div className="p-4 sm:p-5 flex flex-col h-full">
              {/* Trait mobile */}
              <div
                className="lg:hidden w-10 h-1 bg-contact rounded-full
                              mx-auto mb-4 shrink-0"
              />

              {/* Header */}
              <div className="flex items-start justify-between mb-4 shrink-0">
                <div>
                  <h3 className="font-bold text-navy text-base">
                    {selectedUE}
                  </h3>
                  <p className="text-xs text-gray-400 mt-0.5">
                    Supports pédagogiques
                  </p>
                </div>
                <div className="flex gap-2 shrink-0">
                  {isTeacher && (
                    <button
                      type="button"
                      onClick={() => {
                        setShowAdd((p) => !p);
                        setAddError("");
                      }}
                      className="w-7 h-7 rounded-full bg-gold text-white
                                 flex items-center justify-center hover:opacity-80 transition"
                    >
                      <FontAwesomeIcon
                        icon={showAdd ? faTimes : faPlus}
                        className="text-xs"
                      />
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={handleClosePanel}
                    className="w-7 h-7 rounded-full bg-surface text-gray-400
                               flex items-center justify-center hover:bg-contact transition"
                  >
                    <FontAwesomeIcon icon={faTimes} className="text-xs" />
                  </button>
                </div>
              </div>

              {/* Formulaire ajout */}
              {isTeacher && showAdd && (
                <form
                  onSubmit={handleAdd}
                  className="mb-4 p-3 bg-surface rounded-xl flex flex-col gap-2 shrink-0"
                >
                  {addError && (
                    <p className="text-red-500 text-xs">{addError}</p>
                  )}
                  <input
                    className="input-field"
                    placeholder="Intitulé du support *"
                    value={addForm.label}
                    onChange={(e) => {
                      setAdd("label", e.target.value);
                      setAddError("");
                    }}
                    required
                  />
                  <input
                    className="input-field"
                    placeholder="URL (https://...) *"
                    value={addForm.url}
                    onChange={(e) => {
                      setAdd("url", e.target.value);
                      setAddError("");
                    }}
                    required
                  />
                  <button
                    type="submit"
                    disabled={saving}
                    className="btn-primary w-full text-center disabled:opacity-60"
                  >
                    {saving ? (
                      <FontAwesomeIcon
                        icon={faSpinner}
                        className="animate-spin"
                      />
                    ) : (
                      "Ajouter"
                    )}
                  </button>
                </form>
              )}

              {/* Supports */}
              <div className="flex flex-col gap-2 flex-1 overflow-y-auto">
                {loading && (
                  <div className="flex justify-center py-8">
                    <FontAwesomeIcon
                      icon={faSpinner}
                      className="text-navy text-xl animate-spin"
                    />
                  </div>
                )}

                {!loading && supports.length === 0 && (
                  <div className="flex flex-col items-center justify-center py-10 text-gray-300">
                    <FontAwesomeIcon
                      icon={faFolderOpen}
                      className="text-3xl mb-2"
                    />
                    <p className="text-sm">Aucun support ajouté</p>
                  </div>
                )}

                {!loading &&
                  supports.map((s) => (
                    <div
                      key={s.id}
                      className="flex items-center gap-3 p-3 bg-surface
                                  rounded-xl hover:bg-contact/50 transition group"
                    >
                      <div
                        className="w-8 h-8 rounded-full bg-navy/10
                                    flex items-center justify-center shrink-0"
                      >
                        <FontAwesomeIcon
                          icon={faLink}
                          className="text-navy text-xs"
                        />
                      </div>
                      <a
                        href={s.url}
                        target="_blank"
                        rel="noreferrer"
                        className="flex-1 min-w-0 flex items-center gap-2"
                      >
                        <span
                          className="text-sm font-semibold text-navy
                                       group-hover:text-gold transition-colors truncate"
                        >
                          {s.label}
                        </span>
                        <FontAwesomeIcon
                          icon={faExternalLinkAlt}
                          className="text-gray-300 text-xs shrink-0
                                   group-hover:text-gold transition-colors"
                        />
                      </a>
                      {isTeacher && (
                        <button
                          type="button"
                          onClick={() => handleDelete(s.id)}
                          className="text-red-300 hover:text-red-500 transition shrink-0"
                        >
                          <FontAwesomeIcon icon={faTrash} className="text-xs" />
                        </button>
                      )}
                    </div>
                  ))}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
