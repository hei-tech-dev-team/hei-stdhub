import { useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faFilter, faDownload } from "@fortawesome/free-solid-svg-icons";
import Navbar from "../layout/Navbar";
import Badge from "../ui/Badge";
import Avatar from "../ui/Avatar";

const DEMO_POSTS = [];

const LEVELS = ["Tous", "L1", "L2", "L3"];

const BAR_COLOR = {
  td: "bg-cyan-400",
  examen: "bg-red-600",
  cours: "bg-gray-200",
};

export default function StudentHome() {
  const [filter, setFilter] = useState("Tous");

  const filtered =
    filter === "Tous"
      ? DEMO_POSTS
      : DEMO_POSTS.filter((p) => p.level === filter);

  return (
    <div className="flex flex-col h-full">
      <Navbar />

      <div className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto">
        {/* Header + Filtres */}
        <div
          className="flex flex-col sm:flex-row sm:items-center
                        justify-between gap-3 mb-6"
        >
          <div>
            <h1 className="text-lg sm:text-xl font-bold text-navy">
              Contenu disponible
            </h1>
            <p className="text-xs sm:text-sm text-gray-400 mt-0.5">
              {filtered.length} élément(s)
            </p>
          </div>

          {/* Filtres niveau */}
          <div className="flex items-center gap-2 flex-wrap">
            <FontAwesomeIcon
              icon={faFilter}
              className="text-gray-400 text-sm shrink-0"
            />
            {LEVELS.map((l) => (
              <button
                key={l}
                type="button"
                onClick={() => setFilter(l)}
                className={
                  "px-3 sm:px-4 py-1.5 rounded-full text-xs sm:text-sm " +
                  "font-semibold transition " +
                  (filter === l
                    ? "bg-navy text-white"
                    : "bg-white border border-contact text-navy hover:bg-surface")
                }
              >
                {l}
              </button>
            ))}
          </div>
        </div>

        {/* Grille — 1 col mobile, 2 col tablet, 3 col desktop */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3 sm:gap-4">
          {filtered.map((post) => (
            <div
              key={post.id}
              className="card hover:shadow-md transition-shadow cursor-pointer group"
            >
              {/* Barre colorée */}
              <div
                className={`h-1.5 rounded-full mb-4 ${BAR_COLOR[post.type]}`}
              />

              {/* Badges */}
              <div className="flex items-center gap-2 mb-3 flex-wrap">
                <Badge type={post.type} />
                <span
                  className="bg-navy/10 text-navy text-xs
                                 font-bold px-3 py-1 rounded-full"
                >
                  {post.ue}
                </span>
                <span
                  className="ml-auto bg-surface text-gray-400 text-xs
                                 font-semibold px-2 py-0.5 rounded-full
                                 border border-contact"
                >
                  {post.level}
                </span>
              </div>

              {/* Titre + description */}
              <h3
                className="font-bold text-navy text-sm mb-1
                             group-hover:text-gold transition-colors"
              >
                {post.title}
              </h3>
              <p className="text-gray-400 text-xs mb-4 line-clamp-2 leading-relaxed">
                {post.description}
              </p>

              {/* Footer */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 min-w-0">
                  <Avatar name={post.author} size="sm" color="bg-navy" />
                  <span className="text-xs text-gray-500 truncate">
                    {post.author}
                  </span>
                </div>
                <button
                  type="button"
                  className="text-xs text-gold font-semibold
                             hover:underline flex items-center gap-1
                             shrink-0 ml-2"
                >
                  <FontAwesomeIcon icon={faDownload} className="text-xs" />
                  Accéder
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
