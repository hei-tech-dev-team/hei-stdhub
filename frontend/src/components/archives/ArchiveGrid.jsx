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

const UES_BY_LEVEL = {
  L1: [
    "WEB1", "PROG1", "SYS1", "DONNEES1", "THEORIE1-P1", "THEORIE1-P2",
    "WEB2", "PROG2-POO", "PROG2-API", "SYS2", "MGT1", "LV1",
  ],
  L2: ["WEB3", "PROG3", "MGT2", "PROG4-SYS3", "DONNEES2", "IA1"],
  L3: ["MOB1", "PROG5", "SECU1", "SECU2"],
};

const LEVEL_META = {
  L1: {
    label: "Première Année",
    subtitle: "Semestre 1 & 2",
    gradient: "from-cyan-500/10 via-cyan-500/5 to-transparent",
    accent: "bg-cyan-500",
    light: "bg-cyan-50",
    border: "border-cyan-200",
    text: "text-cyan-700",
    dot: "bg-cyan-400",
    badge: "bg-cyan-100 text-cyan-700",
    glow: "rgba(6,182,212,0.15)",
    icon: "01",
    ring: "ring-cyan-500/20",
  },
  L2: {
    label: "Deuxième Année",
    subtitle: "Semestre 3 & 4",
    gradient: "from-violet-500/10 via-violet-500/5 to-transparent",
    accent: "bg-violet-500",
    light: "bg-violet-50",
    border: "border-violet-200",
    text: "text-violet-700",
    dot: "bg-violet-400",
    badge: "bg-violet-100 text-violet-700",
    glow: "rgba(139,92,246,0.15)",
    icon: "02",
    ring: "ring-violet-500/20",
  },
  L3: {
    label: "Troisième Année",
    subtitle: "Semestre 5 & 6",
    gradient: "from-amber-500/10 via-amber-500/5 to-transparent",
    accent: "bg-amber-500",
    light: "bg-amber-50",
    border: "border-amber-200",
    text: "text-amber-700",
    dot: "bg-amber-400",
    badge: "bg-amber-100 text-amber-700",
    glow: "rgba(245,158,11,0.15)",
    icon: "03",
    ring: "ring-amber-500/20",
  },
};

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

