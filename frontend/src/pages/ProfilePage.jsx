import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { useAuth } from "../context/AuthContext";
import api from "../api/axios";
import Tilt from 'react-parallax-tilt';
import Sidebar from "../components/layout/Sidebar";
import Navbar from "../components/layout/Navbar";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import WelcomeMessageBubble from "../components/ui/WelcomeMessageBubble";
import { mockupWelcomeMessages } from "../utils/welcomeMessages";
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
  faCommentDots,
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

// mockupWelcomeMessages moved to `src/utils/welcomeMessages.js`

import { useParams } from "react-router-dom"; // Import useParams

export default function ProfilePage() {
  const { user: viewer, setUser } = useAuth(); // Renamed user to viewer for clarity
  const { ref } = useParams(); // Get ref from URL for public profiles

  const [profileUser, setProfileUser] = useState(null); // The user whose profile is being viewed
  const isOwner = useMemo(() => viewer && profileUser && viewer.id === profileUser.id, [viewer, profileUser]);

  const fileRef = useRef(null);
  const [showPicker, setShowPicker] = useState(false);
  const [showCustomizer, setShowCustomizer] = useState(false);
  const [bgImages, setBgImages] = useState([]);
  const [loadingBgImages, setLoadingBgImages] = useState(false);
  const [savingBg, setSavingBg] = useState(false);
  const [savingCustomization, setSavingCustomization] = useState(false);
  const [customCoverBorder, setCustomCoverBorder] = useState(viewer?.cover_border_color || "");
  const [customAvatarBorder, setCustomAvatarBorder] = useState(viewer?.avatar_border_color || "");
  const [customParallax, setCustomParallax] = useState(() => {
    try {
      const v = localStorage.getItem("cover_parallax");
      // Initialize with profileUser's setting if available, otherwise default to true from localStorage
      // This state is for the customizer's temporary value, not the actual display
      return v === null ? true : v === "true";
    } catch (e) {
      return true;
    }
  });
  const [customSelectedBg, setCustomSelectedBg] = useState(null);
  const [customWelcomeMessageTheme, setCustomWelcomeMessageTheme] = useState(viewer?.welcome_message_theme || "simple");
  const [customWelcomeMessageEnabled, setCustomWelcomeMessageEnabled] = useState(viewer?.welcome_message_enabled || false);
  const [customSelectedBubble, setCustomSelectedBubble] = useState(null);
  const [bubbles, setBubbles] = useState([]);

  const [pseudo, setPseudo] = useState(viewer?.pseudo || "");
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
  const [parallaxEnabled, setParallaxEnabled] = useState(() => {
    // This state is for the actual display, not the customizer's temporary state
    try {
      const v = localStorage.getItem("cover_parallax");
      return v === null ? true : v === "true";
    } catch (e) {
      return true;
    }
  });

  const [showWelcomeBubble, setShowWelcomeBubble] = useState(false);
  const [welcomeBubbleMessage, setWelcomeBubbleMessage] = useState("");

  useEffect(() => {
    try {
      localStorage.setItem("cover_parallax", parallaxEnabled ? "true" : "false");
    } catch (e) {}
  }, [parallaxEnabled]);

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
      setProfileUser(data); // Update profileUser, not viewer
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

  const openBackgroundPicker = async () => {
    setShowPicker(true);
    setLoadingBgImages(true);
    try {
      // Appel direct à l'API backend pour les fonds de profil
      const { data } = await api.get("/auth/backgrounds");
      setBgImages(data.images || []); // These are global backgrounds, not user-specific
    } catch (err) {
      console.error("Erreur chargement backgrounds:", err);
      setBgImages([]);
    } finally {
      setLoadingBgImages(false);
    }

    try {
      const { data } = await api.get("/auth/bubbles");
      setBubbles(data.bubbles || []);
    } catch (err) {
      console.error("Erreur chargement bulles:", err);
      setBubbles([]);
    }
  };
  const openCustomizer = async () => {
    // initialize from current user
    setCustomCoverBorder(profileUser?.cover_border_color ?? "");
    setCustomAvatarBorder(profileUser?.avatar_border_color ?? "");
    setCustomParallax(profileUser?.cover_parallax == null ? parallaxEnabled : !!profileUser?.cover_parallax);
    setCustomSelectedBg(profileUser?.profile_background || null);
    setCustomWelcomeMessageTheme(profileUser?.welcome_message_theme || "simple");
    setCustomSelectedBubble(profileUser?.welcome_bubble_url || null);
    setCustomWelcomeMessageEnabled(profileUser?.welcome_message_enabled || false);
    setShowCustomizer(true);

    // load images once
    setLoadingBgImages(true);
    try {
      const { data } = await api.get("/auth/backgrounds");
      setBgImages(data.images || []);
    } catch (err) {
      console.error("Erreur chargement backgrounds", err);
      setBgImages([]);
    } finally {
      setLoadingBgImages(false);
    }

    // Load bubbles
    try {
      const { data } = await api.get("/auth/bubbles");
      setBubbles(data.bubbles || []);
    } catch (err) {
      console.error("Erreur chargement bulles:", err);
      setBubbles([]);
    }
  };

  const saveCustomization = async () => {
    const payload = {
      profile_background: customSelectedBg || null,
      cover_border_color: customCoverBorder || null,
      avatar_border_color: customAvatarBorder || null,
      cover_parallax: !!customParallax,
      welcome_message_theme: customWelcomeMessageTheme,
      welcome_message_enabled: customWelcomeMessageEnabled,
      welcome_bubble_url: customSelectedBubble || null,
    };
    try {
      setSavingCustomization(true);
      const { data } = await api.patch('/auth/profile-customization', payload);
      setProfileUser(data); // Update profileUser, not viewer
      setParallaxEnabled(!!data.cover_parallax);
      setShowCustomizer(false);
    } catch (err) {
      console.error(err);
    } finally {
        setSavingCustomization(false);
      }
    };

    if (!profileUser) return null; // Or a loading spinner

  return (
    <div className="flex h-screen bg-surface overflow-hidden">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Navbar title={isOwner ? "Mon Profil" : `Profil de ${profileUser?.pseudo || 'Chargement...'}`} />
        <main className="flex-1 overflow-y-auto relative">
          <div className="max-w-2xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-6 sm:py-8 relative z-10">
            {/* Animated profile header */}
            <div
              className={`transition-all duration-700 ease-out ${
                visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"
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
                    className="rounded-xl overflow-hidden mb-6 relative"
                    style={{
                      background:
                        "linear-gradient(135deg, rgba(212,175,55,0.16), rgba(255,255,255,0.04))",
                    }}
                  />
                </div>

                    {/* Cover accent */}
                    <div className="h-24 sm:h-28 relative overflow-hidden border-b border-white/10">
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
                              border: `3px solid ${avatarBorderColor}`,
                              boxShadow: `0 0 20px ${avatarBorderColor.replace(/[^,]+\)$/, '0.15)')}`,
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
                            {profileUser?.pseudo}
                          </h1>
                          <p className="text-gray-500 text-sm mt-0.5">
                            {profileUser?.ref}
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
                            {profileUser?.level && (
                              <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-gray-100 text-gray-600">
                                {profileUser.level}
                              </span>
                            )}
                            {profileUser?.promo && (
                              <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-gray-100 text-gray-600">
                                Promo {profileUser.promo}
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
                </Tilt>
              ) : (
                <div
                  className="rounded-xl overflow-hidden mb-6 relative"
                  style={{
                    background: profileBg
                      ? `linear-gradient(rgba(10,26,51,0.35), rgba(0,25,72,0.35)), url(${profileBg})`
                      : "linear-gradient(135deg, rgba(10,26,51,0.95), rgba(0,25,72,0.98))",
                    backgroundSize: profileBg ? "cover" : undefined,
                    backgroundPosition: profileBg ? "right top" : undefined,
                    backgroundRepeat: profileBg ? "no-repeat" : undefined,
                    border: `1px solid ${customCoverBorder || profileUser?.cover_border_color || 'rgba(255,255,255,0.08)'}`,
                    boxShadow: "0 8px 32px rgba(0,0,0,0.2)",
                  }}
                >
                  {/* owner personalize button for cover */}
                  <div className="absolute top-3 right-3 z-20 flex items-center gap-2">
                    <button
                      type="button"
                      onClick={openCustomizer}
                      title="Personnaliser"
                      className="px-3 py-1 rounded-lg bg-white/10 text-white hover:opacity-90"
                    >
                      Personnaliser
                    </button>
                  </div>

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
                            border: `3px solid ${avatarBorderColor}`,
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
                            {profileUser?.pseudo}
                        </h1>
                        <p className="text-gray-500 text-sm mt-0.5">
                            {profileUser?.ref}
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
                            {profileUser?.level && (
                            <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-gray-100 text-gray-600">
                                {profileUser.level}
                            </span>
                          )}
                            {profileUser?.promo && (
                            <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-gray-100 text-gray-600">
                                Promo {profileUser.promo}
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
              )}
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
                      ["Nom", profileUser?.nom, faUser],
                      ["Prénom", profileUser?.prenom, faUser],
                      ["Email", profileUser?.email, faEnvelope],
                      ["Référence", profileUser?.ref, faIdCard],
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
              isOwner && { // Only show pseudo and password fields if it's the owner's profile
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
                          <FontAwesomeIcon icon={faSpinner} className="animate-spin" />
                        ) : (
                          "Mettre à jour"
                        )}
                      </button>
                    </form>
                  </>
                ),
              },
              isOwner && { // Only show password field if it's the owner's profile
                key: "password",
                title: "Sécurité & Mot de passe",
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
                </div>
              </a>
            </div>

            {/* Welcome Message Bubble */}
            {/* DEV: manual trigger to force-show the bubble */}
            {process.env.NODE_ENV !== 'production' && (
              <div className="mb-2">
                <button className="px-2 py-1 text-sm bg-gray-200 rounded" onClick={() => { setWelcomeBubbleMessage('Test bubble'); setShowWelcomeBubble(true); }}>Afficher bulle (dev)</button>
              </div>
            )}

            {showWelcomeBubble && (() => {
              console.debug('render: showing WelcomeMessageBubble', { welcomeBubbleMessage, bubbleUrl: profileUser?.welcome_bubble_url, isOwner, viewerId: viewer?.id });
              return (
                <WelcomeMessageBubble 
                  message={welcomeBubbleMessage} 
                  bubbleUrl={profileUser?.welcome_bubble_url} 
                />
              );
            })()}

          </div>
        </main>
        {/* Cloudinary picker modal */}
        {showPicker && (
          <div className="fixed inset-0 flex items-center justify-center" style={{ zIndex: 99990 }}>
            <div className="absolute inset-0 bg-black/50" style={{ zIndex: 99991 }} onClick={() => setShowPicker(false)} />
            <div className="relative bg-white rounded-xl p-4 max-w-3xl w-full max-h-[80vh] overflow-auto" style={{ zIndex: 99992 }}>
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-bold">Choisissez une image de fond</h3>
                <button className="text-sm text-gray-500" onClick={() => setShowPicker(false)}>Fermer</button>
              </div>
              {loadingBgImages ? (
                <div className="flex items-center justify-center py-8">Chargement...</div>
              ) : (
                <div className="grid grid-cols-3 gap-3">
                  {bgImages.length === 0 && <div className="text-sm text-gray-400">Aucune image trouvée.</div>}
                  {bgImages.map((img) => (
                    <div key={img.id} className="cursor-pointer" onClick={async () => {
                      setSavingBg(true);
                      try {
                        const { data } = await api.patch('/auth/profile-background', { url: img.url });
                        setProfileUser(data); // Update profileUser, not viewer
                        setShowPicker(false);
                      } catch (err) {
                        // ignore for now
                      } finally {
                        setSavingBg(false);
                      }
                    }}>
                      <img src={img.url} alt="bg" className="w-full h-28 object-cover rounded-lg" />
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
        {/* Full customizer modal */}
        {showCustomizer && (
          <div className="fixed inset-0 flex items-center justify-center" style={{ zIndex: 99995 }}>
            <div className="absolute inset-0 bg-black/50" style={{ zIndex: 99996 }} onClick={async () => {
              // auto-save when clicking outside modal
              await saveCustomization();
            }} />
            <div className="relative bg-white rounded-xl p-4 max-w-3xl w-full max-h-[80vh] overflow-auto" style={{ zIndex: 99997 }}>
                <div className="flex items-center justify-between mb-3">
                <h3 className="font-bold">Personnalisation du profil</h3>
                <div className="flex items-center gap-2">
                  <button className="text-sm text-gray-500" onClick={async () => { await saveCustomization(); }}>Fermer</button>
                  <button className="text-sm text-red-500" onClick={async () => {
                    // reset to defaults and save
                    setCustomSelectedBg(null);
                    setCustomCoverBorder("");
                    setCustomAvatarBorder("");
                    setCustomParallax(false);
                    setCustomWelcomeMessageTheme("simple");
                    setCustomWelcomeMessageEnabled(false);
                    setCustomSelectedBubble(null);
                    try {
                      setSavingCustomization(true);
                      const { data } = await api.patch('/auth/profile-customization', {
                        profile_background: null,
                        cover_border_color: null,
                        avatar_border_color: null,
                        cover_parallax: false,
                        welcome_message_theme: "simple",
                        welcome_bubble_url: null,
                        welcome_message_enabled: false,
                      });
                      setProfileUser(data);
                      setParallaxEnabled(false);
                      setShowCustomizer(false);
                    } catch (err) {
                      console.error(err);
                    } finally {
                      setSavingCustomization(false);
                    }
                  }}>Réinitialiser</button>
                </div>
              </div>
              <div className="grid grid-cols-1 gap-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-semibold">Effet parallaxe</h4>
                    <p className="text-xs text-gray-400">Activer/désactiver l'effet parallaxe sur le bandeau.</p>
                  </div>
                  <label className="inline-flex items-center gap-2">
                    <input type="checkbox" checked={customParallax} onChange={(e) => setCustomParallax(e.target.checked)} />
                    <span className="text-sm">Parallax</span>
                  </label>
                </div>

                {/* Welcome Message Customization */}
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-semibold">Message de bienvenue</h4>
                    <p className="text-xs text-gray-400">Afficher un message de bienvenue aux visiteurs.</p>
                  </div>
                  <label className="inline-flex items-center gap-2">
                    <input type="checkbox" checked={customWelcomeMessageEnabled} onChange={(e) => setCustomWelcomeMessageEnabled(e.target.checked)} />
                    <span className="text-sm">Activer</span>
                  </label>
                </div>
                {customWelcomeMessageEnabled && (
                  <div>
                    <h4 className="font-semibold mb-2">Thème du message</h4>
                    <select
                      value={customWelcomeMessageTheme}
                      onChange={(e) => setCustomWelcomeMessageTheme(e.target.value)}
                      className="input-field"
                    >
                      {Object.keys(mockupWelcomeMessages).map((theme) => (
                        <option key={theme} value={theme}>
                          {theme.charAt(0).toUpperCase() + theme.slice(1)} (Ex: {mockupWelcomeMessages[theme][0]})
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Welcome Bubble Image Customization */}
                {customWelcomeMessageEnabled && (
                  <div>
                    <h4 className="font-semibold mb-2">Image de bulle</h4>
                    {bubbles.length === 0 ? (
                      <div className="text-sm text-gray-400">Aucune image de bulle trouvée.</div>
                    ) : (
                      <div className="grid grid-cols-3 gap-3">
                        {bubbles.map((bubble) => (
                          <div key={bubble.id} className={`cursor-pointer rounded-lg overflow-hidden border ${customSelectedBubble === bubble.url ? 'ring-2 ring-gold' : ''}`} onClick={() => setCustomSelectedBubble(bubble.url)} title={bubble.label}>
                            <img src={bubble.url} alt={bubble.label} className="w-full h-20 object-contain rounded-lg" />
                          </div>
                        ))}
                        <div className="col-span-3 mt-2 flex gap-2">
                          <button type="button" className="px-3 py-1 rounded bg-gray-100" onClick={() => setCustomSelectedBubble(null)}>Aucune</button>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                <hr className="my-2 border-gray-200" />

                <div>
                  <h4 className="font-semibold mb-2">Image de fond</h4>
                  {loadingBgImages ? (
                    <div className="py-6 text-center">Chargement...</div>
                  ) : (
                    <div className="grid grid-cols-3 gap-3">
                      {bgImages.length === 0 && <div className="text-sm text-gray-400">Aucune image trouvée.</div>}
                      {bgImages.map((img) => (
                        <div key={img.id} className={`cursor-pointer rounded-lg overflow-hidden border ${customSelectedBg === img.url ? 'ring-2 ring-gold' : ''}`} onClick={() => setCustomSelectedBg(img.url)} title={img.label}>
                          <img src={img.url} alt="bg" className="w-full h-28 object-cover" />
                        </div>
                      ))}
                      <div className="col-span-3 mt-2 flex gap-2">
                        <button type="button" className="px-3 py-1 rounded bg-gray-100" onClick={() => setCustomSelectedBg(null)}>Aucune</button>
                      </div>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <h4 className="font-semibold mb-1">Bordure du bandeau</h4>
                    <input type="color" value={customCoverBorder || "#ffffff"} onChange={(e) => setCustomCoverBorder(e.target.value)} className="w-full h-10 p-0 border-0" />
                  </div>
                  <div>
                    <h4 className="font-semibold mb-1">Bordure du profil</h4>
                    <input type="color" value={customAvatarBorder || "#d4af37"} onChange={(e) => setCustomAvatarBorder(e.target.value)} className="w-full h-10 p-0 border-0" />
                  </div>
                </div>

                <div className="flex justify-end gap-3 mt-4">
                  <button type="button" className="px-4 py-2 rounded-lg bg-gray-100" onClick={() => setShowCustomizer(false)}>Annuler</button>
                  <button type="button" disabled={savingCustomization} className="px-4 py-2 rounded-lg bg-gradient-to-r from-yellow-500 to-amber-500 text-white" onClick={saveCustomization}>{savingCustomization ? 'Enregistrement...' : 'Enregistrer'}</button>
                </div>
              </div>
            </div>
          </div>
        )}
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
