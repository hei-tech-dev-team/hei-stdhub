import { useState, useEffect, useCallback } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faSearch,
  faFilter,
  faInbox,
  faDownload,
  faExternalLinkAlt,
  faSpinner,
  faChevronLeft,
  faChevronRight,
  faFileAlt,
  faUsers,
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
    <div className="flex flex-col h-full gap-5">
      {/* En-tête */}
      <div
        className="transition-all duration-700 ease-out opacity-100 translate-y-0"
      >
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-navy/10 flex items-center justify-center">
            <FontAwesomeIcon icon={faFileAlt} className="text-navy text-lg" />
          </div>
          <div>
            <h3 className="font-bold text-navy text-base">Rendus des étudiants</h3>
            <p className="text-sm text-gray-400">Consultez et téléchargez les devoirs soumis</p>
          </div>
        </div>

        <div className="relative">
          <FontAwesomeIcon
            icon={faSearch}
            className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 text-sm pointer-events-none"
          />
          <input
            className="input-field pl-10"
            placeholder="Rechercher par réf., nom, email, groupe..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 mt-3">
          <div className="flex items-center gap-1.5 text-gray-400 text-sm mr-1">
            <FontAwesomeIcon icon={faFilter} />
          </div>

          {FILTER_OPTIONS.map((opt) => (
            <button
              key={opt}
              type="button"
              onClick={() => setActiveType(opt)}
              className={`px-3.5 py-1.5 rounded-xl text-sm font-bold border transition-all duration-200 ${
                activeType === opt
                  ? "bg-navy text-white border-navy shadow-sm shadow-navy/20"
                  : "bg-white border-contact/60 text-navy hover:border-gold/40 hover:shadow-sm"
              }`}
            >
              {opt}
            </button>
          ))}

          <div className="w-px h-5 bg-contact/60 mx-1" />

          {ues.map((ue) => (
            <button
              key={ue}
              type="button"
              onClick={() => setActiveUE(ue)}
              className={`px-3.5 py-1.5 rounded-xl text-sm font-bold border transition-all duration-200 ${
                activeUE === ue
                  ? "bg-gold text-white border-gold shadow-sm shadow-gold/20"
                  : "bg-white border-contact/60 text-navy hover:border-gold/40 hover:shadow-sm"
              }`}
            >
              {ue}
            </button>
          ))}

          <span className="ml-auto text-sm text-gray-400 font-semibold shrink-0 bg-surface px-3 py-1.5 rounded-xl">
            <FontAwesomeIcon icon={faUsers} className="mr-1.5 text-[11px]" />
            {submissions.length} / {total} rendu(s)
          </span>
        </div>
      </div>

      {/* Spinner */}
      {loading && (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <div className="w-10 h-10 border-4 border-navy border-t-gold rounded-full animate-spin" />
          <p className="text-sm text-gray-400 font-medium">Chargement des rendus...</p>
        </div>
      )}

      {/* Vide */}
      {!loading && submissions.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 sm:py-20 text-center">
          <div className="relative mb-6">
            <div className="absolute inset-0 bg-gold/10 rounded-full scale-[2] animate-ping opacity-30" />
            <div className="absolute inset-0 bg-navy/5 rounded-full scale-150 blur-xl animate-pulse" />
            <div className="relative bg-white border-2 border-gold/20 p-5 rounded-2xl shadow-lg">
              <FontAwesomeIcon icon={faInbox} className="text-gold/40 text-4xl animate-float" />
            </div>
          </div>
          <p className="text-navy font-bold text-sm mb-1">Aucun rendu trouvé</p>
          <p className="text-gray-400 text-sm max-w-[220px] leading-relaxed">
            Ajustez vos filtres ou revenez plus tard.
          </p>
        </div>
      )}

      {/* Résultats */}
      {!loading && submissions.length > 0 && (
        <>
          {/* Tableau md+ */}
          <div className="hidden md:block bg-white rounded-2xl shadow-card overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-surface bg-navy/[0.02]">
                  {["Nom", "Référence", "Email", "UE", "Groupe", "Type", "Date", ""].map((h) => (
                    <th
                      key={h}
                      className="text-left py-3.5 px-4 text-sm font-bold text-gray-500 uppercase tracking-wide whitespace-nowrap"
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
                    className="border-b border-surface last:border-0 hover:bg-gold/[0.02] transition-all duration-150"
                  >
                    <td className="py-3.5 px-4">
                      <span className="font-semibold text-navy whitespace-nowrap">
                        {s.prenom} {s.nom}
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="font-bold text-navy/70 text-sm whitespace-nowrap">
                        {s.ref}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-gray-400 text-sm whitespace-nowrap">
                      {s.email}
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="bg-gold/10 text-gold text-sm font-bold px-2.5 py-0.5 rounded-full">
                        {s.ue}
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="bg-navy/10 text-navy text-sm font-bold px-2.5 py-0.5 rounded-full">
                        {s.groupe}
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      <Badge type={s.type} />
                    </td>
                    <td className="py-3.5 px-4 text-gray-400 text-sm whitespace-nowrap">
                      {new Date(s.created_at).toLocaleDateString("fr-FR", {
                        day: "numeric",
                        month: "short",
                      })}
                    </td>
                    <td className="py-3.5 px-4">
                      {s.file_path ? (
                        <a
                          href={s.file_path}
                          target="_blank"
                          rel="noreferrer"
                          className="btn-primary text-sm px-3 py-1.5 flex items-center gap-1.5 whitespace-nowrap"
                        >
                          <FontAwesomeIcon icon={faDownload} className="text-[10px]" />
                          Télécharger
                        </a>
                      ) : s.link ? (
                        <a
                          href={s.link}
                          target="_blank"
                          rel="noreferrer"
                          className="text-blue-500 text-sm font-semibold hover:underline flex items-center gap-1.5"
                        >
                          <FontAwesomeIcon icon={faExternalLinkAlt} className="text-[10px]" />
                          Lien
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
              <div key={s.id} className="bg-white rounded-2xl shadow-card p-4 animate-slide-up">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-xl bg-navy/10 flex items-center justify-center shrink-0">
                      <FontAwesomeIcon icon={faUsers} className="text-navy text-sm" />
                    </div>
                    <div>
                      <span className="font-bold text-navy text-sm">
                        {s.prenom} {s.nom}
                      </span>
                      <p className="text-sm text-gray-400">{s.ref}</p>
                    </div>
                  </div>
                  <Badge type={s.type} />
                </div>
                <div className="flex flex-wrap gap-1.5 mb-3">
                  <span className="bg-gold/10 text-gold text-sm font-bold px-2.5 py-0.5 rounded-full">
                    {s.ue}
                  </span>
                  <span className="bg-navy/10 text-navy text-sm font-bold px-2.5 py-0.5 rounded-full">
                    {s.groupe}
                  </span>
                  <span className="text-sm text-gray-400 px-1">
                    {new Date(s.created_at).toLocaleDateString("fr-FR", {
                      day: "numeric",
                      month: "short",
                    })}
                  </span>
                </div>
                <p className="text-sm text-gray-400 mb-3 truncate">{s.email}</p>
                {s.file_path ? (
                  <a
                    href={`${import.meta.env.VITE_API_URL || "http://localhost:3001"}/${s.file_path}`}
                    target="_blank"
                    rel="noreferrer"
                    className="btn-primary text-sm px-4 py-2 flex items-center gap-2 w-full justify-center"
                  >
                    <FontAwesomeIcon icon={faDownload} />
                    Télécharger
                  </a>
                ) : s.link ? (
                  <a
                    href={s.link}
                    target="_blank"
                    rel="noreferrer"
                    className="text-blue-500 text-sm font-semibold hover:underline flex items-center gap-2 justify-center bg-blue-50 py-2 rounded-xl transition hover:bg-blue-100"
                  >
                    <FontAwesomeIcon icon={faExternalLinkAlt} />
                    Voir le lien
                  </a>
                ) : null}
              </div>
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-4 pt-2">
              <button
                type="button"
                disabled={page === 0}
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-bold
                  bg-white border border-contact/60 text-navy hover:border-gold/40 hover:shadow-sm
                  disabled:opacity-30 disabled:cursor-not-allowed transition-all duration-200"
              >
                <FontAwesomeIcon icon={faChevronLeft} className="text-[10px]" />
                Précédent
              </button>
              <div className="flex items-center gap-1.5">
                {Array.from({ length: totalPages }, (_, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setPage(i)}
                    className={`w-8 h-8 rounded-xl text-sm font-bold transition-all duration-200 ${
                      i === page
                        ? "bg-navy text-white shadow-sm shadow-navy/20"
                        : "bg-white text-navy border border-contact/60 hover:border-gold/40"
                    }`}
                  >
                    {i + 1}
                  </button>
                ))}
              </div>
              <button
                type="button"
                disabled={page >= totalPages - 1}
                onClick={() => setPage((p) => p + 1)}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-bold
                  bg-white border border-contact/60 text-navy hover:border-gold/40 hover:shadow-sm
                  disabled:opacity-30 disabled:cursor-not-allowed transition-all duration-200"
              >
                Suivant
                <FontAwesomeIcon icon={faChevronRight} className="text-[10px]" />
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
