import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { HEI_BLUE_LOGO } from "../assets/logos";

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState({ ref: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const set = (key, val) => setForm((f) => ({ ...f, [key]: val }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.ref.trim() || !form.password.trim()) {
      setError("Veuillez remplir tous les champs.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      await login(form.ref.toUpperCase(), form.password);
      navigate("/");
    } catch (err) {
      setError(err.response?.data?.error || "Erreur de connexion, réessayez.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen bg-surface flex items-center
                    justify-center px-4 py-8"
    >
      <div
        className="bg-white rounded-2xl sm:rounded-3xl shadow-modal
                      p-6 sm:p-8 lg:p-10 w-full max-w-sm sm:max-w-md"
      >
        {/* Logo */}
        <div className="flex flex-col items-center mb-6 sm:mb-8">
          <img
            src={HEI_BLUE_LOGO}
            alt="HEI"
            className="h-12 sm:h-16 mb-3 object-contain"
          />
          <h1 className="text-xl sm:text-2xl font-bold text-navy">
            HEI STDhub
          </h1>
          <p className="text-gray-400 text-xs sm:text-sm mt-1 text-center">
            Connectez-vous à votre espace
          </p>
        </div>

        {/* Erreur */}
        {error && (
          <div
            className="bg-red-50 border border-red-200 text-red-600
                          text-sm px-4 py-3 rounded-xl mb-4"
          >
            {error}
          </div>
        )}

        {/* Formulaire */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label
              className="text-xs font-bold text-gray-500
                              mb-1 block uppercase tracking-wide"
            >
              Référence *
            </label>
            <input
              className="input-field"
              placeholder="STD25001 ou ADMIN001"
              value={form.ref}
              onChange={(e) => {
                set("ref", e.target.value);
                setError("");
              }}
            />
          </div>

          <div>
            <label
              className="text-xs font-bold text-gray-500
                              mb-1 block uppercase tracking-wide"
            >
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

          <button
            type="submit"
            disabled={loading}
            className="btn-primary w-full text-center py-3 mt-1
                       disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {loading ? "Connexion..." : "Se connecter"}
          </button>
        </form>

        <p className="text-center text-xs text-gray-400 mt-5 sm:mt-6">
          Pas encore inscrit ?{" "}
          <Link to="/register" className="text-gold font-bold hover:underline">
            Créer un compte
          </Link>
        </p>
      </div>
    </div>
  );
}
