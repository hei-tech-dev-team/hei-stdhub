import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { HEI_BLUE_LOGO, HEI_WHITE_LOGO } from "../assets/logos";
import { Eye, EyeOff, User, Lock, ArrowRight } from "lucide-react";

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ ref: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPwd, setShowPwd] = useState(false);
  const [isAlumni, setIsAlumni] = useState(false);

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
    <div className="min-h-screen bg-gradient-to-br from-[#0A1A33] via-[#001948] to-[#0A1A33] flex items-center justify-center px-4 py-8">
      {/* Bubbles background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-32 -left-32 w-96 h-96 bg-white/5 rounded-full blur-3xl" />
        <div className="absolute top-1/4 -right-24 w-64 h-64 bg-white/5 rounded-full blur-2xl" />
        <div className="absolute bottom-0 left-1/3 w-80 h-80 bg-white/3 rounded-full blur-3xl" />
      </div>

      <div className="relative w-full max-w-4xl">
        <div className="bg-white rounded-3xl shadow-[0_32px_80px_rgba(0,0,0,0.35)] overflow-hidden flex min-h-[540px]">
          {/* Left panel */}
          <div
            className="hidden lg:flex lg:w-2/5 relative flex-col justify-between p-10 overflow-hidden"
            style={{
              background:
                "linear-gradient(160deg, #0A1A33 0%, #001948 50%, #0A1A33 100%)",
            }}
          >
            {/* Decorative bubbles */}
            <div className="absolute top-[-60px] left-[-60px] w-56 h-56 bg-white/10 rounded-full" />
            <div className="absolute top-[30%] right-[-80px] w-72 h-72 bg-white/8 rounded-full" />
            <div className="absolute bottom-[-40px] left-[20%] w-48 h-48 bg-white/10 rounded-full" />
            <div className="absolute bottom-[20%] left-[-30px] w-32 h-32 bg-white/12 rounded-full" />
            <div className="absolute top-[55%] right-[10%] w-20 h-20 bg-white/10 rounded-full" />

            {/* Logo */}
            <div className="relative z-10 flex items-center gap-3">
              <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-sm">
                <img
                  src={HEI_WHITE_LOGO}
                  alt="HEI"
                  className="w-8 h-8 object-contain"
                />
              </div>
              <div>
                <span className="text-white font-bold text-lg leading-none block">
                  HEI STDhub
                </span>
                <span className="text-white/60 text-xs">
                  Plateforme étudiante
                </span>
              </div>
            </div>

            {/* Welcome text */}
            <div className="relative z-10">
              <h2 className="text-white text-3xl font-bold leading-snug mb-3">
                Bon retour
                <br />
                parmi nous !
              </h2>
              <p className="text-white/60 text-sm leading-relaxed">
                Connectez-vous pour accéder à vos cours, archives et discussions
                avec la communauté HEI.
              </p>
            </div>

            {/* Bottom badge */}
            <div className="relative z-10 bg-white/10 backdrop-blur-sm rounded-2xl px-4 py-3 border border-white/20">
              <p className="text-white/80 text-xs font-medium">
                Communauté HEI Madagascar
              </p>
              <p className="text-white/50 text-xs mt-0.5">
                Étudiants · Professeurs · Admin
              </p>
            </div>
          </div>

          {/* Right panel */}
          <div className="flex-1 flex flex-col justify-center px-8 sm:px-12 py-10">
            {/* Mobile logo */}
            <div className="flex lg:hidden items-center gap-2 mb-8">
              <img
                src={HEI_BLUE_LOGO}
                alt="HEI"
                className="h-9 object-contain"
              />
              <span className="text-navy font-bold text-lg">HEI STDhub</span>
            </div>

            <div className="mb-8">
              <h1 className="text-2xl sm:text-3xl font-bold text-navy">
                Connexion
              </h1>
              <p className="text-gray-400 text-sm mt-1">
                Entrez vos identifiants pour continuer
              </p>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-600 text-sm px-4 py-3 rounded-2xl mb-5 flex items-center gap-2">
                {error}
              </div>
            )}

            {/* Alumni toggle */}
            <div className="flex items-center gap-3 mb-4 p-3 bg-surface rounded-xl">
              <div
                onClick={() => setIsAlumni(false)}
                className={`flex-1 py-2 rounded-lg text-xs font-bold text-center cursor-pointer transition-all duration-200 ${
                  !isAlumni
                    ? "bg-navy text-white shadow-sm"
                    : "text-gray-400 hover:text-navy"
                }`}
              >
                Étudiant actuel
              </div>
              <div
                onClick={() => setIsAlumni(true)}
                className={`flex-1 py-2 rounded-lg text-xs font-bold text-center cursor-pointer transition-all duration-200 ${
                  isAlumni
                    ? "bg-navy text-white shadow-sm"
                    : "text-gray-400 hover:text-navy"
                }`}
              >
                Ancien étudiant
              </div>
            </div>

            <form onSubmit={handleSubmit} className="flex flex-col gap-5">
              <div>
                <label className="text-xs font-bold text-gray-500 mb-2 block uppercase tracking-wide">
                  Référence
                </label>
                <div className="relative">
                  <User
                    size={15}
                    className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"
                  />
                  <input
                    className="input-field pl-10"
                    placeholder={isAlumni ? "STD21XXX ou STD22XXX" : "STD25XXX ou PROFXXX"}
                    value={form.ref}
                    onChange={(e) => {
                      set("ref", e.target.value);
                      setError("");
                    }}
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-gray-500 mb-2 block uppercase tracking-wide">
                  Mot de passe
                </label>
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
                  className="text-xs text-[#001948] hover:underline font-medium"
                >
                  Mot de passe oublié ?
                </Link>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 rounded-2xl font-bold text-sm text-white flex items-center justify-center gap-2 transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed"
                style={{
                  background: "linear-gradient(135deg, #0A1A33, #001948)",
                }}
              >
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

            <p className="text-center text-xs text-gray-400 mt-6">
              Pas encore inscrit ?{" "}
              <Link
                to="/register"
                className="text-[#001948] font-bold hover:underline"
              >
                Créer un compte
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
