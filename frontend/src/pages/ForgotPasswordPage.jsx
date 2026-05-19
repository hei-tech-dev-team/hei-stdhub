import { useState, useCallback } from "react";
import { Link } from "react-router-dom";
import { HEI_BLUE_LOGO, HEI_WHITE_LOGO } from "../assets/logos";
import { ArrowLeft, CheckCircle, AlertCircle, ShieldCheck, User, Lock, Eye, EyeOff } from "lucide-react";
import api from "../api/axios";
import JarvisScanAnimation from "../components/ui/JarvisScanAnimation";

function StepRefLookup({ ref, setRef, onSubmit, loading, error }) {
  return (
    <>
      <div className="mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold text-navy">Reinitialisation</h1>
        <p className="text-gray-400 text-sm mt-1">Entrez votre reference etudiant</p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-600 text-sm px-4 py-3 rounded-2xl mb-5 flex items-center gap-2">
          <AlertCircle size={16} /> {error}
        </div>
      )}

      <form onSubmit={onSubmit} className="flex flex-col gap-5">
        <div>
          <label className="text-xs font-bold text-gray-500 mb-2 block uppercase tracking-wide">Reference</label>
          <div className="relative">
            <User size={15} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              className="input-field pl-10 uppercase"
              placeholder="STD25001"
              value={ref}
              onChange={(e) => setRef(e.target.value.toUpperCase())}
              inputMode="text"
              autoComplete="username"
            />
          </div>
        </div>
        <button
          type="submit"
          disabled={loading}
          className="w-full py-3.5 rounded-2xl font-bold text-sm text-white flex items-center justify-center gap-2 transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed"
          style={{ background: "linear-gradient(135deg, #0A1A33, #001948)" }}
        >
          {loading ? "Verification..." : "Continuer"}
        </button>
      </form>
    </>
  );
}

function StepVerifyQuestions({ userInfo, questions, answers, setAnswers, onSubmit, loading, error, onBack }) {
  const handleAnswer = useCallback((key, value) => {
    setAnswers((prev) => ({ ...prev, [key]: value }));
  }, [setAnswers]);

  return (
    <>
      <div className="mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold text-navy">Verification</h1>
        <p className="text-gray-400 text-sm mt-1">{userInfo?.prenom}, repondez a vos questions de securite</p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-600 text-sm px-4 py-3 rounded-2xl mb-4 flex items-center gap-2">
          <AlertCircle size={16} /> {error}
        </div>
      )}

      <form onSubmit={onSubmit} className="flex flex-col gap-4">
        {questions.map((q, i) => (
          <div key={q.key}>
            <label className="text-xs font-bold text-gray-500 mb-2 block">Question {i + 1} : {q.question}</label>
            <input
              type="text"
              className="input-field"
              placeholder="Votre reponse"
              value={answers[q.key] || ""}
              onChange={(e) => handleAnswer(q.key, e.target.value)}
              inputMode="text"
              autoComplete="off"
            />
          </div>
        ))}
        <button
          type="submit"
          disabled={loading}
          className="w-full py-3.5 rounded-2xl font-bold text-sm text-white flex items-center justify-center gap-2 transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed"
          style={{ background: "linear-gradient(135deg, #0A1A33, #001948)" }}
        >
          {loading ? "Verification..." : "Verifier mes reponses"}
        </button>
      </form>
    </>
  );
}

