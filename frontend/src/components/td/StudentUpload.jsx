import { useState, useEffect } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faCloudUploadAlt,
  faLink,
  faCheckCircle,
  faTrash,
  faSpinner,
  faFile,
  faGraduationCap,
  faChevronRight,
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
    "WEB1", "PROG1", "SYS1", "DONNEES1",
    "THEORIE1-P1", "THEORIE1-P2",
    "WEB2", "PROG2-POO", "PROG2-API", "SYS2", "MGT1",
  ],
  L2: ["WEB3", "PROG3", "MGT2", "PROG4", "SYS3", "DONNEES2", "IA1"],
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
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    requestAnimationFrame(() => setVisible(true));
  }, []);

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
    if (!user?.nom?.trim()) return "Le nom est requis.";
    if (!user?.prenom?.trim()) return "Le prénom est requis.";
    if (!user?.email?.trim()) return "L'email est requis.";
    if (!user?.ref?.trim()) return "La référence STD est requise.";
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
      <div className="flex flex-col items-center justify-center h-full text-center py-16 sm:py-24 px-4">
        <div className="relative mb-6">
          <div className="absolute inset-0 bg-green-400/20 rounded-full scale-[2] animate-ping opacity-30" />
          <div className="absolute inset-0 bg-green-500/10 rounded-full scale-150 blur-xl animate-pulse" />
          <div className="relative bg-white border-2 border-green-300/30 p-6 rounded-2xl shadow-lg">
            <FontAwesomeIcon icon={faCheckCircle} className="text-5xl text-green-400" />
          </div>
        </div>
        <h2 className="text-lg sm:text-xl font-bold text-navy mb-2">
          Rendu soumis avec succès !
        </h2>
        <p className="text-gray-400 text-sm max-w-sm">
          Votre devoir <span className="font-bold text-navy">{form.type}</span>{" "}
          pour <span className="font-bold text-navy">{form.ue}</span> a bien été
          envoyé.
        </p>
      </div>
    );
  }

  return (
    <div
      className={`flex flex-col lg:flex-row gap-6 lg:gap-8 h-full transition-all duration-700 ease-out ${
        visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
      }`}
    >
      {/* Dropzone */}

      <div
        className={
          "flex flex-col items-center justify-center rounded-2xl " +
          "border-2 border-dashed cursor-pointer transition-all duration-500 " +
          "min-h-48 sm:min-h-64 lg:flex-1 p-6 sm:p-8 " +
          (dragOver
            ? "border-gold bg-gold/5"
            : "border-contact bg-white hover:border-gold/40 hover:shadow-[0_15px_40px_rgba(0,0,0,0.04),0_0_15px_rgba(212,175,55,0.1)]")
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
      <form onSubmit={handleSubmit} className="flex-1 flex flex-col gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-navy/10 flex items-center justify-center">
            <FontAwesomeIcon icon={faGraduationCap} className="text-navy text-lg" />
          </div>
          <div>
            <h3 className="font-bold text-navy text-base">Informations</h3>
            <p className="text-sm text-gray-400">Vos coordonnées et le devoir</p>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-card p-5 flex flex-col gap-4">
          {error && (
            <div className="animate-slide-up bg-red-50 border border-red-200 text-red-600 text-sm px-4 py-2.5 rounded-xl flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-red-500 shrink-0" />
              {error}
            </div>
          )}

          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1">
              <label className="text-xs font-bold text-gray-500 mb-1.5 block uppercase tracking-wide">
                Nom
              </label>
              <input
                className="input-field bg-surface/50 text-gray-500 cursor-not-allowed"
                value={user?.nom || ""}
                readOnly
              />
            </div>
            <div className="flex-1">
              <label className="text-xs font-bold text-gray-500 mb-1.5 block uppercase tracking-wide">
                Prénom
              </label>
              <input
                className="input-field bg-surface/50 text-gray-500 cursor-not-allowed"
                value={user?.prenom || ""}
                readOnly
              />
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1">
              <label className="text-xs font-bold text-gray-500 mb-1.5 block uppercase tracking-wide">
                Email
              </label>
              <input
                className="input-field bg-surface/50 text-gray-500 cursor-not-allowed"
                value={user?.email || ""}
                readOnly
              />
            </div>
            <div className="flex-1">
              <label className="text-xs font-bold text-gray-500 mb-1.5 block uppercase tracking-wide">
                Référence
              </label>
              <input
                className="input-field bg-surface/50 text-gray-500 cursor-not-allowed"
                value={user?.ref || ""}
                readOnly
              />
            </div>
          </div>

          <hr className="border-contact/50" />

          <div className="flex gap-3">
            <div className="flex-1">
              <label className="text-xs font-bold text-gray-500 mb-1.5 block uppercase tracking-wide">
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
              <label className="text-xs font-bold text-gray-500 mb-1.5 block uppercase tracking-wide">
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

          <div>
            <label className="text-xs font-bold text-gray-500 mb-1.5 block uppercase tracking-wide">
              UE <span className="text-red-400">*</span>
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
            <p className="text-xs text-gray-400 mt-1.5 flex items-center gap-1">
              <FontAwesomeIcon icon={faChevronRight} className="text-[10px]" />
              Le rendu sera envoyé au professeur responsable de cette UE.
            </p>
          </div>

          <div>
            <label className="text-xs font-bold text-gray-500 mb-1.5 block uppercase tracking-wide">
              Type
            </label>
            <div className="flex gap-2">
              {["TD", "Examen"].map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => set("type", t)}
                  className={`px-5 py-2.5 rounded-xl text-sm font-bold transition-all duration-200 ${
                    form.type === t
                      ? "bg-navy text-white shadow-md shadow-navy/20"
                      : "bg-white text-navy border-2 border-contact/60 hover:border-gold/40"
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          <hr className="border-contact/50" />

          <div className="relative">
            <FontAwesomeIcon
              icon={faLink}
              className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 text-sm pointer-events-none"
            />
            <input
              className="input-field pl-10"
              placeholder="Lien Google Drive, GitHub..."
              value={form.link}
              onChange={(e) => set("link", e.target.value)}
            />
          </div>

          <div className="flex flex-col sm:flex-row gap-3 mt-1">
            <button
              type="button"
              onClick={() =>
                setForm({
                  ...EMPTY,
                  email: user?.email || "",
                  ref: user?.ref || "",
                })
              }
              className="flex-1 px-5 py-3 rounded-xl font-bold text-sm
                bg-gradient-to-r from-red-500 to-red-600 text-white
                hover:from-red-600 hover:to-red-700
                shadow-md shadow-red-500/25 hover:shadow-lg hover:shadow-red-500/30
                active:scale-[0.95] transition-all duration-200"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-5 py-3 rounded-xl font-bold text-sm
                bg-gradient-to-r from-emerald-500 to-emerald-600 text-white
                hover:from-emerald-600 hover:to-emerald-700
                shadow-md shadow-emerald-500/25 hover:shadow-lg hover:shadow-emerald-500/30
                active:scale-[0.95] disabled:opacity-50 disabled:cursor-not-allowed
                transition-all duration-200"
            >
              {loading ? (
                <FontAwesomeIcon icon={faSpinner} className="animate-spin" />
              ) : (
                "Soumettre"
              )}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
