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
  { value: "cours", label: "Cours simple" },
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

const TYPE_BTN = {
  cours: "border border-gray-300 text-gray-600 hover:bg-gray-50",
  td: "bg-cyan-100 text-cyan-700 border border-cyan-200 hover:bg-cyan-200",
  examen: "bg-red-100 text-red-600 border border-red-200 hover:bg-red-200",
};

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

  const set = (key, val) => setForm((f) => ({ ...f, [key]: val }));

  /* ── Publier ── */
  const handlePublish = (e) => {
    e.preventDefault();
    if (!form.title.trim() || !form.ue) return;
    setPosts([
      {
        ...form,
        id: Date.now(),
        date: new Date().toLocaleString("fr-FR"),
      },
      ...posts,
    ]);
    setForm(EMPTY);
    setShowForm(false);
  };

  /* ── Drag & Drop ── */
  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files[0];
    if (f && f.size <= 10 * 1024 * 1024) set("file", f);
  };

  return (
    <div className="flex flex-col h-full">
      <Navbar />

      <div className="flex-1 p-8 overflow-y-auto">
        {/* ── Header ── */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-xl font-bold text-navy">Tableau de bord</h1>
            <p className="text-sm text-gray-400 mt-0.5">
              Publiez vos cours, TD et examens
            </p>
          </div>
          <button
            onClick={() => setShowForm(!showForm)}
            className="btn-primary flex items-center gap-2"
          >
            <FontAwesomeIcon icon={showForm ? faTimes : faPlus} />
            {showForm ? "Fermer" : "Nouveau contenu"}
          </button>
        </div>

        {/* ── Formulaire ── */}
        {showForm && (
          <div className="card mb-6 border border-contact">
            <h2 className="font-bold text-navy mb-5">Publier un contenu</h2>

            <form onSubmit={handlePublish}>
              {/* Titre + UE */}
              <div className="flex gap-4 mb-4">
                <div className="flex-1">
                  <label
                    className="text-xs font-bold text-gray-500 mb-1
                                    block uppercase tracking-wide"
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
                <div className="w-44">
                  <label
                    className="text-xs font-bold text-gray-500 mb-1
                                    block uppercase tracking-wide"
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
                      <option key={u}>{u}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Description */}
              <div className="mb-4">
                <label
                  className="text-xs font-bold text-gray-500 mb-1
                                  block uppercase tracking-wide"
                >
                  Description
                </label>
                <textarea
                  className="input-field h-24 resize-none"
                  placeholder="Consignes, description..."
                  value={form.description}
                  onChange={(e) => set("description", e.target.value)}
                />
              </div>

              {/* Type */}
              <div className="mb-4">
                <label
                  className="text-xs font-bold text-gray-500 mb-2
                                  block uppercase tracking-wide"
                >
                  Type de contenu
                </label>
                <div className="flex gap-2">
                  {TYPES.map(({ value, label }) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => set("type", value)}
                      className={`px-4 py-1.5 rounded-full text-sm font-semibold
                                  transition ${TYPE_BTN[value]}
                                  ${
                                    form.type === value
                                      ? "ring-2 ring-offset-2 ring-navy/30 scale-105"
                                      : ""
                                  }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Zone drag & drop */}
              <div className="mb-4">
                <label
                  className="text-xs font-bold text-gray-500 mb-2
                                  block uppercase tracking-wide"
                >
                  Fichier (max 10 Mo)
                </label>
                <div
                  className={`border-2 border-dashed rounded-xl p-6 text-center
                              cursor-pointer transition
                              ${
                                dragOver
                                  ? "border-gold bg-gold/5"
                                  : "border-contact hover:border-navy/40"
                              }`}
                  onDragOver={(e) => {
                    e.preventDefault();
                    setDragOver(true);
                  }}
                  onDragLeave={() => setDragOver(false)}
                  onDrop={handleDrop}
                  onClick={() =>
                    document.getElementById("teacher-file").click()
                  }
                >
                  <FontAwesomeIcon
                    icon={faCloudUploadAlt}
                    className="text-3xl text-gray-300 mb-2"
                  />
                  {form.file ? (
                    <p className="text-sm font-semibold text-navy">
                      {form.file.name}
                    </p>
                  ) : (
                    <p className="text-sm text-gray-400">
                      Glisser-déposer ou cliquer pour parcourir
                    </p>
                  )}
                  <input
                    id="teacher-file"
                    type="file"
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files[0];
                      if (f && f.size <= 10 * 1024 * 1024) set("file", f);
                    }}
                  />
                </div>
              </div>

              {/* Séparateur OU */}
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
                             text-gray-400 text-sm"
                />
                <input
                  className="input-field pl-10"
                  placeholder="Lien Google Docs, Drive ou GitHub..."
                  value={form.link}
                  onChange={(e) => set("link", e.target.value)}
                />
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowForm(false);
                    setForm(EMPTY);
                  }}
                  className="px-5 py-2 rounded-full text-sm font-semibold
                             bg-surface hover:bg-contact transition"
                >
                  Annuler
                </button>
                <button type="submit" className="btn-gold">
                  Publier
                </button>
              </div>
            </form>
          </div>
        )}

        {/* ── État vide ── */}
        {posts.length === 0 && !showForm && (
          <div className="text-center py-24 text-gray-300">
            <FontAwesomeIcon icon={faInbox} className="text-5xl mb-4" />
            <p className="font-semibold text-gray-400">Aucun contenu publié</p>
            <p className="text-sm text-gray-300 mt-1">
              Cliquez sur "Nouveau contenu" pour commencer
            </p>
          </div>
        )}

        {/* ── Feed ── */}
        <div className="flex flex-col gap-4">
          {posts.map((post) => (
            <div
              key={post.id}
              className="card flex justify-between items-start
                         hover:shadow-md transition-shadow"
            >
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <Badge type={post.type} />
                  <span
                    className="bg-navy/10 text-navy text-xs font-bold
                                   px-3 py-1 rounded-full"
                  >
                    {post.ue}
                  </span>
                </div>
                <h3 className="font-bold text-navy text-sm">{post.title}</h3>
                {post.description && (
                  <p className="text-gray-400 text-xs mt-1">
                    {post.description}
                  </p>
                )}
                {post.file && (
                  <p className="text-xs text-gold mt-1">
                    <FontAwesomeIcon icon={faCloudUploadAlt} className="mr-1" />
                    {post.file.name}
                  </p>
                )}
                {post.link && (
                  <a
                    href={post.link}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs text-blue-500 hover:underline mt-1 block"
                  >
                    <FontAwesomeIcon icon={faLink} className="mr-1" />
                    {post.link}
                  </a>
                )}
              </div>
              <span className="text-xs text-gray-400 ml-4 shrink-0">
                {post.date}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
