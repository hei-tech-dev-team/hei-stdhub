import { useState, useEffect, useRef } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faFolderOpen,
  faPlus,
  faTimes,
  faLink,
  faExternalLinkAlt,
  faSpinner,
  faTrash,
  faBookOpen,
  faChevronRight,
  faGraduationCap,
} from "@fortawesome/free-solid-svg-icons";
import api from "../../api/axios";
import { useAuth } from "../../context/AuthContext";

const GOLD = "223,164,8";
const NAVY_RGB = "0,25,72";
const NAVY_HEX = "#001948";
const NAVY_DARK = "#0A1A33";

const YEARS = [
  {
    id: "L1",
    label: "PREMIERE ANNEE",
    subtitle: "Semestre 1 & 2",
    ues: [
      "WEB1", "PROG1", "SYS1", "DONNEES1",
      "THEORIE1-P1", "THEORIE1-P2",
      "WEB2", "PROG2-POO", "PROG2-API", "SYS2", "MGT1",
    ],
  },
  {
    id: "L2",
    label: "DEUXIEME ANNEE",
    subtitle: "Semestre 3 & 4",
    ues: ["WEB3", "PROG3", "MGT2", "PROG4", "SYS3", "DONNEES2", "IA1"],
  },
  {
    id: "L3",
    label: "TROISIEME ANNEE",
    subtitle: "Semestre 5 & 6",
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
  const [visible, setVisible] = useState(false);
  const panelRef = useRef(null);

  useEffect(() => {
    requestAnimationFrame(() => setVisible(true));
  }, []);

  const setAdd = (k, v) => setAddForm((p) => ({ ...p, [k]: v }));

  const handleSelectUE = async (ue) => {
    setSelectedUE(ue);
    setShowPanel(true);
    setShowAdd(false);
    setAddForm({ label: "", url: "" });
    setAddError("");
    setLoading(true);
    try {
      const { data } = await api.get(`/supports/${ue}`);
      setSupports(Array.isArray(data) ? data : []);
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
    <div className="flex flex-col lg:flex-row gap-6 lg:gap-8 h-full">
      <div className="flex-1 overflow-y-auto">
        <div className="flex flex-col gap-8">
          {YEARS.map((year, yi) => (
            <div
              key={year.id}
              className={`transition-all duration-700 ease-out ${
                visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
              }`}
              style={{ transitionDelay: `${yi * 150}ms` }}
            >
              <div className="relative overflow-hidden rounded-2xl mb-5 group">
                <div
                  className="relative flex items-center gap-4 rounded-2xl overflow-hidden bg-white shadow-card"
                >
                  <div
                    className="absolute left-0 top-0 bottom-0 w-1.5"
                    style={{ background: `linear-gradient(to bottom, rgba(${GOLD},0.6), rgba(${GOLD},0.3))` }}
                  />
                  <div
                    className="flex items-center gap-4 px-6 py-5 w-full"
                    style={{
                      background: `linear-gradient(135deg, rgba(${NAVY_RGB},0.03), transparent)`,
                    }}
                  >
                    <div
                      className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0 shadow-lg"
                      style={{
                        background: `linear-gradient(135deg, ${NAVY_HEX}, ${NAVY_DARK})`,
                      }}
                    >
                      <FontAwesomeIcon icon={faGraduationCap} className="text-gold text-xl" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-bold text-navy text-base tracking-wide">
                        {year.label}
                      </h3>
                      <p className="text-sm text-gray-400 mt-0.5 font-medium">
                        {year.subtitle}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap gap-3 lg:gap-4">
                {year.ues.map((ue, ui) => (
                  <button
                    key={ue}
                    type="button"
                    onClick={() => handleSelectUE(ue)}
                    className={`group relative px-5 lg:px-7 py-3 lg:py-4 rounded-xl lg:rounded-2xl text-sm lg:text-base font-bold
                      transition-all duration-300 active:scale-[0.95]
                      animate-slide-up ${
                        selectedUE === ue
                          ? "bg-navy text-white shadow-lg shadow-navy/30 scale-105"
                          : "bg-white/80 backdrop-blur-sm text-navy border-2 border-gold/20 hover:border-gold/50 hover:shadow-xl hover:shadow-gold/10 hover:-translate-y-1"
                      }`}
                    style={{ animationDelay: `${yi * 150 + ui * 60}ms`, animationFillMode: "backwards" }}
                  >
                    {selectedUE === ue && (
                      <span className="absolute -top-1.5 -right-1.5 w-3.5 h-3.5 bg-gold rounded-full border-[3px] border-white animate-pulse" />
                    )}
                    <span className="relative z-10">{ue}</span>
                    {selectedUE !== ue && (
                      <span
                        className="absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
                        style={{
                          background: `linear-gradient(135deg, rgba(${GOLD},0.08), transparent)`,
                        }}
                      />
                    )}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {selectedUE && (
        <>
          <div
            className="lg:hidden fixed inset-0 bg-black/50 backdrop-blur-sm z-30 animate-fade-in"
            onClick={handleClosePanel}
          />

          <div
            ref={panelRef}
            className={
              "fixed lg:static inset-x-0 bottom-0 lg:inset-auto z-40 " +
              "lg:w-96 lg:shrink-0 " +
              "max-h-[85vh] lg:max-h-none lg:h-full " +
              "rounded-t-3xl lg:rounded-2xl " +
              "bg-white/95 backdrop-blur-xl shadow-modal lg:shadow-card " +
              "flex flex-col " +
              "transition-all duration-400 ease-out " +
              (showPanel
                ? "translate-y-0 opacity-100"
                : "translate-y-full lg:translate-y-0 lg:opacity-100 opacity-0")
            }
          >
            <div className="p-5 sm:p-6 flex flex-col h-full">
              <div className="lg:hidden w-10 h-1 bg-contact rounded-full mx-auto mb-4 shrink-0" />

              <div className="flex items-start justify-between mb-5 shrink-0">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gold/20 flex items-center justify-center animate-float">
                    <FontAwesomeIcon icon={faBookOpen} className="text-gold text-lg" />
                  </div>
                  <div>
                    <h3 className="font-bold text-navy text-lg leading-tight">
                      {selectedUE}
                    </h3>
                    <p className="text-sm text-gray-400 mt-0.5 flex items-center gap-1">
                      <FontAwesomeIcon icon={faChevronRight} className="text-[10px]" />
                      Supports pédagogiques
                    </p>
                  </div>
                </div>
                <div className="flex gap-2 shrink-0">
                  {isTeacher && (
                    <button
                      type="button"
                      onClick={() => {
                        setShowAdd((p) => !p);
                        setAddError("");
                      }}
                      className="w-8 h-8 rounded-xl bg-gold text-white
                        flex items-center justify-center hover:opacity-80
                        transition-all duration-200 active:scale-90"
                      title={showAdd ? "Fermer" : "Ajouter un support"}
                    >
                      <FontAwesomeIcon
                        icon={showAdd ? faTimes : faPlus}
                        className="text-sm"
                      />
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={handleClosePanel}
                    className="w-8 h-8 rounded-xl bg-surface text-gray-400
                      flex items-center justify-center hover:bg-contact hover:text-navy
                      transition-all duration-200 active:scale-90"
                    title="Fermer"
                  >
                    <FontAwesomeIcon icon={faTimes} className="text-sm" />
                  </button>
                </div>
              </div>

              {isTeacher && showAdd && (
                <form
                  onSubmit={handleAdd}
                  className="mb-5 p-4 bg-gradient-to-br from-gold/10 via-amber-50 to-transparent rounded-2xl border border-gold/20 flex flex-col gap-3 shrink-0 animate-slide-up"
                >
                  {addError && (
                    <p className="text-red-500 text-xs font-medium flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-red-500 shrink-0" />
                      {addError}
                    </p>
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
                    className="btn-gold w-full text-center disabled:opacity-60"
                  >
                    {saving ? (
                      <FontAwesomeIcon icon={faSpinner} className="animate-spin" />
                    ) : (
                      "Ajouter le support"
                    )}
                  </button>
                </form>
              )}

              <div className="flex flex-col gap-2 flex-1 overflow-y-auto custom-scrollbar">
                {loading && (
                  <div className="flex flex-col items-center justify-center py-16 gap-3">
                    <div className="w-10 h-10 border-4 border-navy border-t-gold rounded-full animate-spin" />
                    <p className="text-sm text-gray-400 font-medium">
                      Chargement des supports...
                    </p>
                  </div>
                )}

                {!loading && supports.length === 0 && (
                  <div className="flex flex-col items-center justify-center py-16 text-center">
                    <div className="relative mb-6">
                      <div className="absolute inset-0 bg-gold/10 rounded-full scale-[2] animate-ping opacity-30" />
                      <div className="absolute inset-0 bg-navy/5 rounded-full scale-150 blur-xl animate-pulse" />
                      <div className="relative bg-white border-2 border-gold/20 p-5 rounded-2xl shadow-lg">
                        <FontAwesomeIcon
                          icon={faFolderOpen}
                          className="text-gold/60 text-4xl animate-float"
                        />
                      </div>
                    </div>
                    <p className="text-navy font-bold text-sm mb-1">
                      Aucun support pour l'instant
                    </p>
                    <p className="text-gray-400 text-xs max-w-[200px] leading-relaxed">
                      {isTeacher
                        ? "Ajoutez des ressources pédagogiques pour vos étudiants."
                        : "Les supports seront ajoutés par vos enseignants."}
                    </p>
                  </div>
                )}

                {!loading &&
                  supports.map((s, i) => (
                    <div
                      key={s.id}
                      className="group flex items-center gap-3 p-3.5 bg-gradient-to-r from-transparent via-white to-transparent
                        rounded-xl hover:bg-gold/5 hover:border-gold/30
                        border border-transparent transition-all duration-200
                        animate-slide-up"
                      style={{ animationDelay: `${i * 60}ms`, animationFillMode: "backwards" }}
                    >
                      <div
                        className="w-9 h-9 rounded-xl bg-gradient-to-br from-gold/20 to-gold/5
                          flex items-center justify-center shrink-0
                          group-hover:from-gold/30 group-hover:to-gold/10 transition-all duration-300
                          group-hover:scale-110"
                      >
                        <FontAwesomeIcon
                          icon={faLink}
                          className="text-gold text-sm"
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
                            group-hover:text-gold transition-colors duration-200 truncate"
                        >
                          {s.label}
                        </span>
                        <FontAwesomeIcon
                          icon={faExternalLinkAlt}
                          className="text-gray-300 text-xs shrink-0
                            group-hover:text-gold transition-colors duration-200
                            opacity-0 group-hover:opacity-100 -translate-x-1 group-hover:translate-x-0
                            transition-all duration-200"
                        />
                      </a>
                      {isTeacher && (
                        <button
                          type="button"
                          onClick={() => handleDelete(s.id)}
                          className="w-7 h-7 rounded-lg text-red-300 hover:text-red-500
                            hover:bg-red-50 transition-all duration-200
                            flex items-center justify-center shrink-0
                            opacity-0 group-hover:opacity-100"
                          title="Supprimer"
                        >
                          <FontAwesomeIcon icon={faTrash} className="text-xs" />
                        </button>
                      )}
                    </div>
                  ))}
              </div>

              {!loading && supports.length > 0 && (
                <div className="mt-3 pt-3 border-t border-gold/20 shrink-0">
                  <p className="text-[11px] text-gray-400 font-medium text-center">
                    {supports.length} support{supports.length > 1 ? "s" : ""}
                  </p>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
