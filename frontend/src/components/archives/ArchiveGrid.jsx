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
  faLayerGroup,
  faFilePdf,
  faFileLines,
  faVideo,
  faCode,
  faGlobe,
  faBookmark,
  faFilter,
  faPlusCircle,
  faXmark,
} from "@fortawesome/free-solid-svg-icons";
import api from "../../api/axios";
import { useAuth } from "../../context/AuthContext";

const GOLD = "223,164,8";
const NAVY_RGB = "0,25,72";
const NAVY_HEX = "#001948";
const NAVY_DARK = "#0A1A33";

const UES_BY_LEVEL = {
  L1: [
    "WEB1", "PROG1", "SYS1", "DONNEES1", "THEORIE1-P1", "THEORIE1-P2",
    "WEB2", "PROG2-POO", "PROG2-API", "SYS2", "MGT1", "LV1",
  ],
  L2: ["WEB3", "PROG3", "MGT2", "PROG4-SYS3", "DONNEES2", "IA1"],
  L3: ["MOB1", "PROG5", "SECU1", "SECU2"],
};

const ueToLevel = Object.entries(UES_BY_LEVEL).reduce((map, [level, ues]) => {
  ues.forEach((ue) => { map[ue] = level; });
  return map;
}, {});

const YEAR_CONFIG = [
  { id: "L1", label: "PREMIERE ANNEE", subtitle: "Semestre 1 & 2", color: "from-cyan-500/20 to-transparent", badge: "bg-cyan-100 text-cyan-700" },
  { id: "L2", label: "DEUXIEME ANNEE", subtitle: "Semestre 3 & 4", color: "from-violet-500/20 to-transparent", badge: "bg-violet-100 text-violet-700" },
  { id: "L3", label: "TROISIEME ANNEE", subtitle: "Semestre 5 & 6", color: "from-amber-500/20 to-transparent", badge: "bg-amber-100 text-amber-700" },
];

const LEVEL_COLORS = {
  L1: { bg: "bg-cyan-50", border: "border-cyan-200", text: "text-cyan-700", dot: "bg-cyan-400" },
  L2: { bg: "bg-violet-50", border: "border-violet-200", text: "text-violet-700", dot: "bg-violet-400" },
  L3: { bg: "bg-amber-50", border: "border-amber-200", text: "text-amber-700", dot: "bg-amber-400" },
};

const CUSTOM_UES_KEY = "archive_custom_ues";

function loadCustomUes() {
  try {
    return JSON.parse(localStorage.getItem(CUSTOM_UES_KEY)) || {};
  } catch {
    return {};
  }
}

function saveCustomUes(data) {
  localStorage.setItem(CUSTOM_UES_KEY, JSON.stringify(data));
}

