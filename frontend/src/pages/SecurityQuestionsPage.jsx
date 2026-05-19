import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { CheckCircle, AlertCircle, ShieldCheck, Plus, Trash2 } from "lucide-react";
import api from "../api/axios";
import JarvisScanAnimation from "../components/ui/JarvisScanAnimation";

export default function SecurityQuestionsPage() {
  const navigate = useNavigate();
  const [questions, setQuestions] = useState([]);
  const [answers, setAnswers] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  const [showJarvis, setShowJarvis] = useState(false);

  useEffect(() => {
    api.get("/auth/security-questions")
      .then((res) => {
        const existing = res.data.questions || [];
        setQuestions(existing.map((q) => ({ id: q.question_key, question: q.question_text })));
        const initialAnswers = {};
        existing.forEach((q) => { initialAnswers[q.question_key] = ""; });
        setAnswers(initialAnswers);
      })
      .catch((err) => setError(err.response?.data?.error || "Erreur de chargement."))
      .finally(() => setLoading(false));
  }, []);

  const addQuestion = () => {
    if (questions.length >= 4) return;
    const id = `q_${Date.now()}`;
    setQuestions((prev) => [...prev, { id, question: "" }]);
    setError("");
  };

  const removeQuestion = (id) => {
    setQuestions((prev) => prev.filter((q) => q.id !== id));
    setAnswers((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
  };

  const setQuestionText = (id, value) => {
    setQuestions((prev) => prev.map((q) => q.id === id ? { ...q, question: value } : q));
    setError("");
  };

  const handleAnswer = (id, value) => {
    setAnswers((prev) => ({ ...prev, [id]: value }));
    setError("");
  };

  const handleSave = async () => {
    if (questions.length < 2) {
      setError("Ajoutez au moins 2 questions.");
      return;
    }
    for (const q of questions) {
      if (!q.question.trim()) { setError("Veuillez rediger toutes vos questions."); return; }
      if (q.question.trim().length < 10) { setError("Question trop courte (min 10 caracteres)."); return; }
      if (!answers[q.id]?.trim()) { setError("Veuillez repondre a toutes les questions."); return; }
      if (answers[q.id].trim().length < 2) { setError("Reponse trop courte (min 2 caracteres)."); return; }
    }
    const uniqueQuestions = new Set(questions.map((q) => q.question.trim().toLowerCase()));
    if (uniqueQuestions.size !== questions.length) {
      setError("Questions dupliquees.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const payload = questions.map((q) => ({
        question: q.question.trim(),
        answer: answers[q.id],
      }));
      await api.post("/auth/security-questions", { questions: payload });
      setShowJarvis(true);
    } catch (err) {
      setError(err.response?.data?.error || "Erreur lors de l'enregistrement.");
    } finally {
      setSaving(false);
    }
  };

  const handleJarvisComplete = () => {
    setShowJarvis(false);
    setSaved(true);
    setTimeout(() => navigate("/profile", { replace: true }), 2000);
  };

  if (showJarvis) {
    return <JarvisScanAnimation onComplete={handleJarvisComplete} duration={3000} />;
  }

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
                <h1 className="text-xl font-bold text-navy">Questions de securite</h1>
                <p className="text-gray-400 text-xs">Creez vos propres questions pour proteger votre compte</p>
              </div>
            </div>

            {saved ? (
              <div className="flex flex-col items-center text-center gap-4 py-8">
                <div className="w-16 h-16 rounded-full flex items-center justify-center" style={{ background: "linear-gradient(135deg, #0A1A33, #001948)" }}>
                  <CheckCircle size={28} className="text-white" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-navy mb-1">Questions enregistrees</h2>
                  <p className="text-gray-400 text-sm">Redirection vers votre profil...</p>
                </div>
              </div>
            ) : (
              <>
                {error && (
                  <div className="bg-red-50 border border-red-200 text-red-600 text-sm px-4 py-3 rounded-2xl mb-5 flex items-center gap-2">
                    <AlertCircle size={16} /> {error}
                  </div>
                )}

                <p className="text-gray-500 text-sm mb-4">
                  Creez 2 a 4 questions personnelles et repondez-y ({questions.length}/4).
                </p>

                <div className="space-y-3 mb-6">
                  {questions.map((q, i) => (
                    <div
                      key={q.id}
                      className="rounded-2xl border border-navy/30 bg-navy/[0.04] transition-all duration-200 has-[input:focus]:border-navy has-[input:focus]:shadow-sm"
                    >
                      <div className="px-4 pt-3 pb-2 flex items-center gap-2">
                        <span className="text-xs font-bold text-gray-400 shrink-0">Q{i + 1}</span>
                        <input
                          type="text"
                          className="flex-1 text-sm font-medium text-gray-700 bg-transparent border-b-2 border-gray-200 pb-1.5 focus:border-navy outline-none placeholder:text-gray-400 transition-colors duration-200"
                          placeholder="Redigez votre question..."
                          value={q.question}
                          onChange={(e) => setQuestionText(q.id, e.target.value)}
                        />
                        <button
                          type="button"
                          onClick={() => removeQuestion(q.id)}
                          className="text-gray-400 hover:text-red-500 hover:bg-red-50 p-1.5 rounded-lg transition shrink-0"
                          title="Supprimer"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                      <div className="px-4 pb-3">
                        <input
                          type="text"
                          className="w-full text-sm text-gray-600 bg-white border border-gray-200 rounded-xl px-3.5 py-2.5 focus:border-navy outline-none transition-all duration-200 placeholder:text-gray-400"
                          placeholder="Votre reponse"
                          value={answers[q.id] || ""}
                          onChange={(e) => handleAnswer(q.id, e.target.value)}
                          autoComplete="off"
                        />
                      </div>
                    </div>
                  ))}

                  {questions.length === 0 && (
                    <button
                      type="button"
                      onClick={addQuestion}
                      className="w-full rounded-2xl border-2 border-dashed border-gray-200 py-6 flex flex-col items-center gap-2 hover:border-navy/40 hover:bg-navy/5 transition-all duration-200 group cursor-pointer"
                    >
                      <Plus size={20} className="text-gray-300 group-hover:text-navy transition" />
                      <span className="text-xs text-gray-400 group-hover:text-navy font-semibold transition">
                        Ajouter votre premiere question
                      </span>
                    </button>
                  )}

                  {questions.length < 4 && (
                    <button
                      type="button"
                      onClick={addQuestion}
                      className="w-full rounded-2xl border-2 border-dashed border-gray-200 py-4 flex items-center justify-center gap-2 hover:border-navy/40 hover:bg-navy/5 transition-all duration-200 group"
                    >
                      <Plus size={16} className="text-gray-300 group-hover:text-navy transition" />
                      <span className="text-xs text-gray-400 group-hover:text-navy font-semibold transition">
                        Ajouter une autre question
                      </span>
                    </button>
                  )}
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
                    disabled={saving}
                    className="flex-1 py-3 rounded-2xl font-bold text-sm text-white transition-all duration-200 disabled:opacity-40 active:scale-[0.98]"
                    style={{
                      background: saving ? "#94a3b8" : "linear-gradient(135deg, #0A1A33, #001948)",
                      boxShadow: saving ? "none" : "0 4px 16px rgba(0,25,72,0.25)",
                    }}
                    onMouseEnter={(e) => { if (!saving) e.currentTarget.style.opacity = "0.9"; }}
                    onMouseLeave={(e) => { if (!saving) e.currentTarget.style.opacity = "1"; }}
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
