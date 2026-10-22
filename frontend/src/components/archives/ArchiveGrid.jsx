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
  faSearch,
  faFilePdf,
  faFileLines,
  faVideo,
  faCode,
  faGlobe,
  faPlusCircle,
  faXmark,
  faChevronDown,
  faArchive,
  faBook,
  faChalkboardUser,
  faCircleNotch,
} from "@fortawesome/free-solid-svg-icons";
import api from "../../api/axios";
import { useAuth } from "../../context/AuthContext";

const GOLD = "223,164,8";
const NAVY_RGB = "0,25,72";

const LEVEL_META = {
  L1: {
    label: "Première Année",
    subtitle: "Semestre 1 & 2",
    light: "bg-cyan-50",
    text: "text-cyan-700",
  },
  L2: {
    label: "Deuxième Année",
    subtitle: "Semestre 3 & 4",
    light: "bg-violet-50",
    text: "text-violet-700",
  },
  L3: {
    label: "Troisième Année",
    subtitle: "Semestre 5 & 6",
    light: "bg-amber-50",
    text: "text-amber-700",
  },
};

function getFileIcon(url) {
  if (!url) return faLink;
  const ext = url.split(".").pop()?.toLowerCase();
  if (ext === "pdf") return faFilePdf;
  if (["mp4", "webm", "avi"].includes(ext)) return faVideo;
  if (["js", "ts", "jsx", "tsx", "py", "java", "c", "cpp", "html", "css"].includes(ext)) return faCode;
  if (["doc", "docx", "txt", "md"].includes(ext)) return faFileLines;
  if (url.includes("youtube") || url.includes("vimeo")) return faVideo;
  return faGlobe;
}

function getFileColor(url) {
  if (!url) return "bg-blue-50 text-blue-600";
  const ext = url.split(".").pop()?.toLowerCase();
  if (ext === "pdf") return "bg-red-50 text-red-600";
  if (["mp4", "webm", "avi"].includes(ext)) return "bg-purple-50 text-purple-600";
  if (["js", "ts", "jsx", "tsx", "py", "java", "c", "cpp", "html", "css"].includes(ext)) return "bg-emerald-50 text-emerald-600";
  if (["doc", "docx", "txt", "md"].includes(ext)) return "bg-blue-50 text-blue-600";
  if (url.includes("youtube") || url.includes("vimeo")) return "bg-red-50 text-red-600";
  return "bg-gray-50 text-gray-600";
}

const LEVEL_ACCENT_COLORS = {
  L1: { from: "#06b6d4", to: "#0891b2" },
  L2: { from: "#8b5cf6", to: "#7c3aed" },
  L3: { from: "#f59e0b", to: "#d97706" },
};

