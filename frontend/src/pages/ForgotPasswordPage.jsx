import { useState } from "react";
import { Link } from "react-router-dom";
import { HEI_BLUE_LOGO, HEI_WHITE_LOGO } from "../assets/logos";
import { User, Lock, ArrowLeft, CheckCircle, AlertCircle, ShieldCheck } from "lucide-react";
import api from "../api/axios";

export default function ForgotPasswordPage() {
  const [step, setStep] = useState(1);
  const [ref, setRef] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [userInfo, setUserInfo] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [answers, setAnswers] = useState({});
  const [resetToken, setResetToken] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [done, setDone] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleLookup = async (e) => {
    e.preventDefault();
    if (!ref.trim()) {
      setError("Veuillez entrer votre référence (ex: STD25001).");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const res = await api.post("/auth/forgot-password/by-ref", { ref: ref.trim() });
      setUserInfo(res.data);
      setQuestions(res.data.questions);
      setStep(2);
    } catch (err) {
      setError(err.response?.data?.error || "Référence introuvable.");
    } finally {
      setLoading(false);
    }
  };

  const handleAnswer = (key, value) => {
    setAnswers((prev) => ({ ...prev, [key]: value }));
    setError("");
  };

  const handleVerify = async (e) => {
    e.preventDefault();
    const missing = questions.filter((q) => !answers[q.key]?.trim());
    if (missing.length) {
      setError("Veuillez répondre à toutes les questions.");
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
      setStep(3);
    } catch (err) {
      setError(err.response?.data?.error || "Réponses incorrectes.");
    } finally {
      setLoading(false);
    }
  };

  const handleReset = async (e) => {
    e.preventDefault();
    if (!password || !confirmPassword) {
      setError("Veuillez remplir les deux champs.");
      return;
    }
    if (password.length < 6) {
      setError("Le mot de passe doit contenir 6 caractères minimum.");
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
      setDone(true);
    } catch (err) {
      setError(err.response?.data?.error || "Impossible de réinitialiser le mot de passe.");
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
                {step === 1 && "Entrez votre référence pour commencer."}
                {step === 2 && "Répondez à vos questions de sécurité."}
                {step === 3 && "Choisissez un nouveau mot de passe."}
              </p>
            </div>

            <div className="relative z-10 bg-white/10 backdrop-blur-sm rounded-2xl px-4 py-3 border border-white/20">
              <p className="text-white/80 text-xs font-medium">
                Étape {step}/3
              </p>
              <p className="text-white/50 text-xs mt-0.5">
                {step === 1 && "Identification"}
                {step === 2 && "Vérification"}
                {step === 3 && "Réinitialisation"}
              </p>
            </div>
          </div>

          {/* Right panel */}
          <div className="flex-1 flex flex-col justify-center px-8 sm:px-12 py-10">
            {/* Mobile logo */}
            <div className="flex lg:hidden items-center gap-2 mb-8">
              <img src={HEI_BLUE_LOGO} alt="HEI" className="h-9 object-contain" />
              <span className="text-navy font-bold text-lg">HEI STDhub</span>
            </div>

            {done ? (
              <div className="flex flex-col items-center text-center gap-5 py-6">
                <div
                  className="w-20 h-20 rounded-full flex items-center justify-center"
                  style={{ background: "linear-gradient(135deg, #0A1A33, #001948)" }}
                >
                  <CheckCircle size={36} className="text-white" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-navy mb-2">
                    Mot de passe réinitialisé
                  </h2>
                  <p className="text-gray-400 text-sm leading-relaxed max-w-xs">
                    Vous pouvez maintenant vous connecter avec votre nouveau mot de passe.
                  </p>
                </div>
                <Link
                  to="/login"
                  className="w-full py-3.5 rounded-2xl font-bold text-sm text-white flex items-center justify-center gap-2 transition-all duration-200"
                  style={{ background: "linear-gradient(135deg, #0A1A33, #001948)" }}
                >
                  Se connecter
                </Link>
              </div>
            ) : (
              <>
                {step === 1 && (
                  <>
                    <div className="mb-8">
                      <h1 className="text-2xl sm:text-3xl font-bold text-navy">
                        Réinitialisation
                      </h1>
                      <p className="text-gray-400 text-sm mt-1">
                        Entrez votre référence étudiant pour commencer
                      </p>
                    </div>

                    {error && (
                      <div className="bg-red-50 border border-red-200 text-red-600 text-sm px-4 py-3 rounded-2xl mb-5 flex items-center gap-2">
                        <AlertCircle size={16} /> {error}
                      </div>
                    )}

                    <form onSubmit={handleLookup} className="flex flex-col gap-5">
                      <div>
                        <label className="text-xs font-bold text-gray-500 mb-2 block uppercase tracking-wide">
                          Réference
                        </label>
                        <div className="relative">
                          <User
                            size={15}
                            className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"
                          />
                          <input
                            type="text"
                            className="input-field pl-10 uppercase"
                            placeholder="STD25001"
                            value={ref}
                            onChange={(e) => { setRef(e.target.value); setError(""); }}
                          />
                        </div>
                      </div>
                      <button
                        type="submit"
                        disabled={loading}
                        className="w-full py-3.5 rounded-2xl font-bold text-sm text-white flex items-center justify-center gap-2 transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed"
                        style={{ background: "linear-gradient(135deg, #0A1A33, #001948)" }}
                      >
                        {loading ? "Vérification..." : "Continuer"}
                      </button>
                    </form>
                  </>
                )}

                {step === 2 && (
                  <>
                    <div className="mb-6">
                      <h1 className="text-2xl sm:text-3xl font-bold text-navy">
                        Vérification
                      </h1>
                      <p className="text-gray-400 text-sm mt-1">
                        {userInfo?.prenom}, répondez à vos questions de sécurité
                      </p>
                    </div>

                    {error && (
                      <div className="bg-red-50 border border-red-200 text-red-600 text-sm px-4 py-3 rounded-2xl mb-4 flex items-center gap-2">
                        <AlertCircle size={16} /> {error}
                      </div>
                    )}

                    <form onSubmit={handleVerify} className="flex flex-col gap-4">
                      {questions.map((q, i) => (
                        <div key={q.key}>
                          <label className="text-xs font-bold text-gray-500 mb-2 block">
                            Question {i + 1} : {q.question}
                          </label>
                          <input
                            type="text"
                            className="input-field"
                            placeholder="Votre réponse"
                            value={answers[q.key] || ""}
                            onChange={(e) => handleAnswer(q.key, e.target.value)}
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
                        {loading ? "Vérification..." : "Vérifier mes réponses"}
                      </button>
                    </form>
                  </>
                )}

                {step === 3 && (
                  <>
                    <div className="mb-6">
                      <h1 className="text-2xl sm:text-3xl font-bold text-navy">
                        Nouveau mot de passe
                      </h1>
                      <p className="text-gray-400 text-sm mt-1">
                        Choisissez un mot de passe sécurisé
                      </p>
                    </div>

                    {error && (
                      <div className="bg-red-50 border border-red-200 text-red-600 text-sm px-4 py-3 rounded-2xl mb-4 flex items-center gap-2">
                        <AlertCircle size={16} /> {error}
                      </div>
                    )}

                    <form onSubmit={handleReset} className="flex flex-col gap-4">
                      <div>
                        <label className="text-xs font-bold text-gray-500 mb-2 block uppercase tracking-wide">
                          Nouveau mot de passe
                        </label>
                        <div className="relative">
                          <Lock size={15} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                          <input
                            type={showPassword ? "text" : "password"}
                            className="input-field pl-10 pr-11"
                            placeholder="Minimum 6 caractères"
                            value={password}
                            onChange={(e) => { setPassword(e.target.value); setError(""); }}
                            autoComplete="new-password"
                          />
                          <button
                            type="button"
                            onClick={() => setShowPassword((v) => !v)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-navy"
                          >
                            {showPassword ? "🙈" : "👁"}
                          </button>
                        </div>
                      </div>
                      <div>
                        <label className="text-xs font-bold text-gray-500 mb-2 block uppercase tracking-wide">
                          Confirmer
                        </label>
                        <div className="relative">
                          <ShieldCheck size={15} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                          <input
                            type={showPassword ? "text" : "password"}
                            className="input-field pl-10"
                            placeholder="Répétez le mot de passe"
                            value={confirmPassword}
                            onChange={(e) => { setConfirmPassword(e.target.value); setError(""); }}
                            autoComplete="new-password"
                          />
                        </div>
                      </div>
                      <button
                        type="submit"
                        disabled={loading}
                        className="w-full py-3.5 rounded-2xl font-bold text-sm text-white flex items-center justify-center gap-2 transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed"
                        style={{ background: "linear-gradient(135deg, #0A1A33, #001948)" }}
                      >
                        {loading ? "Mise à jour..." : "Changer le mot de passe"}
                      </button>
                    </form>
                  </>
                )}

                <div className="mt-6 text-center">
                  {step > 1 ? (
                    <button
                      onClick={() => { setStep(step - 1); setError(""); }}
                      className="inline-flex items-center gap-2 text-xs text-gray-400 hover:text-navy transition font-medium"
                    >
                      <ArrowLeft size={14} /> Retour
                    </button>
                  ) : (
                    <Link
                      to="/login"
                      className="inline-flex items-center gap-2 text-xs text-gray-400 hover:text-navy transition font-medium"
                    >
                      <ArrowLeft size={14} /> Retour à la connexion
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