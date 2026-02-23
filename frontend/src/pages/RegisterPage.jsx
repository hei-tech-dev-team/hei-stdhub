import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { HEI_BLUE_LOGO } from "../assets/logos";

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
      return "Format email étudiant : hei.prenom@gmail.com";
    }
    return null;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const err = validate();
    if (err) { setError(err); return; }
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
                    justify-center px-4 py-8">
      <div className="bg-white rounded-2xl sm:rounded-3xl shadow-modal
                      p-6 sm:p-8 lg:p-10 w-full max-w-sm sm:max-w-lg">

        {/* Logo */}
        <div className="flex flex-col items-center mb-6 sm:mb-8">
          <img
            src={HEI_BLUE_LOGO}
            alt="HEI"
            className="h-12 sm:h-14 mb-3 object-contain"
          />
          <h1 className="text-xl sm:text-2xl font-bold text-navy">
            Créer un compte
          </h1>
          <p className="text-gray-400 text-xs sm:text-sm mt-1">
            HEI STDhub
          </p>
        </div>

        {/* Erreur */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-600
                          text-sm px-4 py-3 rounded-xl mb-4">
            {error}
          </div>
        )}

        {/* Formulaire */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">

          {/* Nom + Prénom */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            <div>
              <label className="text-xs font-bold text-gray-500
                                mb-1 block uppercase tracking-wide">
                Nom *
              </label>
              <input
                className="input-field"
                placeholder="Rakoto"
                value={form.nom}
                onChange={(e) => { set("nom", e.target.value); setError(""); }}
              />
            </div>
            <div>
              <label className="text-xs font-bold text-gray-500
                                mb-1 block uppercase tracking-wide">
                Prénom *
              </label>
              <input
                className="input-field"
                placeholder="Jean"
                value={form.prenom}
                onChange={(e) => { set("prenom", e.target.value); setError(""); }}
              />
            </div>
          </div>

          {/* Email */}
          <div>
            <label className="text-xs font-bold text-gray-500
                              mb-1 block uppercase tracking-wide">
              Email *
            </label>
            <input
              type="email"
              className="input-field"
              placeholder="hei.jean@gmail.com"
              value={form.email}
              onChange={(e) => { set("email", e.target.value); setError(""); }}
            />
          </div>

          {/* Référence + Pseudo */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            <div>
              <label className="text-xs font-bold text-gray-500
                                mb-1 block uppercase tracking-wide">
                Référence STD *
              </label>
              <input
                className="input-field"
                placeholder="STD25001"
                value={form.ref}
                onChange={(e) => { set("ref", e.target.value); setError(""); }}
              />
            </div>
            <div>
              <label className="text-xs font-bold text-gray-500
                                mb-1 block uppercase tracking-wide">
                Pseudo (chat) *
              </label>
              <input
                className="input-field"
                placeholder="MonPseudo"
                value={form.pseudo}
                onChange={(e) => { set("pseudo", e.target.value); setError(""); }}
              />
            </div>
          </div>

          {/* Rôle */}
          <div>
            <label className="text-xs font-bold text-gray-500
                              mb-1 block uppercase tracking-wide">
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

          <button
            type="submit"
            className="btn-primary w-full text-center py-3 mt-1"
          >
            S'inscrire
          </button>
        </form>

        <p className="text-center text-xs text-gray-400 mt-5 sm:mt-6">
          Déjà un compte ?{" "}
          <Link to="/login" className="text-gold font-bold hover:underline">
            Se connecter
          </Link>
        </p>

      </div>
    </div>
  );
}