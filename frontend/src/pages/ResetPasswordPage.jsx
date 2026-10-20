import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import AuthShell, { AuthBackLink } from "../components/auth/AuthShell";
import {
      AlertCircle,
      CheckCircle,
      Eye,
      EyeOff,
      Lock,
      ShieldCheck,
} from "lucide-react";
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
                        5000,
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

      const pageTitle = checking
            ? "Réinitialiser"
            : done
              ? "Mot de passe réinitialisé"
              : !validToken
                ? "Lien invalide"
                : "Réinitialiser";

      const pageSubtitle = checking
            ? "Vérification du lien en cours..."
            : done
              ? "Vous allez être redirigé vers la connexion dans quelques instants."
              : !validToken
                ? error || "Ce lien de réinitialisation n'est plus valide."
                : "Saisissez votre nouveau mot de passe";

      return (
            <AuthShell
                  headline="Nouveau"
                  headlineAccent="mot de passe"
                  sub="Choisissez un mot de passe que vous n'utilisez pas déjà sur un autre service."
                  cardTitle="Validation sécurisée"
                  cardSub="Le lien est désactivé après usage."
                  title={pageTitle}
                  subtitle={pageSubtitle}
                  footer={<AuthBackLink>Retour à la connexion</AuthBackLink>}
            >
                  {checking ? (
                        <div className="flex flex-col items-center gap-4 py-4">
                              <div
                                    className="w-12 h-12 border-4 border-navy border-t-gold rounded-full animate-spin"
                                    aria-label="Chargement"
                              />
                        </div>
                  ) : done ? (
                        <div className="flex flex-col items-center gap-4 py-2">
                              <div
                                    className="w-20 h-20 rounded-full flex items-center justify-center"
                                    style={{
                                          background:
                                                "linear-gradient(135deg, #0A1A33, #001948)",
                                    }}
                              >
                                    <CheckCircle size={36} className="text-white" />
                              </div>
                              <button
                                    onClick={() =>
                                          navigate("/login", { replace: true })
                                    }
                                    className="auth-submit"
                              >
                                    Se connecter
                              </button>
                        </div>
                  ) : !validToken ? (
                        <div className="flex flex-col items-center gap-4 py-2">
                              <div className="w-20 h-20 rounded-full bg-red-50 flex items-center justify-center">
                                    <AlertCircle size={36} className="text-red-500" />
                              </div>
                              <Link to="/forgot-password" className="auth-submit">
                                    Demander un nouveau lien
                              </Link>
                        </div>
                  ) : (
                        <>
                              {error && <div className="auth-error">{error}</div>}

                              <form
                                    onSubmit={handleSubmit}
                                    className="flex flex-col gap-5"
                              >
                                    <div>
                                          <label className="auth-label">
                                                Nouveau mot de passe
                                          </label>
                                          <div className="relative">
                                                <Lock
                                                      size={15}
                                                      className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"
                                                />
                                                <input
                                                      type={
                                                            showPassword
                                                                  ? "text"
                                                                  : "password"
                                                      }
                                                      className="input-field pl-10 pr-11"
                                                      placeholder="Minimum 6 caractères"
                                                      value={password}
                                                      onChange={(e) => {
                                                            setPassword(
                                                                  e.target.value,
                                                            );
                                                            setError("");
                                                      }}
                                                      autoComplete="new-password"
                                                      inputMode="text"
                                                />
                                                <button
                                                      type="button"
                                                      onClick={() =>
                                                            setShowPassword(
                                                                  (value) =>
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
                                                            <EyeOff size={17} />
                                                      ) : (
                                                            <Eye size={17} />
                                                      )}
                                                </button>
                                          </div>
                                    </div>

                                    <div>
                                          <label className="auth-label">
                                                Confirmer le mot de passe
                                          </label>
                                          <div className="relative">
                                                <ShieldCheck
                                                      size={15}
                                                      className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"
                                                />
                                                <input
                                                      type={
                                                            showConfirmPassword
                                                                  ? "text"
                                                                  : "password"
                                                      }
                                                      className="input-field pl-10 pr-11"
                                                      placeholder="Répétez le mot de passe"
                                                      value={confirmPassword}
                                                      onChange={(e) => {
                                                            setConfirmPassword(
                                                                  e.target.value,
                                                            );
                                                            setError("");
                                                      }}
                                                      autoComplete="new-password"
                                                      inputMode="text"
                                                />
                                                <button
                                                      type="button"
                                                      onClick={() =>
                                                            setShowConfirmPassword(
                                                                  (value) =>
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
                                                            <EyeOff size={17} />
                                                      ) : (
                                                            <Eye size={17} />
                                                      )}
                                                </button>
                                          </div>
                                    </div>

                                    <button
                                          type="submit"
                                          disabled={loading}
                                          className="auth-submit"
                                    >
                                          {loading
                                                ? "Mise à jour..."
                                                : "Changer le mot de passe"}
                                    </button>
                              </form>
                        </>
                  )}
            </AuthShell>
      );
}
