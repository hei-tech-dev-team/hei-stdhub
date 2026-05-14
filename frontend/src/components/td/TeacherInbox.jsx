import { useState, useEffect, useCallback } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faSearch,
  faFilter,
  faInbox,
  faDownload,
  faExternalLinkAlt,
  faSpinner,
} from "@fortawesome/free-solid-svg-icons";
import api from "../../api/axios";
import Badge from "../ui/Badge";

const FILTER_OPTIONS = ["Tous", "TD", "Examen"];
const PAGE_SIZE = 50;

export default function TeacherInbox() {
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [activeType, setActiveType] = useState("Tous");
  const [activeUE, setActiveUE] = useState("Tous");
  const [ues, setUes] = useState(["Tous"]);
  const [page, setPage] = useState(0);
  const [total, setTotal] = useState(0);

  const loadSubmissions = useCallback(async () => {
    setLoading(true);
    try {
      const params = { limit: PAGE_SIZE, offset: page * PAGE_SIZE };
      if (activeType !== "Tous") params.type = activeType;
      if (activeUE !== "Tous") params.ue = activeUE;
      if (search.trim()) params.search = search.trim();
      const { data } = await api.get("/submissions", { params });
      const items = data.submissions || data;
      setSubmissions(items);
      setTotal(data.total || 0);
      if (data.submissions) {
        const uniqueUes = ["Tous", ...new Set(data.submissions.map((s) => s.ue))];
        setUes(uniqueUes);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [page, activeType, activeUE, search]);

  useEffect(() => {
    setPage(0);
  }, [activeType, activeUE, search]);

  useEffect(() => {
    loadSubmissions();
  }, [loadSubmissions]);

  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <div className="flex flex-col h-full gap-4 sm:gap-5">
      {/* Toolbar */}
      <div className="flex flex-col gap-3">
        <div className="relative">
          <FontAwesomeIcon
            icon={faSearch}
            className="absolute left-4 top-1/2 -translate-y-1/2
                       text-gray-400 text-sm pointer-events-none"
          />
          <input
            className="input-field pl-10"
            placeholder="Rechercher réf., nom, email, groupe..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <FontAwesomeIcon icon={faFilter} className="text-gray-400 text-sm" />

          {FILTER_OPTIONS.map((opt) => (
            <button
              key={opt}
              type="button"
              onClick={() => setActiveType(opt)}
              className={
                "px-3 py-1.5 rounded-full text-xs font-semibold border transition " +
                (activeType === opt
                  ? "bg-navy text-white border-navy"
                  : "bg-white border-contact text-navy hover:bg-surface")
              }
            >
              {opt}
            </button>
          ))}

          <div className="w-px h-5 bg-contact mx-1" />

          {ues.map((ue) => (
            <button
              key={ue}
              type="button"
              onClick={() => setActiveUE(ue)}
              className={
                "px-3 py-1.5 rounded-full text-xs font-semibold border transition " +
                (activeUE === ue
                  ? "bg-gold text-white border-gold"
                  : "bg-white border-contact text-navy hover:bg-surface")
              }
            >
              {ue}
            </button>
          ))}

          <span className="ml-auto text-xs text-gray-400 font-semibold shrink-0">
            {submissions.length} / {total} rendu(s)
          </span>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-4">
            <button
              type="button"
              disabled={page === 0}
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              className="px-3 py-1.5 rounded-xl text-xs font-bold bg-navy/10 text-navy hover:bg-navy/20 disabled:opacity-30 transition"
            >
              Précédent
            </button>
            <span className="text-xs text-gray-500">
              Page {page + 1} / {totalPages}
            </span>
            <button
              type="button"
              disabled={page >= totalPages - 1}
              onClick={() => setPage((p) => p + 1)}
              className="px-3 py-1.5 rounded-xl text-xs font-bold bg-navy/10 text-navy hover:bg-navy/20 disabled:opacity-30 transition"
            >
              Suivant
            </button>
          </div>
        )}
      </div>

      {/* Spinner */}
      {loading && (
        <div className="flex justify-center py-20">
          <FontAwesomeIcon
            icon={faSpinner}
            className="text-navy text-3xl animate-spin"
          />
        </div>
      )}

      {/* Vide */}
      {!loading && submissions.length === 0 && (
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
      )}

      {/* Tableau md+ */}
      {!loading && submissions.length > 0 && (
        <>
          <div className="hidden md:block bg-white rounded-2xl shadow-card overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-surface bg-surface/60">
                  {[
                    "Nom",
                    "Référence",
                    "Email",
                    "UE",
                    "Groupe",
                    "Type",
                    "Date",
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
                {submissions.map((s) => (
                  <tr
                    key={s.id}
                    className="border-b border-surface last:border-0
                                 hover:bg-surface/50 transition"
                  >
                    <td className="py-3 px-4 font-semibold text-navy whitespace-nowrap">
                      {s.prenom} {s.nom}
                    </td>
                    <td className="py-3 px-4 font-bold text-navy whitespace-nowrap">
                      {s.ref}
                    </td>
                    <td className="py-3 px-4 text-gray-500 text-xs whitespace-nowrap">
                      {s.email}
                    </td>
                    <td className="py-3 px-4">
                      <span className="bg-gold/10 text-gold text-xs font-bold px-2 py-0.5 rounded-full">
                        {s.ue}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <span className="bg-navy/10 text-navy text-xs font-bold px-2 py-0.5 rounded-full">
                        {s.groupe}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <Badge type={s.type} />
                    </td>
                    <td className="py-3 px-4 text-gray-400 text-xs whitespace-nowrap">
                      {new Date(s.created_at).toLocaleDateString("fr-FR")}
                    </td>
                    <td className="py-3 px-4">
                      {s.file_path ? (
                        <a
                          href={s.file_path}
                          target="_blank"
                          rel="noreferrer"
                          className="btn-primary text-xs px-3 py-1.5
                                     flex items-center gap-1.5 whitespace-nowrap"
                        >
                          <FontAwesomeIcon
                            icon={faDownload}
                            className="text-xs"
                          />
                          Télécharger
                        </a>
                      ) : s.link ? (
                        <a
                          href={s.link}
                          target="_blank"
                          rel="noreferrer"
                          className="text-blue-500 text-xs font-semibold
                                     hover:underline flex items-center gap-1.5"
                        >
                          <FontAwesomeIcon
                            icon={faExternalLinkAlt}
                            className="text-xs"
                          />
                          Voir le lien
                        </a>
                      ) : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Cartes mobile */}
          <div className="md:hidden flex flex-col gap-3">
            {submissions.map((s) => (
              <div key={s.id} className="bg-white rounded-2xl shadow-card p-4">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <span className="font-bold text-navy text-sm">
                      {s.prenom} {s.nom}
                    </span>
                    <p className="text-xs text-gray-400">{s.ref}</p>
                  </div>
                  <Badge type={s.type} />
                </div>
                <div className="flex flex-wrap gap-2 mb-3">
                  <span className="bg-gold/10 text-gold text-xs font-bold px-2 py-0.5 rounded-full">
                    {s.ue}
                  </span>
                  <span className="bg-navy/10 text-navy text-xs font-bold px-2 py-0.5 rounded-full">
                    {s.groupe}
                  </span>
                  <span className="text-xs text-gray-400">
                    {new Date(s.created_at).toLocaleDateString("fr-FR")}
                  </span>
                </div>
                <p className="text-xs text-gray-400 mb-3">{s.email}</p>
                {s.file_path ? (
                  <a
                    href={`${import.meta.env.VITE_API_URL || "http://localhost:3001"}/${s.file_path}`}
                    target="_blank"
                    rel="noreferrer"
                    className="btn-primary text-xs px-4 py-2
                               flex items-center gap-2 w-full justify-center"
                  >
                    <FontAwesomeIcon icon={faDownload} />
                    Télécharger
                  </a>
                ) : s.link ? (
                  <a
                    href={s.link}
                    target="_blank"
                    rel="noreferrer"
                    className="text-blue-500 text-xs font-semibold
                               hover:underline flex items-center gap-2 justify-center"
                  >
                    <FontAwesomeIcon icon={faExternalLinkAlt} />
                    Voir le lien
                  </a>
                ) : null}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
