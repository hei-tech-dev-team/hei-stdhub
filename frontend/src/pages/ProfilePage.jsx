import { useState, useRef, useEffect } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import api from "../api/axios";
import Sidebar from "../components/layout/Sidebar";
import Navbar from "../components/layout/Navbar";
import { subscribeToPush, unsubscribeFromPush, isSubscribedToPush } from "../push";
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
  faBell,
  faBellSlash,
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
  const { user, setUser, pushSubscribed, setPushSubscribed } = useAuth();
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
  const [notifLoading, setNotifLoading] = useState(false);

  useEffect(() => {
    requestAnimationFrame(() => setVisible(true));
  }, []);

  useEffect(() => {
    isSubscribedToPush().then(setPushSubscribed);
  }, [setPushSubscribed]);

  const handleToggleNotifications = async () => {
    setNotifLoading(true);
    if (pushSubscribed) {
      await unsubscribeFromPush();
      setPushSubscribed(false);
    } else {
      await subscribeToPush();
      const subscribed = await isSubscribedToPush();
      setPushSubscribed(subscribed);
    }
    setNotifLoading(false);
  };

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
      const { data } = await api.patch("/auth/avatar", fd);
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
    if (!pseudo.trim()) {
      setErrorPseudo("Le pseudo ne peut pas être vide.");
      return;
    }
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
    if (!currentPwd) {
      setErrorPwd("Veuillez entrer votre mot de passe actuel.");
      return;
    }
    if (newPwd.length < 6) {
      setErrorPwd("Le nouveau mot de passe doit contenir au moins 6 caractères.");
      return;
    }
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

        {/* ───────── Banner ───────── */}
        <div className="bg-gradient-to-br from-navy via-navy-dark to-navy px-4 sm:px-6 lg:px-8 pt-8 pb-14 sm:pt-10 sm:pb-16 lg:pt-12 lg:pb-18 shrink-0 relative overflow-hidden">
          <div className="max-w-6xl mx-auto w-full">
            <div className="flex flex-col sm:flex-row items-center sm:items-end gap-4 sm:gap-6">
              <div className="relative group shrink-0">
                <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full flex items-center justify-center overflow-hidden transition-transform duration-300 group-hover:scale-105 ring-2 ring-gold/60 shadow-lg shadow-gold/20"
                  style={{
                    background: loadingAvatar
                      ? "rgba(10,26,51,0.8)"
                      : displayedAvatar
                        ? "transparent"
                        : "linear-gradient(135deg, rgba(10,26,51,0.9), rgba(0,25,72,0.9))",
                  }}
                >
                  {loadingAvatar ? (
                    <FontAwesomeIcon icon={faSpinner} className="text-gold text-2xl animate-spin" />
                  ) : displayedAvatar ? (
                    <img src={displayedAvatar} alt="avatar" className="w-full h-full object-cover" />
                  ) : (
                    <FontAwesomeIcon icon={faUser} className="text-gold text-2xl" />
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  title="Changer la photo"
                  className="absolute -bottom-0.5 -right-0.5 w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center transition-all duration-200 hover:scale-110 active:scale-95 bg-gold text-white shadow-lg shadow-gold/40"
                >
                  <FontAwesomeIcon icon={faCamera} className="text-xs" />
                </button>
                <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleAvatar} />
              </div>
              <div className="flex-1 text-center sm:text-left min-w-0">
                <h1 className="text-white font-bold text-xl sm:text-2xl lg:text-3xl truncate">{user?.pseudo}</h1>
                <div className="flex items-center gap-2 mt-1.5 justify-center sm:justify-start flex-wrap">
                  <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${roleCfg.cls}`}>
                    <FontAwesomeIcon icon={roleCfg.icon} className="mr-1.5" />
                    {roleCfg.label}
                  </span>
                  <span className="text-xs text-white/50">{user?.ref}</span>
                  {user?.level && <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-white/10 text-white/70">{user.level}</span>}
                  {user?.promo && <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-white/10 text-white/70">Promo {user.promo}</span>}
                </div>
              </div>
            </div>
            {(errorAvatar || successAvatar) && (
              <div className={`mt-4 text-sm px-4 py-2.5 rounded-xl border max-w-md mx-auto sm:mx-0 ${errorAvatar ? "bg-red-500/10 border-red-500/20 text-red-200" : "bg-green-500/10 border-green-500/20 text-green-200"}`}>
                {errorAvatar || "Photo de profil mise à jour !"}
              </div>
            )}
          </div>
        </div>

        {/* ───────── Content ───────── */}
        <main className="flex-1 overflow-y-auto relative">
          <div className="max-w-6xl mx-auto w-full px-4 sm:px-6 lg:px-8 -mt-4 sm:-mt-5 pb-6 sm:pb-8">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-5">
              {/* Info */}
              <div className={`rounded-xl bg-white border border-contact/40 shadow-sm p-5 sm:p-6 transition-all duration-700 ease-out ${visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"}`}
                style={{ transitionDelay: "150ms" }}>
                <h2 className="text-navy font-bold text-xs uppercase tracking-wide mb-4 flex items-center gap-2.5">
                  <span className="w-7 h-7 rounded-lg bg-gold/15 flex items-center justify-center">
                    <FontAwesomeIcon icon={faIdCard} className="text-gold text-xs" />
                  </span>
                  Informations
                </h2>
                <div className="grid grid-cols-2 gap-x-4 gap-y-4">
                  {[["Nom", user?.nom, faUser], ["Prénom", user?.prenom, faUser], ["Email", user?.email, faEnvelope], ["Référence", user?.ref, faIdCard]].map(([label, val, icon]) => (
                    <div key={label}>
                      <div className="flex items-center gap-1.5 mb-1">
                        <FontAwesomeIcon icon={icon} className="text-gold/60 text-[10px]" />
                        <p className="text-[10px] text-gray-400 uppercase tracking-wide font-semibold">{label}</p>
                      </div>
                      <p className="font-semibold text-navy text-sm truncate">{val || "—"}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Pseudo */}
              <div className={`rounded-xl bg-white border border-contact/40 shadow-sm p-5 sm:p-6 transition-all duration-700 ease-out ${visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"}`}
                style={{ transitionDelay: "250ms" }}>
                <h2 className="text-navy font-bold text-xs uppercase tracking-wide mb-4 flex items-center gap-2.5">
                  <span className="w-7 h-7 rounded-lg bg-gold/15 flex items-center justify-center">
                    <FontAwesomeIcon icon={faPen} className="text-gold text-xs" />
                  </span>
                  Modifier le pseudo
                </h2>
                {errorPseudo && <div className="flex items-center gap-2 text-xs px-3 py-2 rounded-lg mb-3 bg-red-50 border border-red-200 text-red-500"><FontAwesomeIcon icon={faTimes} className="text-xs shrink-0" />{errorPseudo}</div>}
                {successPseudo && <div className="flex items-center gap-2 text-xs px-3 py-2 rounded-lg mb-3 animate-slide-up bg-green-50 border border-green-200 text-green-600"><FontAwesomeIcon icon={faCheck} className="text-xs" /> Pseudo mis à jour !</div>}
                <form onSubmit={handlePseudo} className="flex gap-2">
                  <input className="flex-1 text-sm rounded-xl px-4 py-2.5 border border-contact/60 bg-surface text-navy placeholder:text-gray-400 focus:outline-none focus:border-gold focus:ring-2 focus:ring-gold/10 transition-all"
                    value={pseudo} onChange={(e) => setPseudo(e.target.value)} placeholder="Nouveau pseudo" />
                  <button type="submit" disabled={loadingPseudo}
                    className="px-4 rounded-xl text-sm font-semibold transition-all duration-200 disabled:opacity-50 active:scale-95 bg-gold text-white shadow-md shadow-gold/25">
                    {loadingPseudo ? <FontAwesomeIcon icon={faSpinner} className="animate-spin" /> : <FontAwesomeIcon icon={faSave} />}
                  </button>
                </form>
              </div>

              {/* Password */}
              <div className={`rounded-xl bg-white border border-contact/40 shadow-sm p-5 sm:p-6 transition-all duration-700 ease-out ${visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"}`}
                style={{ transitionDelay: "350ms" }}>
                <h2 className="text-navy font-bold text-xs uppercase tracking-wide mb-4 flex items-center gap-2.5">
                  <span className="w-7 h-7 rounded-lg bg-gold/15 flex items-center justify-center">
                    <FontAwesomeIcon icon={faLock} className="text-gold text-xs" />
                  </span>
                  Modifier le mot de passe
                </h2>
                {errorPwd && <div className="flex items-center gap-2 text-sm px-4 py-2.5 rounded-xl mb-3 bg-red-50 border border-red-200 text-red-500"><FontAwesomeIcon icon={faTimes} className="text-xs shrink-0" />{errorPwd}</div>}
                {successPwd && <div className="flex items-center gap-2 text-sm px-4 py-2.5 rounded-xl mb-3 animate-slide-up bg-green-50 border border-green-200 text-green-600"><FontAwesomeIcon icon={faCheck} className="text-xs" /> Mot de passe mis à jour !</div>}
                <form onSubmit={handlePassword} className="flex flex-col gap-3">
                  <PwdInput value={currentPwd} setValue={setCurrentPwd} placeholder="Mot de passe actuel" show={showCurrent} toggle={() => setShowCurrent((p) => !p)} />
                  <PwdInput value={newPwd} setValue={setNewPwd} placeholder="Nouveau mot de passe" show={showNew} toggle={() => setShowNew((p) => !p)} />
                  <PwdInput value={confirmPwd} setValue={setConfirmPwd} placeholder="Confirmer le nouveau mot de passe" show={showConfirm} toggle={() => setShowConfirm((p) => !p)} />
                  <button type="submit" disabled={loadingPwd}
                    className="w-full py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 disabled:opacity-50 active:scale-[0.98] flex items-center justify-center gap-2 bg-gold text-white shadow-md shadow-gold/25">
                    {loadingPwd ? <FontAwesomeIcon icon={faSpinner} className="animate-spin" /> : <FontAwesomeIcon icon={faLock} />} Mettre à jour
                  </button>
                </form>
              </div>

              {/* Notifications */}
              <div className={`rounded-xl bg-white border border-contact/40 shadow-sm p-5 sm:p-6 transition-all duration-700 ease-out ${visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"}`}
                style={{ transitionDelay: "450ms" }}>
                <h2 className="text-navy font-bold text-xs uppercase tracking-wide mb-4 flex items-center gap-2.5">
                  <span className="w-7 h-7 rounded-lg bg-gold/15 flex items-center justify-center">
                    <FontAwesomeIcon icon={faBell} className="text-gold text-xs" />
                  </span>
                  Notifications
                </h2>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${pushSubscribed ? "bg-green-100" : "bg-gray-100"}`}>
                      <FontAwesomeIcon icon={pushSubscribed ? faBell : faBellSlash}
                        className={pushSubscribed ? "text-green-500 text-sm" : "text-gray-400 text-sm"} />
                    </div>
                    <div>
                      <p className="text-navy font-semibold text-sm">{pushSubscribed ? "Notifications activées" : "Notifications désactivées"}</p>
                      <p className="text-gray-400 text-xs mt-0.5">{pushSubscribed ? "Vous recevrez des alertes même hors de l'application." : "Activez pour être informé en temps réel."}</p>
                    </div>
                  </div>
                  <button onClick={handleToggleNotifications} disabled={notifLoading}
                    className={`relative w-12 h-6 rounded-full transition-all duration-300 shrink-0 ${pushSubscribed ? "bg-green-500" : "bg-gray-300"}`}>
                    <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform duration-300 ${pushSubscribed ? "translate-x-6" : "translate-x-0"}`} />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

/* Shared password input for mobile */
function PwdInput({ value, setValue, placeholder, show, toggle }) {
  return (
    <div className="relative">
      <input type={show ? "text" : "password"}
        className="w-full text-sm rounded-xl px-4 py-2.5 pr-10 transition-all duration-200 placeholder:text-gray-400"
        style={{ background: "#f8fafc", border: "1px solid #e2e8f0", color: "#1e293b" }}
        onFocus={(e) => { e.currentTarget.style.borderColor = "#D4AF37"; e.currentTarget.style.background = "white"; }}
        onBlur={(e) => { e.currentTarget.style.borderColor = "#e2e8f0"; e.currentTarget.style.background = "#f8fafc"; }}
        placeholder={placeholder} value={value} onChange={(e) => setValue(e.target.value)} />
      <button type="button" tabIndex={-1} onClick={toggle}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gold transition-colors duration-200">
        <FontAwesomeIcon icon={show ? faEyeSlash : faEye} className="text-sm" />
      </button>
    </div>
  );
}
