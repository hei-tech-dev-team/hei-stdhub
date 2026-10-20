import { useState, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import AuthShell, { AuthBackLink } from "../components/auth/AuthShell";
import {
  ArrowLeft,
  CheckCircle,
  Mail,
  Loader,
  Bell,
  RefreshCw,
} from "lucide-react";
import api from "../api/axios";

export default function ForgotPasswordPage() {
  const navigate = useNavigate();

  const [step, setStep] = useState("email");
  const [email, setEmail] = useState("");
  const [codeDigits, setCodeDigits] = useState(["", "", "", "", "", ""]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [codeSuccess, setCodeSuccess] = useState(false);
  const [resetToken, setResetToken] = useState("");
  const inputRefs = useRef([]);

  const handleSendCode = async (e) => {
    e.preventDefault();
    const trimmed = email.trim();
    if (!trimmed) {
      setError("Veuillez entrer votre adresse email.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      await api.post("/auth/forgot-password", { email: trimmed });
      setMessage("Verifiez vos notifications.");
      setStep("code");
    } catch (err) {
      setError(err.response?.data?.error || "Erreur lors de l'envoi du code.");
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setLoading(true);
    setError("");
    setMessage("");
    setCodeDigits(["", "", "", "", "", ""]);
    setCodeSuccess(false);
    try {
      await api.post("/auth/forgot-password", {
        email: email.trim(),
      });
      setMessage("Nouveau code envoye. Verifiez vos notifications.");
      inputRefs.current[0]?.focus();
    } catch (err) {
      setError(err.response?.data?.error || "Erreur lors de l'envoi.");
    } finally {
      setLoading(false);
    }
  };

  const handleDigitChange = useCallback(
    (index, value) => {
      if (codeSuccess) return;
      const digit = value.slice(0, 1).toUpperCase();
      const newDigits = [...codeDigits];
      newDigits[index] = digit;
      setCodeDigits(newDigits);
      setError("");

      if (digit && index < 5) {
        inputRefs.current[index + 1]?.focus();
      }
    },
    [codeDigits, codeSuccess],
  );

  const handleDigitPaste = useCallback(
    (e) => {
      e.preventDefault();
      if (codeSuccess) return;
      const pasted = (e.clipboardData?.getData("text") || "")
        .toUpperCase()
        .replace(/[^A-Z0-9]/g, "")
        .slice(0, 6);
      if (!pasted) return;
      const newDigits = [...codeDigits];
      for (let i = 0; i < pasted.length; i++) {
        newDigits[i] = pasted[i];
      }
      setCodeDigits(newDigits);
      setError("");
      const nextEmpty = pasted.length < 6 ? pasted.length : 5;
      inputRefs.current[nextEmpty]?.focus();
    },
    [codeDigits, codeSuccess],
  );

  const handleDigitKeyDown = useCallback(
    (index, e) => {
      if (e.key === "Backspace") {
        if (codeDigits[index]) {
          const newDigits = [...codeDigits];
          newDigits[index] = "";
          setCodeDigits(newDigits);
        } else if (index > 0) {
          inputRefs.current[index - 1]?.focus();
        }
      }
    },
    [codeDigits],
  );

  const handleVerifyCode = async (e) => {
    e.preventDefault();
    const code = codeDigits.join("");
    if (code.length !== 6) {
      setError("Veuillez entrer le code a 6 caracteres.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const res = await api.post("/auth/forgot-password/verify-code", {
        email: email.trim(),
        code,
      });
      setResetToken(res.data.token);
      setCodeSuccess(true);
    } catch (err) {
      setError(err.response?.data?.error || "Code invalide.");
      inputRefs.current[0]?.focus();
      setCodeDigits(["", "", "", "", "", ""]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell
      headline="Mot de passe"
      headlineAccent="oublié ?"
      sub={
        step === "email"
          ? "Reinitialiser votre mot de passe pour retrouver la tribu HEI."
          : "Entrez le code reçu dans vos notifications."
      }
      cardTitle="Réinitialisation en un clic"
      cardSub="Récupérez votre compte facilement"
      title={step === "email" ? "Réinitialisation" : "Code de vérification"}
      subtitle={
        step === "email" ? (
          "Entrez votre adresse email"
        ) : (
          <>
            Un code à 6 caractères a été envoyé à{" "}
            <span className="font-semibold text-navy">{email}</span>
          </>
        )
      }
      footer={<AuthBackLink>Retour à la connexion</AuthBackLink>}
    >
      {error && <div className="auth-error">{error}</div>}

      {step === "email" ? (
        <form onSubmit={handleSendCode} className="flex flex-col gap-5">
          <div>
            <label className="auth-label">Email</label>
            <div className="relative">
              <Mail
                size={15}
                className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"
              />
              <input
                type="email"
                className="input-field pl-10"
                placeholder="hei.exemple@gmail.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                inputMode="email"
                autoComplete="email"
              />
            </div>
          </div>
          <button type="submit" disabled={loading} className="auth-submit">
            {loading ? (
              <>
                <Loader size={16} className="animate-spin" /> Envoi en cours...
              </>
            ) : (
              "Envoyer le code"
            )}
          </button>
        </form>
      ) : (
        <>
          <div className="bg-blue-50 border border-blue-200 text-blue-700 text-sm px-4 py-3 rounded-lg mb-5 flex items-start gap-3">
            <Bell size={18} className="shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold">Vérifiez vos notifications</p>
              <p className="text-blue-600/80 text-xs mt-1">
                Le code a été envoyé sur votre appareil (ordinateur ou mobile).
              </p>
            </div>
          </div>

          {message && (
            <div className="bg-green-50 border border-green-200 text-green-700 text-sm px-4 py-3 rounded-lg mb-5 flex items-center gap-2">
              <CheckCircle size={16} /> {message}
            </div>
          )}

          <form onSubmit={handleVerifyCode} className="flex flex-col gap-5">
            <div>
              <label className="auth-label mb-3">Code de vérification</label>
              <div
                className="flex gap-2 justify-center"
                onPaste={handleDigitPaste}
              >
                {codeDigits.map((digit, i) => (
                  <input
                    key={i}
                    ref={(el) => {
                      inputRefs.current[i] = el;
                    }}
                    type="text"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handleDigitChange(i, e.target.value)}
                    onKeyDown={(e) => handleDigitKeyDown(i, e)}
                    disabled={codeSuccess}
                    className={`
                            w-11 h-14 sm:w-12 sm:h-14 text-center text-2xl font-bold
                            border-2 rounded-xl outline-none
                            transition-all duration-300
                            ${
                              codeSuccess
                                ? `border-green-400 bg-green-50 text-green-700 animate-box-confirm`
                                : digit
                                  ? "border-navy bg-white"
                                  : "border-gray-200 bg-[#F6F7F8] hover:border-gray-300"
                            }
                            focus:border-gold focus:ring-1 focus:ring-gold/15
                            [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none
                            [&::-webkit-outer-spin-button]:appearance-none
                          `}
                    style={
                      codeSuccess
                        ? {
                            animationDelay: `${i * 200}ms`,
                          }
                        : undefined
                    }
                    inputMode="text"
                    autoComplete="off"
                    aria-label={`Chiffre ${i + 1}`}
                  />
                ))}
              </div>
            </div>

            {codeSuccess ? (
              <div className="flex flex-col items-center gap-4 animate-success-pop">
                <div className="flex items-center gap-2 text-green-600 font-semibold text-sm">
                  <CheckCircle size={18} />
                  Code valide
                </div>
                <button
                  type="button"
                  onClick={() =>
                    navigate(`/reset-password?token=${resetToken}`)
                  }
                  className="auth-submit"
                >
                  Continuer
                </button>
              </div>
            ) : (
              <button type="submit" disabled={loading} className="auth-submit">
                {loading ? (
                  <>
                    <Loader size={16} className="animate-spin" />{" "}
                    Vérification...
                  </>
                ) : (
                  "Vérifier le code"
                )}
              </button>
            )}
          </form>

          <div className="mt-5 flex items-center justify-between">
            <button
              onClick={() => {
                setStep("email");
                setCodeDigits(["", "", "", "", "", ""]);
                setCodeSuccess(false);
                setError("");
                setMessage("");
              }}
              className="inline-flex items-center gap-1.5 text-xs text-gray-400 hover:text-navy transition font-medium"
            >
              <ArrowLeft size={14} /> Changer d&apos;email
            </button>
            <button
              onClick={handleResend}
              disabled={loading}
              className="inline-flex items-center gap-1.5 text-xs text-gray-400 hover:text-navy transition font-medium disabled:opacity-50"
            >
              <RefreshCw size={14} className={loading ? "animate-spin" : ""} />{" "}
              Renvoyer
            </button>
          </div>
        </>
      )}
    </AuthShell>
  );
}