function StepNewPassword({ onSubmit, loading, error, onBack }) {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(e, password, confirmPassword);
  };

  return (
    <>
      <div className="mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold text-navy">Nouveau mot de passe</h1>
        <p className="text-gray-400 text-sm mt-1">Choisissez un mot de passe securise</p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-600 text-sm px-4 py-3 rounded-2xl mb-4 flex items-center gap-2">
          <AlertCircle size={16} /> {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div>
          <label className="text-xs font-bold text-gray-500 mb-2 block uppercase tracking-wide">Nouveau mot de passe</label>
          <div className="relative">
            <Lock size={15} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type={showPassword ? "text" : "password"}
              className="input-field pl-10 pr-11"
              placeholder="Minimum 6 caracteres"
              value={password}
              onChange={(e) => { setPassword(e.target.value); }}
              autoComplete="new-password"
              inputMode="text"
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-navy min-w-[36px] min-h-[36px] flex items-center justify-center"
              aria-label={showPassword ? "Masquer le mot de passe" : "Afficher le mot de passe"}
            >
              {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
        </div>
        <div>
          <label className="text-xs font-bold text-gray-500 mb-2 block uppercase tracking-wide">Confirmer</label>
          <div className="relative">
            <ShieldCheck size={15} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type={showConfirmPassword ? "text" : "password"}
              className="input-field pl-10 pr-11"
              placeholder="Repetez le mot de passe"
              value={confirmPassword}
              onChange={(e) => { setConfirmPassword(e.target.value); }}
              autoComplete="new-password"
              inputMode="text"
            />
            <button
              type="button"
              onClick={() => setShowConfirmPassword((v) => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-navy min-w-[36px] min-h-[36px] flex items-center justify-center"
              aria-label={showConfirmPassword ? "Masquer la confirmation" : "Afficher la confirmation"}
            >
              {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
        </div>
        <button
          type="submit"
          disabled={loading}
          className="w-full py-3.5 rounded-2xl font-bold text-sm text-white flex items-center justify-center gap-2 transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed"
          style={{ background: "linear-gradient(135deg, #0A1A33, #001948)" }}
        >
          {loading ? "Mise a jour..." : "Changer le mot de passe"}
        </button>
      </form>
    </>
  );
}

export default function ForgotPasswordPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  const [step, setStep] = useState(1);
  const [ref, setRef] = useState("");
  const [userInfo, setUserInfo] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [answers, setAnswers] = useState({});
  const [resetToken, setResetToken] = useState("");
  const [showJarvis, setShowJarvis] = useState(false);
  const [jarvisTrigger, setJarvisTrigger] = useState(null);

  const handleRefLookup = async (e) => {
    e.preventDefault();
    const trimmed = ref.trim();
    if (!trimmed) {
      setError("Veuillez entrer votre reference (ex: STD25001).");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const res = await api.post("/auth/forgot-password/by-ref", { ref: trimmed });
      setUserInfo(res.data);
      setQuestions(res.data.questions);
      setAnswers({});
      setStep(2);
    } catch (err) {
      setError(err.response?.data?.error || "Reference introuvable.");
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async (e) => {
    e.preventDefault();
    const missing = questions.filter((q) => !answers[q.key]?.trim());
    if (missing.length) {
      setError("Veuillez repondre a toutes les questions.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const answersArray = questions.map((q) => ({
        key: q.key,
        answer: answers[q.key],
      }));
      const res = await api.post("/auth/forgot-password/verify", {
        ref: ref.trim().toUpperCase(),
        answers: answersArray,
      });
      setResetToken(res.data.token);
      setShowJarvis(true);
      setJarvisTrigger("verify");
    } catch (err) {
      setError(err.response?.data?.error || "Reponses incorrectes.");
    } finally {
      setLoading(false);
    }
  };

  const handleJarvisComplete = () => {
    setShowJarvis(false);
    if (jarvisTrigger === "verify") {
      setStep(3);
    }
  };

  const handleReset = async (_e, password, confirmPassword) => {
    if (!password || !confirmPassword) {
      setError("Veuillez remplir les deux champs.");
      return;
    }
    if (password.length < 6) {
      setError("Le mot de passe doit contenir 6 caracteres minimum.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Les mots de passe ne correspondent pas.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      await api.post("/auth/reset-password", { token: resetToken, newPassword: password });
      setShowJarvis(true);
      setJarvisTrigger("reset");
    } catch (err) {
      setError(err.response?.data?.error || "Impossible de reinitialiser le mot de passe.");
    } finally {
      setLoading(false);
    }
  };

  const handleJarvisResetComplete = () => {
    setShowJarvis(false);
    setDone(true);
  };

  const goBack = () => {
    if (step > 1) {
      setStep(step - 1);
      setError("");
    }
  };

  if (showJarvis && jarvisTrigger === "reset") {
    return <JarvisScanAnimation onComplete={handleJarvisResetComplete} duration={3000} />;
  }

  if (showJarvis && jarvisTrigger === "verify") {
    return <JarvisScanAnimation onComplete={handleJarvisComplete} duration={3000} />;
  }

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
              background: "linear-gradient(160deg, #0A1A33 0%, #001948 50%, #0A1A33 100%)",
            }}
          >
            <div className="absolute top-[-60px] left-[-60px] w-56 h-56 bg-white/10 rounded-full" />
            <div className="absolute top-[30%] right-[-80px] w-72 h-72 bg-white/8 rounded-full" />
            <div className="absolute bottom-[-40px] left-[20%] w-48 h-48 bg-white/10 rounded-full" />
            <div className="absolute bottom-[20%] left-[-30px] w-32 h-32 bg-white/12 rounded-full" />
            <div className="absolute top-[55%] right-[10%] w-20 h-20 bg-white/10 rounded-full" />

            <div className="relative z-10 flex items-center gap-3">
              <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-sm">
                <img src={HEI_WHITE_LOGO} alt="HEI" className="w-8 h-8 object-contain" />
              </div>
              <div>
                <span className="text-white font-bold text-lg leading-none block">HEI STDhub</span>
                <span className="text-white/60 text-xs">Plateforme etudiante</span>
              </div>
            </div>

            <div className="relative z-10">
              <h2 className="text-white text-3xl font-bold leading-snug mb-3">
                Mot de passe
                <br />
                oublie ?
              </h2>
              <p className="text-white/60 text-sm leading-relaxed">
                Repondez a vos questions de securite pour verifier votre identite.
              </p>
            </div>

            <div className="relative z-10 bg-white/10 backdrop-blur-sm rounded-2xl px-4 py-3 border border-white/20">
              <p className="text-white/80 text-xs font-medium">Questions de securite</p>
              <p className="text-white/50 text-xs mt-0.5">
                {step === 1 ? "Identifiez-vous" : step === 2 ? "Verification" : "Reinitialisation"}
              </p>
            </div>
          </div>

          <div className="flex-1 flex flex-col justify-center px-8 sm:px-12 py-10">
            <div className="flex lg:hidden items-center gap-2 mb-8">
              <img src={HEI_BLUE_LOGO} alt="HEI" className="h-9 object-contain" />
              <span className="text-navy font-bold text-lg">HEI STDhub</span>
            </div>

            {done ? (
              <div className="flex flex-col items-center text-center gap-5 py-6">
                <div className="w-20 h-20 rounded-full flex items-center justify-center" style={{ background: "linear-gradient(135deg, #0A1A33, #001948)" }}>
                  <CheckCircle size={36} className="text-white" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-navy mb-2">Mot de passe reinitialise</h2>
                  <p className="text-gray-400 text-sm leading-relaxed max-w-xs">
                    Vous pouvez maintenant vous connecter avec votre nouveau mot de passe.
                  </p>
                </div>
                <Link
                  to="/login"
                  className="w-full py-3.5 rounded-2xl font-bold text-sm text-white flex items-center justify-center gap-2 transition-all duration-200"
                  style={{ background: "linear-gradient(135deg, #0A1A33, #001948)" }}
                >
                  Retour a la connexion
                </Link>
              </div>
            ) : (
              <>
                {step === 1 && (
                  <StepRefLookup
                    ref={ref}
                    setRef={setRef}
                    onSubmit={handleRefLookup}
                    loading={loading}
                    error={error}
                  />
                )}

                {step === 2 && (
                  <StepVerifyQuestions
                    userInfo={userInfo}
                    questions={questions}
                    answers={answers}
                    setAnswers={setAnswers}
                    onSubmit={handleVerify}
                    loading={loading}
                    error={error}
                    onBack={goBack}
                  />
                )}

                {step === 3 && (
                  <StepNewPassword
                    onSubmit={handleReset}
                    loading={loading}
                    error={error}
                    onBack={goBack}
                  />
                )}

                <div className="mt-6 text-center">
                  {step > 1 ? (
                    <button
                      onClick={goBack}
                      className="inline-flex items-center gap-2 text-xs text-gray-400 hover:text-navy transition font-medium"
                    >
                      <ArrowLeft size={14} /> Retour
                    </button>
                  ) : (
                    <Link
                      to="/login"
                      className="inline-flex items-center gap-2 text-xs text-gray-400 hover:text-navy transition font-medium"
                    >
                      <ArrowLeft size={14} /> Retour a la connexion
                    </Link>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
