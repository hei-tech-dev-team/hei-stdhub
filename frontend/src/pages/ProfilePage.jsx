import { useState, useRef, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import api from "../api/axios";
import Sidebar from "../components/layout/Sidebar";
import Navbar from "../components/layout/Navbar";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faCamera,
  faUser,
  faLock,
  faSave,
  faSpinner,
  faCheck,
  faEye,
  faEyeSlash,
  faUserGraduate,
  faChalkboardTeacher,
  faUserShield,
  faUsers,
  faGraduationCap,
  faEnvelope,
  faIdCard,
  faPen,
  faTimes,
} from "@fortawesome/free-solid-svg-icons";

const ROLE_LABEL = {
  student: {
    label: "Étudiant",
    icon: faUserGraduate,
    cls: "bg-cyan-500/20 text-cyan-300",
  },
  teacher: {
    label: "Professeur",
    icon: faChalkboardTeacher,
    cls: "bg-purple-500/20 text-purple-300",
  },
  admin: {
    label: "Admin",
    icon: faUserShield,
    cls: "bg-red-500/20 text-red-300",
  },
  bde: { label: "BDE", icon: faUsers, cls: "bg-yellow-500/20 text-yellow-300" },
  alumni: {
    label: "Alumni",
    icon: faGraduationCap,
    cls: "bg-amber-500/20 text-amber-300",
  },
};

