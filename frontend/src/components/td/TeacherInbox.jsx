import { useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faSearch,
  faFilter,
  faInbox,
  faDownload,
  faExternalLinkAlt,
} from "@fortawesome/free-solid-svg-icons";
import Badge from "../ui/Badge";

const SUBMISSIONS = [
  {
    id: 1,
    ref: "STD25001",
    email: "hei.jean@gmail.com",
    groupe: "N1",
    type: "td",
    date: "2025-02-20 14:32",
    format: "Fichier",
    file: "td3_jean.pdf",
    link: null,
  },
  {
    id: 2,
    ref: "STD24002",
    email: "hei.marie@gmail.com",
    groupe: "K2",
    type: "examen",
    date: "2025-02-20 15:10",
    format: "Lien GitHub",
    file: null,
    link: "https://github.com/marie/exam",
  },
  {
    id: 3,
    ref: "STD25003",
    email: "hei.paul@gmail.com",
    groupe: "N3",
    type: "td",
    date: "2025-02-20 16:45",
    format: "Fichier",
    file: "td3_paul.zip",
    link: null,
  },
  {
    id: 4,
    ref: "STD25004",
    email: "hei.sara@gmail.com",
    groupe: "J1",
    type: "examen",
    date: "2025-02-19 09:00",
    format: "Lien Drive",
    file: null,
    link: "https://drive.google.com/file/example",
  },
];

const FILTER_OPTIONS = ["Tous", "TD", "Examen"];

export default function TeacherInbox() {
  const [search, setSearch] = useState("");
  const [activeType, setActiveType] = useState("Tous");

  const filtered = SUBMISSIONS.filter((s) => {
    const q = search.toLowerCase();
    const matchSearch =
      s.ref.toLowerCase().includes(q) ||
      s.email.toLowerCase().includes(q) ||
      s.groupe.toLowerCase().includes(q);
    const matchType =
      activeType === "Tous" || s.type === activeType.toLowerCase();
    return matchSearch && matchType;
  });

  return (
    <div className="flex flex-col h-full gap-4 sm:gap-5">
      {/* Toolbar */}
      <div
        className="flex flex-col sm:flex-row items-stretch
                      sm:items-center gap-3"
      >
        <div className="relative flex-1">
          <FontAwesomeIcon
            icon={faSearch}
            className="absolute left-4 top-1/2 -translate-y-1/2
                       text-gray-400 text-sm pointer-events-none"
          />
          <input
            className="input-field pl-10"
            placeholder="Rechercher réf., email, groupe..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <FontAwesomeIcon icon={faFilter} className="text-gray-400 text-sm" />
          {FILTER_OPTIONS.map((opt) => (
            <button
              key={opt}
              type="button"
              onClick={() => setActiveType(opt)}
              className={
                "px-3 sm:px-4 py-1.5 rounded-full text-xs sm:text-sm " +
                "font-semibold border transition " +
                (activeType === opt
                  ? "bg-navy text-white border-navy"
                  : "bg-white border-contact text-navy hover:bg-surface")
              }
            >
              {opt}
            </button>
          ))}
          <span
            className="ml-auto sm:ml-2 text-xs sm:text-sm
                           text-gray-400 font-semibold shrink-0"
          >
            {filtered.length} rendu(s)
          </span>
        </div>
      </div>

      {/* Etat vide */}
      {filtered.length === 0 ? (
        <div
          className="flex flex-col items-center justify-center
                        py-16 sm:py-24 text-gray-300"
        >
          <FontAwesomeIcon
            icon={faInbox}
            className="text-4xl sm:text-5xl mb-3"
          />
          <p className="text-gray-400 font-semibold text-sm">
            Aucun rendu trouvé
          </p>
        </div>
      ) : (
        <>
          {/* ── Vue tableau (md+) ── */}
          <div
            className="hidden md:block bg-white rounded-2xl
                          shadow-card overflow-hidden"
          >
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-surface bg-surface/60">
                  {[
                    "Référence",
                    "Email",
                    "Groupe",
                    "Type",
                    "Date",
                    "Format",
                    "Action",
                  ].map((h) => (
                    <th
                      key={h}
                      className="text-left py-3 px-4 text-xs font-bold
                                 text-gray-500 uppercase tracking-wide whitespace-nowrap"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((s) => (
                  <tr
                    key={s.id}
                    className="border-b border-surface last:border-0
                               hover:bg-surface/50 transition"
                  >
                    <td className="py-3 px-4 font-bold text-navy whitespace-nowrap">
                      {s.ref}
                    </td>
                    <td className="py-3 px-4 text-gray-500 text-xs whitespace-nowrap">
                      {s.email}
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className="bg-navy/10 text-navy text-xs
                                       font-bold px-2 py-0.5 rounded-full"
                      >
                        {s.groupe}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <Badge type={s.type} />
                    </td>
                    <td className="py-3 px-4 text-gray-400 text-xs whitespace-nowrap">
                      {s.date}
                    </td>
                    <td className="py-3 px-4 text-gray-500 text-xs whitespace-nowrap">
                      {s.format}
                    </td>
                    <td className="py-3 px-4">
                      {s.file ? (
                        <button
                          type="button"
                          className="btn-primary text-xs px-3 py-1.5
                                     flex items-center gap-1.5 whitespace-nowrap"
                        >
                          <FontAwesomeIcon
                            icon={faDownload}
                            className="text-xs"
                          />
                          Télécharger
                        </button>
                      ) : (
                        <a
                          href={s.link}
                          target="_blank"
                          rel="noreferrer"
                          className="text-blue-500 text-xs font-semibold
                                     hover:underline flex items-center
                                     gap-1.5 whitespace-nowrap"
                        >
                          <FontAwesomeIcon
                            icon={faExternalLinkAlt}
                            className="text-xs"
                          />
                          Voir le lien
                        </a>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* ── Vue cartes (mobile) ── */}
          <div className="md:hidden flex flex-col gap-3">
            {filtered.map((s) => (
              <div key={s.id} className="bg-white rounded-2xl shadow-card p-4">
                <div className="flex items-center justify-between mb-3">
                  <span className="font-bold text-navy text-sm">{s.ref}</span>
                  <Badge type={s.type} />
                </div>
                <div className="flex flex-col gap-1 mb-3">
                  <p className="text-xs text-gray-400">{s.email}</p>
                  <div className="flex items-center gap-2">
                    <span
                      className="bg-navy/10 text-navy text-xs
                                     font-bold px-2 py-0.5 rounded-full"
                    >
                      {s.groupe}
                    </span>
                    <span className="text-xs text-gray-400">{s.date}</span>
                  </div>
                  <p className="text-xs text-gray-500">{s.format}</p>
                </div>
                {s.file ? (
                  <button
                    type="button"
                    className="btn-primary text-xs px-4 py-2
                               flex items-center gap-2 w-full justify-center"
                  >
                    <FontAwesomeIcon icon={faDownload} />
                    Télécharger
                  </button>
                ) : (
                  <a
                    href={s.link}
                    target="_blank"
                    rel="noreferrer"
                    className="text-blue-500 text-xs font-semibold
                               hover:underline flex items-center
                               gap-2 justify-center"
                  >
                    <FontAwesomeIcon icon={faExternalLinkAlt} />
                    Voir le lien
                  </a>
                )}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
