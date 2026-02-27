import { useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faCloudUploadAlt,
  faLink,
  faCheckCircle,
  faTrash,
  faSpinner,
} from "@fortawesome/free-solid-svg-icons";
import api from "../../api/axios";
import { useAuth } from "../../context/AuthContext";

const GROUPS = {
  L1: ["N1", "N2", "N3", "N4"],
  L2: ["K1", "K2", "K3"],
  L3: ["J1", "J2"],
};

const UES = {
  L1: [
    "WEB1",
    "PROG1",
    "SYS1",
    "DONNEES1",
    "THEORIE1-P1",
    "THEORIE1-P2",
    "WEB2",
    "PROG2-POO",
    "PROG2-API",
    "SYS2",
    "DONNEES2",
    "IA1",
  ],
  L2: ["WEB3", "PROG3", "MGT2", "PROG4", "SYS3"],
  L3: ["MOB1", "PROG5", "SECU1", "SECU2"],
};

export default function StudentUpload() {
  const { user } = useAuth();

  const defaultLevel = user?.level || "L1";
  const EMPTY = {
    nom: "",
    prenom: "",
    email: user?.email || "",
    ref: user?.ref || "",
    level: defaultLevel,
    groupe: GROUPS[defaultLevel][0],
    ue: UES[defaultLevel][0],
    type: "TD",
    file: null,
    link: "",
  };

  const [form, setForm] = useState(EMPTY);
  const [dragOver, setDragOver] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const set = (k, v) => setForm((p) => ({ ...p, [k]: v }));

  const handleLevelChange = (newLevel) =>
    setForm((p) => ({
      ...p,
      level: newLevel,
      groupe: GROUPS[newLevel][0],
      ue: UES[newLevel][0],
    }));

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      setError("Fichier trop volumineux (max 10 Mo).");
      return;
    }
    set("file", file);
    setError("");
  };

  const handleFileInput = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      setError("Fichier trop volumineux (max 10 Mo).");
      return;
    }
    set("file", file);
    setError("");
  };

  const validate = () => {
    if (!form.nom.trim()) return "Le nom est requis.";
    if (!form.prenom.trim()) return "Le prénom est requis.";
    if (!form.email.trim()) return "L'email est requis.";
    if (!form.ref.trim()) return "La référence STD est requise.";
    if (!form.ue) return "Veuillez choisir une UE.";
    if (!form.file && !form.link.trim())
      return "Veuillez déposer un fichier ou coller un lien.";
    return null;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const err = validate();
    if (err) {
      setError(err);
      return;
    }
    setLoading(true);
    setError("");

    try {
      const fd = new FormData();
      fd.append("nom", user.nom);
      fd.append("prenom", user.prenom);
      fd.append("email", user.email);
      fd.append("ref", user.ref);
      fd.append("level", form.level);
      fd.append("groupe", form.groupe);
      fd.append("ue", form.ue);
      fd.append("type", form.type);
      if (form.file) fd.append("file", form.file);
      if (form.link) fd.append("link", form.link);

      await api.post("/submissions", fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      setSubmitted(true);
      setTimeout(() => {
        setSubmitted(false);
        setForm({ ...EMPTY, email: user?.email || "", ref: user?.ref || "" });
      }, 3000);
    } catch (err) {
      setError(err.response?.data?.error || "Erreur lors de la soumission.");
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <div
        className="flex flex-col items-center justify-center
                      h-full text-center py-16 sm:py-24 px-4"
      >
        <FontAwesomeIcon
          icon={faCheckCircle}
          className="text-5xl sm:text-6xl text-green-400 mb-4"
        />
        <h2 className="text-lg sm:text-xl font-bold text-navy mb-2">
          Rendu soumis avec succès !
        </h2>
        <p className="text-gray-400 text-sm">
          Votre devoir <span className="font-bold text-navy">{form.type}</span>{" "}
          pour <span className="font-bold text-navy">{form.ue}</span> a bien été
          envoyé.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col lg:flex-row gap-6 h-full">
      {/* Dropzone */}
      <div
        className={
          "flex flex-col items-center justify-center rounded-2xl " +
          "border-2 border-dashed cursor-pointer transition " +
          "min-h-48 sm:min-h-64 lg:flex-1 p-6 sm:p-8 " +
          (dragOver
            ? "border-gold bg-gold/5"
            : "border-contact bg-white hover:border-navy/40")
        }
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
          className={
            "text-4xl sm:text-5xl mb-3 transition " +
            (dragOver ? "text-gold" : "text-gray-300")
          }
        />
        {form.file ? (
          <>
            <p className="font-bold text-navy text-sm text-center truncate max-w-full px-4">
              {form.file.name}
            </p>
            <p className="text-xs text-gray-400 mt-1">
              {(form.file.size / 1024 / 1024).toFixed(2)} Mo
            </p>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                set("file", null);
              }}
              className="mt-3 text-red-400 text-xs hover:underline flex items-center gap-1"
            >
              <FontAwesomeIcon icon={faTrash} /> Supprimer
            </button>
          </>
        ) : (
          <>
            <p className="font-semibold text-gray-400 text-sm sm:text-base text-center">
              Déposer votre devoir ici
            </p>
            <p className="text-xs text-gray-300 mt-1 text-center">
              ou cliquer pour parcourir (max 10 Mo)
            </p>
          </>
        )}
        <input
          id="student-file"
          type="file"
          className="hidden"
          onChange={handleFileInput}
        />
      </div>

      {/* Formulaire */}
      <form onSubmit={handleSubmit} className="flex flex-col gap-3 lg:flex-1">
        {error && (
          <div
            className="bg-red-50 border border-red-200 text-red-600
                          text-sm px-4 py-2 rounded-xl"
          >
            {error}
          </div>
        )}

        {/* Nom + Prénom — readonly */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1">
            <label className="text-xs font-bold text-gray-500 mb-1 block uppercase tracking-wide">
              Nom
            </label>
            <input
              className="input-field bg-surface text-gray-400 cursor-not-allowed"
              value={user?.nom || ""}
              readOnly
            />
          </div>
          <div className="flex-1">
            <label className="text-xs font-bold text-gray-500 mb-1 block uppercase tracking-wide">
              Prénom
            </label>
            <input
              className="input-field bg-surface text-gray-400 cursor-not-allowed"
              value={user?.prenom || ""}
              readOnly
            />
          </div>
        </div>

        {/* Email — readonly */}
        <div>
          <label className="text-xs font-bold text-gray-500 mb-1 block uppercase tracking-wide">
            Email
          </label>
          <input
            className="input-field bg-surface text-gray-400 cursor-not-allowed"
            value={user?.email || ""}
            readOnly
          />
        </div>

        {/* Référence — readonly */}
        <div>
          <label className="text-xs font-bold text-gray-500 mb-1 block uppercase tracking-wide">
            Référence STD
          </label>
          <input
            className="input-field bg-surface text-gray-400 cursor-not-allowed"
            value={user?.ref || ""}
            readOnly
          />
        </div>

        {/* Niveau + Groupe */}
        <div className="flex gap-2">
          <div className="flex-1">
            <label className="text-xs font-bold text-gray-500 mb-1 block uppercase tracking-wide">
              Niveau
            </label>
            <select
              className="input-field"
              value={form.level}
              onChange={(e) => handleLevelChange(e.target.value)}
            >
              {Object.keys(GROUPS).map((l) => (
                <option key={l}>{l}</option>
              ))}
            </select>
          </div>
          <div className="flex-1">
            <label className="text-xs font-bold text-gray-500 mb-1 block uppercase tracking-wide">
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
        </div>

        {/* UE */}
        <div>
          <label className="text-xs font-bold text-gray-500 mb-1 block uppercase tracking-wide">
            Unité d'enseignement (UE) *
          </label>
          <select
            className="input-field"
            value={form.ue}
            onChange={(e) => set("ue", e.target.value)}
          >
            {UES[form.level].map((ue) => (
              <option key={ue} value={ue}>
                {ue}
              </option>
            ))}
          </select>
          <p className="text-xs text-gray-400 mt-1">
            Le rendu sera envoyé au professeur responsable de cette UE.
          </p>
        </div>

        {/* Type */}
        <div>
          <label className="text-xs font-bold text-gray-500 mb-1 block uppercase tracking-wide">
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

        {/* Séparateur */}
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
                       text-gray-400 text-sm pointer-events-none"
          />
          <input
            className="input-field pl-10"
            placeholder="Lien Google Drive ou GitHub..."
            value={form.link}
            onChange={(e) => set("link", e.target.value)}
          />
        </div>

        {/* Boutons */}
        <div className="flex flex-col sm:flex-row gap-3 mt-2">
          <button
            type="button"
            onClick={() =>
              setForm({
                ...EMPTY,
                email: user?.email || "",
                ref: user?.ref || "",
              })
            }
            className="flex-1 btn-danger text-center"
          >
            Annuler
          </button>
          <button
            type="submit"
            disabled={loading}
            className="flex-1 btn-success text-center disabled:opacity-60"
          >
            {loading ? (
              <FontAwesomeIcon icon={faSpinner} className="animate-spin" />
            ) : (
              "Soumettre"
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