export default function ProfilePage() {
  const { user, setUser } = useAuth();
  const fileRef = useRef(null);

  const [pseudo, setPseudo] = useState(user?.pseudo || "");
  const [currentPwd, setCurrentPwd] = useState("");
  const [newPwd, setNewPwd] = useState("");
  const [confirmPwd, setConfirmPwd] = useState("");
  const [avatarPreview, setAvatarPreview] = useState("");

  const [loadingPseudo, setLoadingPseudo] = useState(false);
  const [loadingPwd, setLoadingPwd] = useState(false);
  const [loadingAvatar, setLoadingAvatar] = useState(false);

  const [successPseudo, setSuccessPseudo] = useState(false);
  const [successPwd, setSuccessPwd] = useState(false);
  const [successAvatar, setSuccessAvatar] = useState(false);

  const [errorPseudo, setErrorPseudo] = useState("");
  const [errorPwd, setErrorPwd] = useState("");
  const [errorAvatar, setErrorAvatar] = useState("");

  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const [visible, setVisible] = useState(false);

  useEffect(() => {
    requestAnimationFrame(() => setVisible(true));
  }, []);

  const roleCfg = ROLE_LABEL[user?.role] || ROLE_LABEL.student;
  const avatarUrl = user?.avatar || null;
  const displayedAvatar = avatarPreview || avatarUrl;

  useEffect(() => {
    if (!avatarPreview) return;
    return () => URL.revokeObjectURL(avatarPreview);
  }, [avatarPreview]);

  const handleAvatar = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setErrorAvatar("Choisissez une image valide.");
      return;
    }

    const preview = URL.createObjectURL(file);
    setAvatarPreview(preview);
    setErrorAvatar("");
    setSuccessAvatar(false);
    setLoadingAvatar(true);
    try {
      const fd = new FormData();
      fd.append("avatar", file);
      const { data } = await api.patch("/auth/avatar", fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setUser(data);
      setSuccessAvatar(true);
      setAvatarPreview("");
      setTimeout(() => setSuccessAvatar(false), 3000);
    } catch (err) {
      console.error(err);
      setErrorAvatar(err.response?.data?.error || "Erreur lors de l'upload.");
      setAvatarPreview("");
    } finally {
      setLoadingAvatar(false);
      e.target.value = "";
    }
  };

  const handlePseudo = async (e) => {
    e.preventDefault();
    setErrorPseudo("");
    setLoadingPseudo(true);
    try {
      const { data } = await api.patch("/auth/profile", { pseudo });
      setUser(data);
      setSuccessPseudo(true);
      setTimeout(() => setSuccessPseudo(false), 3000);
    } catch (err) {
      setErrorPseudo(err.response?.data?.error || "Erreur.");
    } finally {
      setLoadingPseudo(false);
    }
  };

  const handlePassword = async (e) => {
    e.preventDefault();
    setErrorPwd("");
    if (newPwd !== confirmPwd) {
      setErrorPwd("Les mots de passe ne correspondent pas.");
      return;
    }
    setLoadingPwd(true);
    try {
      await api.patch("/auth/password", {
        current: currentPwd,
        newPassword: newPwd,
      });
      setSuccessPwd(true);
      setCurrentPwd("");
      setNewPwd("");
      setConfirmPwd("");
      setTimeout(() => setSuccessPwd(false), 3000);
    } catch (err) {
      setErrorPwd(err.response?.data?.error || "Erreur.");
    } finally {
      setLoadingPwd(false);
    }
  };

  return (
    <div className="flex h-screen bg-surface overflow-hidden">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Navbar title="Mon Profil" />
        <main className="flex-1 overflow-y-auto relative">
          <div className="max-w-2xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-6 sm:py-8 relative z-10">
            {/* Animated profile header */}
            <div
              className={`transition-all duration-700 ease-out ${
                visible
                  ? "opacity-100 translate-y-0"
                  : "opacity-0 translate-y-6"
              }`}
            >
              <div
                className="rounded-xl overflow-hidden mb-6"
                style={{
                  background:
                    "linear-gradient(135deg, rgba(10,26,51,0.95), rgba(0,25,72,0.98))",
                  border: "1px solid rgba(255,255,255,0.08)",
                  boxShadow: "0 8px 32px rgba(0,0,0,0.2)",
                }}
              >
                {/* Cover accent */}
                <div className="h-24 sm:h-28 relative overflow-hidden border-b border-white/10">
                  <div
                    className="absolute inset-0"
                    style={{
                      background:
                        "linear-gradient(135deg, rgba(212,175,55,0.16), rgba(255,255,255,0.04))",
                    }}
                  />
                </div>

                {/* Avatar + info */}
                <div className="px-6 pb-6 -mt-12 relative">
                  <div className="flex flex-col sm:flex-row items-center sm:items-end gap-4">
                    <div className="relative group shrink-0">
                      <div
                        className="w-24 h-24 rounded-full flex items-center justify-center overflow-hidden transition-transform duration-300 group-hover:scale-105"
                        style={{
                          border: "3px solid rgba(212,175,55,0.6)",
                          boxShadow: "0 0 20px rgba(212,175,55,0.15)",
                          background: loadingAvatar
                            ? "rgba(10,26,51,0.8)"
                            : displayedAvatar
                              ? "transparent"
                              : "linear-gradient(135deg, rgba(10,26,51,0.9), rgba(0,25,72,0.9))",
                        }}
                      >
                        {loadingAvatar ? (
                          <FontAwesomeIcon
                            icon={faSpinner}
                            className="text-gold text-2xl animate-spin"
                          />
                        ) : displayedAvatar ? (
                          <img
                            src={displayedAvatar}
                            alt="avatar"
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <FontAwesomeIcon
                            icon={faUser}
                            className="text-gold text-3xl"
                          />
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => fileRef.current?.click()}
                        title="Changer la photo"
                        className="absolute -bottom-1 -right-1 w-9 h-9 rounded-full flex items-center justify-center transition-all duration-200 hover:scale-110 active:scale-95"
                        style={{
                          background:
                            "linear-gradient(135deg, #D4AF37, #B8860B)",
                          boxShadow: "0 2px 12px rgba(212,175,55,0.4)",
                          color: "white",
                        }}
                      >
                        <FontAwesomeIcon icon={faCamera} className="text-xs" />
                      </button>
                      <input
                        ref={fileRef}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handleAvatar}
                      />
                    </div>

                    <div className="flex-1 text-center sm:text-left min-w-0">
                      <h1 className="text-gold-light font-bold text-xl truncate">
                        {user?.pseudo}
                      </h1>
                      <p className="text-gray-500 text-sm mt-0.5">
                        {user?.ref}
                      </p>
                      <div className="flex items-center gap-2 mt-2 justify-center sm:justify-start">
                        <span
                          className={`text-[11px] font-bold px-2.5 py-1 rounded-full ${roleCfg.cls}`}
                        >
                          <FontAwesomeIcon
                            icon={roleCfg.icon}
                            className="mr-1.5"
                          />
                          {roleCfg.label}
                        </span>
                        {user?.level && (
                          <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-gray-100 text-gray-600">
                            {user.level}
                          </span>
                        )}
                        {user?.promo && (
                          <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-gray-100 text-gray-600">
                            Promo {user.promo}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  {(errorAvatar || successAvatar) && (
                    <div
                      className={`mt-4 text-sm px-4 py-2.5 rounded-xl border ${
                        errorAvatar
                          ? "bg-red-500/10 border-red-500/20 text-red-200"
                          : "bg-green-500/10 border-green-500/20 text-green-200"
                      }`}
                    >
                      {errorAvatar || "Photo de profil mise à jour !"}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Info cards with staggered entrance */}
            {[
              {
                key: "info",
                title: "Informations",
                icon: faIdCard,
                content: (
                  <div className="grid grid-cols-2 gap-4">
                    {[
                      ["Nom", user?.nom, faUser],
                      ["Prénom", user?.prenom, faUser],
                      ["Email", user?.email, faEnvelope],
                      ["Référence", user?.ref, faIdCard],
                    ].map(([label, val, icon]) => (
                      <div key={label} className="group">
                        <div className="flex items-center gap-2 mb-1.5">
                          <FontAwesomeIcon
                            icon={icon}
                            className="text-gold text-[10px] opacity-60"
                          />
                          <p className="text-xs text-gray-400 uppercase tracking-wide font-semibold">
                            {label}
                          </p>
                        </div>
                        <p className="font-semibold text-gray-800 text-sm truncate group-hover:text-gold transition-colors duration-200">
                          {val || "—"}
                        </p>
                      </div>
                    ))}
                  </div>
                ),
              },
              {
                key: "pseudo",
                title: "Modifier le pseudo",
                icon: faPen,
                content: (
                  <>
                    {errorPseudo && (
                      <div
                        className="flex items-center gap-2 text-sm px-4 py-2.5 rounded-xl mb-3"
                        style={{
                          background: "rgba(220,38,38,0.1)",
                          border: "1px solid rgba(220,38,38,0.2)",
                          color: "#fca5a5",
                        }}
                      >
                        <FontAwesomeIcon
                          icon={faTimes}
                          className="text-xs shrink-0"
                        />
                        {errorPseudo}
                      </div>
                    )}
                    {successPseudo && (
                      <div
                        className="flex items-center gap-2 text-sm px-4 py-2.5 rounded-xl mb-3 animate-slide-up"
                        style={{
                          background: "rgba(34,197,94,0.1)",
                          border: "1px solid rgba(34,197,94,0.2)",
                          color: "#86efac",
                        }}
                      >
                        <FontAwesomeIcon icon={faCheck} className="text-xs" />
                        Pseudo mis à jour !
                      </div>
                    )}
                    <form onSubmit={handlePseudo} className="flex gap-3">
                      <input
                        className="flex-1 text-sm rounded-xl px-4 py-2.5 transition-all duration-200 placeholder:text-gray-400"
                        style={{
                          background: "#f8fafc",
                          border: "1px solid #e2e8f0",
                          color: "#1e293b",
                        }}
                        onFocus={(e) => {
                          e.currentTarget.style.borderColor = "#D4AF37";
                          e.currentTarget.style.background = "white";
                        }}
                        onBlur={(e) => {
                          e.currentTarget.style.borderColor = "#e2e8f0";
                          e.currentTarget.style.background = "#f8fafc";
                        }}
                        value={pseudo}
                        onChange={(e) => setPseudo(e.target.value)}
                        placeholder="Nouveau pseudo"
                      />
                      <button
                        type="submit"
                        disabled={loadingPseudo}
                        className="px-4 rounded-xl text-sm font-semibold transition-all duration-200 disabled:opacity-50 active:scale-95"
                        style={{
                          background:
                            "linear-gradient(135deg, #D4AF37, #B8860B)",
                          color: "white",
                          boxShadow: "0 2px 12px rgba(212,175,55,0.25)",
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.opacity = "0.9";
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.opacity = "1";
                        }}
                      >
                        {loadingPseudo ? (
                          <FontAwesomeIcon
                            icon={faSpinner}
                            className="animate-spin"
                          />
                        ) : (
                          <FontAwesomeIcon icon={faSave} />
                        )}
                      </button>
                    </form>
                  </>
                ),
              },
              {
                key: "password",
                title: "Modifier le mot de passe",
                icon: faLock,
                content: (
                  <>
                    {errorPwd && (
                      <div
                        className="flex items-center gap-2 text-sm px-4 py-2.5 rounded-xl mb-3"
                        style={{
                          background: "rgba(220,38,38,0.1)",
                          border: "1px solid rgba(220,38,38,0.2)",
                          color: "#fca5a5",
                        }}
                      >
                        <FontAwesomeIcon
                          icon={faTimes}
                          className="text-xs shrink-0"
                        />
                        {errorPwd}
                      </div>
                    )}
                    {successPwd && (
                      <div
                        className="flex items-center gap-2 text-sm px-4 py-2.5 rounded-xl mb-3 animate-slide-up"
                        style={{
                          background: "rgba(34,197,94,0.1)",
                          border: "1px solid rgba(34,197,94,0.2)",
                          color: "#86efac",
                        }}
                      >
                        <FontAwesomeIcon icon={faCheck} className="text-xs" />
                        Mot de passe mis à jour !
                      </div>
                    )}
                    <form
                      onSubmit={handlePassword}
                      className="flex flex-col gap-3"
                    >
                      <PwdInput
                        value={currentPwd}
                        setValue={setCurrentPwd}
                        placeholder="Mot de passe actuel"
                        show={showCurrent}
                        toggle={() => setShowCurrent((p) => !p)}
                      />
                      <PwdInput
                        value={newPwd}
                        setValue={setNewPwd}
                        placeholder="Nouveau mot de passe"
                        show={showNew}
                        toggle={() => setShowNew((p) => !p)}
                      />
                      <PwdInput
                        value={confirmPwd}
                        setValue={setConfirmPwd}
                        placeholder="Confirmer le nouveau mot de passe"
                        show={showConfirm}
                        toggle={() => setShowConfirm((p) => !p)}
                      />
                      <button
                        type="submit"
                        disabled={loadingPwd}
                        className="w-full py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 disabled:opacity-50 active:scale-[0.98] flex items-center justify-center gap-2"
                        style={{
                          background:
                            "linear-gradient(135deg, #D4AF37, #B8860B)",
                          color: "white",
                          boxShadow: "0 2px 12px rgba(212,175,55,0.25)",
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.opacity = "0.9";
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.opacity = "1";
                        }}
                      >
                        {loadingPwd ? (
                          <FontAwesomeIcon
                            icon={faSpinner}
                            className="animate-spin"
                          />
                        ) : (
                          <FontAwesomeIcon icon={faLock} />
                        )}
                        Mettre à jour
                      </button>
                    </form>
                  </>
                ),
              },
            ].map((section, i) => (
              <div
                key={section.key}
                className={`transition-all duration-700 ease-out mb-5 ${
                  visible
                    ? "opacity-100 translate-y-0"
                    : "opacity-0 translate-y-6"
                }`}
                style={{ transitionDelay: `${150 + i * 100}ms` }}
              >
                <div
                  className="rounded-xl overflow-hidden p-5 sm:p-6"
                  style={{
                    background: "white",
                    border: "1px solid rgba(0,0,0,0.08)",
                  }}
                >
                  <h2 className="text-gray-800 font-bold text-sm uppercase tracking-wide mb-4 flex items-center gap-2.5">
                    <span
                      className="w-7 h-7 rounded-lg flex items-center justify-center"
                      style={{
                        background: "rgba(212,175,55,0.15)",
                      }}
                    >
                      <FontAwesomeIcon
                        icon={section.icon}
                        className="text-gold text-xs"
                      />
                    </span>
                    {section.title}
                  </h2>
                  {section.content}
                </div>
              </div>
            ))}

            {/* Security questions link */}
            <div className="animate-slide-up" style={{ animationDelay: "0.45s" }}>
              <a href="/security-questions"
                className="block rounded-2xl overflow-hidden p-5 sm:p-6 transition-all duration-200 hover:shadow-md"
                style={{
                  background: "white",
                  border: "1px solid rgba(0,0,0,0.08)",
                }}
              >
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                    style={{ background: "rgba(212,175,55,0.15)" }}>
                    <FontAwesomeIcon icon={faLock} className="text-gold text-sm" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-gray-800 text-sm">Questions de sécurité</h3>
                    <p className="text-xs text-gray-400 mt-0.5">Configurer la récupération de compte</p>
                  </div>
                  <svg className="w-4 h-4 text-gray-300 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </a>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

function PwdInput({ value, setValue, placeholder, show, toggle }) {
  return (
    <div className="relative">
      <input
        type={show ? "text" : "password"}
        className="w-full text-sm rounded-xl px-4 py-2.5 pr-10 transition-all duration-200 placeholder:text-gray-400"
        style={{
          background: "#f8fafc",
          border: "1px solid #e2e8f0",
          color: "#1e293b",
        }}
        onFocus={(e) => {
          e.currentTarget.style.borderColor = "#D4AF37";
          e.currentTarget.style.background = "white";
        }}
        onBlur={(e) => {
          e.currentTarget.style.borderColor = "#e2e8f0";
          e.currentTarget.style.background = "#f8fafc";
        }}
        placeholder={placeholder}
        value={value}
        onChange={(e) => setValue(e.target.value)}
      />
      <button
        type="button"
        tabIndex={-1}
        onClick={toggle}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gold transition-colors duration-200"
      >
        <FontAwesomeIcon icon={show ? faEyeSlash : faEye} className="text-sm" />
      </button>
    </div>
  );
}
