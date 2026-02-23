import { useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faPlus,
  faTimes,
  faCloudUploadAlt,
  faLink,
  faInbox,
} from "@fortawesome/free-solid-svg-icons";
import Navbar from "../layout/Navbar";
import Badge from "../ui/Badge";

const TYPES = [
  { value: "cours", label: "Cours" },
  { value: "td", label: "TD" },
  { value: "examen", label: "Examen" },
];

const UE_LIST = [
  "WEB1",
  "WEB2",
  "WEB3",
  "PROG1",
  "PROG2-POO",
  "PROG2-API",
  "PROG3",
  "PROG4",
  "PROG5",
  "SYS1",
  "SYS2",
  "SYS3",
  "DONNEES1",
  "DONNEES2",
  "THEORIE1-P1",
  "THEORIE1-P2",
  "MGT2",
  "IA1",
  "MOB1",
  "SECU1",
  "SECU2",
];

const EMPTY = {
  title: "",
  description: "",
  ue: "",
  type: "cours",
  file: null,
  link: "",
};

export default function TeacherHome() {
  const [posts, setPosts] = useState([]);
  const [form, setForm] = useState(EMPTY);
  const [showForm, setShowForm] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  const set = (key, val) => setForm((prev) => ({ ...prev, [key]: val }));

  const handlePublish = (e) => {
    e.preventDefault();
    if (!form.title.trim() || !form.ue) return;
    setPosts((prev) => [
      { ...form, id: Date.now(), date: new Date().toLocaleString("fr-FR") },
      ...prev,
    ]);
    setForm(EMPTY);
    setShowForm(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file && file.size <= 10 * 1024 * 1024) set("file", file);
  };

  const handleFileInput = (e) => {
    const file = e.target.files[0];
    if (file && file.size <= 10 * 1024 * 1024) set("file", file);
  };

  const getTypeBtnClass = (value) => {
    const base =
      "px-3 sm:px-4 py-1.5 rounded-full text-xs sm:text-sm font-semibold border transition flex-1 sm:flex-none";
    const active =
      form.type === value ? " ring-2 ring-offset-1 ring-navy/30 scale-105" : "";
    if (value === "cours")
      return base + " border-gray-300 text-gray-600 hover:bg-gray-50" + active;
    if (value === "td")
      return (
        base +
        " bg-cyan-100 text-cyan-700 border-cyan-200 hover:bg-cyan-200" +
        active
      );
    if (value === "examen")
      return (
        base +
        " bg-red-100 text-red-600 border-red-200 hover:bg-red-200" +
        active
      );
    return base;
  };

  return (
    <div className="flex flex-col h-full">
      <Navbar />

      <div className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto">
        {/* Header */}
        <div
          className="flex flex-col sm:flex-row sm:items-center
                        justify-between gap-3 mb-6"
        >
          <div>
            <h1 className="text-lg sm:text-xl font-bold text-navy">
              Tableau de bord
            </h1>
            <p className="text-xs sm:text-sm text-gray-400 mt-0.5">
              Publiez vos cours, TD et examens
            </p>
          </div>
          <button
            onClick={() => setShowForm((prev) => !prev)}
            className="btn-primary flex items-center gap-2 self-start sm:self-auto"
          >
            <FontAwesomeIcon icon={showForm ? faTimes : faPlus} />
            <span className="text-sm">
              {showForm ? "Fermer" : "Nouveau contenu"}
            </span>
          </button>
        </div>

        {/* Formulaire */}
        {showForm && (
          <div className="card mb-6 border border-contact">
            <h2 className="font-bold text-navy mb-5 text-base">
              Publier un contenu
            </h2>
            <form onSubmit={handlePublish}>
              {/* Titre + UE : colonne sur mobile, ligne sur desktop */}
              <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 mb-4">
                <div className="flex-1">
                  <label
                    className="text-xs font-bold text-gray-500
                                    mb-1 block uppercase tracking-wide"
                  >
                    Titre *
                  </label>
                  <input
                    className="input-field"
                    placeholder="Ex : TD3 – JavaScript ES6"
                    value={form.title}
                    onChange={(e) => set("title", e.target.value)}
                    required
                  />
                </div>
                <div className="sm:w-44">
                  <label
                    className="text-xs font-bold text-gray-500
                                    mb-1 block uppercase tracking-wide"
                  >
                    UE *
                  </label>
                  <select
                    className="input-field"
                    value={form.ue}
                    onChange={(e) => set("ue", e.target.value)}
                    required
                  >
                    <option value="">— Choisir —</option>
                    {UE_LIST.map((u) => (
                      <option key={u} value={u}>
                        {u}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Description */}
              <div className="mb-4">
                <label
                  className="text-xs font-bold text-gray-500
                                  mb-1 block uppercase tracking-wide"
                >
                  Description
                </label>
                <textarea
                  className="input-field h-20 sm:h-24 resize-none"
                  placeholder="Consignes, description..."
                  value={form.description}
                  onChange={(e) => set("description", e.target.value)}
                />
              </div>

              {/* Type */}
              <div className="mb-4">
                <label
                  className="text-xs font-bold text-gray-500
                                  mb-2 block uppercase tracking-wide"
                >
                  Type de contenu
                </label>
                <div className="flex gap-2">
                  {TYPES.map(({ value, label }) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => set("type", value)}
                      className={getTypeBtnClass(value)}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Drag & Drop */}
              <div className="mb-4">
                <label
                  className="text-xs font-bold text-gray-500
                                  mb-2 block uppercase tracking-wide"
                >
                  Fichier (max 10 Mo)
                </label>
                <div
                  className={
                    "border-2 border-dashed rounded-xl p-4 sm:p-6 " +
                    "text-center cursor-pointer transition " +
                    (dragOver
                      ? "border-gold bg-gold/5"
                      : "border-contact hover:border-navy/40")
                  }
                  onDragOver={(e) => {
                    e.preventDefault();
                    setDragOver(true);
                  }}
                  onDragLeave={() => setDragOver(false)}
                  onDrop={handleDrop}
                  onClick={() =>
                    document.getElementById("teacher-file-input").click()
                  }
                >
                  <FontAwesomeIcon
                    icon={faCloudUploadAlt}
                    className="text-2xl sm:text-3xl text-gray-300 mb-2"
                  />
                  {form.file ? (
                    <p className="text-sm font-semibold text-navy truncate px-4">
                      {form.file.name}
                    </p>
                  ) : (
                    <p className="text-xs sm:text-sm text-gray-400">
                      Glisser-déposer ou cliquer pour parcourir
                    </p>
                  )}
                </div>
                <input
                  id="teacher-file-input"
                  type="file"
                  className="hidden"
                  onChange={handleFileInput}
                />
              </div>

              {/* Séparateur */}
              <div className="flex items-center gap-3 mb-4">
                <hr className="flex-1 border-contact" />
                <span className="text-xs font-bold text-gray-400 uppercase">
                  OU
                </span>
                <hr className="flex-1 border-contact" />
              </div>

              {/* Lien */}
              <div className="relative mb-6">
                <FontAwesomeIcon
                  icon={faLink}
                  className="absolute left-4 top-1/2 -translate-y-1/2
                             text-gray-400 text-sm pointer-events-none"
                />
                <input
                  className="input-field pl-10"
                  placeholder="Lien Google Docs, Drive ou GitHub..."
                  value={form.link}
                  onChange={(e) => set("link", e.target.value)}
                />
              </div>

              {/* Actions */}
              <div
                className="flex flex-col-reverse sm:flex-row
                              justify-end gap-3"
              >
                <button
                  type="button"
                  onClick={() => {
                    setShowForm(false);
                    setForm(EMPTY);
                  }}
                  className="w-full sm:w-auto px-5 py-2.5 rounded-full
                             text-sm font-semibold bg-surface
                             hover:bg-contact transition text-center"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="w-full sm:w-auto btn-gold text-center"
                >
                  Publier
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Etat vide */}
        {posts.length === 0 && !showForm && (
          <div className="text-center py-16 sm:py-24 text-gray-300">
            <FontAwesomeIcon
              icon={faInbox}
              className="text-4xl sm:text-5xl mb-4"
            />
            <p className="font-semibold text-gray-400">Aucun contenu publié</p>
            <p className="text-xs sm:text-sm text-gray-300 mt-1">
              Cliquez sur "Nouveau contenu" pour commencer
            </p>
          </div>
        )}

        {/* Feed */}
        <div className="flex flex-col gap-3 sm:gap-4">
          {posts.map((post) => (
            <div
              key={post.id}
              className="card flex flex-col sm:flex-row sm:justify-between
                         sm:items-start gap-3 hover:shadow-md transition-shadow"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-2 flex-wrap">
                  <Badge type={post.type} />
                  <span
                    className="bg-navy/10 text-navy text-xs
                                   font-bold px-3 py-1 rounded-full"
                  >
                    {post.ue}
                  </span>
                </div>
                <h3 className="font-bold text-navy text-sm">{post.title}</h3>
                {post.description && (
                  <p className="text-gray-400 text-xs mt-1 leading-relaxed">
                    {post.description}
                  </p>
                )}
                {post.file && (
                  <p className="text-xs text-gold mt-2 flex items-center gap-1 truncate">
                    <FontAwesomeIcon icon={faCloudUploadAlt} />
                    {post.file.name}
                  </p>
                )}
                {post.link && (
                  <a
                    href={post.link}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs text-blue-500 hover:underline
                               mt-1 flex items-center gap-1 truncate"
                  >
                    <FontAwesomeIcon icon={faLink} />
                    {post.link}
                  </a>
                )}
              </div>
              <span className="text-xs text-gray-400 shrink-0">
                {post.date}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
