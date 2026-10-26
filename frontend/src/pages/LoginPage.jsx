import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import AuthShell from "../components/auth/AuthShell";
import { Eye, EyeOff, User, Lock, ArrowRight } from "lucide-react";

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ ref: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPwd, setShowPwd] = useState(false);

  const set = (key, val) => setForm((f) => ({ ...f, [key]: val }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.ref.trim() || !form.password.trim()) {
      setError("Veuillez remplir tous les champs.");
      return;
    }
    if (form.ref.includes("@")) {
      setError("Inserer votre reference etudiante ou enseignante.");
      return;
    }

    setLoading(true);
    setError("");
    try {
      await login(form.ref.trim().toUpperCase(), form.password);
      navigate("/");
    } catch (err) {
      setError(
        err.response?.data?.error ||
          err.userMessage ||
          "Erreur de connexion, reessayez.",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell
      headline="Bon retour sur "
      headlineAccent="HEI STDhub"
      sub="Interagissez avec la tribu HEI sans moderation, Creez de nouvelles amities et renforcez les existantes ."
      cardTitle="HEI TRIBU"
      cardSub="Mais sous un nouvel angle"
      title="Connexion"
      subtitle="Entrez vos identifiants pour continuer"
      footer={
        <p className="text-xs text-gray-400">
          Pas encore inscrit ?{" "}
          <Link to="/register" className="text-navy font-bold hover:underline">
            Créer un compte
          </Link>
        </p>
      }
    >
      {error && <div className="auth-error">{error}</div>}

      <form onSubmit={handleSubmit} className="flex flex-col gap-5">
        <div>
          <label className="auth-label">Référence</label>
          <div className="relative">
            <User
              size={15}
              className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"
            />
            <input
              className="input-field pl-10"
              placeholder="STD25XXX, PROF001..."
              value={form.ref}
              onChange={(e) => {
                set("ref", e.target.value);
                setError("");
              }}
            />
          </div>
        </div>

        <div>
          <label className="auth-label">Mot de passe</label>
          <div className="relative">
            <Lock
              size={15}
              className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"
            />
            <input
              type={showPwd ? "text" : "password"}
              className="input-field pl-10 pr-10"
              placeholder="••••••••"
              value={form.password}
              onChange={(e) => {
                set("password", e.target.value);
                setError("");
              }}
            />
            <button
              type="button"
              tabIndex={-1}
              onClick={() => setShowPwd((p) => !p)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-navy transition"
            >
              {showPwd ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
        </div>

        <div className="flex justify-end -mt-2">
          <Link
            to="/forgot-password"
            className="text-xs text-navy hover:underline font-medium"
          >
            Mot de passe oublié ?
          </Link>
        </div>

        <button type="submit" disabled={loading} className="auth-submit">
          {loading ? (
            "Connexion en cours..."
          ) : (
            <>
              <span>Se connecter</span>
              <ArrowRight size={16} />
            </>
          )}
        </button>
      </form>
    </AuthShell>
  );
}
