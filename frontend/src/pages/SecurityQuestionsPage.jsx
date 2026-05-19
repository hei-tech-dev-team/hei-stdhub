import { useState, useEffect, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import { CheckCircle, AlertCircle, ShieldCheck, Plus, Trash2, Edit2 } from "lucide-react";
import api from "../api/axios";
import JarvisScanAnimation from "../components/ui/JarvisScanAnimation";

function generateQuestionId() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return `q_${crypto.randomUUID()}`;
  }
  return `q_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

function QuestionEditor({ question, index, onQuestionChange, onAnswerChange, onRemove, canRemove, isExisting }) {
  return (
    <div
      className="rounded-2xl border border-navy/30 bg-navy/[0.04] transition-all duration-200 focus-within:border-navy focus-within:shadow-sm"
    >
      <div className="px-4 pt-3 pb-2 flex items-center gap-2">
        <span className="text-xs font-bold text-gray-400 shrink-0">Q{index + 1}</span>
        {isExisting && (
          <span className="text-[10px] font-semibold text-navy/60 bg-navy/10 px-2 py-0.5 rounded-full shrink-0">
            Existante
          </span>
        )}
        <input
          type="text"
          className="flex-1 text-sm font-medium text-gray-700 bg-transparent border-b-2 border-gray-200 pb-1.5 focus:border-navy outline-none placeholder:text-gray-400 transition-colors duration-200 min-w-0"
          placeholder="Redigez votre question..."
          value={question.question}
          onChange={(e) => onQuestionChange(question.id, e.target.value)}
          inputMode="text"
          autoComplete="off"
        />
        {canRemove && (
          <button
            type="button"
            onClick={() => onRemove(question.id)}
            className="text-gray-400 hover:text-red-500 hover:bg-red-50 p-2 rounded-lg transition shrink-0 min-w-[44px] min-h-[44px] flex items-center justify-center"
            title="Supprimer"
            aria-label={`Supprimer la question ${index + 1}`}
          >
            <Trash2 size={16} />
          </button>
        )}
      </div>
      <div className="px-4 pb-3">
        <input
          type="text"
          className="w-full text-sm text-gray-600 bg-white border border-gray-200 rounded-xl px-3.5 py-3 focus:border-navy outline-none transition-all duration-200 placeholder:text-gray-400"
          placeholder={isExisting ? "Nouvelle reponse (remplace l'ancienne)" : "Votre reponse"}
          value={question.answer}
          onChange={(e) => onAnswerChange(question.id, e.target.value)}
          inputMode="text"
          autoComplete="off"
        />
      </div>
    </div>
  );
}

export default function SecurityQuestionsPage() {
  const navigate = useNavigate();
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  const [showJarvis, setShowJarvis] = useState(false);
  const [hasExisting, setHasExisting] = useState(false);

  useEffect(() => {
    api.get("/auth/security-questions")
      .then((res) => {
        const existing = res.data.questions || [];
        setHasExisting(existing.length > 0);
        const mapped = existing.map((q) => ({
          id: q.question_key,
          question: q.question_text,
          answer: "",
          isExisting: true,
        }));
        setQuestions(mapped);
      })
      .catch((err) => setError(err.response?.data?.error || "Erreur de chargement."))
      .finally(() => setLoading(false));
  }, []);

  const addQuestion = useCallback(() => {
    if (questions.length >= 4) return;
    setQuestions((prev) => [...prev, { id: generateQuestionId(), question: "", answer: "", isExisting: false }]);
    setError("");
  }, [questions.length]);

  const removeQuestion = useCallback((id) => {
    setQuestions((prev) => prev.filter((q) => q.id !== id));
    setError("");
  }, []);

  const setQuestionText = useCallback((id, value) => {
    setQuestions((prev) => prev.map((q) => (q.id === id ? { ...q, question: value } : q)));
    setError("");
  }, []);

  const handleAnswer = useCallback((id, value) => {
    setQuestions((prev) => prev.map((q) => (q.id === id ? { ...q, answer: value } : q)));
    setError("");
  }, []);

  const handleSave = async () => {
    if (questions.length < 2) {
      setError("Ajoutez au moins 2 questions.");
      return;
    }
    for (const q of questions) {
      if (!q.question.trim()) { setError("Veuillez rediger toutes vos questions."); return; }
      if (q.question.trim().length < 10) { setError("Question trop courte (min 10 caracteres)."); return; }
      if (!q.answer?.trim()) { setError("Veuillez repondre a toutes les questions."); return; }
      if (q.answer.trim().length < 2) { setError("Reponse trop courte (min 2 caracteres)."); return; }
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
        answer: q.answer,
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
    <div className="min-h-screen bg-gradient-to-br from-[#0A1A33] via-[#001948] to-[#0A1A33] flex items-start sm:items-center justify-center px-4 py-6 sm:py-8">
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-32 -left-32 w-96 h-96 bg-white/5 rounded-full blur-3xl" />
        <div className="absolute top-1/4 -right-24 w-64 h-64 bg-white/5 rounded-full blur-2xl" />
        <div className="absolute bottom-0 left-1/3 w-80 h-80 bg-white/3 rounded-full blur-3xl" />
      </div>

      <div className="relative w-full max-w-2xl my-4">
        <div className="bg-white rounded-3xl shadow-[0_32px_80px_rgba(0,0,0,0.35)] overflow-hidden">
          <div className="p-6 sm:p-10">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-11 h-11 rounded-2xl flex items-center justify-center shrink-0" style={{ background: "linear-gradient(135deg, #0A1A33, #001948)" }}>
                <ShieldCheck size={20} className="text-white" />
              </div>
              <div>
                <h1 className="text-lg sm:text-xl font-bold text-navy">Questions de securite</h1>
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
                    <AlertCircle size={16} className="shrink-0" /> <span>{error}</span>
                  </div>
                )}

                {hasExisting && (
                  <div className="bg-blue-50 border border-blue-200 text-blue-700 text-sm px-4 py-3 rounded-2xl mb-5 flex items-start gap-2">
                    <Edit2 size={15} className="shrink-0 mt-0.5" />
                    <span>Modifiez vos questions existantes ou ajoutez-en de nouvelles. Les reponses seront remplacees.</span>
                  </div>
                )}

                <p className="text-gray-500 text-sm mb-4">
                  Creez 2 a 4 questions personnelles ({questions.length}/4).
                </p>

                <div className="space-y-3 mb-6">
                  {questions.map((q, i) => (
                    <QuestionEditor
                      key={q.id}
                      question={q}
                      index={i}
                      onQuestionChange={setQuestionText}
                      onAnswerChange={handleAnswer}
                      onRemove={removeQuestion}
                      canRemove={questions.length > 2}
                      isExisting={q.isExisting}
                    />
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
