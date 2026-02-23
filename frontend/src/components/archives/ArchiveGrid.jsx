import { useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faFolderOpen,
  faPlus,
  faTimes,
  faLink,
  faExternalLinkAlt,
} from "@fortawesome/free-solid-svg-icons";
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

/* Supports de démo – remplacer par appel API */
const INIT_SUPPORTS = {
  WEB1: [
    { id: 1, label: "W3Schools – HTML & CSS", url: "https://w3schools.com" },
    { id: 2, label: "MDN Web Docs", url: "https://developer.mozilla.org" },
  ],
  DONNEES1: [
    {
      id: 3,
      label: "PostgreSQL Official Docs",
      url: "https://postgresql.org/docs",
    },
  ],
};

export default function ArchiveGrid() {
  const { user } = useAuth();
  const isTeacher = user?.role === "teacher";

  const [selectedUE, setSelectedUE] = useState(null);
  const [supports, setSupports] = useState(INIT_SUPPORTS);
  const [showAdd, setShowAdd] = useState(false);
  const [addForm, setAddForm] = useState({ label: "", url: "" });

  /* ── Ajouter un support (prof uniquement) ── */
  const handleAdd = (e) => {
    e.preventDefault();
    if (!addForm.label.trim() || !addForm.url.trim()) return;
    setSupports((prev) => ({
      ...prev,
      [selectedUE]: [
        ...(prev[selectedUE] || []),
        { id: Date.now(), ...addForm },
      ],
    }));
    setAddForm({ label: "", url: "" });
    setShowAdd(false);
  };

  return (
    <div className="flex gap-6 h-full">
      {/* ── Grille des UE ── */}
      <div className="flex-1 overflow-y-auto">
        <div className="flex flex-col gap-8">
          {YEARS.map((year) => (
            <div key={year.id}>
              {/* Bandeau année */}
              <div
                className="bg-gold-light text-navy font-bold text-xs
                              py-3 px-5 rounded-xl mb-4 uppercase tracking-wider"
              >
                {year.label}
              </div>

              {/* Boutons UE */}
              <div className="flex flex-wrap gap-2">
                {year.ues.map((ue) => (
                  <button
                    key={ue}
                    onClick={() => {
                      setSelectedUE(ue);
                      setShowAdd(false);
                    }}
                    className={`px-5 py-2.5 rounded-full text-sm font-bold
                                border transition-all
                                ${
                                  selectedUE === ue
                                    ? "bg-navy text-white border-navy shadow-md"
                                    : "bg-white text-navy border-contact hover:border-navy hover:bg-navy/5 shadow-sm"
                                }`}
                  >
                    {ue}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Panneau latéral supports ── */}
      {selectedUE && (
        <div className="w-80 shrink-0">
          <div className="card h-full flex flex-col">
            {/* Header panneau */}
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-bold text-navy text-base">{selectedUE}</h3>
                <p className="text-xs text-gray-400">Supports pédagogiques</p>
              </div>
              <div className="flex gap-2">
                {isTeacher && (
                  <button
                    onClick={() => setShowAdd(!showAdd)}
                    className="w-7 h-7 rounded-full bg-gold text-white
                               flex items-center justify-center
                               hover:opacity-80 transition"
                    title="Ajouter un support"
                  >
                    <FontAwesomeIcon
                      icon={showAdd ? faTimes : faPlus}
                      className="text-xs"
                    />
                  </button>
                )}
                <button
                  onClick={() => setSelectedUE(null)}
                  className="w-7 h-7 rounded-full bg-surface text-gray-400
                             flex items-center justify-center
                             hover:bg-contact transition"
                >
                  <FontAwesomeIcon icon={faTimes} className="text-xs" />
                </button>
              </div>
            </div>

            {/* Formulaire ajout (prof) */}
            {isTeacher && showAdd && (
              <form
                onSubmit={handleAdd}
                className="mb-4 p-3 bg-surface rounded-xl"
              >
                <input
                  className="input-field mb-2"
                  placeholder="Intitulé du support"
                  value={addForm.label}
                  onChange={(e) =>
                    setAddForm({ ...addForm, label: e.target.value })
                  }
                  required
                />
                <input
                  className="input-field mb-2"
                  placeholder="URL (https://...)"
                  value={addForm.url}
                  onChange={(e) =>
                    setAddForm({ ...addForm, url: e.target.value })
                  }
                  required
                />
                <button
                  type="submit"
                  className="btn-primary w-full text-center"
                >
                  Ajouter
                </button>
              </form>
            )}

            {/* Liste supports */}
            <div className="flex flex-col gap-2 flex-1 overflow-y-auto">
              {(supports[selectedUE] || []).length === 0 ? (
                <div className="text-center py-10 text-gray-300">
                  <FontAwesomeIcon
                    icon={faFolderOpen}
                    className="text-3xl mb-2"
                  />
                  <p className="text-sm">Aucun support ajouté</p>
                </div>
              ) : (
                (supports[selectedUE] || []).map((s) => (
                  <a
                    key={s.id}
                    href={s.url}
                    target="_blank"
                    rel="noreferrer"
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
                    <span
                      className="text-sm font-semibold text-navy
                                     group-hover:text-gold transition-colors
                                     flex-1 truncate"
                    >
                      {s.label}
                    </span>
                    <FontAwesomeIcon
                      icon={faExternalLinkAlt}
                      className="text-gray-300 text-xs group-hover:text-gold
                                 transition-colors shrink-0"
                    />
                  </a>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
