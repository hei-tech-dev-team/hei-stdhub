import { useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faFilter, faDownload } from "@fortawesome/free-solid-svg-icons";
import Navbar from "../layout/Navbar";
import Badge from "../ui/Badge";
import Avatar from "../ui/Avatar";

/* ── Données de démo – remplacer par appel API ── */
const DEMO_POSTS = [
  {
    id: 1,
    type: "td",
    ue: "WEB2",
    level: "L1",
    title: "TD3 – JavaScript Avancé",
    description: "Closures, promises et async/await",
    author: "Dr Toky",
    date: "2025-02-20",
  },
  {
    id: 2,
    type: "examen",
    ue: "PROG1",
    level: "L1",
    title: "Partiel Semestre 1",
    description: "Algorithmique et structures de données",
    author: "Mr Larry",
    date: "2025-02-19",
  },
  {
    id: 3,
    type: "cours",
    ue: "SYS2",
    level: "L2",
    title: "Gestion des processus Linux",
    description: "fork(), wait(), signaux POSIX",
    author: "Mr Ryan",
    date: "2025-02-18",
  },
  {
    id: 4,
    type: "td",
    ue: "DONNEES1",
    level: "L1",
    title: "TD2 – Modélisation UML",
    description: "Diagrammes de classes et de séquence",
    author: "Mr Julien",
    date: "2025-02-17",
  },
  {
    id: 5,
    type: "cours",
    ue: "MOB1",
    level: "L3",
    title: "Introduction React Native",
    description: "Setup Expo, composants de base",
    author: "Dr Toky",
    date: "2025-02-16",
  },
];

const LEVELS = ["Tous", "L1", "L2", "L3"];

const BAR_COLOR = {
  td: "bg-cyan-400",
  examen: "bg-red-400",
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

      <div className="flex-1 p-8 overflow-y-auto">
        {/* ── Header + Filtres ── */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-xl font-bold text-navy">Contenu disponible</h1>
            <p className="text-sm text-gray-400 mt-0.5">
              {filtered.length} élément(s)
            </p>
          </div>

          <div className="flex items-center gap-2">
            <FontAwesomeIcon
              icon={faFilter}
              className="text-gray-400 text-sm"
            />
            {LEVELS.map((l) => (
              <button
                key={l}
                onClick={() => setFilter(l)}
                className={`px-4 py-1.5 rounded-full text-sm font-semibold
                            transition
                            ${
                              filter === l
                                ? "bg-navy text-white"
                                : "bg-white border border-contact text-navy hover:bg-surface"
                            }`}
              >
                {l}
              </button>
            ))}
          </div>
        </div>

        {/* ── Grille ── */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
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
              <div className="flex items-center gap-2 mb-3">
                <Badge type={post.type} />
                <span
                  className="bg-navy/10 text-navy text-xs font-bold
                                 px-3 py-1 rounded-full"
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

              {/* Titre */}
              <h3
                className="font-bold text-navy text-sm mb-1
                             group-hover:text-gold transition-colors"
              >
                {post.title}
              </h3>
              <p className="text-gray-400 text-xs mb-4 line-clamp-2">
                {post.description}
              </p>

              {/* Footer */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Avatar name={post.author} size="sm" color="bg-navy" />
                  <span className="text-xs text-gray-500">{post.author}</span>
                </div>
                <button
                  className="text-xs text-gold font-semibold
                                   hover:underline flex items-center gap-1"
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
