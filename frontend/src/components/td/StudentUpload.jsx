import { useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faCloudUploadAlt,
  faLink,
  faCheckCircle,
  faTrash,
} from "@fortawesome/free-solid-svg-icons";
import { useAuth } from "../../context/AuthContext";

const GROUPS = {
  L1: ["N1", "N2", "N3", "N4"],
  L2: ["K1", "K2", "K3"],
  L3: ["J1", "J2"],
};

const EMPTY = {
  nom: "",
  prenom: "",
  email: "",
  ref: "",
  level: "L1",
  groupe: "N1",
  type: "TD",
  file: null,
  link: "",
};

export default function StudentUpload() {
  const { user } = useAuth();

  const [form, setForm] = useState({
    ...EMPTY,
    email: user?.email || "",
    ref: user?.ref || "",
  });
  const [dragOver, setDragOver] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");

  const set = (key, val) => setForm((f) => ({ ...f, [key]: val }));

  /* ── Drag & Drop ── */
  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files[0];
    if (!f) return;
    if (f.size > 10 * 1024 * 1024) {
      setError("Fichier trop volumineux (max 10 Mo).");
      return;
    }
    set("file", f);
    setError("");
  };

  /* ── Validation ── */
  const validate = () => {
    if (!form.nom.trim()) return "Le nom est requis.";
    if (!form.prenom.trim()) return "Le prénom est requis.";
    if (!form.email.trim()) return "L'email est requis.";
    if (!form.ref.trim()) return "La référence STD est requise.";
    if (!form.file && !form.link.trim())
      return "Veuillez déposer un fichier ou coller un lien.";
    return null;
  };

  /* ── Soumettre ── */
  const handleSubmit = (e) => {
    e.preventDefault();
    const err = validate();
    if (err) {
      setError(err);
      return;
    }
    setError("");
    // TODO : POST /api/submissions
    setSubmitted(true);
    setTimeout(() => {
      setSubmitted(false);
      setForm({
        ...EMPTY,
        email: user?.email || "",
        ref: user?.ref || "",
      });
    }, 3000);
  };

  /* ── Succès ── */
  if (submitted) {
    return (
      <div
        className="flex flex-col items-center justify-center
                      h-full text-center py-24"
      >
        <FontAwesomeIcon
          icon={faCheckCircle}
          className="text-6xl text-green-400 mb-4"
        />
        <h2 className="text-xl font-bold text-navy mb-2">
          Rendu soumis avec succès !
        </h2>
        <p className="text-gray-400 text-sm">Vous allez être redirigé...</p>
      </div>
    );
  }

  return (
    <div className="flex gap-8 h-full">
      {/* ── Zone de dépôt ── */}
      <div
        className={`flex-1 flex flex-col items-center justify-center
                    rounded-2xl border-2 border-dashed cursor-pointer
                    transition min-h-64
                    ${
                      dragOver
                        ? "border-gold bg-gold/5"
                        : "border-contact bg-white hover:border-navy/40"
                    }`}
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        onClick={() => document.getElementById("student-file").click()}
      >
        <FontAwesomeIcon
          icon={faCloudUploadAlt}
          className={`text-5xl mb-3 transition
                      ${dragOver ? "text-gold" : "text-gray-300"}`}
        />

        {form.file ? (
          <>
            <p className="font-bold text-navy text-sm">{form.file.name}</p>
            <p className="text-xs text-gray-400 mt-1">
              {(form.file.size / 1024 / 1024).toFixed(2)} Mo
            </p>
            <button
              onClick={(e) => {
                e.stopPropagation();
                set("file", null);
              }}
              className="mt-3 text-red-400 text-xs hover:underline
                         flex items-center gap-1"
            >
              <FontAwesomeIcon icon={faTrash} />
              Supprimer
            </button>
          </>
        ) : (
          <>
            <p className="font-semibold text-gray-400">
              Déposer votre devoir ici
            </p>
            <p className="text-xs text-gray-300 mt-1">
              ou cliquer pour parcourir (max 10 Mo)
            </p>
          </>
        )}

        <input
          id="student-file"
          type="file"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files[0];
            if (!f) return;
            if (f.size > 10 * 1024 * 1024) {
              setError("Fichier trop volumineux (max 10 Mo).");
              return;
            }
            set("file", f);
            setError("");
          }}
        />
      </div>

      {/* ── Formulaire ── */}
      <form onSubmit={handleSubmit} className="flex-1 flex flex-col gap-3">
        {/* Erreur */}
        {error && (
          <div
            className="bg-red-50 border border-red-200 text-red-600
                          text-sm px-4 py-2 rounded-xl"
          >
            {error}
          </div>
        )}

        {/* Nom */}
        <div>
          <label
            className="text-xs font-bold text-gray-500 mb-1
                            block uppercase tracking-wide"
          >
            Nom *
          </label>
          <input
            className="input-field"
            placeholder="Rakoto"
            value={form.nom}
            onChange={(e) => set("nom", e.target.value)}
          />
        </div>

        {/* Prénom */}
        <div>
          <label
            className="text-xs font-bold text-gray-500 mb-1
                            block uppercase tracking-wide"
          >
            Prénom *
          </label>
          <input
            className="input-field"
            placeholder="Jean"
            value={form.prenom}
            onChange={(e) => set("prenom", e.target.value)}
          />
        </div>

        {/* Email */}
        <div>
          <label
            className="text-xs font-bold text-gray-500 mb-1
                            block uppercase tracking-wide"
          >
            Email *
          </label>
          <input
            type="email"
            className="input-field"
            placeholder="hei.jean@gmail.com"
            value={form.email}
            onChange={(e) => set("email", e.target.value)}
          />
        </div>

        {/* Référence STD */}
        <div>
          <label
            className="text-xs font-bold text-gray-500 mb-1
                            block uppercase tracking-wide"
          >
            Référence STD *
          </label>
          <input
            className="input-field"
            placeholder="STD25001"
            value={form.ref}
            onChange={(e) => set("ref", e.target.value)}
          />
        </div>

        {/* Niveau + Groupe + Type */}
        <div className="flex gap-2">
          <div className="flex-1">
            <label
              className="text-xs font-bold text-gray-500 mb-1
                              block uppercase tracking-wide"
            >
              Niveau
            </label>
            <select
              className="input-field"
              value={form.level}
              onChange={(e) => {
                set("level", e.target.value);
                set("groupe", GROUPS[e.target.value][0]);
              }}
            >
              {Object.keys(GROUPS).map((l) => (
                <option key={l}>{l}</option>
              ))}
            </select>
          </div>

          <div className="flex-1">
            <label
              className="text-xs font-bold text-gray-500 mb-1
                              block uppercase tracking-wide"
            >
              Groupe
            </label>
            <select
              className="input-field"
              value={form.groupe}
              onChange={(e) => set("groupe", e.target.value)}
            >
              {GROUPS[form.level].map((g) => (
                <option key={g}>{g}</option>
              ))}
            </select>
          </div>

          <div className="flex-1">
            <label
              className="text-xs font-bold text-gray-500 mb-1
                              block uppercase tracking-wide"
            >
              Type
            </label>
            <select
              className="input-field"
              value={form.type}
              onChange={(e) => set("type", e.target.value)}
            >
              <option>TD</option>
              <option>Examen</option>
            </select>
          </div>
        </div>

        {/* Séparateur OU */}
        <div className="flex items-center gap-3">
          <hr className="flex-1 border-contact" />
          <span className="text-xs font-bold text-gray-400">OU</span>
          <hr className="flex-1 border-contact" />
        </div>

        {/* Lien */}
        <div className="relative">
          <FontAwesomeIcon
            icon={faLink}
            className="absolute left-4 top-1/2 -translate-y-1/2
                       text-gray-400 text-sm"
          />
          <input
            className="input-field pl-10"
            placeholder="Lien Google Drive ou GitHub..."
            value={form.link}
            onChange={(e) => set("link", e.target.value)}
          />
        </div>

        {/* Boutons */}
        <div className="flex gap-3 mt-2">
          <button
            type="button"
            onClick={() =>
              setForm({
                ...EMPTY,
                email: user?.email || "",
                ref: user?.ref || "",
              })
            }
            className="flex-1 btn-danger"
          >
            Annuler
          </button>
          <button type="submit" className="flex-1 btn-success">
            Soumettre
          </button>
        </div>
      </form>
    </div>
  );
}
