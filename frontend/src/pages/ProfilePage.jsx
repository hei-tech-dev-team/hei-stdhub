import { useState, useRef, useEffect } from "react";
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
  faTimes,
  faBell,
  faBellSlash,
} from "@fortawesome/free-solid-svg-icons";

const ROLE_LABEL = {
  student: {
    label: "Étudiant",
    icon: faUserGraduate,
    cls: "bg-cyan-50 text-cyan-700",
  },
  teacher: {
    label: "Professeur",
    icon: faChalkboardTeacher,
    cls: "bg-purple-50 text-purple-700",
  },
  admin: {
    label: "Admin",
    icon: faUserShield,
    cls: "bg-red-50 text-red-700",
  },
  bde: { label: "BDE", icon: faUsers, cls: "bg-amber-50 text-amber-700" },
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

        <main className="flex-1 overflow-y-auto custom-scrollbar">
          <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-4">
            {/* Identity */}
            <div className={`card p-5 transition-all duration-500 ${visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}`}>
              <div className="flex items-center gap-4">
                <div className="relative shrink-0">
                  <div className="w-14 h-14 rounded-full bg-surface flex items-center justify-center overflow-hidden">
                    {loadingAvatar ? (
                      <FontAwesomeIcon icon={faSpinner} className="text-navy/50 animate-spin" />
                    ) : displayedAvatar ? (
                      <img src={displayedAvatar} alt="avatar" className="w-full h-full object-cover" />
                    ) : (
                      <FontAwesomeIcon icon={faUser} className="text-navy/40" />
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => fileRef.current?.click()}
                    title="Changer la photo"
                    className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-navy text-white flex items-center justify-center hover:bg-navy-dark transition-colors"
                  >
                    <FontAwesomeIcon icon={faCamera} className="text-[10px]" />
                  </button>
                  <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleAvatar} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h1 className="text-navy font-bold text-lg truncate">{user?.pseudo}</h1>
                    <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${roleCfg.cls}`}>
                      <FontAwesomeIcon icon={roleCfg.icon} className="mr-1" />
                      {roleCfg.label}
                    </span>
                  </div>
                  <p className="text-gray-400 text-xs mt-0.5">{user?.ref}</p>
                </div>
              </div>
              {(errorAvatar || successAvatar) && (
                <div className={`mt-4 text-xs px-3 py-2 rounded-lg ${errorAvatar ? "bg-[#FEF3F2] border border-[#FECACA] text-[#B42318]" : "bg-green-50 border border-green-200 text-green-700"}`}>
                  {errorAvatar || "Photo de profil mise à jour !"}
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Info */}
              <div
                className={`card p-5 transition-all duration-500 ${visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}`}
                style={{ transitionDelay: "100ms" }}
              >
                <h2 className="field-label">Informations</h2>
                <div className="grid grid-cols-2 gap-x-4 gap-y-3">
                  {[["Nom", user?.nom], ["Prénom", user?.prenom], ["Email", user?.email], ["Référence", user?.ref]].map(([label, val]) => (
                    <div key={label}>
                      <p className="text-[11px] text-navy/50 uppercase tracking-[0.1em] font-medium mb-1">{label}</p>
                      <p className="font-medium text-navy text-sm truncate">{val || "—"}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Pseudo */}
              <div
                className={`card p-5 transition-all duration-500 ${visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}`}
                style={{ transitionDelay: "150ms" }}
              >
                <h2 className="field-label">Modifier le pseudo</h2>
                {errorPseudo && (
                  <div className="flex items-center gap-2 text-xs px-3 py-2 rounded-lg mb-3 bg-[#FEF3F2] border border-[#FECACA] text-[#B42318]">
                    <FontAwesomeIcon icon={faTimes} className="text-xs shrink-0" />
                    {errorPseudo}
                  </div>
                )}
                {successPseudo && (
                  <div className="flex items-center gap-2 text-xs px-3 py-2 rounded-lg mb-3 animate-slide-up bg-green-50 border border-green-200 text-green-700">
                    <FontAwesomeIcon icon={faCheck} className="text-xs" /> Pseudo mis à jour !
                  </div>
                )}
                <form onSubmit={handlePseudo} className="flex gap-2">
                  <input
                    className="input-field flex-1"
                    value={pseudo}
                    onChange={(e) => setPseudo(e.target.value)}
                    placeholder="Nouveau pseudo"
                  />
                  <button
                    type="submit"
                    disabled={loadingPseudo}
                    className="w-10 shrink-0 rounded-xl bg-navy text-white flex items-center justify-center transition-colors hover:bg-navy-dark disabled:opacity-50"
                  >
                    {loadingPseudo ? <FontAwesomeIcon icon={faSpinner} className="animate-spin" /> : <FontAwesomeIcon icon={faSave} />}
                  </button>
                </form>
              </div>

              {/* Password */}
              <div
                className={`card p-5 transition-all duration-500 ${visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}`}
                style={{ transitionDelay: "200ms" }}
              >
                <h2 className="field-label">Modifier le mot de passe</h2>
                {errorPwd && (
                  <div className="flex items-center gap-2 text-xs px-3 py-2 rounded-lg mb-3 bg-[#FEF3F2] border border-[#FECACA] text-[#B42318]">
                    <FontAwesomeIcon icon={faTimes} className="text-xs shrink-0" />
                    {errorPwd}
                  </div>
                )}
                {successPwd && (
                  <div className="flex items-center gap-2 text-xs px-3 py-2 rounded-lg mb-3 animate-slide-up bg-green-50 border border-green-200 text-green-700">
                    <FontAwesomeIcon icon={faCheck} className="text-xs" /> Mot de passe mis à jour !
                  </div>
                )}
                <form onSubmit={handlePassword} className="flex flex-col gap-3">
                  <PwdInput value={currentPwd} setValue={setCurrentPwd} placeholder="Mot de passe actuel" show={showCurrent} toggle={() => setShowCurrent((p) => !p)} />
                  <PwdInput value={newPwd} setValue={setNewPwd} placeholder="Nouveau mot de passe" show={showNew} toggle={() => setShowNew((p) => !p)} />
                  <PwdInput value={confirmPwd} setValue={setConfirmPwd} placeholder="Confirmer le mot de passe" show={showConfirm} toggle={() => setShowConfirm((p) => !p)} />
                  <button
                    type="submit"
                    disabled={loadingPwd}
                    className="w-full py-2.5 rounded-xl bg-navy text-white text-sm font-medium transition-colors hover:bg-navy-dark disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {loadingPwd ? <FontAwesomeIcon icon={faSpinner} className="animate-spin" /> : <FontAwesomeIcon icon={faLock} />} Mettre à jour
                  </button>
                </form>
              </div>

              {/* Notifications */}
              <div
                className={`card p-5 transition-all duration-500 ${visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}`}
                style={{ transitionDelay: "250ms" }}
              >
                <h2 className="field-label">Notifications</h2>
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${pushSubscribed ? "bg-green-50" : "bg-surface"}`}>
                      <FontAwesomeIcon
                        icon={pushSubscribed ? faBell : faBellSlash}
                        className={pushSubscribed ? "text-green-600 text-sm" : "text-gray-400 text-sm"}
                      />
                    </div>
                    <div className="min-w-0">
                      <p className="text-navy font-medium text-sm">{pushSubscribed ? "Notifications activées" : "Notifications désactivées"}</p>
                      <p className="text-gray-400 text-xs mt-0.5 leading-snug">
                        {pushSubscribed ? "Vous recevrez des alertes même hors de l'application." : "Activez pour être informé en temps réel."}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={handleToggleNotifications}
                    disabled={notifLoading}
                    className={`relative w-11 h-6 rounded-full transition-colors duration-300 shrink-0 ${pushSubscribed ? "bg-green-500" : "bg-gray-300"}`}
                  >
                    <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform duration-300 ${pushSubscribed ? "translate-x-5" : "translate-x-0"}`} />
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

function PwdInput({ value, setValue, placeholder, show, toggle }) {
  return (
    <div className="relative">
      <input
        type={show ? "text" : "password"}
        className="input-field pr-10"
        placeholder={placeholder}
        value={value}
        onChange={(e) => setValue(e.target.value)}
      />
      <button
        type="button"
        tabIndex={-1}
        onClick={toggle}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-navy transition-colors"
      >
        <FontAwesomeIcon icon={show ? faEyeSlash : faEye} className="text-sm" />
      </button>
    </div>
  );
}
