import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { HEI_BLUE_LOGO } from "../assets/logos";
import api from "../api/axios";

const ALL_UES = [
  "WEB1", "PROG1", "SYS1", "DONNEES1", "THEORIE1-P1", "THEORIE1-P2",
  "WEB2", "PROG2-POO", "PROG2-API", "SYS2",
  "DONNEES2", "WEB3", "PROG3", "MGT2", "PROG4", "SYS3",
  "MOB1", "PROG5", "SECU1", "SECU2",
];

export default function RegisterPage() {
  const { register } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState({
    nom: "",
    prenom: "",
    email: "",
    ref: "",
    pseudo: "",
    role: "student",
    level: "L1",
    password: "",
    confirmPassword: "",
    inviteCode: "",
    ues: [],
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [codeVerified, setCodeVerified] = useState(false);
  const [codeLoading, setCodeLoading] = useState(false);
  const [codeError, setCodeError] = useState("");

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const toggleUE = (ue) => {
    setForm((f) => ({
      ...f,
      ues: f.ues.includes(ue) ? f.ues.filter((u) => u !== ue) : [...f.ues, ue],
    }));
  };

  const verifyCode = async () => {
    if (!form.inviteCode.trim()) {
      setCodeError("Entrez un code d'invitation.");
      return;
    }
    setCodeLoading(true);
    setCodeError("");
    try {
      const { data } = await api.post("/auth/verify-invite", {
        code: form.inviteCode.trim().toUpperCase(),
      });
      set("role", data.role);
      setCodeVerified(true);
    } catch (err) {
      setCodeError(err.response?.data?.error || "Code invalide ou expiré.");
    } finally {
      setCodeLoading(false);
    }
  };

  const validate = () => {
    if (!form.nom.trim()) return "Le nom est requis.";
    if (!form.prenom.trim()) return "Le prénom est requis.";
    if (!form.email.trim()) return "L'email est requis.";
    if (!form.ref.trim()) return "La référence est requise.";
    if (!form.pseudo.trim()) return "Le pseudo est requis.";
    if (!form.password) return "Le mot de passe est requis.";
    if (form.password.length < 6)
      return "Le mot de passe doit faire au moins 6 caractères.";
    if (form.password !== form.confirmPassword)
      return "Les mots de passe ne correspondent pas.";
    if (form.role === "student" && !/^hei\..+@gmail\.com$/.test(form.email))
      return "Format email étudiant : hei.prenom@gmail.com";
    if (form.role === "teacher" && form.ues.length === 0)
      return "Veuillez sélectionner au moins une UE.";
    return null;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!codeVerified) {
      setError("Veuillez vérifier votre code d'invitation.");
      return;
    }
    const err = validate();
    if (err) {
      setError(err);
      return;
    }

    setLoading(true);
    setError("");
    try {
      await register({
        nom: form.nom,
        prenom: form.prenom,
        email: form.email,
        ref: form.ref.toUpperCase(),
        pseudo: form.pseudo,
        password: form.password,
        role: form.role,
        level: form.role === "student" ? form.level : undefined,
        inviteCode: form.inviteCode.trim().toUpperCase(),
        ues: form.role === "teacher" ? form.ues : [],
      });
      navigate("/");
    } catch (err) {
      setError(err.response?.data?.error || "Erreur lors de l'inscription.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-surface flex items-center justify-center px-4 py-8">
      <div className="bg-white rounded-2xl sm:rounded-3xl shadow-modal p-6 sm:p-8 lg:p-10 w-full max-w-sm sm:max-w-lg">
        {/* Logo */}
        <div className="flex flex-col items-center mb-6">
          <img src={HEI_BLUE_LOGO} alt="HEI" className="h-12 sm:h-14 mb-3 object-contain" />
          <h1 className="text-xl sm:text-2xl font-bold text-navy">Créer un compte</h1>
          <p className="text-gray-400 text-xs sm:text-sm mt-1">HEI STDhub</p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-600 text-sm px-4 py-3 rounded-xl mb-4">
            {error}
          </div>
        )}

        {/* ÉTAPE 1 : Code d'invitation */}
        {!codeVerified ? (
          <div className="flex flex-col gap-4">
            <div className="bg-navy/5 rounded-xl p-4 text-center">
              <p className="text-navy font-semibold text-sm mb-1">
                Accès sur invitation uniquement
              </p>
              <p className="text-gray-400 text-xs">
                Contactez votre administrateur pour obtenir un code d'accès en
                envoyant un email à{" "}
                <a href="mailto:hub203313@gmail.com" className="text-gold hover:underline">
                  hub203313@gmail.com
                </a>{" "}
                avec comme objet "Demande de code d'invitation HEI STDhub" et en
                précisant votre rôle (étudiant ou professeur) ainsi que votre
                niveau d'étude si vous êtes étudiant. Le code vous sera envoyé
                par email après vérification de votre statut à HEI. Chaque code
                est unique, valable une seule fois, et expire après 7 jours.
              </p>
            </div>

            {codeError && (
              <div className="bg-red-50 border border-red-200 text-red-600 text-sm px-4 py-2 rounded-xl">
                {codeError}
              </div>
            )}

            <div>
              <label className="text-xs font-bold text-gray-500 mb-1 block uppercase tracking-wide">
                Code d'invitation *
              </label>
              <input
                className="input-field tracking-widest font-mono uppercase"
                placeholder="EX: AB12CD34"
                value={form.inviteCode}
                onChange={(e) => {
                  set("inviteCode", e.target.value.toUpperCase());
                  setCodeError("");
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    verifyCode();
                  }
                }}
              />
            </div>

            <button
              type="button"
              onClick={verifyCode}
              disabled={codeLoading}
              className="btn-primary w-full text-center py-3 disabled:opacity-60"
            >
              {codeLoading ? "Vérification..." : "Vérifier le code"}
            </button>

            <p className="text-center text-xs text-gray-400">
              Déjà un compte ?{" "}
              <Link to="/login" className="text-gold font-bold hover:underline">
                Se connecter
              </Link>
            </p>
          </div>
        ) : (
          /* ÉTAPE 2 : Formulaire complet */
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            {/* Badge rôle */}
            <div className="flex items-center gap-2 bg-green-50 border border-green-200 text-green-700 text-sm px-4 py-2 rounded-xl">
              <span>✅ Code valide — inscription en tant que</span>
              <span className="font-bold capitalize">
                {form.role === "student" ? "Étudiant" : "Professeur"}
              </span>
            </div>

            {/* Nom + Prénom */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold text-gray-500 mb-1 block uppercase tracking-wide">
                  Nom *
                </label>
                <input
                  className="input-field"
                  placeholder="Rakoto"
                  value={form.nom}
                  onChange={(e) => { set("nom", e.target.value); setError(""); }}
                />
              </div>
              <div>
                <label className="text-xs font-bold text-gray-500 mb-1 block uppercase tracking-wide">
                  Prénom *
                </label>
                <input
                  className="input-field"
                  placeholder="Jean"
                  value={form.prenom}
                  onChange={(e) => { set("prenom", e.target.value); setError(""); }}
                />
              </div>
            </div>

            {/* Email */}
            <div>
              <label className="text-xs font-bold text-gray-500 mb-1 block uppercase tracking-wide">
                Email *
              </label>
              <input
                type="email"
                className="input-field"
                placeholder={form.role === "student" ? "hei.jean@gmail.com" : "dr.nom@hei.mg"}
                value={form.email}
                onChange={(e) => { set("email", e.target.value); setError(""); }}
              />
            </div>

            {/* Référence + Pseudo */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold text-gray-500 mb-1 block uppercase tracking-wide">
                  Référence *
                </label>
                <input
                  className="input-field"
                  placeholder={form.role === "student" ? "STD25001" : "PROF001"}
                  value={form.ref}
                  onChange={(e) => { set("ref", e.target.value); setError(""); }}
                />
              </div>
              <div>
                <label className="text-xs font-bold text-gray-500 mb-1 block uppercase tracking-wide">
                  Pseudo (chat) *
                </label>
                <input
                  className="input-field"
                  placeholder="MonPseudo"
                  value={form.pseudo}
                  onChange={(e) => { set("pseudo", e.target.value); setError(""); }}
                />
              </div>
            </div>

            {/* Niveau (étudiant seulement) */}
            {form.role === "student" && (
              <div>
                <label className="text-xs font-bold text-gray-500 mb-1 block uppercase tracking-wide">
                  Niveau *
                </label>
                <select
                  className="input-field"
                  value={form.level}
                  onChange={(e) => set("level", e.target.value)}
                >
                  <option value="L1">L1 — Première année</option>
                  <option value="L2">L2 — Deuxième année</option>
                  <option value="L3">L3 — Troisième année</option>
                </select>
              </div>
            )}

            {/* UEs (professeur seulement) */}
            {form.role === "teacher" && (
              <div>
                <label className="text-xs font-bold text-gray-500 mb-2 block uppercase tracking-wide">
                  UEs dont vous êtes responsable *
                </label>
                <div className="flex flex-wrap gap-2">
                  {ALL_UES.map((ue) => (
                    <button
                      key={ue}
                      type="button"
                      onClick={() => toggleUE(ue)}
                      className={
                        "px-3 py-1.5 rounded-full text-xs font-semibold border transition " +
                        (form.ues.includes(ue)
                          ? "bg-navy text-white border-navy"
                          : "bg-white border-contact text-navy hover:bg-surface")
                      }
                    >
                      {ue}
                    </button>
                  ))}
                </div>
                {form.ues.length > 0 && (
                  <p className="text-xs text-green-600 mt-2 font-medium">
                    {form.ues.length} UE(s) sélectionnée(s) : {form.ues.join(", ")}
                  </p>
                )}
              </div>
            )}

            {/* Mots de passe */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold text-gray-500 mb-1 block uppercase tracking-wide">
                  Mot de passe *
                </label>
                <input
                  type="password"
                  className="input-field"
                  placeholder="••••••••"
                  value={form.password}
                  onChange={(e) => { set("password", e.target.value); setError(""); }}
                />
              </div>
              <div>
                <label className="text-xs font-bold text-gray-500 mb-1 block uppercase tracking-wide">
                  Confirmer *
                </label>
                <input
                  type="password"
                  className="input-field"
                  placeholder="••••••••"
                  value={form.confirmPassword}
                  onChange={(e) => { set("confirmPassword", e.target.value); setError(""); }}
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full text-center py-3 mt-1 disabled:opacity-60"
            >
              {loading ? "Inscription..." : "S'inscrire"}
            </button>

            <button
              type="button"
              onClick={() => setCodeVerified(false)}
              className="text-center text-xs text-gray-400 hover:text-navy transition"
            >
              ← Changer de code d'invitation
            </button>
          </form>
        )}
      </div>
    </div>
  );
}