import { useState } from "react";
import { Link } from "react-router-dom";
import { HEI_BLUE_LOGO, HEI_WHITE_LOGO } from "../assets/logos";
import { Mail, ArrowLeft, CheckCircle } from "lucide-react";
import api from "../api/axios";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email.trim()) {
      setError("Veuillez entrer votre adresse email.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      await api.post("/auth/forgot-password", { email: email.trim() });
      setSent(true);
    } catch (err) {
      setError(
        err.response?.data?.error || "Une erreur est survenue. Réessayez.",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0A1A33] via-[#001948] to-[#0A1A33] flex items-center justify-center px-4 py-8">
      {/* Bubbles */}
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
            <div className="absolute top-[-60px] left-[-60px] w-56 h-56 bg-white/10 rounded-full" />
            <div className="absolute top-[30%] right-[-80px] w-72 h-72 bg-white/8 rounded-full" />
            <div className="absolute bottom-[-40px] left-[20%] w-48 h-48 bg-white/10 rounded-full" />
            <div className="absolute bottom-[20%] left-[-30px] w-32 h-32 bg-white/12 rounded-full" />
            <div className="absolute top-[55%] right-[10%] w-20 h-20 bg-white/10 rounded-full" />

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

            <div className="relative z-10">
              <h2 className="text-white text-3xl font-bold leading-snug mb-3">
                Mot de passe
                <br />
                oublié ?
              </h2>
              <p className="text-white/60 text-sm leading-relaxed">
                Pas de panique ! Indiquez votre adresse email et nous vous
                enverrons un lien de réinitialisation.
              </p>
            </div>

            <div className="relative z-10 bg-white/10 backdrop-blur-sm rounded-2xl px-4 py-3 border border-white/20">
              <p className="text-white/80 text-xs font-medium">
                Sécurité renforcée
              </p>
              <p className="text-white/50 text-xs mt-0.5">
                Lien valable 5 minutes seulement
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

            {!sent ? (
              <>
                <div className="mb-8">
                  <h1 className="text-2xl sm:text-3xl font-bold text-navy">
                    Réinitialisation
                  </h1>
                  <p className="text-gray-400 text-sm mt-1">
                    Entrez votre email pour recevoir un lien de réinitialisation
                  </p>
                </div>

                {error && (
                  <div className="bg-red-50 border border-red-200 text-red-600 text-sm px-4 py-3 rounded-2xl mb-5 flex items-center gap-2">
                    <span className="text-red-400">⚠</span> {error}
                  </div>
                )}

                <form onSubmit={handleSubmit} className="flex flex-col gap-5">
                  <div>
                    <label className="text-xs font-bold text-gray-500 mb-2 block uppercase tracking-wide">
                      Adresse email
                    </label>
                    <div className="relative">
                      <Mail
                        size={15}
                        className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"
                      />
                      <input
                        type="email"
                        className="input-field pl-10"
                        placeholder="hei.prenom@gmail.com"
                        value={email}
                        onChange={(e) => {
                          setEmail(e.target.value);
                          setError("");
                        }}
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-3.5 rounded-2xl font-bold text-sm text-white flex items-center justify-center gap-2 transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed"
                    style={{
                      background: "linear-gradient(135deg, #0A1A33, #001948)",
                    }}
                  >
                    {loading ? "Envoi en cours..." : "Envoyer le lien"}
                  </button>
                </form>
              </>
            ) : (
              <div className="flex flex-col items-center text-center gap-5 py-6">
                <div
                  className="w-20 h-20 rounded-full flex items-center justify-center"
                  style={{
                    background: "linear-gradient(135deg, #0A1A33, #001948)",
                  }}
                >
                  <CheckCircle size={36} className="text-white" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-navy mb-2">
                    Email envoyé !
                  </h2>
                  <p className="text-gray-400 text-sm leading-relaxed max-w-xs">
                    Si un compte est associé à{" "}
                    <strong className="text-navy">{email}</strong>, vous
                    recevrez un lien de réinitialisation sous peu.
                  </p>
                </div>
                <div className="bg-amber-50 border border-amber-200 text-amber-700 text-xs px-4 py-3 rounded-2xl text-left w-full">
                  <p className="font-semibold mb-1">Vérifiez vos spams</p>
                  <p>
                    L'email peut parfois atterrir dans le dossier courrier
                    indésirable.
                  </p>
                </div>
              </div>
            )}

            <div className="mt-6 text-center">
              <Link
                to="/login"
                className="inline-flex items-center gap-2 text-xs text-gray-400 hover:text-navy transition font-medium"
              >
                <ArrowLeft size={14} /> Retour à la connexion
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
