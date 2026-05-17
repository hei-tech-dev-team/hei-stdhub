import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, CheckCircle, AlertCircle, ShieldCheck } from "lucide-react";
import { HEI_BLUE_LOGO, HEI_WHITE_LOGO } from "../assets/logos";
import api from "../api/axios";

export default function SecurityQuestionsPage() {
  const navigate = useNavigate();
  const [questions, setQuestions] = useState([]);
  const [selections, setSelections] = useState({});
  const [answers, setAnswers] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  const [existingKeys, setExistingKeys] = useState([]);

  useEffect(() => {
    api.get("/auth/security-questions")
      .then((res) => {
        setQuestions(res.data.questions);
        setExistingKeys(res.data.saved_keys || []);
      })
      .catch((err) => setError(err.response?.data?.error || "Erreur de chargement."))
      .finally(() => setLoading(false));
  }, []);

  const toggleQuestion = (key) => {
    setSelections((prev) => {
      const next = { ...prev };
      if (next[key]) {
        delete next[key];
        setAnswers((a) => { const r = { ...a }; delete r[key]; return r; });
      } else {
        if (Object.keys(next).length >= 3) return prev;
        next[key] = true;
      }
      return next;
    });
    setError("");
  };

  const handleAnswer = (key, value) => {
    setAnswers((prev) => ({ ...prev, [key]: value }));
    setError("");
  };

  const handleSave = async () => {
    const selectedKeys = Object.keys(selections);
    if (selectedKeys.length < 2) {
      setError("Veuillez sélectionner au moins 2 questions.");
      return;
    }
    const missing = selectedKeys.filter((k) => !answers[k]?.trim());
    if (missing.length) {
      setError("Veuillez répondre à toutes les questions sélectionnées.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      await api.post("/auth/security-questions", {
        questions: selectedKeys.map((key) => ({ key, answer: answers[key] })),
      });
      setSaved(true);
      setTimeout(() => navigate("/profile", { replace: true }), 2000);
    } catch (err) {
      setError(err.response?.data?.error || "Erreur lors de l'enregistrement.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-surface flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-navy border-t-gold rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0A1A33] via-[#001948] to-[#0A1A33] flex items-center justify-center px-4 py-8">
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-32 -left-32 w-96 h-96 bg-white/5 rounded-full blur-3xl" />
        <div className="absolute top-1/4 -right-24 w-64 h-64 bg-white/5 rounded-full blur-2xl" />
        <div className="absolute bottom-0 left-1/3 w-80 h-80 bg-white/3 rounded-full blur-3xl" />
      </div>

      <div className="relative w-full max-w-2xl">
        <div className="bg-white rounded-3xl shadow-[0_32px_80px_rgba(0,0,0,0.35)] overflow-hidden">
          <div className="p-8 sm:p-10">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 rounded-2xl flex items-center justify-center" style={{ background: "linear-gradient(135deg, #0A1A33, #001948)" }}>
                <ShieldCheck size={22} className="text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-navy">Questions de sécurité</h1>
                <p className="text-gray-400 text-xs">Protégez votre compte</p>
              </div>
            </div>

            {saved ? (
              <div className="flex flex-col items-center text-center gap-4 py-8">
                <div className="w-16 h-16 rounded-full flex items-center justify-center" style={{ background: "linear-gradient(135deg, #0A1A33, #001948)" }}>
                  <CheckCircle size={28} className="text-white" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-navy mb-1">Questions enregistrées</h2>
                  <p className="text-gray-400 text-sm">Redirection vers votre profil...</p>
                </div>
              </div>
            ) : (
              <>
                {existingKeys.length > 0 && (
                  <div className="bg-green-50 border border-green-200 text-green-700 text-sm px-4 py-3 rounded-2xl mb-5">
                    Vous avez déjà {existingKeys.length} question(s) enregistrée(s). Les remplacer.
                  </div>
                )}

                {error && (
                  <div className="bg-red-50 border border-red-200 text-red-600 text-sm px-4 py-3 rounded-2xl mb-5 flex items-center gap-2">
                    <AlertCircle size={16} /> {error}
                  </div>
                )}

                <p className="text-gray-500 text-sm mb-4">
                  Choisissez 2 à 3 questions et répondez-y. Ces réponses vous permettront de réinitialiser votre mot de passe si vous l'oubliez.
                </p>

                <div className="space-y-3 mb-6">
                  {questions.map((q) => (
                    <div key={q.key} className={`rounded-2xl border transition-all duration-200 ${selections[q.key] ? "border-navy bg-navy/5" : "border-gray-200"}`}>
                      <button
                        type="button"
                        onClick={() => toggleQuestion(q.key)}
                        className="w-full text-left px-4 py-3 flex items-center gap-3"
                      >
                        <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all ${selections[q.key] ? "bg-navy border-navy" : "border-gray-300"}`}>
                          {selections[q.key] && <CheckCircle size={14} className="text-white" />}
                        </div>
                        <span className="text-sm font-medium text-gray-700">{q.question}</span>
                      </button>
                      {selections[q.key] && (
                        <div className="px-4 pb-3">
                          <input
                            type="text"
                            className="input-field text-sm"
                            placeholder="Votre réponse"
                            value={answers[q.key] || ""}
                            onChange={(e) => handleAnswer(q.key, e.target.value)}
                            autoComplete="off"
                          />
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                <div className="flex gap-3">
                  <Link
                    to="/profile"
                    className="flex-1 py-3 rounded-2xl font-bold text-sm border border-gray-300 text-gray-500 hover:bg-gray-50 transition text-center"
                  >
                    Annuler
                  </Link>
                  <button
                    onClick={handleSave}
                    disabled={saving || Object.keys(selections).length < 2}
                    className="flex-1 py-3 rounded-2xl font-bold text-sm text-white transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed"
                    style={{ background: "linear-gradient(135deg, #0A1A33, #001948)" }}
                  >
                    {saving ? "Enregistrement..." : "Enregistrer"}
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