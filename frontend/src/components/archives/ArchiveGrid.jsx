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
      "MGT1",
      "DONNEES1",
      "THEORIE1-P1",
      "THEORIE1-P2",
      "WEB2",
      "POO",
      "API",
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

const INIT_SUPPORTS = {
  DONNEES1: [
    {
      id: 1,
      label: "Documentation Postgresql",
      url: "https://postgresql.org/docs",
    },
    {
      id: 2,
      label: "ISO/IEC 9075-1:2011",
      url: "https://www.iso.org/standard/53681.html",
    },
    {
      id: 3,
      label: "pgAdmin",
      url: "https://www.pgadmin.org/docs/pgadmin4/latest/",
    },
    {
      id: 4,
      label: "PostgreSQL Download",
      url: "https://www.postgresql.org/download/",
    },
  ],
  DONNEES2: [
    {
      id: 1,
      label: "Data Warehouse",
      url: "https://www.data-bird.co/blog/data-warehouse",
    },
    {
      id: 2,
      label: "Data Lake",
      url: "https://www.talend.com/fr/resources/what-is-data-mart/",
    },
    {
      id: 3,
      label: "Data Marts",
      url: "https://www.talend.com/fr/resources/what-is-data-mart/",
    },
    {
      id: 4,
      label: "ETL avec Python",
      url: "https://www.datacamp.com/fr/courses/etl-and-elt-in-python",
    },
  ],
  IA1: [
    {
      id: 1,
      label: "ActuIA",
      url: "https://www.actuia.com/decouvrir/quelles-differences-entre-lia-symbolique-et-lapprentissage-automatique/#:~:text=Voici%20une%20comparaison%20entre%20les,les%20donn%C3%A9es%20et%20la%20statistique.",
    },
  ],
  MGT1: [
    {
      id: 1,
      label: "Google workspace",
      url: "https://workspace.google.com/",
    },
    {
      id: 2,
      label: "Git",
      url: "https://git-scm.com/",
    },
    {
      id: 3,
      label: "Trello",
      url: "https://trello.com/",
    },
    {
      id: 4,
      label: "GitLab",
      url: "https://gitlab.com/",
    },
  ],
  MGT2: [
    {
      id: 1,
      label: "Guide PMBOK©",
      url: "https://www.pmi.org/pmbok-guide-standards/foundational/pmbok",
    },
    {
      id: 2,
      label: "Gestion de projet en SSII, Michel Winter",
      url: "https://www.amazon.fr/Gestion-projet-SSII-Michel-Winter/dp/2100804419",
    },
  ],
  MOB1: [
    {
      id: 1,
      label: "React Native",
      url: "https://reactnative.dev",
    },
    {
      id: 2,
      label: "Kotlin",
      url: "https://kotlinlang.org",
    },
    {
      id: 3,
      label: "Swift",
      url: "https://swift.org",
    },
  ],

  PROG1: [
    {
      id: 1,
      label: "SICP-JS, M. Henz et al",
      url: "https://source-academy.github.io/sicp/",
    },
  ],
  POO: [
    {
      id: 1,
      label: "Effective Java, J. Bloch",
      url: "https://www.oracle.com/java/technologies/effectivejava.html",
    },
  ],
  API: [{}],
  PROG3: [
    {
      id: 1,
      label: "Oracle Help Center - Java JDBC API",
      url: "https://docs.oracle.com/javase/8/docs/technotes/guides/jdbc/",
    },
    {
      id: 2,
      label: "OpenAPI Swagger",
      url: "https://swagger.io/specification/",
    },
  ],
  PROG4: [
    { id: 1, label: "Mockito", url: "https://site.mockito.org/" },
    {
      id: 2,
      label: "JUnit",
      url: "https://junit.org",
    },
  ],
  SECU1: [
    {
      id: 1,
      label: "Cyber-résilience en entreprise",
      url: "https://www.editions-eni.fr/livre/cyber-resilience-en-entreprise-enjeux-referentiels-et-bonnes-pratiques-2e-edition-9782409041440/la-souverainete-numerique",
    },
  ],
  SECU2: [
    {
      id: 1,
      label: "OWASP Foundation",
      url: "https://owasp.org",
    },
    {
      id: 2,
      label: "Apprendre le C sur OpenClassrooms",
      url: "https://openclassrooms.com/fr/courses/19980-apprenez-a-programmer-en-c",
    },
    {
      id: 3,
      label: "Apprende le C++ sur OpenClassrooms",
      url: "https://openclassrooms.com/fr/courses/1894236-apprenez-a-programmer-en-c",
    },
    {
      id: 4,
      label: "SQL Injection principes",
      url: "https://www.vaadata.com/blog/fr/injections-sql-principes-impacts-exploitations-bonnes-pratiques-securite/",
    },
  ],
  SYS1: [
    {
      id: 1,
      label: "LPIC-1 Exam 101",
      url: "https://learning.lpi.org/en/learning-materials/101-500",
    },
    {
      id: 2,
      label: "Ubuntu",
      url: "https://ubuntu.com/",
    },
    {
      id: 3,
      label: "VMware Workstation",
      url: "https://www.vmware.com",
    },
  ],
  SYS2: [
    {
      id: 1,
      label: "Ansible Community",
      url: "https://docs.ansible.com",
    },
    {
      id: 2,
      label: "Puppet Documentation",
      url: "https://help.puppet.com/",
    },
    {
      id: 3,
      label: "Docker-DockerDocs",
      url: "https://docs.docker.com/",
    },
    {
      id: 4,
      label: "Root me",
      url: "https://www.root-me.org",
    },
  ],
  WEB1: [
    {
      id: 1,
      label: "Templated",
      url: "https://templated.co/",
    },
    {
      id: 2,
      label: "AFIHM",
      url: "https://www.afihm.org/enseignement.shtml",
    },
    {
      id: 3,
      label: "W3C",
      url: "https://www.w3c.fr/standards/",
    },
  ],
};
export default function ArchiveGrid() {
  const { user } = useAuth();
  const isTeacher = user?.role === "teacher";

  const [selectedUE, setSelectedUE] = useState(null);
  const [supports, setSupports] = useState(INIT_SUPPORTS);
  const [showAdd, setShowAdd] = useState(false);
  const [showPanel, setShowPanel] = useState(false);
  const [addForm, setAddForm] = useState({ label: "", url: "" });

  const setAdd = (key, val) => setAddForm((prev) => ({ ...prev, [key]: val }));

  const handleSelectUE = (ue) => {
    setSelectedUE(ue);
    setShowAdd(false);
    setShowPanel(true);
    setAddForm({ label: "", url: "" });
  };

  const handleClosePanel = () => {
    setSelectedUE(null);
    setShowPanel(false);
    setShowAdd(false);
  };

  const handleAdd = (e) => {
    e.preventDefault();
    if (!addForm.label.trim() || !addForm.url.trim()) return;
    setSupports((prev) => ({
      ...prev,
      [selectedUE]: [
        ...(prev[selectedUE] || []),
        { id: Date.now(), label: addForm.label, url: addForm.url },
      ],
    }));
    setAddForm({ label: "", url: "" });
    setShowAdd(false);
  };

  const currentSupports = supports[selectedUE] || [];

  return (
    <div className="flex flex-col lg:flex-row gap-4 lg:gap-6 h-full">
      {/* ── Grille des UE ── */}
      <div className="flex-1 overflow-y-auto">
        <div className="flex flex-col gap-6 sm:gap-8">
          {YEARS.map((year) => (
            <div key={year.id}>
              {/* Bandeau année */}
              <div
                className="bg-gold-light text-navy font-bold text-xs
                              py-3 px-4 sm:px-5 rounded-xl mb-3 sm:mb-4
                              uppercase tracking-wider"
              >
                {year.label}
              </div>
              {/* Boutons UE */}
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

      {/* ── Panneau supports — drawer mobile, colonne desktop ── */}
      {selectedUE && (
        <>
          {/* Overlay mobile */}
          <div
            className="lg:hidden fixed inset-0 bg-black/40 z-30"
            onClick={handleClosePanel}
          />

          {/* Panneau */}
          <div
            className={
              "fixed lg:static inset-x-0 bottom-0 lg:inset-auto z-40 " +
              "lg:w-80 lg:shrink-0 " +
              "max-h-[80vh] lg:max-h-none lg:h-full " +
              "rounded-t-2xl lg:rounded-2xl " +
              "bg-white shadow-modal lg:shadow-card " +
              "flex flex-col " +
              (showPanel
                ? "translate-y-0"
                : "translate-y-full lg:translate-y-0") +
              " transition-transform duration-300"
            }
          >
            <div className="p-4 sm:p-5 flex flex-col h-full">
              {/* Trait mobile */}
              <div
                className="lg:hidden w-10 h-1 bg-contact rounded-full
                              mx-auto mb-4 shrink-0"
              />

              {/* Header panneau */}
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
                      onClick={() => setShowAdd((prev) => !prev)}
                      className="w-7 h-7 rounded-full bg-gold text-white
                                 flex items-center justify-center
                                 hover:opacity-80 transition"
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
                               flex items-center justify-center
                               hover:bg-contact transition"
                  >
                    <FontAwesomeIcon icon={faTimes} className="text-xs" />
                  </button>
                </div>
              </div>

              {/* Formulaire ajout */}
              {isTeacher && showAdd && (
                <form
                  onSubmit={handleAdd}
                  className="mb-4 p-3 bg-surface rounded-xl
                             flex flex-col gap-2 shrink-0"
                >
                  <input
                    className="input-field"
                    placeholder="Intitulé du support"
                    value={addForm.label}
                    onChange={(e) => setAdd("label", e.target.value)}
                    required
                  />
                  <input
                    className="input-field"
                    placeholder="URL (https://...)"
                    value={addForm.url}
                    onChange={(e) => setAdd("url", e.target.value)}
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
                {currentSupports.length === 0 ? (
                  <div
                    className="flex flex-col items-center justify-center
                                  py-10 text-gray-300"
                  >
                    <FontAwesomeIcon
                      icon={faFolderOpen}
                      className="text-3xl mb-2"
                    />
                    <p className="text-sm">Aucun support ajouté</p>
                  </div>
                ) : (
                  currentSupports.map((s) => (
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
                        className="text-gray-300 text-xs shrink-0
                                   group-hover:text-gold transition-colors"
                      />
                    </a>
                  ))
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