function mergeUes(hardcoded, custom) {
  const result = {};
  for (const level of ["L1", "L2", "L3"]) {
    result[level] = [...(hardcoded[level] || []), ...(custom[level] || [])];
  }
  return result;
}

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
  const [customUes, setCustomUes] = useState(loadCustomUes);
  const [showAddUE, setShowAddUE] = useState(false);
  const [addUECode, setAddUECode] = useState("");
  const [addUELevel, setAddUELevel] = useState("L1");
  const [searchTerm, setSearchTerm] = useState("");
  const [levelFilter, setLevelFilter] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(null);
  const panelRef = useRef(null);

  const effectiveUEs = mergeUes(UES_BY_LEVEL, customUes);
  const effectiveUeToLevel = Object.entries(effectiveUEs).reduce((map, [level, ues]) => {
    ues.forEach((ue) => { map[ue] = level; });
    return map;
  }, {});

  useEffect(() => {
    requestAnimationFrame(() => setVisible(true));
  }, []);

  useEffect(() => {
    api.get("/posts").then(({ data }) => {
      const allPosts = data.posts || [];
      const known = new Set(Object.keys(effectiveUeToLevel));
      const others = new Set();
      allPosts.forEach((p) => {
        if (p.ue && !known.has(p.ue)) others.add(p.ue);
      });
      setOtherUes([...others].sort());
    }).catch(() => {});
  }, [customUes]);

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
    } catch {
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
    try {
      await api.delete(`/supports/${id}`);
      setSupports((prev) => prev.filter((s) => s.id !== id));
      setConfirmDelete(null);
    } catch (err) {
      console.error(err);
    }
  };

  const allYears = [
    ...YEAR_CONFIG,
    ...(otherUes.length > 0 ? [{ id: "Autre", label: "AUTRES", subtitle: "UE non classées", color: "from-gray-500/20 to-transparent", badge: "bg-gray-100 text-gray-700" }] : []),
  ];

  const filteredYears = allYears.map((year) => {
    const ues = year.id === "Autre"
      ? otherUes
      : effectiveUEs[year.id] || [];
    const filtered = ues.filter((ue) => {
      const matchSearch = !searchTerm || ue.toLowerCase().includes(searchTerm.toLowerCase());
      const matchLevel = !levelFilter || year.id === levelFilter;
      return matchSearch && matchLevel;
    });
    return { ...year, ues: filtered };
  }).filter((y) => y.ues.length > 0 || (levelFilter && y.id === levelFilter));

  const totalSupports = supports.length;

  return (
    <div className="flex flex-col lg:flex-row gap-6 lg:gap-8 h-full min-h-0">
      <div className="flex-1 overflow-y-auto custom-scrollbar min-h-0">
        <div className="flex flex-col gap-6">
          {/* Search and Filters */}
          <div className={`flex flex-col sm:flex-row gap-3 transition-all duration-500 ${visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}`}>
            <div className="relative flex-1">
              <FontAwesomeIcon
                icon={faSearch}
                className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 text-sm pointer-events-none"
              />
              <input
                className="w-full border border-contact rounded-xl pl-10 pr-4 py-3 text-sm bg-white focus:outline-none focus:border-navy focus:ring-2 focus:ring-navy/10 transition-all duration-200 placeholder:text-gray-400"
                placeholder="Rechercher une UE..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="flex gap-2">
              {["", "L1", "L2", "L3"].map((l) => (
                <button
                  key={l}
                  type="button"
                  onClick={() => setLevelFilter(l)}
                  className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all duration-200 ${
                    levelFilter === l
                      ? "bg-navy text-white shadow-md shadow-navy/20"
                      : "bg-white text-navy border border-contact hover:border-navy/30 hover:bg-surface"
                  }`}
                >
                  {l || "Tout"}
                </button>
              ))}
            </div>
          </div>

          {/* Year Sections */}
          {filteredYears.map((year, yi) => {
            const colors = LEVEL_COLORS[year.id] || LEVEL_COLORS.L1;

            return (
              <div
                key={year.id}
                className={`transition-all duration-700 ease-out ${
                  visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
                }`}
                style={{ transitionDelay: `${yi * 150}ms` }}
              >
                {/* Year Header */}
                <div className="relative mb-5 group">
                  <div className="relative flex items-center gap-4 rounded-2xl overflow-hidden bg-white shadow-[0_2px_12px_0_rgba(0,25,72,0.08)]">
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
                      <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-navy/5">
                        <span className="text-xs font-bold text-navy/60">{year.ues.length} UE{year.ues.length > 1 ? "s" : ""}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* UE Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                  {year.ues.map((ue, ui) => {
                    const isSelected = selectedUE === ue;
                    return (
                      <button
                        key={ue}
                        type="button"
                        onClick={() => handleSelectUE(ue)}
                        className={`group relative px-4 py-4 rounded-xl text-sm font-bold
                          transition-all duration-300 active:scale-[0.96]
                          animate-slide-up flex flex-col items-center justify-center gap-2
                          min-h-[80px]
                          ${isSelected
                            ? "bg-navy text-white shadow-lg shadow-navy/30 scale-[1.02] ring-2 ring-gold/40"
                            : "bg-white text-navy border-2 border-contact/60 hover:border-gold/40 hover:shadow-lg hover:shadow-gold/5 hover:-translate-y-0.5"
                          }`}
                        style={{ animationDelay: `${yi * 150 + ui * 60}ms`, animationFillMode: "backwards" }}
                      >
                        {isSelected && (
                          <span className="absolute -top-1.5 -right-1.5 w-3.5 h-3.5 bg-gold rounded-full border-[3px] border-white animate-pulse" />
                        )}
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs transition-all duration-300 ${
                          isSelected
                            ? "bg-white/20 text-white"
                            : "bg-navy/10 text-navy group-hover:bg-gold/20 group-hover:text-gold"
                        }`}>
                          <FontAwesomeIcon icon={faBookOpen} className="text-sm" />
                        </div>
                        <span className="relative z-10 text-xs leading-tight text-center">{ue}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}

          {filteredYears.length === 0 && (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="w-16 h-16 rounded-2xl bg-navy/5 flex items-center justify-center mb-4">
                <FontAwesomeIcon icon={faSearch} className="text-navy/30 text-2xl" />
              </div>
              <p className="text-navy font-bold text-sm mb-1">Aucune UE trouvée</p>
              <p className="text-gray-400 text-xs max-w-[240px] leading-relaxed">
                Essayez de modifier votre recherche ou vos filtres.
              </p>
            </div>
          )}

          {/* Admin: Add UE */}
          {isAdmin && (
            <div className="flex flex-col gap-4 mt-2">
              {showAddUE && (
                <div className="p-5 bg-white rounded-2xl shadow-[0_2px_12px_0_rgba(0,25,72,0.08)] border border-navy/5 animate-slide-up">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-9 h-9 rounded-xl bg-navy/10 flex items-center justify-center">
                      <FontAwesomeIcon icon={faPlusCircle} className="text-navy text-sm" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-navy">Nouvelle UE</p>
                      <p className="text-xs text-gray-400">Ajouter un code UE personnalisé</p>
                    </div>
                  </div>
                  <div className="flex gap-3 mb-3">
                    <input
                      className="flex-1 border border-contact rounded-xl px-4 py-2.5 text-sm bg-white focus:outline-none focus:border-navy focus:ring-2 focus:ring-navy/10 transition-all duration-200 placeholder:text-gray-400 font-mono uppercase"
                      placeholder="Code UE (ex: NOUVELLE1)"
                      value={addUECode}
                      onChange={(e) => setAddUECode(e.target.value.toUpperCase())}
                      autoFocus
                    />
                    <select
                      className="border border-contact rounded-xl px-4 py-2.5 text-sm bg-white focus:outline-none focus:border-navy focus:ring-2 focus:ring-navy/10 transition-all duration-200 w-24"
                      value={addUELevel}
                      onChange={(e) => setAddUELevel(e.target.value)}
                    >
                      <option value="L1">L1</option>
                      <option value="L2">L2</option>
                      <option value="L3">L3</option>
                    </select>
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        const code = addUECode.trim();
                        if (!code) return;
                        const updated = { ...customUes };
                        if (!updated[addUELevel]) updated[addUELevel] = [];
                        if (updated[addUELevel].includes(code)) return;
                        updated[addUELevel] = [...updated[addUELevel], code];
                        saveCustomUes(updated);
                        setCustomUes(updated);
                        setAddUECode("");
                        setShowAddUE(false);
                      }}
                      className="bg-navy text-white rounded-xl text-sm px-5 py-2.5 hover:bg-navy/90 transition-all duration-200 active:scale-95 font-bold"
                    >
                      <FontAwesomeIcon icon={faPlus} className="mr-1.5" />
                      Ajouter
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setShowAddUE(false);
                        setAddUECode("");
                      }}
                      className="text-sm text-gray-400 hover:text-navy px-4 py-2.5 transition-colors font-medium"
                    >
                      Annuler
                    </button>
                  </div>
                </div>
              )}
              {!showAddUE && (
                <button
                  type="button"
                  onClick={() => setShowAddUE(true)}
                  className="w-full py-4 rounded-2xl border-2 border-dashed border-contact text-gray-400 hover:border-navy hover:text-navy transition-all font-bold text-sm flex items-center justify-center gap-2 group"
                >
                  <FontAwesomeIcon icon={faPlusCircle} className="group-hover:scale-110 transition-transform" />
                  Ajouter une UE
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Slide-out Panel */}
      {selectedUE && (
        <>
          {/* Mobile backdrop */}
          <div
            className="lg:hidden fixed inset-0 bg-black/40 backdrop-blur-sm z-30 animate-fade-in"
            onClick={handleClosePanel}
          />

          {/* Panel wrapper — mobile: centered overlay; desktop: static side panel */}
          <div
            ref={panelRef}
            className={
              "fixed inset-0 z-40 flex items-center justify-center p-4 " +
              "lg:static lg:block lg:p-0 lg:w-96 lg:shrink-0 lg:h-full " +
              "transition-all duration-300 ease-out " +
              (showPanel
                ? "opacity-100"
                : "opacity-0 pointer-events-none lg:pointer-events-auto lg:opacity-100")
            }
          >
            {/* Inner card — mobile: modal card; desktop: fills parent */}
            <div className={
              "w-full max-w-md max-h-[85vh] " +
              "lg:max-w-none lg:max-h-none lg:h-full " +
              "rounded-2xl " +
              "bg-white/95 backdrop-blur-xl shadow-[0_8px_32px_0_rgba(0,25,72,0.16)] lg:shadow-[0_2px_12px_0_rgba(0,25,72,0.08)] " +
              "flex flex-col " +
              "transition-all duration-300 ease-out " +
              (showPanel
                ? "scale-100 translate-y-0"
                : "scale-95 translate-y-4 lg:translate-y-0 lg:scale-100")
            }
            >
            <div className="p-5 sm:p-6 flex flex-col h-full">
              <div className="lg:hidden w-10 h-1 bg-gray-300 rounded-full mx-auto mb-4 shrink-0" />

              <div className="flex items-start justify-between mb-5 shrink-0">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-gold/20 to-gold/5 flex items-center justify-center">
                    <FontAwesomeIcon icon={faBookOpen} className="text-gold text-lg" />
                  </div>
                  <div>
                    <h3 className="font-bold text-navy text-lg leading-tight">
                      {selectedUE}
                    </h3>
                    <p className="text-xs text-gray-400 mt-0.5 flex items-center gap-1">
                      <FontAwesomeIcon icon={faChevronRight} className="text-[10px]" />
                      Supports pédagogiques
                      {totalSupports > 0 && (
                        <span className="ml-1.5 px-2 py-0.5 rounded-full bg-navy/5 text-navy/60 text-[10px] font-bold">
                          {totalSupports}
                        </span>
                      )}
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
                      className="w-9 h-9 rounded-xl bg-gold text-white flex items-center justify-center hover:opacity-80 transition-all duration-200 active:scale-90 shadow-sm"
                      title={showAdd ? "Fermer" : "Ajouter un support"}
                    >
                      <FontAwesomeIcon icon={showAdd ? faTimes : faPlus} className="text-sm" />
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={handleClosePanel}
                    className="w-9 h-9 rounded-xl bg-surface text-gray-400 flex items-center justify-center hover:bg-contact hover:text-navy transition-all duration-200 active:scale-90"
                    title="Fermer"
                  >
                    <FontAwesomeIcon icon={faTimes} className="text-sm" />
                  </button>
                </div>
              </div>

              {/* Add Support Form */}
              {isTeacher && showAdd && (
                <form
                  onSubmit={handleAdd}
                  className="mb-5 p-4 bg-gradient-to-br from-gold/10 via-amber-50 to-transparent rounded-2xl border border-gold/20 flex flex-col gap-3 shrink-0 animate-slide-up"
                >
                  {addError && (
                    <div className="flex items-center gap-2 px-3 py-2 bg-red-50 border border-red-200 rounded-xl">
                      <span className="w-1.5 h-1.5 rounded-full bg-red-500 shrink-0" />
                      <p className="text-red-500 text-xs font-medium">{addError}</p>
                    </div>
                  )}
                  <input
                    className="w-full border border-contact rounded-xl px-4 py-2.5 text-sm bg-white focus:outline-none focus:border-navy focus:ring-2 focus:ring-navy/10 transition-all duration-200 placeholder:text-gray-400"
                    placeholder="Intitulé du support *"
                    value={addForm.label}
                    onChange={(e) => {
                      setAdd("label", e.target.value);
                      setAddError("");
                    }}
                    required
                  />
                  <input
                    className="w-full border border-contact rounded-xl px-4 py-2.5 text-sm bg-white focus:outline-none focus:border-navy focus:ring-2 focus:ring-navy/10 transition-all duration-200 placeholder:text-gray-400"
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
                    className="bg-gold text-white px-5 py-2.5 rounded-full font-semibold text-sm hover:opacity-90 transition-all duration-200 cursor-pointer disabled:opacity-60 w-full text-center flex items-center justify-center gap-2"
                  >
                    {saving ? (
                      <FontAwesomeIcon icon={faSpinner} className="animate-spin" />
                    ) : (
                      <>
                        <FontAwesomeIcon icon={faPlus} className="text-xs" />
                        Ajouter le support
                      </>
                    )}
                  </button>
                </form>
              )}

              {/* Supports List */}
              <div className="flex flex-col gap-2 flex-1 overflow-y-auto custom-scrollbar">
                {loading && (
                  <div className="flex flex-col items-center justify-center py-16 gap-3">
                    <div className="w-10 h-10 border-4 border-navy border-t-gold rounded-full animate-spin" />
                    <p className="text-sm text-gray-400 font-medium">Chargement des supports...</p>
                  </div>
                )}

                {!loading && supports.length === 0 && (
                  <div className="flex flex-col items-center justify-center py-16 text-center">
                    <div className="relative mb-6">
                      <div className="absolute inset-0 bg-gold/10 rounded-full scale-[2] animate-ping opacity-30" />
                      <div className="absolute inset-0 bg-navy/5 rounded-full scale-150 blur-xl animate-pulse" />
                      <div className="relative bg-white border-2 border-gold/20 p-5 rounded-2xl shadow-lg">
                        <FontAwesomeIcon icon={faFolderOpen} className="text-gold/60 text-4xl" />
                      </div>
                    </div>
                    <p className="text-navy font-bold text-sm mb-1">Aucun support pour l'instant</p>
                    <p className="text-gray-400 text-xs max-w-[200px] leading-relaxed">
                      {isTeacher
                        ? "Ajoutez des ressources pédagogiques pour vos étudiants."
                        : "Les supports seront ajoutés par vos enseignants."}
                    </p>
                  </div>
                )}

                {!loading && supports.map((s, i) => {
                  const icon = getFileIcon(s.url);
                  return (
                    <div
                      key={s.id}
                      className="group flex items-center gap-3 p-3.5 bg-white rounded-xl hover:bg-gold/[0.03] hover:border-gold/20 border border-transparent transition-all duration-200 animate-slide-up shadow-[0_1px_3px_0_rgba(0,25,72,0.04)]"
                      style={{ animationDelay: `${i * 60}ms`, animationFillMode: "backwards" }}
                    >
                      <div
                        className="w-9 h-9 rounded-xl bg-gradient-to-br from-gold/20 to-gold/5 flex items-center justify-center shrink-0 group-hover:from-gold/30 group-hover:to-gold/10 transition-all duration-300 group-hover:scale-110"
                      >
                        <FontAwesomeIcon icon={icon} className="text-gold text-sm" />
                      </div>
                      <a
                        href={s.url}
                        target="_blank"
                        rel="noreferrer"
                        className="flex-1 min-w-0 flex items-center gap-2"
                      >
                        <span className="text-sm font-semibold text-navy group-hover:text-gold transition-colors duration-200 truncate">
                          {s.label}
                        </span>
                        <FontAwesomeIcon
                          icon={faExternalLinkAlt}
                          className="text-gray-300 text-xs shrink-0 group-hover:text-gold transition-all duration-200 opacity-0 group-hover:opacity-100 -translate-x-1 group-hover:translate-x-0"
                        />
                      </a>
                      {isTeacher && (
                        <button
                          type="button"
                          onClick={() => setConfirmDelete(s.id)}
                          className="w-7 h-7 rounded-lg text-red-300 hover:text-red-500 hover:bg-red-50 transition-all duration-200 flex items-center justify-center shrink-0 opacity-0 group-hover:opacity-100"
                          title="Supprimer"
                        >
                          <FontAwesomeIcon icon={faTrash} className="text-xs" />
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>

              {!loading && totalSupports > 0 && (
                <div className="mt-3 pt-3 border-t border-gold/20 shrink-0">
                  <p className="text-[11px] text-gray-400 font-medium text-center">
                    {totalSupports} support{totalSupports > 1 ? "s" : ""}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </>
      )}

      {/* Custom Confirm Dialog */}
      {confirmDelete && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-2xl shadow-modal p-6 w-full max-w-sm animate-slide-up">
            <div className="w-12 h-12 rounded-2xl bg-red-50 flex items-center justify-center mx-auto mb-4">
              <FontAwesomeIcon icon={faTrash} className="text-red-500 text-xl" />
            </div>
            <h3 className="font-bold text-navy text-center text-base mb-2">Supprimer ce support ?</h3>
            <p className="text-gray-400 text-sm text-center mb-6">Cette action est irréversible.</p>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setConfirmDelete(null)}
                className="flex-1 py-2.5 rounded-xl text-sm font-bold bg-surface text-navy hover:bg-contact transition-all duration-200"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={() => handleDelete(confirmDelete)}
                className="flex-1 py-2.5 rounded-xl text-sm font-bold bg-red-500 text-white hover:bg-red-600 transition-all duration-200"
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
