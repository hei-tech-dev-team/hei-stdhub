import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import {
      AlertCircle,
      ArrowLeft,
      CheckCircle,
      Eye,
      EyeOff,
      Lock,
      ShieldCheck,
} from "lucide-react";
import { HEI_BLUE_LOGO, HEI_WHITE_LOGO } from "../assets/logos";
import api from "../api/axios";

export default function ResetPasswordPage() {
      const [searchParams] = useSearchParams();
      const navigate = useNavigate();
      const token = searchParams.get("token") || "";

      const [checking, setChecking] = useState(true);
      const [validToken, setValidToken] = useState(false);
      const [password, setPassword] = useState("");
      const [confirmPassword, setConfirmPassword] = useState("");
      const [showPassword, setShowPassword] = useState(false);
      const [showConfirmPassword, setShowConfirmPassword] = useState(false);
      const [loading, setLoading] = useState(false);
      const [done, setDone] = useState(false);
      const [error, setError] = useState("");

      useEffect(() => {
            let mounted = true;

            const verifyToken = async () => {
                  if (!token) {
                        setError("Lien de reinitialisation manquant.");
                        setChecking(false);
                        return;
                  }

                  try {
                        await api.get(
                              `/auth/reset-password/${encodeURIComponent(token)}`,
                        );
                        if (mounted) setValidToken(true);
                  } catch (err) {
                        if (mounted) {
                              setError(
                                    err.response?.data?.error ||
                                          "Lien de reinitialisation invalide.",
                              );
                        }
                  } finally {
                        if (mounted) setChecking(false);
                  }
            };

            verifyToken();
            return () => {
                  mounted = false;
            };
      }, [token]);

      const handleSubmit = async (e) => {
            e.preventDefault();
            if (!password || !confirmPassword) {
                  setError("Veuillez remplir les deux champs.");
                  return;
            }
            if (password.length < 6) {
                  setError(
                        "Le mot de passe doit contenir 6 caracteres minimum.",
                  );
                  return;
            }
            if (password !== confirmPassword) {
                  setError("Les mots de passe ne correspondent pas.");
                  return;
            }

            setLoading(true);
            setError("");
            try {
                  await api.post("/auth/reset-password", {
                        token,
                        newPassword: password,
                  });
                  setDone(true);
                  window.setTimeout(
                        () => navigate("/login", { replace: true }),
                        2500,
                  );
            } catch (err) {
                  setError(
                        err.response?.data?.error ||
                              "Impossible de reinitialiser le mot de passe.",
                  );
            } finally {
                  setLoading(false);
            }
      };

      return (
            <div className="min-h-screen bg-gradient-to-br from-[#0A1A33] via-[#001948] to-[#0A1A33] flex items-center justify-center px-4 py-8">
                  <div className="fixed inset-0 overflow-hidden pointer-events-none">
                        <div className="absolute -top-32 -left-32 w-96 h-96 bg-white/5 rounded-full blur-3xl" />
                        <div className="absolute top-1/4 -right-24 w-64 h-64 bg-white/5 rounded-full blur-2xl" />
                        <div className="absolute bottom-0 left-1/3 w-80 h-80 bg-white/3 rounded-full blur-3xl" />
                  </div>

                  <div className="relative w-full max-w-4xl">
                        <div className="bg-white rounded-3xl shadow-[0_32px_80px_rgba(0,0,0,0.35)] overflow-hidden flex min-h-[540px]">
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
                                                      Plateforme etudiante
                                                </span>
                                          </div>
                                    </div>

                                    <div className="relative z-10">
                                          <h2 className="text-white text-3xl font-bold leading-snug mb-3">
                                                Nouveau
                                                <br />
                                                mot de passe
                                          </h2>
                                          <p className="text-white/60 text-sm leading-relaxed">
                                                Choisissez un mot de passe que
                                                vous n&apos;utilisez pas deja
                                                sur un autre service.
                                          </p>
                                    </div>

                                    <div className="relative z-10 bg-white/10 backdrop-blur-sm rounded-2xl px-4 py-3 border border-white/20">
                                          <p className="text-white/80 text-xs font-medium">
                                                Validation securisee
                                          </p>
                                          <p className="text-white/50 text-xs mt-0.5">
                                                Le lien est desactive apres
                                                usage.
                                          </p>
                                    </div>
                              </div>

                              <div className="flex-1 flex flex-col justify-center px-8 sm:px-12 py-10">
                                    <div className="flex lg:hidden items-center gap-2 mb-8">
                                          <img
                                                src={HEI_BLUE_LOGO}
                                                alt="HEI"
                                                className="h-9 object-contain"
                                          />
                                          <span className="text-navy font-bold text-lg">
                                                HEI STDhub
                                          </span>
                                    </div>

                                    {checking ? (
                                          <div className="flex flex-col items-center text-center gap-4 py-8">
                                                <div
                                                      className="w-12 h-12 border-4 border-navy border-t-gold rounded-full animate-spin"
                                                      aria-label="Chargement"
                                                />
                                                <p className="text-gray-400 text-sm">
                                                      Verification du lien...
                                                </p>
                                          </div>
                                    ) : done ? (
                                          <div className="flex flex-col items-center text-center gap-5 py-6">
                                                <div
                                                      className="w-20 h-20 rounded-full flex items-center justify-center"
                                                      style={{
                                                            background:
                                                                  "linear-gradient(135deg, #0A1A33, #001948)",
                                                      }}
                                                >
                                                      <CheckCircle
                                                            size={36}
                                                            className="text-white"
                                                      />
                                                </div>
                                                <div>
                                                      <h1 className="text-2xl font-bold text-navy mb-2">
                                                            Mot de passe
                                                            reinitialise
                                                      </h1>
                                                      <p className="text-gray-400 text-sm leading-relaxed max-w-xs">
                                                            Vous allez etre
                                                            redirige vers la
                                                            connexion.
                                                      </p>
                                                </div>
                                          </div>
                                    ) : !validToken ? (
                                          <div className="flex flex-col items-center text-center gap-5 py-6">
                                                <div className="w-20 h-20 rounded-full bg-red-50 flex items-center justify-center">
                                                      <AlertCircle
                                                            size={36}
                                                            className="text-red-500"
                                                      />
                                                </div>
                                                <div>
                                                      <h1 className="text-2xl font-bold text-navy mb-2">
                                                            Lien invalide
                                                      </h1>
                                                      <p className="text-gray-400 text-sm leading-relaxed max-w-xs">
                                                            {error ||
                                                                  "Ce lien de reinitialisation n&apos;est plus valide."}
                                                      </p>
                                                </div>
                                                <Link
                                                      to="/forgot-password"
                                                      className="w-full py-3.5 rounded-2xl font-bold text-sm text-white flex items-center justify-center gap-2 transition-all duration-200"
                                                      style={{
                                                            background:
                                                                  "linear-gradient(135deg, #0A1A33, #001948)",
                                                      }}
                                                >
                                                      Demander un nouveau lien
                                                </Link>
                                          </div>
                                    ) : (
                                          <>
                                                <div className="mb-8">
                                                      <h1 className="text-2xl sm:text-3xl font-bold text-navy">
                                                            Reinitialiser
                                                      </h1>
                                                      <p className="text-gray-400 text-sm mt-1">
                                                            Saisissez votre
                                                            nouveau mot de passe
                                                      </p>
                                                </div>

                                                {error && (
                                                      <div className="bg-red-50 border border-red-200 text-red-600 text-sm px-4 py-3 rounded-2xl mb-5 flex items-start gap-2">
                                                            <AlertCircle
                                                                  size={16}
                                                                  className="mt-0.5 shrink-0"
                                                            />
                                                            <span>{error}</span>
                                                      </div>
                                                )}

                                                <form
                                                      onSubmit={handleSubmit}
                                                      className="flex flex-col gap-5"
                                                >
                                                      <div>
                                                            <label className="text-xs font-bold text-gray-500 mb-2 block uppercase tracking-wide">
                                                                  Nouveau mot de
                                                                  passe
                                                            </label>
                                                            <div className="relative">
                                                                  <Lock
                                                                        size={
                                                                              15
                                                                        }
                                                                        className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"
                                                                  />
                                                                  <input
                                                                        type={
                                                                              showPassword
                                                                                    ? "text"
                                                                                    : "password"
                                                                        }
                                                                        className="input-field pl-10 pr-11"
                                                                        placeholder="Minimum 6 caracteres"
                                                                        value={
                                                                              password
                                                                        }
                                                                        onChange={(
                                                                              e,
                                                                        ) => {
                                                                              setPassword(
                                                                                    e
                                                                                          .target
                                                                                          .value,
                                                                              );
                                                                              setError(
                                                                                    "",
                                                                              );
                                                                        }}
                                                                        autoComplete="new-password"
                                                                        inputMode="text"
                                                                  />
                                                                  <button
                                                                        type="button"
                                                                        onClick={() =>
                                                                              setShowPassword(
                                                                                    (
                                                                                          value,
                                                                                    ) =>
                                                                                          !value,
                                                                              )
                                                                        }
                                                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-navy min-w-[36px] min-h-[36px] flex items-center justify-center"
                                                                        aria-label={
                                                                              showPassword
                                                                                    ? "Masquer le mot de passe"
                                                                                    : "Afficher le mot de passe"
                                                                        }
                                                                  >
                                                                        {showPassword ? (
                                                                              <EyeOff
                                                                                    size={
                                                                                          17
                                                                                    }
                                                                              />
                                                                        ) : (
                                                                              <Eye
                                                                                    size={
                                                                                          17
                                                                                    }
                                                                              />
                                                                        )}
                                                                  </button>
                                                            </div>
                                                      </div>

                                                      <div>
                                                            <label className="text-xs font-bold text-gray-500 mb-2 block uppercase tracking-wide">
                                                                  Confirmer le
                                                                  mot de passe
                                                            </label>
                                                            <div className="relative">
                                                                  <ShieldCheck
                                                                        size={
                                                                              15
                                                                        }
                                                                        className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"
                                                                  />
                                                                  <input
                                                                        type={
                                                                              showConfirmPassword
                                                                                    ? "text"
                                                                                    : "password"
                                                                        }
                                                                        className="input-field pl-10 pr-11"
                                                                        placeholder="Repetez le mot de passe"
                                                                        value={
                                                                              confirmPassword
                                                                        }
                                                                        onChange={(
                                                                              e,
                                                                        ) => {
                                                                              setConfirmPassword(
                                                                                    e
                                                                                          .target
                                                                                          .value,
                                                                              );
                                                                              setError(
                                                                                    "",
                                                                              );
                                                                        }}
                                                                        autoComplete="new-password"
                                                                        inputMode="text"
                                                                  />
                                                                  <button
                                                                        type="button"
                                                                        onClick={() =>
                                                                              setShowConfirmPassword(
                                                                                    (
                                                                                          value,
                                                                                    ) =>
                                                                                          !value,
                                                                              )
                                                                        }
                                                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-navy min-w-[36px] min-h-[36px] flex items-center justify-center"
                                                                        aria-label={
                                                                              showConfirmPassword
                                                                                    ? "Masquer la confirmation"
                                                                                    : "Afficher la confirmation"
                                                                        }
                                                                  >
                                                                        {showConfirmPassword ? (
                                                                              <EyeOff
                                                                                    size={
                                                                                          17
                                                                                    }
                                                                              />
                                                                        ) : (
                                                                              <Eye
                                                                                    size={
                                                                                          17
                                                                                    }
                                                                              />
                                                                        )}
                                                                  </button>
                                                            </div>
                                                      </div>

                                                      <button
                                                            type="submit"
                                                            disabled={loading}
                                                            className="w-full py-3.5 rounded-2xl font-bold text-sm text-white flex items-center justify-center gap-2 transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed"
                                                            style={{
                                                                  background:
                                                                        "linear-gradient(135deg, #0A1A33, #001948)",
                                                            }}
                                                      >
                                                            {loading
                                                                  ? "Mise a jour..."
                                                                  : "Changer le mot de passe"}
                                                      </button>
                                                </form>
                                          </>
                                    )}

                                    <div className="mt-6 text-center">
                                          <Link
                                                to="/login"
                                                className="inline-flex items-center gap-2 text-xs text-gray-400 hover:text-navy transition font-medium"
                                          >
                                                <ArrowLeft size={14} /> Retour a
                                                la connexion
                                          </Link>
                                    </div>
                              </div>
                        </div>
                  </div>
            </div>
      );
}
