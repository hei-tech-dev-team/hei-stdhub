import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, CheckCircle, AlertCircle, ShieldCheck, Plus, Trash2 } from "lucide-react";
import { HEI_BLUE_LOGO, HEI_WHITE_LOGO } from "../assets/logos";
import api from "../api/axios";

export default function SecurityQuestionsPage() {
  const navigate = useNavigate();
  const [predefined, setPredefined] = useState([]);
  const [selected, setSelected] = useState([]);
  const [customs, setCustoms] = useState([]);
  const [answers, setAnswers] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    api.get("/auth/security-questions")
      .then((res) => {
        setPredefined(res.data.questions);
      })
      .catch((err) => setError(err.response?.data?.error || "Erreur de chargement."))
      .finally(() => setLoading(false));
  }, []);

  const totalCount = selected.length + customs.length;

  const togglePredefined = (key) => {
    if (selected.includes(key)) {
      setSelected((p) => p.filter((k) => k !== key));
      setAnswers((a) => { const r = { ...a }; delete r[key]; return r; });
    } else {
      if (totalCount >= 4) return;
      setSelected((p) => [...p, key]);
    }
    setError("");
  };

  const addCustom = () => {
    if (totalCount >= 4) return;
    const id = Date.now();
    setCustoms((p) => [...p, { id, question: "", key: `custom_${id}` }]);
    setError("");
  };

  const removeCustom = (id) => {
    setCustoms((p) => p.filter((c) => c.id !== id));
    setAnswers((a) => { const r = { ...a }; delete r[`custom_${id}`]; return r; });
  };

  const setCustomQuestion = (id, value) => {
    setCustoms((p) => p.map((c) => c.id === id ? { ...c, question: value } : c));
    setError("");
  };

  const handleAnswer = (key, value) => {
    setAnswers((prev) => ({ ...prev, [key]: value }));
    setError("");
  };

  const handleSave = async () => {
    if (totalCount < 2) {
      setError("Sélectionnez au moins 2 questions ou ajoutez des questions personnalisées.");
      return;
    }
    const missing = [];
    for (const key of selected) {
      if (!answers[key]?.trim()) missing.push(key);
    }
    for (const c of customs) {
      if (!c.question.trim()) { setError("Veuillez rédiger vos questions personnalisées."); return; }
      if (c.question.trim().length < 10) { setError("Question personnalisée trop courte (min 10 caractères)."); return; }
      if (!answers[`custom_${c.id}`]?.trim()) missing.push(c.question);
    }
    if (missing.length) {
      setError("Veuillez répondre à toutes les questions.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const payload = [
        ...selected.map((key) => ({ key, answer: answers[key] })),
        ...customs.map((c) => ({
          custom: true,
          key: `custom_${c.id}`,
          question: c.question.trim(),
          answer: answers[`custom_${c.id}`],
        })),
      ];
      await api.post("/auth/security-questions", { questions: payload });
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
                {error && (
                  <div className="bg-red-50 border border-red-200 text-red-600 text-sm px-4 py-3 rounded-2xl mb-5 flex items-center gap-2">
                    <AlertCircle size={16} /> {error}
                  </div>
                )}

                <p className="text-gray-500 text-sm mb-4">
                  Choisissez 2 à 4 questions et répondez-y ({totalCount}/4 sélectionnée{totalCount > 1 ? "s" : ""}).
                </p>

                {/* Predefined questions */}
                <div className="space-y-3 mb-6">
                  <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wide">Questions prédéfinies</h3>
                  {predefined.map((q) => (
                    <div key={q.key} className={`rounded-2xl border transition-all duration-200 ${selected.includes(q.key) ? "border-navy bg-navy/5" : "border-gray-200"}`}>
                      <button
                        type="button"
                        onClick={() => togglePredefined(q.key)}
                        className="w-full text-left px-4 py-3 flex items-center gap-3"
                      >
                        <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all ${selected.includes(q.key) ? "bg-navy border-navy" : "border-gray-300"}`}>
                          {selected.includes(q.key) && <CheckCircle size={14} className="text-white" />}
                        </div>
                        <span className="text-sm font-medium text-gray-700">{q.question}</span>
                      </button>
                      {selected.includes(q.key) && (
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

                {/* Custom questions */}
                <div className="space-y-3 mb-6">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wide">Questions personnalisées</h3>
                    <button
                      type="button"
                      onClick={addCustom}
                      disabled={totalCount >= 4}
                      className="text-xs text-gold font-semibold hover:text-navy transition flex items-center gap-1 disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      <Plus size={14} /> Ajouter
                    </button>
                  </div>
                  {customs.length === 0 && (
                    <button
                      type="button"
                      onClick={addCustom}
                      className="w-full rounded-2xl border-2 border-dashed border-gray-200 py-6 flex flex-col items-center gap-2 hover:border-navy/40 hover:bg-navy/5 transition-all duration-200 group cursor-pointer"
                    >
                      <Plus size={20} className="text-gray-300 group-hover:text-navy transition" />
                      <span className="text-xs text-gray-400 group-hover:text-navy font-semibold transition">
                        Ajouter une question personnalisée
                      </span>
                    </button>
                  )}
                  {customs.map((c) => (
                    <div
                      key={c.id}
                      className="rounded-2xl border border-navy/30 bg-navy/[0.04] transition-all duration-200 has-[input:focus]:border-navy has-[input:focus]:shadow-sm"
                    >
                      <div className="px-4 pt-3 pb-2 flex items-center gap-2">
                        <input
                          type="text"
                          className="flex-1 text-sm font-medium text-gray-700 bg-transparent border-b-2 border-gray-200 pb-1.5 focus:border-navy outline-none placeholder:text-gray-400 transition-colors duration-200"
                          placeholder="Rédigez votre question personnalisée..."
                          value={c.question}
                          onChange={(e) => setCustomQuestion(c.id, e.target.value)}
                        />
                        <button
                          type="button"
                          onClick={() => removeCustom(c.id)}
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
                          placeholder="Votre réponse"
                          value={answers[`custom_${c.id}`] || ""}
                          onChange={(e) => handleAnswer(`custom_${c.id}`, e.target.value)}
                          autoComplete="off"
                        />
                      </div>
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