import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { HEI_BLUE_LOGO, HEI_WHITE_LOGO } from "../assets/logos";
import { ArrowLeft, AlertCircle, User, ShieldCheck, Loader } from "lucide-react";
import api from "../api/axios";

export default function ForgotPasswordSecurityPage() {
  const navigate = useNavigate();

  const [step, setStep] = useState("ref");
  const [ref, setRef] = useState("");
  const [prenom, setPrenom] = useState("");
  const [questions, setQuestions] = useState([]);
  const [answers, setAnswers] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleLookup = async (e) => {
    e.preventDefault();
    const trimmed = ref.trim().toUpperCase();
    if (!trimmed) {
      setError("Veuillez entrer votre reference.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const res = await api.post("/auth/forgot-password/by-ref", { ref: trimmed });
      setPrenom(res.data.prenom);
      setQuestions(res.data.questions);
      const initial = {};
      res.data.questions.forEach((q) => { initial[q.key] = ""; });
      setAnswers(initial);
      setStep("questions");
    } catch (err) {
      setError(err.response?.data?.error || "Erreur lors de la recherche.");
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async (e) => {
    e.preventDefault();
    const allAnswered = Object.values(answers).every((a) => a.trim());
    if (!allAnswered) {
      setError("Veuillez repondre a toutes les questions.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const answersPayload = questions.map((q) => ({
        key: q.key,
        answer: answers[q.key],
      }));
      const res = await api.post("/auth/forgot-password/verify-security", {
        ref: ref.trim().toUpperCase(),
        answers: answersPayload,
      });
      navigate(`/reset-password?token=${res.data.token}`);
    } catch (err) {
      setError(err.response?.data?.error || "Reponses incorrectes.");
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
                Questions
                <br />
                de securite
              </h2>
              <p className="text-white/60 text-sm leading-relaxed">
                Verifiez votre identite pour reinitialiser votre mot de passe.
              </p>
            </div>

            <div className="relative z-10 bg-white/10 backdrop-blur-sm rounded-2xl px-4 py-3 border border-white/20">
              <p className="text-white/80 text-xs font-medium">Alternative securisee</p>
              <p className="text-white/50 text-xs mt-0.5">Repondez a vos questions personnelles</p>
            </div>
          </div>

          <div className="flex-1 flex flex-col justify-center px-8 sm:px-12 py-10">
            <div className="flex lg:hidden items-center gap-2 mb-8">
              <img src={HEI_BLUE_LOGO} alt="HEI" className="h-9 object-contain" />
              <span className="text-navy font-bold text-lg">HEI STDhub</span>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-600 text-sm px-4 py-3 rounded-2xl mb-5 flex items-center gap-2">
                <AlertCircle size={16} /> {error}
              </div>
            )}

            {step === "ref" && (
              <>
                <div className="mb-8">
                  <h1 className="text-2xl sm:text-3xl font-bold text-navy">Verification</h1>
                  <p className="text-gray-400 text-sm mt-1">Entrez votre reference etudiante</p>
                </div>

                <form onSubmit={handleLookup} className="flex flex-col gap-5">
                  <div>
                    <label className="text-xs font-bold text-gray-500 mb-2 block uppercase tracking-wide">Reference</label>
                    <div className="relative">
                      <User size={15} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                      <input
                        type="text"
                        className="input-field pl-10 uppercase"
                        placeholder="STD21000"
                        value={ref}
                        onChange={(e) => setRef(e.target.value)}
                        inputMode="text"
                        autoComplete="off"
                      />
                    </div>
                  </div>
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-3.5 rounded-2xl font-bold text-sm text-white flex items-center justify-center gap-2 transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed"
                    style={{ background: "linear-gradient(135deg, #0A1A33, #001948)" }}
                  >
                    {loading ? (
                      <><Loader size={16} className="animate-spin" /> Recherche...</>
                    ) : (
                      "Verifier"
                    )}
                  </button>
                </form>

                <div className="mt-6 text-center">
                  <button
                    onClick={() => navigate("/forgot-password")}
                    className="inline-flex items-center gap-2 text-xs text-gray-400 hover:text-navy transition font-medium"
                  >
                    <ArrowLeft size={14} /> Retour a la reinitialisation par email
                  </button>
                </div>
              </>
            )}

            {step === "questions" && (
              <>
                <div className="mb-6">
                  <div className="flex items-center gap-2 mb-1">
                    <ShieldCheck size={18} className="text-navy" />
                    <h1 className="text-xl sm:text-2xl font-bold text-navy">Questions de securite</h1>
                  </div>
                  <p className="text-gray-400 text-sm">
                    Bonjour <span className="font-semibold text-navy">{prenom}</span>, repondez a vos questions
                  </p>
                </div>

                <form onSubmit={handleVerify} className="flex flex-col gap-4">
                  {questions.map((q, i) => (
                    <div key={q.key}>
                      <label className="text-xs font-bold text-gray-500 mb-2 block uppercase tracking-wide">
                        Question {i + 1}
                      </label>
                      <p className="text-sm text-gray-700 mb-2 font-medium">{q.question}</p>
                      <input
                        type="text"
                        className="input-field"
                        placeholder="Votre reponse"
                        value={answers[q.key] || ""}
                        onChange={(e) =>
                          setAnswers((prev) => ({ ...prev, [q.key]: e.target.value }))
                        }
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
                    {loading ? (
                      <><Loader size={16} className="animate-spin" /> Verification...</>
                    ) : (
                      "Verifier mes reponses"
                    )}
                  </button>
                </form>

                <div className="mt-6 text-center">
                  <button
                    onClick={() => { setStep("ref"); setError(""); }}
                    className="inline-flex items-center gap-2 text-xs text-gray-400 hover:text-navy transition font-medium"
                  >
                    <ArrowLeft size={14} /> Changer de reference
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
