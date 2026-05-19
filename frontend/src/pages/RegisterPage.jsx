import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { HEI_BLUE_LOGO, HEI_WHITE_LOGO } from "../assets/logos";
import api from "../api/axios";
import {
  determineRegisterRole,
  validateRegisterEmail,
} from "../utils/roleFilter";
import {
  Eye,
  EyeOff,
  User,
  Mail,
  Lock,
  Hash,
  AtSign,
  ArrowRight,
  CheckCircle,
  GraduationCap,
} from "lucide-react";

const ALL_UES = [
  "WEB1",
  "PROG1",
  "SYS1",
  "DONNEES1",
  "THEORIE1-P1",
  "THEORIE1-P2",
  "WEB2",
  "PROG2-POO",
  "PROG2-API",
  "SYS2",
  "MGT1",
  "WEB3",
  "PROG3",
  "MGT2",
  "PROG4",
  "SYS3",
  "DONNEES2",
  "IA1",
  "MOB1",
  "PROG5",
  "SECU1",
  "SECU2",
];

const InputWrapper = ({ label, icon: Icon, children }) => (
  <div>
    <label className="text-xs font-bold text-gray-500 mb-1.5 block uppercase tracking-wide">
      {label}
    </label>
    <div className="relative">
      {Icon && (
        <Icon
          size={14}
          className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
        />
      )}
      {children}
    </div>
  </div>
);

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
  const [showPwd, setShowPwd] = useState(false);
  const [selectedRole, setSelectedRole] = useState("student");
  const [showConfirm, setShowConfirm] = useState(false);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const toggleUE = (ue) =>
    setForm((f) => ({
      ...f,
      ues: f.ues.includes(ue) ? f.ues.filter((u) => u !== ue) : [...f.ues, ue],
    }));

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
      set("role", determineRegisterRole(data.role, selectedRole));
      setCodeVerified(true);
    } catch (err) {
      setCodeError(err.response?.data?.error || "Code invalide ou expiré.");
    } finally {
      setCodeLoading(false);
    }
  };

  const validate = () => {
    if (!form.nom.trim()) return "Le nom est requis.";
    if (!form.prenom.trim()) return "Le prenom est requis.";
    if (!form.email.trim()) return "L'email est requis.";
    if (!form.ref.trim()) return "La reference est requise.";
    if (!form.pseudo.trim()) return "Le pseudo est requis.";
    if (!form.password) return "Le mot de passe est requis.";
    if (form.password.length < 6)
      return "Le mot de passe doit faire au moins 6 caracteres.";
    if (form.password !== form.confirmPassword)
      return "Les mots de passe ne correspondent pas.";
    if (!validateRegisterEmail(form.email, form.role)) {
      if (form.role === "student")
        return "Format email etudiant : hei.prenom@gmail.com";
      if (form.role === "alumni") return "Email invalide.";
    }
    if (form.role === "alumni") {
      const refUpper = form.ref.trim().toUpperCase();
      if (!/^STD2[12]\d{3,}$/.test(refUpper))
        return "Les alumni doivent avoir une reference STD21xxx ou STD22xxx.";
    }
    if (form.role === "teacher" && form.ues.length === 0)
      return "Veuillez selectionner au moins une UE.";
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
    <div className="min-h-screen bg-gradient-to-br from-[#0A1A33] via-[#001948] to-[#0A1A33] flex items-center justify-center px-4 py-8">
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-32 -left-32 w-96 h-96 bg-white/5 rounded-full blur-3xl" />
        <div className="absolute top-1/4 -right-24 w-64 h-64 bg-white/5 rounded-full blur-2xl" />
        <div className="absolute bottom-0 left-1/3 w-80 h-80 bg-white/3 rounded-full blur-3xl" />
      </div>

      <div className="relative w-full max-w-4xl">
        <div className="bg-white rounded-3xl shadow-[0_32px_80px_rgba(0,0,0,0.35)] overflow-hidden flex">
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
                Rejoignez
                <br />
                la communauté !
              </h2>
              <p className="text-white/60 text-sm leading-relaxed">
                Créez votre compte pour accéder aux ressources, archives et
                échanges en temps réel.
              </p>
            </div>

            <div className="relative z-10 bg-white/10 backdrop-blur-sm rounded-2xl px-4 py-3 border border-white/20">
              <p className="text-white/80 text-xs font-medium">
                Inscription sur invitation
              </p>
              <p className="text-white/50 text-xs mt-0.5">
                Code requis — contactez l'admin
              </p>
            </div>
          </div>

          {/* Right panel */}
          <div className="flex-1 flex flex-col px-8 sm:px-10 py-8 overflow-y-auto max-h-screen">
            <div className="flex lg:hidden items-center gap-2 mb-6">
              <img
                src={HEI_BLUE_LOGO}
                alt="HEI"
                className="h-8 object-contain"
              />
              <span className="text-navy font-bold">HEI STDhub</span>
            </div>

            <div className="mb-6">
              <h1 className="text-2xl font-bold text-navy">Créer un compte</h1>
              <p className="text-gray-400 text-sm mt-1">
                Inscription sur invitation uniquement
              </p>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-600 text-sm px-4 py-3 rounded-2xl mb-4 flex items-center gap-2">
                {error}
              </div>
            )}

            {/* ÉTAPE 1 : Code */}
            {!codeVerified ? (
              <div className="flex flex-col gap-4">
                <div className="bg-[#e6edf7] border border-[#b8c9e0] rounded-2xl p-4">
                  <p className="text-[#001948] font-semibold text-sm mb-1">
                    Accès sur invitation uniquement
                  </p>
                  <p className="text-gray-500 text-xs leading-relaxed">
                    Contactez l'administrateur à{" "}
                    <a
                      href="mailto:stdhub.admin@gmail.com"
                      className="text-[#001948] hover:underline font-medium"
                    >
                      stdhub.admin@gmail.com
                    </a>{" "}
                    en précisant votre rôle et niveau. Le code est unique et
                    expire après 7 jours.
                  </p>
                </div>

                {codeError && (
                  <div className="bg-red-50 border border-red-200 text-red-600 text-sm px-4 py-2 rounded-xl">
                    {codeError}
                  </div>
                )}

                {/* Role selector */}
                <div className="flex items-center gap-2 p-1 bg-surface rounded-xl">
                  {[
                    { key: "student", label: "Étudiant" },
                    { key: "teacher", label: "Professeur" },
                    { key: "alumni", label: "Alumni" },
                  ].map((r) => (
                    <div
                      key={r.key}
                      onClick={() => { setSelectedRole(r.key); set("role", r.key); }}
                      className={`flex-1 py-2 rounded-lg text-xs font-bold text-center cursor-pointer transition-all duration-200 ${
                        selectedRole === r.key
                          ? "bg-navy text-white shadow-sm"
                          : "text-gray-400 hover:text-navy"
                      }`}
                    >
                      {r.label}
                    </div>
                  ))}
                </div>

                <InputWrapper label="Code d'invitation" icon={Hash}>
                  <input
                    className="input-field pl-10 tracking-widest font-mono uppercase"
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
                </InputWrapper>

                <button
                  type="button"
                  onClick={verifyCode}
                  disabled={codeLoading}
                  className="w-full py-3.5 rounded-2xl font-bold text-sm text-white flex items-center justify-center gap-2 transition-all disabled:opacity-60"
                  style={{
                    background: "linear-gradient(135deg, #0A1A33, #001948)",
                  }}
                >
                  {codeLoading ? (
                    "Vérification..."
                  ) : (
                    <>
                      <span>Vérifier le code</span>
                      <ArrowRight size={16} />
                    </>
                  )}
                </button>

                <p className="text-center text-xs text-gray-400">
                  Déjà un compte ?{" "}
                  <Link
                    to="/login"
                    className="text-[#001948] font-bold hover:underline"
                  >
                    Se connecter
                  </Link>
                </p>
              </div>
            ) : (
              /* ÉTAPE 2 : Formulaire complet */
              <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                <div className="flex items-center gap-2 bg-blue-50 border border-blue-200 text-[#001948] text-sm px-4 py-2.5 rounded-2xl">
                  <CheckCircle size={16} />
                  <span>
                    Code valide — inscription en tant que{" "}
                    <strong className="capitalize">
                      {form.role === "teacher"
                        ? "Professeur"
                        : form.role === "alumni"
                          ? "Alumni"
                          : "Étudiant"}
                    </strong>
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <InputWrapper label="Nom" icon={User}>
                    <input
                      className="input-field pl-9"
                      placeholder="Rakoto"
                      value={form.nom}
                      onChange={(e) => {
                        set("nom", e.target.value);
                        setError("");
                      }}
                    />
                  </InputWrapper>
                  <InputWrapper label="Prénom" icon={User}>
                    <input
                      className="input-field pl-9"
                      placeholder="Jean"
                      value={form.prenom}
                      onChange={(e) => {
                        set("prenom", e.target.value);
                        setError("");
                      }}
                    />
                  </InputWrapper>
                </div>

                <InputWrapper label="Email" icon={Mail}>
                  <input
                    type="email"
                    className="input-field pl-10"
                    placeholder={
                      form.role === "alumni"
                        ? "jean.rakoto@gmail.com"
                        : form.role === "student"
                          ? "hei.jean@gmail.com"
                          : "dr.nom@hei.mg"
                    }
                    value={form.email}
                    onChange={(e) => {
                      set("email", e.target.value);
                      setError("");
                    }}
                  />
                </InputWrapper>

                <div className="grid grid-cols-2 gap-3">
                  <InputWrapper label="Référence" icon={Hash}>
                    <input
                      className="input-field pl-9"
                      placeholder={
                        form.role === "alumni"
                          ? "STD21001 ou STD22001"
                          : form.role === "student"
                            ? "STD25001"
                            : "PROF001"
                      }
                      value={form.ref}
                      onChange={(e) => {
                        set("ref", e.target.value);
                        setError("");
                      }}
                    />
                  </InputWrapper>
                  <InputWrapper label="Pseudo" icon={AtSign}>
                    <input
                      className="input-field pl-9"
                      placeholder="MonPseudo"
                      value={form.pseudo}
                      onChange={(e) => {
                        set("pseudo", e.target.value);
                        setError("");
                      }}
                    />
                  </InputWrapper>
                </div>

                {form.role === "student" && (
                  <div>
                    <label className="text-xs font-bold text-gray-500 mb-1.5 block uppercase tracking-wide">
                      Niveau
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

                {form.role === "teacher" && (
                  <div>
                    <label className="text-xs font-bold text-gray-500 mb-2 block uppercase tracking-wide">
                      UEs dont vous êtes responsable *
                    </label>
                    <div className="flex flex-wrap gap-1.5">
                      {ALL_UES.map((ue) => (
                        <button
                          key={ue}
                          type="button"
                          onClick={() => {
                            toggleUE(ue);
                            setError("");
                          }}
                          className={
                            "px-3 py-1.5 rounded-full text-xs font-semibold border transition " +
                            (form.ues.includes(ue)
                              ? "text-white border-transparent"
                              : "bg-white border-gray-300 text-navy hover:bg-gray-50")
                          }
                          style={
                            form.ues.includes(ue)
                              ? {
                                  background:
                                    "linear-gradient(135deg, #0A1A33, #001948)",
                                  borderColor: "transparent",
                                }
                              : {}
                          }
                        >
                          {ue}
                        </button>
                      ))}
                    </div>
                    {form.ues.length > 0 && (
                      <p className="text-xs text-[#001948] mt-2 font-medium">
                        {form.ues.length} UE{form.ues.length > 1 ? "s" : ""}{" "}
                        sélectionnée{form.ues.length > 1 ? "s" : ""}
                      </p>
                    )}
                  </div>
                )}

                <div className="grid grid-cols-2 gap-3">
                  <InputWrapper label="Mot de passe" icon={Lock}>
                    <input
                      type={showPwd ? "text" : "password"}
                      className="input-field pl-9 pr-9"
                      placeholder="••••••••"
                      value={form.password}
                      onChange={(e) => {
                        set("password", e.target.value);
                        setError("");
                      }}
                    />
                    <button
                      type="button"
                      tabIndex={-1}
                      onClick={() => setShowPwd((p) => !p)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-navy transition"
                    >
                      {showPwd ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                  </InputWrapper>

                  <InputWrapper label="Confirmer" icon={Lock}>
                    <input
                      type={showConfirm ? "text" : "password"}
                      className="input-field pl-9 pr-9"
                      placeholder="••••••••"
                      value={form.confirmPassword}
                      onChange={(e) => {
                        set("confirmPassword", e.target.value);
                        setError("");
                      }}
                    />
                    <button
                      type="button"
                      tabIndex={-1}
                      onClick={() => setShowConfirm((p) => !p)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-navy transition"
                    >
                      {showConfirm ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                  </InputWrapper>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3.5 rounded-2xl font-bold text-sm text-white flex items-center justify-center gap-2 transition-all disabled:opacity-60 mt-1"
                  style={{
                    background: "linear-gradient(135deg, #0A1A33, #001948)",
                  }}
                >
                  {loading ? (
                    "Inscription..."
                  ) : (
                    <>
                      <span>S'inscrire</span>
                      <ArrowRight size={16} />
                    </>
                  )}
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
      </div>
    </div>
  );
}
