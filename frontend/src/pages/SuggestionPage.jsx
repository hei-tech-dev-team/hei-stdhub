import { useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faLightbulb,
  faPaperPlane,
  faSpinner,
  faCheckCircle,
} from "@fortawesome/free-solid-svg-icons";
import api from "../api/axios";
import Navbar from "../components/layout/Navbar";
import Sidebar from "../components/layout/Sidebar";

export default function SuggestionPage() {
  const [form, setForm] = useState({ titre: "", contenu: "" });
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");

  const set = (k, v) => setForm((p) => ({ ...p, [k]: v }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.titre.trim()) return setError("Le titre est requis.");
    if (!form.contenu.trim()) return setError("Le contenu est requis.");
    if (form.contenu.trim().length < 20)
      return setError("La suggestion doit faire au moins 20 caractères.");

    setLoading(true);
    setError("");
    try {
      await api.post("/suggestions", form);
      setSubmitted(true);
      setForm({ titre: "", contenu: "" });
      setTimeout(() => setSubmitted(false), 4000);
    } catch (err) {
      setError(err.response?.data?.error || "Erreur lors de l'envoi.");
    } finally {
      setLoading(false);
    }
  };

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
                Tu as une idée pour améliorer la vie étudiante à HEI ? Soumets
                ta suggestion au Bureau Des Étudiants. Chaque suggestion sera
                examinée et tu recevras un retour par email.
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

                <div className="flex gap-3 justify-end pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      setForm({ titre: "", contenu: "" });
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
                        <FontAwesomeIcon icon={faPaperPlane} />
                        Envoyer au BDE
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
                BDE reçoit ta suggestion et l'examine. Elle peut être retenue
                pour discussion, ou refusée avec une justification. Tu seras
                notifié par email dès qu'une décision est prise.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
