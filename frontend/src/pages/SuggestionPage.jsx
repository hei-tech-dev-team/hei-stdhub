import { useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faLightbulb,
  faPaperPlane,
  faSpinner,
  faCheckCircle,
  faUserSecret,
  faUser,
} from "@fortawesome/free-solid-svg-icons";
import api from "../api/axios";
import Navbar from "../components/layout/Navbar";
import Sidebar from "../components/layout/Sidebar";
import { useAuth } from "../context/AuthContext";

export default function SuggestionPage() {
  const { user } = useAuth();
  const [form, setForm] = useState({ titre: "", contenu: "", anonyme: false });
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");

  const set = (k, v) => setForm((p) => ({ ...p, [k]: v }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    const titre = form.titre.trim();
    const contenu = form.contenu.trim();

    if (!titre) return setError("Le titre est requis.");
    if (!contenu) return setError("Le contenu est requis.");
    if (contenu.length < 20)
      return setError("La suggestion doit faire au moins 20 caractères.");

    
    const words = contenu.toLowerCase().split(/\s+/);
    const hasRepetitions = words.some((w, i) => w.length > 3 && words.slice(i + 1, i + 3).includes(w));
    if (hasRepetitions) return setError("Le contenu contient trop de répétitions.");

    const hasTooManyConsonants = /[bcdfghjklmnpqrstvwxz]{6,}/i.test(contenu);
    const hasTooManyVowels = /[aeiouyàâéèêëîïôûùüÿ]{5,}/i.test(contenu);
    const hasLongWords = words.some(w => w.length > 25 && !w.startsWith("http"));

    if (hasTooManyConsonants || hasTooManyVowels || hasLongWords) {
      return setError("Le contenu semble être incohérent ou mal formé.");
    }

    const commonWords = ["le", "la", "un", "une", "de", "et", "que", "est", "pour", "dans", "des"];
    if (contenu.length > 50 && !words.some(w => commonWords.includes(w))) {
      return setError("La suggestion doit être écrite en français lisible.");
    }

    // 4. Rate Limiting local (Cooldown de 60 secondes)
    const lastSent = localStorage.getItem("last_suggestion_at");
    if (lastSent && Date.now() - parseInt(lastSent) < 60000) {
      const wait = Math.ceil((60000 - (Date.now() - parseInt(lastSent))) / 1000);
      return setError(`Veuillez attendre ${wait}s avant d'envoyer une nouvelle suggestion.`);
    }

    setLoading(true);
    setError("");
    try {
      await api.post("/suggestions", form);
      setSubmitted(true);
      setForm({ titre: "", contenu: "", anonyme: false });
      localStorage.setItem("last_suggestion_at", Date.now().toString());
      setTimeout(() => setSubmitted(false), 4000);
    } catch (err) {
      setError(err.response?.data?.error || "Erreur lors de l'envoi.");
    } finally {
      setLoading(false);
    }
  };

  const isTeacher = user?.role === "teacher";

  return (
    <div className="flex h-screen bg-surface overflow-hidden">
      <Sidebar />
      <div className="flex flex-col flex-1 min-w-0">
        <Navbar title="Suggestions BDE" />
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          <div className="max-w-2xl mx-auto">
            {/* Header */}
            <div className="bg-navy rounded-2xl p-6 mb-6 text-white">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-full bg-gold/20 flex items-center justify-center">
                  <FontAwesomeIcon
                    icon={faLightbulb}
                    className="text-gold text-lg"
                  />
                </div>
                <h1 className="text-lg font-bold">Boîte à idées du BDE</h1>
              </div>
              <p className="text-white/60 text-sm leading-relaxed">
                {isTeacher
                  ? "En tant que professeur, vous pouvez soumettre des suggestions au BDE pour améliorer la vie à HEI. Vous recevrez un retour par email."
                  : "Tu as une idée pour améliorer la vie étudiante à HEI ? Soumets ta suggestion au Bureau Des Étudiants. Chaque suggestion sera examinée et tu recevras un retour par email."}
              </p>
            </div>

            {/* Succès */}
            {submitted && (
              <div className="bg-green-50 border border-green-200 rounded-2xl p-4 mb-5 flex items-center gap-3">
                <FontAwesomeIcon
                  icon={faCheckCircle}
                  className="text-green-500 text-xl shrink-0"
                />
                <div>
                  <p className="font-bold text-green-700 text-sm">
                    Suggestion envoyée !
                  </p>
                  <p className="text-green-600 text-xs mt-0.5">
                    Le BDE examinera ta suggestion et tu recevras un retour par
                    email.
                  </p>
                </div>
              </div>
            )}

            {/* Erreur */}
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-600 text-sm px-4 py-3 rounded-xl mb-4">
                {error}
              </div>
            )}

            {/* Formulaire */}
            <div className="bg-white rounded-2xl shadow-card p-6">
              <h2 className="font-bold text-navy text-base mb-4">
                Nouvelle suggestion
              </h2>

              <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                <div>
                  <label className="text-xs font-bold text-gray-500 mb-1 block uppercase tracking-wide">
                    Titre *
                  </label>
                  <input
                    className="input-field"
                    placeholder="Résumez votre idée en quelques mots..."
                    value={form.titre}
                    maxLength={120}
                    onChange={(e) => {
                      set("titre", e.target.value);
                      setError("");
                    }}
                  />
                  <p className="text-xs text-gray-400 mt-1 text-right">
                    {form.titre.length}/120
                  </p>
                </div>

                <div>
                  <label className="text-xs font-bold text-gray-500 mb-1 block uppercase tracking-wide">
                    Description *
                  </label>
                  <textarea
                    className="input-field resize-none h-40"
                    placeholder="Décrivez votre suggestion en détail. Quel est le problème ? Quelle est votre solution proposée ?"
                    value={form.contenu}
                    maxLength={1000}
                    onChange={(e) => {
                      set("contenu", e.target.value);
                      setError("");
                    }}
                  />
                  <p className="text-xs text-gray-400 mt-1 text-right">
                    {form.contenu.length}/1000
                  </p>
                </div>

                {/* Toggle anonyme */}
                <div
                  onClick={() => set("anonyme", !form.anonyme)}
                  className={`flex items-center gap-3 p-4 rounded-xl border-2 cursor-pointer transition select-none ${
                    form.anonyme
                      ? "border-navy bg-navy/5"
                      : "border-contact bg-surface hover:border-navy/30"
                  }`}
                >
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 transition ${
                      form.anonyme
                        ? "bg-navy text-white"
                        : "bg-gray-100 text-gray-400"
                    }`}
                  >
                    <FontAwesomeIcon
                      icon={form.anonyme ? faUserSecret : faUser}
                      className="text-sm"
                    />
                  </div>
                  <div className="flex-1">
                    <p
                      className={`font-bold text-sm ${form.anonyme ? "text-navy" : "text-gray-500"}`}
                    >
                      {form.anonyme
                        ? "Suggestion anonyme"
                        : "Suggestion avec mon nom"}
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {form.anonyme
                        ? "Le BDE ne verra pas votre identité."
                        : "Cliquez pour soumettre anonymement."}
                    </p>
                  </div>
                  {/* Switch */}
                  <div
                    className={`w-11 h-6 rounded-full transition-colors shrink-0 relative ${
                      form.anonyme ? "bg-navy" : "bg-gray-200"
                    }`}
                  >
                    <div
                      className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all ${
                        form.anonyme ? "left-5" : "left-0.5"
                      }`}
                    />
                  </div>
                </div>

                <div className="flex gap-3 justify-end pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      setForm({ titre: "", contenu: "", anonyme: false });
                      setError("");
                    }}
                    className="btn-danger"
                  >
                    Effacer
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="btn-primary flex items-center gap-2 disabled:opacity-60"
                  >
                    {loading ? (
                      <FontAwesomeIcon
                        icon={faSpinner}
                        className="animate-spin"
                      />
                    ) : (
                      <>
                        <FontAwesomeIcon
                          icon={form.anonyme ? faUserSecret : faPaperPlane}
                        />
                        {form.anonyme
                          ? "Envoyer anonymement"
                          : "Envoyer au BDE"}
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>

            {/* Info */}
            <div className="mt-4 bg-gold/10 border border-gold/30 rounded-xl p-4">
              <p className="text-xs text-navy/70 leading-relaxed">
                <strong className="text-navy">Comment ça marche ?</strong> Le
                BDE reçoit ta suggestion et l'examine. Elle peut être acceptée,
                mise en discussion, ou refusée avec une justification. Tu seras
                notifié par email dès qu'une décision est prise.{" "}
                <strong className="text-navy">Envoi anonyme :</strong> ton
                identité ne sera pas visible par le BDE.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