export default function ArchiveGrid() {
  const { user } = useAuth();
  const isTeacher = user?.role === "teacher" || user?.role === "admin";
  const isAdmin = user?.role === "admin";

  const [selectedUE, setSelectedUE] = useState(null);
  const [supports, setSupports] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [showPanel, setShowPanel] = useState(false);
  const [addForm, setAddForm] = useState({ label: "", url: "" });
  const [saving, setSaving] = useState(false);
  const [addError, setAddError] = useState("");
  const [visible, setVisible] = useState(false);
  const [otherUes, setOtherUes] = useState([]);
  const [customUes, setCustomUes] = useState({});
  const [searchTerm, setSearchTerm] = useState("");
  const [levelFilter, setLevelFilter] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [isDesktop, setIsDesktop] = useState(false);
  const panelRef = useRef(null);

  const effectiveUeToLevel = Object.entries(customUes).reduce((map, [level, ues]) => {
    ues.forEach((ue) => { map[ue] = level; });
    return map;
  }, {});

  useEffect(() => {
    requestAnimationFrame(() => setVisible(true));
  }, []);

  useEffect(() => {
    const check = () => setIsDesktop(window.innerWidth >= 1024);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  useEffect(() => {
    api.get("/custom-ues").then(({ data }) => {
      if (Array.isArray(data)) {
        const grouped = { L1: [], L2: [], L3: [] };
        data.forEach((cu) => {
          if (grouped[cu.level]) grouped[cu.level].push(cu.ue);
        });
        setCustomUes(grouped);
      }
    }).catch(() => {});
  }, []);

  const setAdd = (k, v) => setAddForm((p) => ({ ...p, [k]: v }));

  const handleSelectUE = async (ue) => {
    setSelectedUE(ue);
    setShowAdd(false);
    setAddForm({ label: "", url: "" });
    setAddError("");
    setLoading(true);
    requestAnimationFrame(() => setShowPanel(true));
    try {
      const { data } = await api.get(`/supports/${ue}`);
      setSupports(Array.isArray(data) ? data : []);
    } catch {
      setSupports([]);
    } finally {
      setLoading(false);
    }
  };

  const handleClosePanel = () => {
    setShowPanel(false);
    setTimeout(() => {
      setSelectedUE(null);
      setShowAdd(false);
      setSupports([]);
    }, 300);
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
    try {
      await api.delete(`/supports/${id}`);
      setSupports((prev) => prev.filter((s) => s.id !== id));
      setConfirmDelete(null);
    } catch (err) {
      console.error(err);
    }
  };

  const allLevels = [...Object.keys(LEVEL_META), ...(otherUes.length > 0 ? ["Autre"] : [])];

  const filteredLevels = allLevels.filter((levelId) => {
    if (levelId === "Autre") return !levelFilter || levelFilter === "Autre";
    if (levelFilter && levelId !== levelFilter) return false;
    const ues = levelId === "Autre" ? otherUes : customUes[levelId] || [];
    if (searchTerm) {
      return ues.some((ue) => ue.toLowerCase().includes(searchTerm.toLowerCase()));
    }
    return true;
  });

  const selectedMeta = selectedUE
    ? LEVEL_META[effectiveUeToLevel[selectedUE]] || LEVEL_META.L1
    : null;

  const supportsCount = supports.length;
  const selectedLevel = selectedUE ? effectiveUeToLevel[selectedUE] || "Autre" : null;

  const marginRight = isDesktop && showPanel ? "calc(28rem + 1.5rem)" : "0";

  const renderPanelContent = (scrollable = true) => (
    <>
      <div className="flex items-start justify-between px-5 sm:px-6 pt-5 sm:pt-6 pb-0 shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <div
            className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${
              selectedMeta ? selectedMeta.light : "bg-[#F6F7F8]"
            }`}
          >
            <FontAwesomeIcon
              icon={faBookOpen}
              className={`text-lg ${selectedMeta ? selectedMeta.text : "text-navy"}`}
            />
          </div>
          <div className="min-w-0">
            <h3 className="font-semibold text-navy text-lg leading-tight truncate">
              {selectedUE}
            </h3>
            <p className="text-xs text-gray-400 mt-0.5 flex items-center gap-1">
              <FontAwesomeIcon icon={faChevronRight} className="text-[10px]" />
              Supports pédagogiques
              {supportsCount > 0 && (
                <span className="ml-1.5 px-2 py-0.5 rounded-full bg-navy/5 text-navy/60 text-[10px] font-medium">
                  {supportsCount}
                </span>
              )}
            </p>
          </div>
        </div>
        <div className="flex gap-2 shrink-0 ml-3">
          {isTeacher && (
            <button
              type="button"
              onClick={() => { setShowAdd((p) => !p); setAddError(""); }}
              className="w-9 h-9 rounded-xl bg-gold text-navy-dark flex items-center justify-center hover:bg-gold-light transition-all duration-200 active:scale-90"
              title={showAdd ? "Fermer" : "Ajouter un support"}
            >
              <FontAwesomeIcon icon={showAdd ? faTimes : faPlus} className="text-sm" />
            </button>
          )}
          <button
            type="button"
            onClick={handleClosePanel}
            className="w-9 h-9 rounded-xl bg-[#F6F7F8] text-gray-400 flex items-center justify-center hover:bg-white hover:text-navy transition-all duration-200 active:scale-90"
            title="Fermer"
          >
            <FontAwesomeIcon icon={faTimes} className="text-sm" />
          </button>
        </div>
      </div>

      {isTeacher && showAdd && (
        <div className="px-5 sm:px-6 pt-4 shrink-0">
          <form onSubmit={handleAdd} className="p-4 bg-[#F6F7F8] rounded-2xl border border-gray-100 flex flex-col gap-3">
            {addError && (
              <div className="flex items-center gap-2 px-3 py-2 bg-red-50 border border-red-200 rounded-xl">
                <span className="w-1.5 h-1.5 rounded-full bg-red-500 shrink-0" />
                <p className="text-red-500 text-xs font-medium">{addError}</p>
              </div>
            )}
            <input className="input-field" placeholder="Intitulé du support *" value={addForm.label} onChange={(e) => { setAdd("label", e.target.value); setAddError(""); }} required />
            <input className="input-field" placeholder="URL (https://...) *" value={addForm.url} onChange={(e) => { setAdd("url", e.target.value); setAddError(""); }} required />
            <button type="submit" disabled={saving} className="btn-primary w-full justify-center disabled:opacity-60">
              {saving ? <FontAwesomeIcon icon={faCircleNotch} className="animate-spin" /> : "Ajouter le support"}
            </button>
          </form>
        </div>
      )}

        <div className={`flex flex-col ${scrollable ? "flex-1 min-h-0" : ""} px-5 sm:px-6 pt-4 pb-5 sm:pb-6`}>
          <div className={`flex flex-col gap-2 ${scrollable ? "flex-1 overflow-y-auto min-h-0 custom-scrollbar" : ""}`}>
          {loading && (
            <div className="flex flex-col items-center justify-center flex-1 gap-3">
              <FontAwesomeIcon icon={faCircleNotch} className="animate-spin text-navy/30 text-3xl" />
              <p className="text-sm text-gray-400 font-medium">Chargement des supports...</p>
            </div>
          )}

          {!loading && supports.length === 0 && (
            <div className="flex flex-col items-center justify-center flex-1 text-center">
              <div className="relative mb-6">
                <div className="w-16 h-16 rounded-2xl bg-[#F6F7F8] border border-gray-100 flex items-center justify-center">
                  <FontAwesomeIcon icon={faFolderOpen} className="text-navy/40 text-2xl" />
                </div>
              </div>
              <p className="text-navy font-semibold text-sm mb-1">Aucun support pour l'instant</p>
              <p className="text-gray-400 text-xs max-w-[220px] leading-relaxed">
                {isTeacher ? "Ajoutez des ressources pédagogiques pour vos étudiants." : "Les supports seront ajoutés par vos enseignants."}
              </p>
            </div>
          )}

          {!loading && supports.map((s) => {
            const icon = getFileIcon(s.url);
            return (
              <div key={s.id} className="group flex items-center gap-3 p-3.5 bg-white rounded-xl hover:bg-[#F6F7F8] border border-gray-100 transition-all duration-200 min-w-0">
                <div className={`w-9 h-9 rounded-lg ${getFileColor(s.url)} flex items-center justify-center shrink-0`}>
                  <FontAwesomeIcon icon={icon} className="text-sm" />
                </div>
                <a href={s.url} target="_blank" rel="noreferrer" className="flex-1 min-w-0 truncate text-sm font-medium text-navy">
                  {s.label}
                  <FontAwesomeIcon icon={faExternalLinkAlt} className="ml-1 text-gray-300 group-hover:text-gray-400 transition-all duration-200 opacity-0 group-hover:opacity-100 text-xs" />
                </a>
                {isTeacher && (
                  <button type="button" onClick={() => setConfirmDelete(s.id)} className="w-7 h-7 rounded-lg text-red-300 hover:text-red-500 hover:bg-red-50 transition-all duration-200 flex items-center justify-center shrink-0 opacity-0 group-hover:opacity-100" title="Supprimer">
                    <FontAwesomeIcon icon={faTrash} className="text-xs" />
                  </button>
                )}
              </div>
            );
          })}
        </div>

        {!loading && supportsCount > 0 && (
          <div className="mt-3 pt-3 border-t border-gray-100 shrink-0">
            <p className="text-[11px] text-gray-400 font-medium text-center">
              {supportsCount} support{supportsCount > 1 ? "s" : ""}
            </p>
          </div>
        )}
      </div>
    </>
  );

  const mobilePanelContent = !isDesktop && showPanel && selectedLevel && (
    <div className="mb-4 mx-auto w-full max-w-sm bg-white rounded-2xl border border-gray-100 shadow-modal overflow-hidden">
      {renderPanelContent(false)}
    </div>
  );

  return (
    <div className="flex flex-col">
      <div
        className="flex-1 min-w-0 transition-all duration-300 ease-out"
        style={{ marginRight }}
      >
        <div className="flex flex-col gap-6">

          {/* Search & Filters */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <FontAwesomeIcon
                icon={faSearch}
                className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 text-sm pointer-events-none"
              />
              <input
                className="input-field pl-10"
                placeholder="Rechercher une UE..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="flex gap-2 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
              {[
                { value: "", label: "Tout" },
                { value: "L1", label: "L1" },
                { value: "L2", label: "L2" },
                { value: "L3", label: "L3" },
              ].map((l) => (
                <button
                  key={l.value}
                  type="button"
                  onClick={() => setLevelFilter(l.value)}
                  className={`relative px-4 py-2 rounded-full text-xs font-medium transition-all duration-200 whitespace-nowrap shrink-0 ${
                    levelFilter === l.value
                      ? "bg-navy text-white"
                      : "bg-white text-navy border border-gray-100 hover:bg-[#F6F7F8]"
                  }`}
                >
                  {l.label}
                </button>
              ))}
            </div>
          </div>

          {/* Year Sections */}
          {filteredLevels.map((levelId, yi) => {
            if (levelId === "Autre") {
              const ues = otherUes.filter((ue) =>
                !searchTerm || ue.toLowerCase().includes(searchTerm.toLowerCase())
              );
              if (ues.length === 0 && levelFilter !== "Autre") return null;
              return (
                <LevelSection
                  key="Autre"
                  levelId="Autre"
                  ues={ues}
                  selectedUE={selectedUE}
                  visible={visible}
                  yi={yi}
                  onSelect={handleSelectUE}
                  searchTerm={searchTerm}
                  panelContent={selectedLevel === "Autre" ? mobilePanelContent : null}
                />
              );
            }

            const meta = LEVEL_META[levelId];
            const ues = (customUes[levelId] || []).filter((ue) =>
              !searchTerm || ue.toLowerCase().includes(searchTerm.toLowerCase())
            );
            if (ues.length === 0 && levelFilter !== levelId) return null;

            return (
              <LevelSection
                key={levelId}
                levelId={levelId}
                meta={meta}
                ues={ues}
                selectedUE={selectedUE}
                visible={visible}
                yi={yi}
                onSelect={handleSelectUE}
                searchTerm={searchTerm}
                panelContent={levelId === selectedLevel ? mobilePanelContent : null}
              />
            );
          })}

          {filteredLevels.length === 0 && (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="w-20 h-20 rounded-full bg-[#F6F7F8] border border-gray-100 flex items-center justify-center mb-5">
                <FontAwesomeIcon icon={faSearch} className="text-navy/40 text-3xl" />
              </div>
              <p className="text-navy font-semibold text-base mb-1">Aucune UE trouvée</p>
              <p className="text-gray-400 text-sm max-w-[260px] leading-relaxed">
                Aucun résultat ne correspond à votre recherche. Essayez de modifier vos filtres.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Desktop: fixed right panel (independent of grid scroll) */}
      {isDesktop && selectedUE && (
        <div
          ref={panelRef}
          className={
            "fixed right-6 top-[5.5rem] bottom-6 w-[28rem] z-40 bg-white rounded-2xl border border-gray-100 shadow-modal flex flex-col " +
            "transition-all duration-300 ease-out " +
            (showPanel
              ? "translate-x-0 opacity-100"
              : "translate-x-[calc(100%+1.5rem)] opacity-0 pointer-events-none")
          }
        >
          <div className="flex flex-col flex-1 min-h-0 max-w-full overflow-hidden">
            {renderPanelContent()}
          </div>
        </div>
      )}

      {/* Custom Confirm Dialog */}
      {confirmDelete && (
        <div className="fixed inset-0 bg-navy/40 z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-modal p-6 w-full max-w-sm animate-slide-up">
            <div className="w-12 h-12 rounded-2xl bg-red-50 flex items-center justify-center mx-auto mb-4">
              <FontAwesomeIcon icon={faTrash} className="text-red-500 text-xl" />
            </div>
            <h3 className="font-semibold text-navy text-center text-base mb-2">Supprimer ce support ?</h3>
            <p className="text-gray-400 text-sm text-center mb-6">Cette action est irréversible.</p>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setConfirmDelete(null)}
                className="btn-primary flex-1 justify-center"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={() => handleDelete(confirmDelete)}
                className="btn-danger flex-1 justify-center"
              >
                Supprimer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function LevelSection({ levelId, meta, ues, selectedUE, visible, yi, onSelect, panelContent }) {
  if (levelId === "Autre") {
    const navylessUes = ues;
    if (navylessUes.length === 0) return null;
    return (
      <div
        className={`transition-all duration-700 ease-out ${
          visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"
        }`}
        style={{ transitionDelay: `${yi * 120}ms` }}
      >
        <div className="relative mb-4 group">
          <div className="relative flex items-center gap-4 rounded-2xl overflow-hidden bg-white border border-gray-100">
            <div className="absolute left-0 top-0 bottom-0 w-1 bg-gray-300" />
            <div className="flex items-center gap-4 px-5 py-4 w-full">
              <div className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center shrink-0">
                <FontAwesomeIcon icon={faArchive} className="text-gray-500 text-base" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-navy text-sm tracking-wide">Autres UE</h3>
                <p className="text-xs text-gray-400 mt-0.5 font-medium">UE non classées</p>
              </div>
              <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#F6F7F8]">
                <span className="text-xs font-medium text-navy/50">{navylessUes.length} UE{navylessUes.length > 1 ? "s" : ""}</span>
              </div>
            </div>
          </div>
        </div>
        {panelContent}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2.5 sm:gap-3">
          {navylessUes.map((ue, ui) => {
            const isSelected = selectedUE === ue;
            return (
              <button
                key={ue}
                type="button"
                onClick={() => onSelect(ue)}
                className={`group relative px-3 py-3.5 rounded-xl text-xs font-medium
                  transition-all duration-300 active:scale-[0.96] flex flex-col items-center justify-center gap-2 min-h-[72px] overflow-hidden
                  ${isSelected
                    ? "bg-navy text-white"
                    : "bg-white text-navy border border-gray-100 hover:bg-[#F6F7F8]"
                  }`}
                style={{ animationDelay: `${ui * 50}ms`, animationFillMode: "backwards" }}
              >
                {isSelected && (
                  <span className="absolute -top-1 -right-1 w-3 h-3 bg-gold rounded-full border-2 border-white" />
                )}
                <div className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs transition-all duration-300 ${
                  isSelected ? "bg-white/20 text-white" : "bg-gray-100 text-gray-500"
                }`}>
                  <FontAwesomeIcon icon={faArchive} className="text-[10px]" />
                </div>
                <span className="relative z-10 leading-tight text-center truncate w-full px-1">{ue}</span>
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  const colors = LEVEL_ACCENT_COLORS[levelId] || LEVEL_ACCENT_COLORS.L1;
  const safeUes = ues || [];

  return (
    <div
      className={`transition-all duration-700 ease-out overflow-x-hidden ${
        visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"
      }`}
      style={{ transitionDelay: `${yi * 120}ms` }}
    >
      {/* Year Header */}
      <div className="relative mb-4 group">
        <div className="relative flex items-center gap-4 rounded-2xl overflow-hidden bg-white border border-gray-100">
          <div
            className="absolute left-0 top-0 bottom-0 w-1"
            style={{ background: colors.from }}
          />
          <div className="flex items-center gap-4 px-5 py-4 w-full">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${meta.light}`}>
              <FontAwesomeIcon icon={faGraduationCap} className={`text-base ${meta.text}`} />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-navy text-sm sm:text-base tracking-wide truncate">
                {meta.label}
              </h3>
              <p className="text-xs text-gray-400 mt-0.5 font-medium">
                {meta.subtitle}
              </p>
            </div>
            <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#F6F7F8]">
              <span className="text-xs font-medium text-navy/50">{safeUes.length} UE{safeUes.length > 1 ? "s" : ""}</span>
            </div>
          </div>
        </div>
      </div>

      {panelContent}

      {/* UE Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2.5 sm:gap-3">
        {safeUes.map((ue, ui) => {
          const isSelected = selectedUE === ue;
          return (
            <button
              key={ue}
              type="button"
              onClick={() => onSelect(ue)}
              className={`group relative px-3 py-3.5 rounded-xl text-xs font-medium
                transition-all duration-300 active:scale-[0.96] flex flex-col items-center justify-center gap-2 min-h-[72px] sm:min-h-[80px] overflow-hidden
                ${isSelected
                  ? "bg-navy text-white"
                  : "bg-white text-navy border border-gray-100 hover:bg-[#F6F7F8]"
                }`}
              style={{
                transitionDelay: `${ui * 40}ms`,
                animationFillMode: "backwards",
              }}
            >
              {isSelected && (
                <span className="absolute -top-1 -right-1 w-3 h-3 bg-gold rounded-full border-2 border-white" />
              )}
              <div className={`w-7 h-7 sm:w-8 sm:h-8 rounded-lg flex items-center justify-center text-xs transition-all duration-300 ${
                isSelected
                  ? "bg-white/20 text-white"
                  : `${meta.light} ${meta.text}`
              }`}
              >
                <FontAwesomeIcon icon={faBookOpen} className="text-[10px] sm:text-sm" />
              </div>
              <span className="relative z-10 leading-tight text-center font-medium truncate w-full px-1">{ue}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}