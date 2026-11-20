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
  faDesktop,
  faMobileScreen,
  faTrash,
  faRightFromBracket,
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

const sessionDeviceLabel = (userAgent) => {
  if (!userAgent) return "Appareil inconnu";
  const browser = /edg\//i.test(userAgent)
    ? "Edge"
    : /firefox/i.test(userAgent)
      ? "Firefox"
      : /chrome|crios/i.test(userAgent)
        ? "Chrome"
        : /safari/i.test(userAgent)
          ? "Safari"
          : "Navigateur";
  const system = /iphone|ipad|ipod/i.test(userAgent)
    ? "iOS"
    : /android/i.test(userAgent)
      ? "Android"
      : /windows/i.test(userAgent)
        ? "Windows"
        : /mac os|macintosh/i.test(userAgent)
          ? "macOS"
          : /linux/i.test(userAgent)
            ? "Linux"
            : "";
  return system ? `${browser} · ${system}` : browser;
};

const formatSessionDate = (value) =>
  value
    ? new Date(value).toLocaleString("fr-FR", {
        dateStyle: "short",
        timeStyle: "short",
      })
    : "—";

export default function ProfilePage() {
  const {
    user,
    setUser,
    pushSubscribed,
    setPushSubscribed,
    changePassword,
    logoutAll,
  } = useAuth();
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
  const [sessions, setSessions] = useState([]);
  const [sessionsLoading, setSessionsLoading] = useState(true);
  const [sessionError, setSessionError] = useState("");
  const [revokingSession, setRevokingSession] = useState(null);

  useEffect(() => {
    let active = true;
    api
      .get("/auth/sessions")
      .then(({ data }) => {
        if (active) setSessions(Array.isArray(data) ? data : []);
      })
      .catch(() => {
        if (active) setSessionError("Impossible de charger les sessions.");
      })
      .finally(() => {
        if (active) setSessionsLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const reloadSessions = async () => {
    const { data } = await api.get("/auth/sessions");
    setSessions(Array.isArray(data) ? data : []);
  };

  const handleRevokeSession = async (session) => {
    setSessionError("");
    setRevokingSession(session.id);
    try {
      await api.delete(`/auth/sessions/${session.id}`);
      if (session.current) {
        window.location.href = "/login";
        return;
      }
      await reloadSessions();
    } catch (err) {
      setSessionError(
        err.response?.data?.error || "Impossible de révoquer cette session.",
      );
    } finally {
      setRevokingSession(null);
    }
  };

  const handleLogoutAll = async () => {
    if (!window.confirm("Déconnecter tous les appareils ?")) return;
    setSessionError("");
    setRevokingSession("all");
    try {
      await logoutAll();
      window.location.href = "/login";
    } catch (err) {
      setSessionError(
        err.response?.data?.error || "Impossible de déconnecter les appareils.",
      );
      setRevokingSession(null);
    }
  };

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
      await changePassword(currentPwd, newPwd);
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
    <div className="flex h-app bg-surface overflow-hidden">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden safe-x safe-bottom">
        <Navbar title="Mon Profil" />

        <main className="flex-1 overflow-y-auto custom-scrollbar pb-16 lg:pb-0">
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

            <div
              className={`card p-5 transition-all duration-500 ${visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}`}
              style={{ transitionDelay: "300ms" }}
            >
              <div className="flex items-start justify-between gap-3 mb-4">
                <div>
                  <h2 className="field-label mb-1">Sessions actives</h2>
                  <p className="text-gray-400 text-xs">
                    Appareils connectés à votre compte.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleLogoutAll}
                  disabled={revokingSession === "all"}
                  className="shrink-0 inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-red-200 text-red-600 text-xs font-medium hover:bg-red-50 transition-colors disabled:opacity-50"
                >
                  {revokingSession === "all" ? (
                    <FontAwesomeIcon icon={faSpinner} className="animate-spin" />
                  ) : (
                    <FontAwesomeIcon icon={faRightFromBracket} />
                  )}
                  Tous les appareils
                </button>
              </div>

              {sessionError && (
                <div className="flex items-center gap-2 text-xs px-3 py-2 rounded-lg mb-3 bg-[#FEF3F2] border border-[#FECACA] text-[#B42318]">
                  <FontAwesomeIcon icon={faTimes} className="text-xs shrink-0" />
                  {sessionError}
                </div>
              )}

              {sessionsLoading ? (
                <div className="flex justify-center py-4 text-navy/40">
                  <FontAwesomeIcon icon={faSpinner} className="animate-spin" />
                </div>
              ) : sessions.length === 0 ? (
                <p className="text-gray-400 text-xs py-2">Aucune session active.</p>
              ) : (
                <div className="space-y-2">
                  {sessions.map((session) => {
                    const mobile = /iphone|ipad|android|mobile/i.test(
                      session.user_agent || "",
                    );
                    return (
                      <div
                        key={session.id}
                        className="flex items-center gap-3 p-3 rounded-xl bg-surface/60 border border-gray-100"
                      >
                        <div className="w-9 h-9 rounded-lg bg-white flex items-center justify-center shrink-0 text-navy/60">
                          <FontAwesomeIcon
                            icon={mobile ? faMobileScreen : faDesktop}
                          />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="text-sm font-medium text-navy">
                              {sessionDeviceLabel(session.user_agent)}
                            </p>
                            {session.current && (
                              <span className="text-[10px] px-2 py-0.5 rounded-full bg-green-50 text-green-700 border border-green-200">
                                Cet appareil
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-gray-400 mt-0.5 truncate">
                            {session.ip || "IP inconnue"} · Dernière activité{" "}
                            {formatSessionDate(session.last_used_at)}
                          </p>
                          <p className="text-[11px] text-gray-400">
                            Connecté le {formatSessionDate(session.created_at)}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRevokeSession(session)}
                          disabled={revokingSession === session.id}
                          title="Révoquer cette session"
                          className="w-8 h-8 shrink-0 rounded-lg flex items-center justify-center text-red-500 hover:bg-red-50 transition-colors disabled:opacity-40"
                        >
                          {revokingSession === session.id ? (
                            <FontAwesomeIcon
                              icon={faSpinner}
                              className="animate-spin text-sm"
                            />
                          ) : (
                            <FontAwesomeIcon icon={faTrash} className="text-sm" />
                          )}
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
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
