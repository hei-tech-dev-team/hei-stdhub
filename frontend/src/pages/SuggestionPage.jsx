import { useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
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
 
    setLoading(true);
    setError("");
    try {
      await api.post("/suggestions", { titre, contenu, anonyme: form.anonyme });
      setSubmitted(true);
      setForm({ titre: "", contenu: "", anonyme: false });
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
      <main className="flex-1 flex flex-col min-h-0">
        <Navbar title="Suggestions BDE" />
        <div className="flex-1 overflow-y-auto overflow-x-hidden">
          <div className="relative px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
            {/* Hero */}
            <div className="bg-navy rounded-2xl px-6 py-7 sm:px-8">
              <h1 className="text-white text-xl sm:text-2xl font-bold tracking-tight">
                Boîte à idées du BDE
                <span className="text-gold">.</span>
              </h1>
              <p className="text-white/50 text-sm mt-2 leading-relaxed max-w-xl">
                {isTeacher
                  ? "Soumettez vos suggestions au BDE pour améliorer la vie à HEI. Vous recevrez un retour par email."
                  : "Une idée pour améliorer la vie étudiante à HEI ? Chaque suggestion est examinée et tu recevras un retour par email."}
              </p>
            </div>
 
            {/* Content */}
            <div className="mt-6">
              <div className="max-w-2xl mx-auto">
                {/* Succès */}
                {submitted && (
                  <div className="bg-green-50 border border-green-200 rounded-2xl p-4 mb-5 flex items-center gap-3">
                    <FontAwesomeIcon icon={faCheckCircle} className="text-green-500 text-xl shrink-0" />
                    <div>
                      <p className="font-semibold text-green-700 text-sm">Suggestion envoyée !</p>
                      <p className="text-green-600 text-xs mt-0.5">
                        Le BDE examinera ta suggestion et tu recevras un retour par email.
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
                <div className="bg-white rounded-2xl border border-gray-100 p-6">
                  <h2 className="font-semibold text-navy text-base mb-4">Nouvelle suggestion</h2>
 
                  <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                    <div>
                      <label className="auth-label">
                        Titre *
                      </label>
                      <input
                        className="input-field"
                        placeholder="Résumez votre idée en quelques mots..."
                        value={form.titre}
                        onChange={(e) => {
                          set("titre", e.target.value);
                          setError("");
                        }}
                      />
                    </div>
 
                    <div>
                      <label className="auth-label">
                        Description *
                      </label>
                      <textarea
                        className="input-field resize-none h-40"
                        placeholder="Décrivez votre suggestion en détail. Quel est le problème ? Quelle est votre solution proposée ?"
                        value={form.contenu}
                        onChange={(e) => {
                          set("contenu", e.target.value);
                          setError("");
                        }}
                      />
                    </div>
 
                    {/* Toggle anonyme */}
                    <div
                      onClick={() => set("anonyme", !form.anonyme)}
                      className={`flex items-center gap-3 p-4 rounded-xl border cursor-pointer transition select-none ${
                        form.anonyme
                          ? "border-navy bg-navy/5"
                          : "border-gray-100 bg-[#F6F7F8] hover:border-navy/30"
                      }`}
                    >
                      <div
                        className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 transition ${
                          form.anonyme ? "bg-navy text-white" : "bg-gray-100 text-gray-400"
                        }`}
                      >
                        <FontAwesomeIcon icon={form.anonyme ? faUserSecret : faUser} className="text-sm" />
                      </div>
                      <div className="flex-1">
                        <p className={`font-medium text-sm ${form.anonyme ? "text-navy" : "text-gray-500"}`}>
                          {form.anonyme ? "Suggestion anonyme" : "Suggestion avec mon nom"}
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
                        className="btn-ghost"
                      >
                        Effacer
                      </button>
                      <button
                        type="submit"
                        disabled={loading}
                        className="btn-primary flex items-center gap-2 disabled:opacity-60"
                      >
                        {loading ? (
                          <FontAwesomeIcon icon={faSpinner} className="animate-spin" />
                        ) : (
                          <>
                            <FontAwesomeIcon icon={form.anonyme ? faUserSecret : faPaperPlane} />
                            {form.anonyme ? "Envoyer anonymement" : "Envoyer au BDE"}
                          </>
                        )}
                      </button>
                    </div>
                  </form>
                </div>
 
                {/* Info */}
                <div className="mt-4 bg-[#F6F7F8] border border-gray-100 rounded-2xl p-4">
                  <p className="text-xs text-navy/70 leading-relaxed">
                    <strong className="text-navy">Comment ça marche ?</strong> Le BDE reçoit ta suggestion et
                    l'examine. Elle peut être acceptée, mise en discussion, ou refusée avec une justification.
                    Tu seras notifié par email dès qu'une décision est prise.{" "}
                    <strong className="text-navy">Envoi anonyme :</strong> ton identité ne sera pas visible par
                    le BDE.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}