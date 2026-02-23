import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { HEI_BLUE_LOGO } from "../assets/logos";

export default function LoginPage() {
  const { login }  = useAuth();
  const navigate   = useNavigate();

  const [form,  setForm]  = useState({
    ref: "", password: "", role: "student",
  });
  const [error, setError] = useState("");

  const set = (key, val) =>
    setForm((f) => ({ ...f, [key]: val }));

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.ref.trim() || !form.password.trim()) {
      setError("Veuillez remplir tous les champs.");
      return;
    }
    // TODO : POST /api/auth/login
    login({
      ref:    form.ref.toUpperCase(),
      name:   form.ref,
      email:  "",
      pseudo: form.ref,
      role:   form.role,
    });
    navigate("/");
  };

  return (
    <div className="min-h-screen bg-surface flex items-center
                    justify-center px-4">
      <div className="bg-white rounded-3xl shadow-modal p-10
                      w-full max-w-md">

        {/* ── Logo ── */}
        <div className="flex flex-col items-center mb-8">
          <img
            src={HEI_BLUE_LOGO}
            alt="HEI"
            className="h-16 mb-3 object-contain"
          />
          <h1 className="text-2xl font-bold text-navy">
            HEI STDhub
          </h1>
          <p className="text-gray-400 text-sm mt-1">
            Connectez-vous à votre espace
          </p>
        </div>

        {/* ── Erreur ── */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-600
                          text-sm px-4 py-3 rounded-xl mb-4">
            {error}
          </div>
        )}

        {/* ── Formulaire ── */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">

          <div>
            <label className="text-xs font-bold text-gray-500 mb-1
                              block uppercase tracking-wide">
              Référence *
            </label>
            <input
              className="input-field"
              placeholder="STD25001 ou PROF001"
              value={form.ref}
              onChange={(e) => {
                set("ref", e.target.value);
                setError("");
              }}
            />
          </div>

          <div>
            <label className="text-xs font-bold text-gray-500 mb-1
                              block uppercase tracking-wide">
              Mot de passe *
            </label>
            <input
              type="password"
              className="input-field"
              placeholder="••••••••"
              value={form.password}
              onChange={(e) => {
                set("password", e.target.value);
                setError("");
              }}
            />
          </div>

          <div>
            <label className="text-xs font-bold text-gray-500 mb-1
                              block uppercase tracking-wide">
              Rôle
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
            className="btn-primary w-full text-center py-3 mt-2"
          >
            Se connecter
          </button>

        </form>

        {/* ── Lien inscription ── */}
        <p className="text-center text-xs text-gray-400 mt-6">
          Pas encore inscrit ?{" "}
          <Link
            to="/register"
            className="text-gold font-bold hover:underline"
          >
            Créer un compte
          </Link>
        </p>

      </div>
    </div>
  );
}