function getFileColor(url) {
  if (!url) return "from-blue-500/20 to-blue-500/5 text-blue-600";
  const ext = url.split(".").pop()?.toLowerCase();
  if (ext === "pdf") return "from-red-500/20 to-red-500/5 text-red-600";
  if (["mp4", "webm", "avi"].includes(ext)) return "from-purple-500/20 to-purple-500/5 text-purple-600";
  if (["js", "ts", "jsx", "tsx", "py", "java", "c", "cpp", "html", "css"].includes(ext)) return "from-emerald-500/20 to-emerald-500/5 text-emerald-600";
  if (["doc", "docx", "txt", "md"].includes(ext)) return "from-blue-500/20 to-blue-500/5 text-blue-600";
  if (url.includes("youtube") || url.includes("vimeo")) return "from-red-500/20 to-red-500/5 text-red-600";
  return "from-gray-500/20 to-gray-500/5 text-gray-600";
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
  const [showAddUE, setShowAddUE] = useState(false);
  const [addUECode, setAddUECode] = useState("");
  const [addUELevel, setAddUELevel] = useState("L1");
  const [searchTerm, setSearchTerm] = useState("");
  const [levelFilter, setLevelFilter] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [isDesktop, setIsDesktop] = useState(false);
  const [clickOrigin, setClickOrigin] = useState({ x: 0, y: 0 });
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

  const handleSelectUE = async (ue, event) => {
    if (event?.currentTarget) {
      const rect = event.currentTarget.getBoundingClientRect();
      setClickOrigin({
        x: rect.left + rect.width / 2,
        y: rect.top + rect.height / 2,
      });
    }
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
    const ues = levelId === "Autre" ? otherUes : effectiveUEs[levelId] || [];
    if (searchTerm) {
      return ues.some((ue) => ue.toLowerCase().includes(searchTerm.toLowerCase()));
    }
    return true;
  });

  const selectedMeta = selectedUE
    ? LEVEL_META[effectiveUeToLevel[selectedUE]] || LEVEL_META.L1
    : null;

  const supportsCount = supports.length;

  const marginRight = isDesktop && showPanel ? "calc(28rem + 1.5rem)" : "0";

  const renderPanelContent = (scrollable = true) => (
    <>
      <div className="flex items-start justify-between px-5 sm:px-6 pt-5 sm:pt-6 pb-0 shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <div
            className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0"
            style={{
              background: selectedMeta
                ? `linear-gradient(135deg, ${LEVEL_ACCENT_COLORS[effectiveUeToLevel[selectedUE]]?.from || "#06b6d4"}20, ${LEVEL_ACCENT_COLORS[effectiveUeToLevel[selectedUE]]?.to || "#0891b2"}10)`
                : "linear-gradient(135deg, rgba(223,164,8,0.2), rgba(223,164,8,0.1))",
            }}
          >
            <FontAwesomeIcon
              icon={faBookOpen}
              className="text-lg"
              style={{
                color: selectedMeta
                  ? LEVEL_ACCENT_COLORS[effectiveUeToLevel[selectedUE]]?.from || "#06b6d4"
                  : "#DFA408",
              }}
            />
          </div>
          <div className="min-w-0">
            <h3 className="font-bold text-navy text-lg leading-tight truncate">
              {selectedUE}
            </h3>
            <p className="text-xs text-gray-400 mt-0.5 flex items-center gap-1">
              <FontAwesomeIcon icon={faChevronRight} className="text-[10px]" />
              Supports pédagogiques
              {supportsCount > 0 && (
                <span className="ml-1.5 px-2 py-0.5 rounded-full bg-navy/5 text-navy/60 text-[10px] font-bold">
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

      {isTeacher && showAdd && (
        <div className="px-5 sm:px-6 pt-4 shrink-0">
          <form onSubmit={handleAdd} className="p-4 bg-gradient-to-br from-gold/10 via-amber-50 to-transparent rounded-2xl border border-gold/20 flex flex-col gap-3">
            {addError && (
              <div className="flex items-center gap-2 px-3 py-2 bg-red-50 border border-red-200 rounded-xl">
                <span className="w-1.5 h-1.5 rounded-full bg-red-500 shrink-0" />
                <p className="text-red-500 text-xs font-medium">{addError}</p>
              </div>
            )}
            <input className="w-full bg-white border border-contact/60 rounded-xl px-4 py-2.5 text-sm text-navy placeholder:text-gray-400 focus:outline-none focus:border-navy/40 focus:ring-2 focus:ring-navy/5 transition-all" placeholder="Intitulé du support *" value={addForm.label} onChange={(e) => { setAdd("label", e.target.value); setAddError(""); }} required />
            <input className="w-full bg-white border border-contact/60 rounded-xl px-4 py-2.5 text-sm text-navy placeholder:text-gray-400 focus:outline-none focus:border-navy/40 focus:ring-2 focus:ring-navy/5 transition-all" placeholder="URL (https://...) *" value={addForm.url} onChange={(e) => { setAdd("url", e.target.value); setAddError(""); }} required />
            <button type="submit" disabled={saving} className="w-full bg-gold text-white px-5 py-2.5 rounded-xl font-bold text-sm hover:opacity-90 transition-all duration-200 disabled:opacity-60 active:scale-[0.97]">
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
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-gold/20 to-gold/5 flex items-center justify-center ring-1 ring-gold/10">
                  <FontAwesomeIcon icon={faFolderOpen} className="text-gold/60 text-2xl" />
                </div>
              </div>
              <p className="text-navy font-bold text-sm mb-1">Aucun support pour l'instant</p>
              <p className="text-gray-400 text-xs max-w-[220px] leading-relaxed">
                {isTeacher ? "Ajoutez des ressources pédagogiques pour vos étudiants." : "Les supports seront ajoutés par vos enseignants."}
              </p>
            </div>
          )}

          {!loading && supports.map((s) => {
            const icon = getFileIcon(s.url);
            return (
              <div key={s.id} className="group flex items-center gap-3 p-3.5 bg-white rounded-xl hover:bg-gold/[0.02] border border-contact/40 hover:border-gold/20 transition-all duration-200 shadow-sm">
                <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${getFileColor(s.url)} flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform duration-300`}>
                  <FontAwesomeIcon icon={icon} className="text-sm" />
                </div>
                <a href={s.url} target="_blank" rel="noreferrer" className="flex-1 min-w-0 flex items-center gap-2">
                  <span className="text-sm font-semibold text-navy group-hover:text-gold transition-colors duration-200 truncate">{s.label}</span>
                  <FontAwesomeIcon icon={faExternalLinkAlt} className="text-gray-300 text-xs shrink-0 group-hover:text-gold transition-all duration-200 opacity-0 group-hover:opacity-100 -translate-x-1 group-hover:translate-x-0" />
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
          <div className="mt-3 pt-3 border-t border-gold/20 shrink-0">
            <p className="text-[11px] text-gray-400 font-medium text-center">
              {supportsCount} support{supportsCount > 1 ? "s" : ""}
            </p>
          </div>
        )}
      </div>
    </>
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
                className="w-full bg-white border border-contact/60 rounded-xl pl-10 pr-4 py-3 text-sm text-navy
                  placeholder:text-gray-400 focus:outline-none focus:border-navy/40 focus:ring-2 focus:ring-navy/5
                  transition-all duration-200 shadow-sm"
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
                  className={`relative px-4 py-2.5 rounded-xl text-xs font-bold transition-all duration-200 whitespace-nowrap shrink-0 ${
                    levelFilter === l.value
                      ? "bg-navy text-white shadow-md shadow-navy/20"
                      : "bg-white text-navy border border-contact/60 hover:border-navy/30 hover:bg-surface/50 shadow-sm"
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
                />
              );
            }

            const meta = LEVEL_META[levelId];
            const ues = (effectiveUEs[levelId] || []).filter((ue) =>
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
              />
            );
          })}

          {filteredLevels.length === 0 && (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="w-20 h-20 rounded-full bg-gradient-to-br from-gold/20 to-gold/5 flex items-center justify-center mb-5 ring-1 ring-gold/10">
                <FontAwesomeIcon icon={faSearch} className="text-gold/40 text-3xl" />
              </div>
              <p className="text-navy font-bold text-base mb-1">Aucune UE trouvée</p>
              <p className="text-gray-400 text-sm max-w-[260px] leading-relaxed">
                Aucun résultat ne correspond à votre recherche. Essayez de modifier vos filtres.
              </p>
            </div>
          )}

          {/* Admin: Add UE */}
          {isAdmin && (
            <div className="mt-2">
              {showAddUE ? (
                <div className="p-5 sm:p-6 bg-white rounded-2xl shadow-card border border-navy/5">
                  <div className="flex items-center gap-3 mb-5">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-gold/20 to-gold/5 flex items-center justify-center">
                      <FontAwesomeIcon icon={faPlusCircle} className="text-gold" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-navy">Nouvelle UE personnalisée</p>
                      <p className="text-xs text-gray-400">Ajoutez un code UE qui n'existe pas encore</p>
                    </div>
                  </div>
                  <div className="flex flex-col sm:flex-row gap-3 mb-4">
                    <input
                      className="flex-1 bg-white border border-contact/60 rounded-xl px-4 py-3 text-sm text-navy
                        placeholder:text-gray-400 focus:outline-none focus:border-navy/40 focus:ring-2 focus:ring-navy/5
                        transition-all font-mono uppercase"
                      placeholder="Code UE (ex: NOUVELLE1)"
                      value={addUECode}
                      onChange={(e) => setAddUECode(e.target.value.toUpperCase())}
                      autoFocus
                    />
                    <select
                      className="bg-white border border-contact/60 rounded-xl px-4 py-3 text-sm text-navy
                        focus:outline-none focus:border-navy/40 focus:ring-2 focus:ring-navy/5 transition-all"
                      value={addUELevel}
                      onChange={(e) => setAddUELevel(e.target.value)}
                    >
                      <option value="L1">L1 — Première Année</option>
                      <option value="L2">L2 — Deuxième Année</option>
                      <option value="L3">L3 — Troisième Année</option>
                    </select>
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={async () => {
                        const code = addUECode.trim();
                        if (!code) return;
                        try {
                          await api.post("/custom-ues", { ue: code, level: addUELevel });
                          setCustomUes((prev) => {
                            const updated = { ...prev };
                            if (!updated[addUELevel]) updated[addUELevel] = [];
                            if (!updated[addUELevel].includes(code)) {
                              updated[addUELevel] = [...updated[addUELevel], code];
                            }
                            return updated;
                          });
                          setAddUECode("");
                          setShowAddUE(false);
                        } catch (err) {
                          if (err.response?.status === 409) return;
                        }
                      }}
                      className="inline-flex items-center gap-2 bg-navy text-white px-5 py-2.5 rounded-xl text-sm font-bold
                        hover:bg-navy-dark transition-all duration-200 active:scale-[0.97]"
                    >
                      <FontAwesomeIcon icon={faPlus} className="text-xs" />
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
              ) : (
                <button
                  type="button"
                  onClick={() => setShowAddUE(true)}
                  className="w-full group flex items-center gap-4 p-4 sm:p-5 bg-white rounded-2xl shadow-card border border-dashed border-contact/60 hover:border-gold/40 transition-all duration-200 hover:shadow-md active:scale-[0.99]"
                >
                  <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-gold/20 to-gold/5 flex items-center justify-center group-hover:from-gold/30 group-hover:to-gold/10 transition-all duration-300">
                    <FontAwesomeIcon icon={faPlus} className="text-gold text-lg" />
                  </div>
                  <div className="text-left">
                    <p className="font-bold text-navy text-sm group-hover:text-gold transition-colors">
                      Ajouter une UE personnalisée
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      Créez un nouveau code UE pour y attacher des supports
                    </p>
                  </div>
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Mobile: centered modal that zooms from the tapped card */}
      {!isDesktop && selectedUE && (
        <>
          <div
            className={`fixed inset-0 bg-black/40 backdrop-blur-sm z-30 transition-all duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)] ${
              showPanel ? "opacity-100" : "opacity-0 pointer-events-none"
            }`}
            onClick={handleClosePanel}
          />
          <div
            className={`fixed inset-0 z-40 flex items-center justify-center p-4 sm:p-6 transition-all duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)] ${
              showPanel ? "scale-100 opacity-100" : "scale-0 opacity-0 pointer-events-none"
            }`}
            style={{ transformOrigin: `${clickOrigin.x}px ${clickOrigin.y}px` }}
            onClick={handleClosePanel}
          >
            <div
              ref={panelRef}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-2xl shadow-modal flex flex-col w-full max-w-lg"
            >
              {renderPanelContent(false)}
            </div>
          </div>
        </>
      )}

      {/* Desktop: fixed right panel (independent of grid scroll) */}
      {isDesktop && selectedUE && (
        <div
          ref={panelRef}
          className={
            "fixed right-6 top-[5.5rem] bottom-6 w-[28rem] z-40 bg-white rounded-2xl shadow-2xl flex flex-col " +
            "transition-all duration-300 ease-out " +
            (showPanel
              ? "translate-x-0 opacity-100"
              : "translate-x-[calc(100%+1.5rem)] opacity-0 pointer-events-none")
          }
        >
          <div className="flex flex-col flex-1 min-h-0">
            {renderPanelContent()}
          </div>
        </div>
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
                className="flex-1 bg-navy text-white px-5 py-2.5 rounded-xl font-semibold text-sm
                  hover:bg-navy-dark transition-all duration-200"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={() => handleDelete(confirmDelete)}
                className="flex-1 bg-red-500 text-white px-5 py-2.5 rounded-xl font-semibold text-sm
                  hover:bg-red-600 transition-all duration-200"
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

function LevelSection({ levelId, meta, ues, selectedUE, visible, yi, onSelect }) {
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
          <div className="relative flex items-center gap-4 rounded-2xl overflow-hidden bg-white shadow-sm border border-contact/40">
            <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-gray-400 to-gray-300" />
            <div className="flex items-center gap-4 px-5 py-4 w-full bg-gradient-to-r from-gray-50 to-transparent">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-gray-200 to-gray-100 flex items-center justify-center shrink-0">
                <FontAwesomeIcon icon={faArchive} className="text-gray-500 text-base" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-bold text-navy text-sm tracking-wide">Autres UE</h3>
                <p className="text-xs text-gray-400 mt-0.5">UE non classées</p>
              </div>
              <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gray-100">
                <span className="text-xs font-bold text-gray-500">{navylessUes.length} UE{navylessUes.length > 1 ? "s" : ""}</span>
              </div>
            </div>
          </div>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2.5 sm:gap-3">
          {navylessUes.map((ue, ui) => {
            const isSelected = selectedUE === ue;
            return (
              <button
                key={ue}
                type="button"
                onClick={(e) => onSelect(ue, e)}
                className={`group relative px-3 py-3.5 rounded-xl text-xs font-bold
                  transition-all duration-300 active:scale-[0.96] flex flex-col items-center justify-center gap-2 min-h-[72px] overflow-hidden
                  ${isSelected
                    ? "bg-navy text-white shadow-lg shadow-navy/30 scale-[1.02]"
                    : "bg-white text-navy border border-contact/40 hover:border-gray-400/50 hover:shadow-md hover:-translate-y-0.5"
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
      className={`transition-all duration-700 ease-out ${
        visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"
      }`}
      style={{ transitionDelay: `${yi * 120}ms` }}
    >
      {/* Year Header */}
      <div className="relative mb-4 group">
        <div className="relative flex items-center gap-4 rounded-2xl overflow-hidden bg-white shadow-sm border border-contact/40">
          <div
            className="absolute left-0 top-0 bottom-0 w-1"
            style={{ background: `linear-gradient(to bottom, ${colors.from}, ${colors.to})` }}
          />
          <div
            className="flex items-center gap-4 px-5 py-4 w-full"
            style={{ background: `linear-gradient(135deg, ${colors.from}12, transparent)` }}
          >
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 shadow-sm"
              style={{ background: `linear-gradient(135deg, ${colors.from}, ${colors.to})` }}
            >
              <FontAwesomeIcon icon={faGraduationCap} className="text-white text-base" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-bold text-navy text-sm sm:text-base tracking-wide truncate">
                {meta.label}
              </h3>
              <p className="text-xs text-gray-400 mt-0.5 font-medium">
                {meta.subtitle}
              </p>
            </div>
            <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-navy/5">
              <span className="text-xs font-bold text-navy/60">{safeUes.length} UE{safeUes.length > 1 ? "s" : ""}</span>
            </div>
          </div>
        </div>
      </div>

      {/* UE Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2.5 sm:gap-3">
        {safeUes.map((ue, ui) => {
          const isSelected = selectedUE === ue;
          return (
            <button
              key={ue}
              type="button"
              onClick={(e) => onSelect(ue, e)}
              className={`group relative px-3 py-3.5 rounded-xl text-xs font-bold
                transition-all duration-300 active:scale-[0.96] flex flex-col items-center justify-center gap-2 min-h-[72px] sm:min-h-[80px] overflow-hidden
                ${isSelected
                  ? "bg-navy text-white shadow-lg shadow-navy/30 scale-[1.02]"
                  : "bg-white text-navy border border-contact/40 hover:shadow-md hover:-translate-y-0.5"
                }`}
              style={{
                borderColor: isSelected ? undefined : undefined,
                boxShadow: isSelected ? undefined : undefined,
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
                  : "text-navy/40 group-hover:scale-110"
              }`}
                style={{
                  background: isSelected
                    ? undefined
                    : `linear-gradient(135deg, ${colors.from}18, ${colors.to}08)`,
                }}
              >
                <FontAwesomeIcon icon={faBookOpen} className="text-[10px] sm:text-sm" />
              </div>
              <span className="relative z-10 leading-tight text-center font-semibold truncate w-full px-1">{ue}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
