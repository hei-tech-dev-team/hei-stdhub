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

/* ── Données de démo – remplacer par appel API ── */
const DEMO = [
  {
    id: 1,
    ref: "STD25001",
    email: "hei.jean@gmail.com",
    groupe: "N1",
    type: "TD",
    date: "2025-02-20 14:32",
    format: "Fichier",
    file: "td3_jean.pdf",
  },
  {
    id: 2,
    ref: "STD24002",
    email: "hei.marie@gmail.com",
    groupe: "K2",
    type: "Examen",
    date: "2025-02-20 15:10",
    format: "Lien GitHub",
    link: "https://github.com/marie/exam",
  },
  {
    id: 3,
    ref: "STD25003",
    email: "hei.paul@gmail.com",
    groupe: "N3",
    type: "TD",
    date: "2025-02-20 16:45",
    format: "Fichier",
    file: "td3_paul.zip",
  },
  {
    id: 4,
    ref: "STD25004",
    email: "hei.sara@gmail.com",
    groupe: "J1",
    type: "Examen",
    date: "2025-02-19 09:00",
    format: "Lien Drive",
    link: "https://drive.google.com/file/example",
  },
];

const FILTER_TYPES = ["Tous", "TD", "Examen"];

const HEADERS = [
  "Référence",
  "Email",
  "Groupe",
  "Type",
  "Date",
  "Format",
  "Action",
];

export default function TeacherInbox() {
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState("Tous");

  const filtered = DEMO.filter((s) => {
    const q = search.toLowerCase();
    const matchSearch =
      s.ref.toLowerCase().includes(q) ||
      s.email.toLowerCase().includes(q) ||
      s.groupe.toLowerCase().includes(q);
    const matchType = filterType === "Tous" || s.type === filterType;
    return matchSearch && matchType;
  });

  return (
    <div className="flex flex-col h-full">
      {/* ── Toolbar ── */}
      <div className="flex items-center gap-3 mb-6 flex-wrap">
        {/* Recherche */}
        <div className="relative flex-1 min-w-48">
          <FontAwesomeIcon
            icon={faSearch}
            className="absolute left-4 top-1/2 -translate-y-1/2
                       text-gray-400 text-sm"
          />
          <input
            className="input-field pl-10"
            placeholder="Rechercher réf., email, groupe..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {/* Filtres type */}
        <div className="flex items-center gap-2">
          <FontAwesomeIcon icon={faFilter} className="text-gray-400 text-sm" />
          {FILTER_TYPES.map((t) => (
            <button
              key={t}
              onClick={() => setFilterType(t)}
              className={`px-4 py-1.5 rounded-full text-sm font-semibold
                          transition
                          ${
                            filterType === t
                              ? "bg-navy text-white"
                              : "bg-white border border-contact text-navy hover:bg-surface"
                          }`}
            >
              {t}
            </button>
          ))}
        </div>

        {/* Compteur */}
        <span className="ml-auto text-sm text-gray-400 font-semibold">
          {filtered.length} rendu(s)
        </span>
      </div>

      {/* ── État vide ── */}
      {filtered.length === 0 ? (
        <div className="text-center py-24 text-gray-300">
          <FontAwesomeIcon icon={faInbox} className="text-5xl mb-3" />
          <p className="text-gray-400 font-semibold">Aucun rendu trouvé</p>
        </div>
      ) : (
        /* ── Tableau ── */
        <div className="bg-white rounded-2xl shadow-card overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-surface bg-surface/60">
                {HEADERS.map((h) => (
                  <th
                    key={h}
                    className="text-left py-3 px-4 text-xs font-bold
                               text-gray-500 uppercase tracking-wide"
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
                  className="border-b border-surface
                             hover:bg-surface/50 transition"
                >
                  {/* Référence */}
                  <td className="py-3 px-4 font-bold text-navy">{s.ref}</td>

                  {/* Email */}
                  <td className="py-3 px-4 text-gray-500 text-xs">{s.email}</td>

                  {/* Groupe */}
                  <td className="py-3 px-4">
                    <span
                      className="bg-navy/10 text-navy text-xs
                                     font-bold px-2 py-0.5 rounded-full"
                    >
                      {s.groupe}
                    </span>
                  </td>

                  {/* Type */}
                  <td className="py-3 px-4">
                    <Badge type={s.type.toLowerCase()} label={s.type} />
                  </td>

                  {/* Date */}
                  <td className="py-3 px-4 text-gray-400 text-xs">{s.date}</td>

                  {/* Format */}
                  <td className="py-3 px-4 text-gray-500 text-xs">
                    {s.format}
                  </td>

                  {/* Action */}
                  <td className="py-3 px-4">
                    {s.file ? (
                      <button
                        className="btn-primary text-xs px-3 py-1.5
                                   flex items-center gap-1"
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
                                   hover:underline flex items-center gap-1"
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
      )}
    </div>
  );
}
