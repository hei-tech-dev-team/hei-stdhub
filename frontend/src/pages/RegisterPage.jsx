import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { HEI_BLUE_LOGO } from "../assets/logos";

const FIELDS = [
  { key: "nom",    label: "Nom",           placeholder: "Rakoto",            col: 1 },
  { key: "prenom", label: "Prénom",        placeholder: "Jean",              col: 1 },
  { key: "email",  label: "Email",         placeholder: "hei.jean@gmail.com",col: 2 },
  { key: "ref",    label: "Référence STD", placeholder: "STD25001",          col: 2 },
  { key: "pseudo", label: "Pseudo (chat)", placeholder: "MonPseudo",         col: 2 },
];

export default function RegisterPage() {
  const { login }  = useAuth();
  const navigate   = useNavigate();

  const [form,  setForm]  = useState({
    nom: "", prenom: "", email: "",
    ref: "", pseudo: "", role: "student",
  });
  const [error, setError] = useState("");

  const set = (key, val) =>
    setForm((f) => ({ ...f, [key]: val }));

  const validate = () => {
    if (!form.nom.trim())    return "Le nom est requis.";
    if (!form.prenom.trim()) return "Le prénom est requis.";
    if (!form.email.trim())  return "L'email est requis.";
    if (!form.ref.trim())    return "La référence est requise.";
    if (!form.pseudo.trim()) return "Le pseudo est requis.";
    if (
      form.role === "student" &&
      !/^hei\..+@gmail\.com$/.test(form.email)
    ) {
      return "Email étudiant : hei.prenom@gmail.com";
    }
    return null;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const err = validate();
    if (err) { setError(err); return; }
    // TODO : POST /api/auth/register
    login({
      ref:    form.ref.toUpperCase(),
      name:   `${form.prenom} ${form.nom}`,
      email:  form.email,
      pseudo: form.pseudo,
      role:   form.role,
    });
    navigate("/");
  };

  return (
    <div className="min-h-screen bg-surface flex items-center
                    justify-center px-4 py-10">
      <div className="bg-white rounded-3xl shadow-modal p-10
                      w-full max-w-lg">

        {/* ── Logo ── */}
        <div className="flex flex-col items-center mb-8">
          <img
            src={HEI_BLUE_LOGO}
            alt="HEI"
            className="h-14 mb-3 object-contain"
          />
          <h1 className="text-2xl font-bold text-navy">
            Créer un compte
          </h1>
          <p className="text-gray-400 text-sm mt-1">HEI STDhub</p>
        </div>

        {/* ── Erreur ── */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-600
                          text-sm px-4 py-3 rounded-xl mb-4">
            {error}
          </div>
        )}

        {/* ── Formulaire ── */}
        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-2 gap-4 mb-4">
            {FIELDS.map(({ key, label, placeholder, col }) => (
              <div
                key={key}
                className={col === 2 ? "col-span-2" : ""}
              >
                <label className="text-xs font-bold text-gray-500 mb-1
                                  block uppercase tracking-wide">
                  {label} *
                </label>
                <input
                  className="input-field"
                  placeholder={placeholder}
                  value={form[key]}
                  onChange={(e) => {
                    set(key, e.target.value);
                    setError("");
                  }}
                />
              </div>
            ))}

            {/* Rôle */}
            <div className="col-span-2">
              <label className="text-xs font-bold text-gray-500 mb-1
                                block uppercase tracking-wide">
                Rôle *
              </label>
              <select
                className="input-field"
                value={form.role}
                onChange={(e) => set("role", e.target.value)}
              >
                <option value="student">Étudiant</option>
                <option value="teacher">Professeur</option>
              </select>
            </div>
          </div>

          <button
            type="submit"
            className="btn-primary w-full text-center py-3"
          >
            S'inscrire
          </button>
        </form>

        {/* ── Lien connexion ── */}
        <p className="text-center text-xs text-gray-400 mt-6">
          Déjà un compte ?{" "}
          <Link
            to="/login"
            className="text-gold font-bold hover:underline"
          >
            Se connecter
          </Link>
        </p>

      </div>
    </div>
  );
}