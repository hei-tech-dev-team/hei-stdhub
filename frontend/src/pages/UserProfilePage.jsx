import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { useAuth } from "../context/AuthContext";
import api from "../api/axios";
import Tilt from 'react-parallax-tilt';
import Sidebar from "../components/layout/Sidebar";
import Navbar from "../components/layout/Navbar";
import WaveAnimation from "../components/ui/WaveAnimation"; // Import WaveAnimation
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import WelcomeMessageBubble from "../components/ui/WelcomeMessageBubble";
import { mockupWelcomeMessages } from "../utils/welcomeMessage";
import {
  faCamera,
  faUser,
  faLock,
  faSave,
  faUserGraduate,
  faChalkboardTeacher,
  faUserShield,
  faBell,
  faUsers,
  faGraduationCap,
  faEnvelope,
  faIdCard,
  faPen,
  faTimes,
  faSpinner,
  faCheck,
  faEye,
  faCommentDots,
  faCheckCircle,
} from "@fortawesome/free-solid-svg-icons";

const ROLE_LABEL = {
  student: { label: "Étudiant", icon: faUserGraduate, cls: "bg-cyan-500/20 text-cyan-300" },
  teacher: { label: "Professeur", icon: faChalkboardTeacher, cls: "bg-purple-500/20 text-purple-300" },
  admin: { label: "Admin", icon: faUserShield, cls: "bg-red-500/20 text-red-300" },
  bde: { label: "BDE", icon: faUsers, cls: "bg-yellow-500/20 text-yellow-300" },
  alumni: { label: "Alumni", icon: faGraduationCap, cls: "bg-amber-500/20 text-amber-300" },
};

// mockupWelcomeMessages moved to `src/utils/welcomeMessage.js`

import { useParams, Link } from "react-router-dom"; // Import useParams

export default function UserProfilePage() {
  const { ref } = useParams();
  const { user: viewer, setUser } = useAuth(); // Renamed user to viewer for clarity

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
  const [error, setError] = useState("");
  const [pingState, setPingState] = useState("idle"); // idle | sending | sent | error | self | exists
  const [pingMsg, setPingMsg] = useState("");
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

  // Welcome message UI state (keep hooks unconditionally at top to preserve hook order)
  const [showWelcomeBubble, setShowWelcomeBubble] = useState(false);
  const [welcomeBubbleMessage, setWelcomeBubbleMessage] = useState("");
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

  useEffect(() => {
    try {
      localStorage.setItem("cover_parallax", parallaxEnabled ? "true" : "false");
    } catch (e) {}
  }, [parallaxEnabled]);

  useEffect(() => {
    requestAnimationFrame(() => setVisible(true));
  }, []);

  // Fetch profile user data
  useEffect(() => {
    const fetchProfileUser = async () => {
      try {
        let data;
        if (ref && ref.toUpperCase() !== viewer?.ref.toUpperCase()) {
          // Viewing another user's profile
          const res = await api.get(`/auth/user/${ref}`);
          data = res.data;
          console.debug('fetchProfileUser: fetched other user', { ref, data });
        } else {
          // Viewing own profile or no ref provided, default to own profile
          const res = await api.get("/auth/me");
          data = res.data;
          console.debug('fetchProfileUser: fetched my profile', { data });
        }
        setProfileUser(data);
        setCustomCoverBorder(data.cover_border_color || "");
        setCustomAvatarBorder(data.avatar_border_color || "");
        setCustomParallax(data.cover_parallax == null ? parallaxEnabled : !!data.cover_parallax);
        setCustomSelectedBg(data.profile_background || null);
        setCustomWelcomeMessageTheme(data.welcome_message_theme || "simple");
        setCustomWelcomeMessageEnabled(data.welcome_message_enabled || false);
        setCustomSelectedBubble(data.welcome_bubble_url || null);
      } catch (err) {
        console.error("Error fetching profile user:", err);
        // Handle error, e.g., redirect to 404 or show error message
      }
    };
    fetchProfileUser();
  }, [ref, viewer, parallaxEnabled]);

  const roleCfg = ROLE_LABEL[profileUser?.role] || ROLE_LABEL.student;
  const avatarUrl = profileUser?.avatar || null;
  const displayedAvatar = avatarPreview || avatarUrl;
  const profileBg = profileUser?.profile_background || null;

  const handlePing = async () => {
    if (isOwner || !profileUser) return; // Prevent pinging self or if profileUser is not loaded
    setPingState("sending");
    setPingMsg("");
    try {
      await api.post("/pings", { receiver_id: profileUser.id });
      setPingState("sent");
      setPingMsg("Ping envoyé !");
    } catch (err) {
      const errorMsg = err.response?.data?.error || "Erreur lors de l'envoi du ping.";
      setPingState("exists");
      setPingMsg(errorMsg);
    }
  };


  // prefer persisted profileUser values; fall back to local custom state or defaults
  const coverBorderColor = profileUser?.cover_border_color ?? customCoverBorder ?? 'rgba(255,255,255,0.08)';
  const avatarBorderColor = profileUser?.avatar_border_color ?? customAvatarBorder ?? 'rgba(212,175,55,0.6)';

  useEffect(() => {
    if (!avatarPreview) return;
    return () => URL.revokeObjectURL(avatarPreview);
  }, [avatarPreview]);

  // Welcome message logic for visitors — show every time a (non-owner) visitor views the profile
  useEffect(() => {
    // DEBUG: log reason why welcome bubble may or may not show
    console.debug("welcome-effect", {
      profileUserExists: !!profileUser,
      welcome_enabled: profileUser?.welcome_message_enabled,
      isOwner,
      viewerId: viewer?.id,
      profileUserId: profileUser?.id,
    });

    // Only show welcome message if it's enabled for the profileUser AND
    // if the current viewer is NOT the owner of the profile, OR if the viewer is the owner
    // but the welcome message is specifically enabled for self-view (though typically it's for visitors).
    // The original logic `(isOwner || profileUser.id !== viewer?.id)` seems to imply showing it to owner too,
    // which might be a bug or intended for testing. Let's stick to the original logic for now.
    if (profileUser && profileUser.welcome_message_enabled && (isOwner || profileUser.id !== viewer?.id)) {
      const messages = mockupWelcomeMessages[profileUser.welcome_message_theme] || mockupWelcomeMessages.simple;
      const randomMessage = messages[Math.floor(Math.random() * messages.length)];

      console.debug("welcome-effect: will show bubble", { randomMessage });

      setWelcomeBubbleMessage(randomMessage);
      setShowWelcomeBubble(true);

      const timer = setTimeout(() => {
        setShowWelcomeBubble(false);
        setWelcomeBubbleMessage("");
      }, 2500); // Augmenté à 2.5s pour laisser le temps de lire

      return () => clearTimeout(timer);
    }
  }, [profileUser?.ref, viewer?.id, profileUser?.welcome_message_enabled, profileUser?.welcome_bubble_url, isOwner, profileUser?.welcome_message_theme, profileUser]); // Added profileUser to dependencies

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
      setProfileUser(data); // Update profileUser, not viewer
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
      const { data } = await api.get("/auth/backgrounds");
      setBgImages(data.backgrounds || []);
    } catch (err) {
      console.error("Erreur chargement fonds:", err);
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

    setLoadingBgImages(true);
    try {
      const { data } = await api.get("/auth/backgrounds");
      setBgImages(data.backgrounds || []);
    } catch (err) {
      console.error("Erreur chargement fonds:", err);
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
              {parallaxEnabled ? (
                <Tilt tiltMaxAngleX={6} tiltMaxAngleY={6} glareEnable={false} scale={1.02} className="rounded-2xl overflow-hidden mb-6">
                  <HeaderContent
                    profileBg={profileBg}
                    avatarUrl={avatarUrl}
                    profile={profileUser}
                    isOwnProfile={isOwner}
                    setShowPicker={setShowPicker}
                    setLoadingBgImages={setLoadingBgImages}
                    setBgImages={setBgImages} // Pass setBgImages
                    coverBorderColor={coverBorderColor}
                    avatarBorderColor={avatarBorderColor}
                  />
                </Tilt>
              ) : (
                <div className="rounded-2xl overflow-hidden mb-6" style={{
                  background: profileBg
                    ? `linear-gradient(rgba(10,26,51,0.35), rgba(0,25,72,0.35)), url(${profileBg})`
                    : "linear-gradient(135deg, rgba(10,26,51,0.95), rgba(0,25,72,0.98))",
                  backgroundSize: profileBg ? "cover" : undefined,
                  backgroundPosition: profileBg ? "right top" : undefined,
                  backgroundRepeat: profileBg ? "no-repeat" : undefined,
                  border: `1px solid ${coverBorderColor}`,
                  boxShadow: "0 8px 32px rgba(0,0,0,0.2)",
                }}>
                  <HeaderContent
                    profileBg={profileBg} // Pass profileBg
                    avatarUrl={avatarUrl} // Pass avatarUrl
                    profile={profileUser} // Use profileUser
                    isOwnProfile={isOwner} // Use isOwner
                    setShowPicker={setShowPicker} // Pass setShowPicker
                    setLoadingBgImages={setLoadingBgImages} // Pass setLoadingBgImages
                    setBgImages={setBgImages} // Pass setBgImages
                    coverBorderColor={coverBorderColor} // Pass coverBorderColor
                    avatarBorderColor={avatarBorderColor} // Pass avatarBorderColor
                  />
                  {/* WaveAnimation only if parallax is disabled and no custom background */}
                  {!parallaxEnabled && !profileBg && <WaveAnimation />}
                </div>
              )}
            </div>

            {/* Background picker modal */}
            {showPicker && (
              <div className="fixed inset-0 z-50 flex items-center justify-center">
                <div className="absolute inset-0 bg-black/50" onClick={() => setShowPicker(false)} />
                <div className="relative bg-white rounded-xl p-4 max-w-3xl w-full max-h-[80vh] overflow-auto">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-bold">Choisissez une image de profil</h3>
                    <button className="text-sm text-gray-500" onClick={() => setShowPicker(false)}>Fermer</button>
                  </div>
                  {loadingBgImages ? (
                    <div className="flex items-center justify-center py-8">Chargement...</div>
                  ) : (
                    <div className="grid grid-cols-3 gap-3">
                      {bgImages.length === 0 && <div className="text-sm text-gray-400">Aucune image trouvée.</div>}
                      {bgImages.map((img) => (
                        <div key={img.id || img.filename || img.url} className="cursor-pointer" onClick={async () => {
                          // save selection
                          setSavingBg(true);
                          try {
                            const { data } = await api.patch('/auth/profile-background', { url: img.url });
                            setProfileUser(data); // Update profileUser
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

            {/* Info card */}
            <div
              className={`transition-all duration-700 ease-out mb-5 ${
                visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"
              }`}
              style={{ transitionDelay: "150ms" }}
            >
              <div
                className="rounded-2xl overflow-hidden p-5 sm:p-6"
                style={{
                  background: "white",
                  border: "1px solid rgba(0,0,0,0.08)",
                }}
              >
                <h2 className="text-gray-800 font-bold text-sm uppercase tracking-wide mb-4 flex items-center gap-2.5">
                  <span
                    className="w-7 h-7 rounded-lg flex items-center justify-center"
                    style={{ background: "rgba(212,175,55,0.15)" }}
                  >
                    <FontAwesomeIcon icon={faIdCard} className="text-gold text-xs" />
                  </span>
                  Informations
                </h2>
                <div className="grid grid-cols-2 gap-4">
                  {[
                    ["Nom", profileUser?.nom, faUser],
                    ["Prénom", profileUser?.prenom, faUser], // Use profileUser
                    ["Référence", profileUser?.ref, faIdCard], // Use profileUser
                    ["Rôle", roleCfg.label, roleCfg.icon], // Use roleCfg
                  ].map(([label, val, icon]) => ( // Map over the array of info
                    <div key={label} className="group">
                      <div className="flex items-center gap-2 mb-1.5">
                        <FontAwesomeIcon icon={icon} className="text-gold text-[10px] opacity-60" />
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
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex flex-col gap-3">
              <div
                className={`transition-all duration-700 ease-out ${
                  visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"
                }`}
                style={{ transitionDelay: "250ms" }}
              >
                <Link
                  to={`/chat`}
                  className="block rounded-2xl overflow-hidden p-5 sm:p-6 transition-all duration-200 hover:shadow-md"
                  style={{
                    background: "white",
                    border: "1px solid rgba(0,0,0,0.08)",
                  }}
                >
                  <div className="flex items-center gap-4">
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                      style={{ background: "rgba(212,175,55,0.15)" }}
                    >
                      <FontAwesomeIcon icon={faCommentDots} className="text-gold text-sm" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-gray-800 text-sm">Envoyer un message</h3>
                      <p className="text-xs text-gray-400 mt-0.5"> {/* Use profileUser */}
                        Discuter avec {profileUser.pseudo}
                      </p>
                    </div>
                  </div>
                </Link>
              </div>

              <div
                className={`transition-all duration-700 ease-out ${
                  visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"
                }`}
                style={{ transitionDelay: "350ms" }}
              >
                <div
                  className="rounded-2xl overflow-hidden p-5 sm:p-6 transition-all duration-200 hover:shadow-md"
                  style={{
                    background: "white",
                    border: "1px solid rgba(0,0,0,0.08)",
                  }}
                >
                  <div className="flex items-center gap-4">
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                      style={{ background: "rgba(212,175,55,0.15)" }}
                    >
                      <FontAwesomeIcon icon={faBell} className="text-gold text-sm" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-gray-800 text-sm">Envoyer un ping</h3>
                      {pingState === "idle" && (
                        <p className="text-xs text-gray-400 mt-0.5">
                          Attirer l'attention de {profileUser.pseudo}
                        </p>
                      )}
                      {pingState === "sending" && (
                        <p className="text-xs text-gold mt-0.5">
                          <FontAwesomeIcon icon={faSpinner} className="animate-spin mr-1" />
                          Envoi en cours...
                        </p>
                      )}
                      {pingState === "sent" && (
                        <p className="text-xs text-green-500 mt-0.5">
                          <FontAwesomeIcon icon={faCheckCircle} className="mr-1" />
                          {pingMsg}
                        </p>
                      )}
                      {(pingState === "exists" || pingState === "self") && (
                        <p className="text-xs text-red-400 mt-0.5">
                          {pingMsg}
                        </p>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={handlePing}
                      disabled={pingState === "sending"}
                      className="shrink-0 px-4 py-2 rounded-xl text-xs font-bold transition-all duration-200 disabled:opacity-50 active:scale-95"
                      style={{
                        background: pingState === "sent"
                          ? "rgba(34,197,94,0.15)"
                          : "linear-gradient(135deg, #D4AF37, #B8860B)",
                        color: pingState === "sent" ? "#22c55e" : "white",
                        boxShadow: pingState === "sent" ? "none" : "0 2px 12px rgba(212,175,55,0.25)",
                      }}
                      onMouseEnter={(e) => {
                        if (pingState !== "sent") {
                          e.currentTarget.style.opacity = "0.9";
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (pingState !== "sent") {
                          e.currentTarget.style.opacity = "1";
                        }
                      }}
                    >
                      {pingState === "sending" ? (
                        <FontAwesomeIcon icon={faSpinner} className="animate-spin" />
                      ) : pingState === "sent" ? (
                        <FontAwesomeIcon icon={faCheckCircle} />
                      ) : (
                        "Ping !"
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </main>
        {showWelcomeBubble && profileUser && ( // Ensure profileUser exists before rendering
          <WelcomeMessageBubble message={welcomeBubbleMessage} bubbleUrl={profileUser.welcome_bubble_url} />
        )}
      </div>
    </div>
  );
}

function HeaderContent({ profileBg, avatarUrl, profile, isOwnProfile, setShowPicker, setLoadingBgImages, setBgImages }) {
  const roleCfg = ROLE_LABEL[profile?.role] || ROLE_LABEL.student; // Define roleCfg here
  return ( // Removed redundant div
    <div>
      <div
        style={{
          background: profileBg
            ? `linear-gradient(rgba(10,26,51,0.35), rgba(0,25,72,0.35)), url(${profileBg})`
            : "linear-gradient(135deg, rgba(10,26,51,0.95), rgba(0,25,72,0.98))",
          backgroundSize: profileBg ? "cover" : undefined,
          backgroundPosition: profileBg ? "right top" : undefined,
          backgroundRepeat: profileBg ? "no-repeat" : undefined,
          border: "1px solid rgba(255,255,255,0.08)",
          boxShadow: "0 8px 32px rgba(0,0,0,0.2)",
        }}
      >
        {/* Cover accent */}
        <div className="h-24 sm:h-28 relative overflow-hidden">
          <div
            className="absolute inset-0"
            style={{
              background: "linear-gradient(135deg, rgba(212,175,55,0.15), rgba(212,175,55,0.05) 50%, transparent 80%)",
            }}
          />
          <div className="absolute inset-0 opacity-30">
            <div
              className="absolute -top-8 -right-8 w-32 h-32 rounded-full"
              style={{ background: "radial-gradient(circle, rgba(212,175,55,0.3), transparent)" }}
            />
            <div
              className="absolute -bottom-4 -left-4 w-24 h-24 rounded-full"
              style={{ background: "radial-gradient(circle, rgba(255,255,255,0.1), transparent)" }}
            />
          </div>
        </div>

        {/* Avatar + info */}
        <div className="px-6 pb-6 -mt-12 relative">
          <div className="flex flex-col sm:flex-row items-center sm:items-end gap-4">
            <div className="relative shrink-0">
              <div className="w-24 h-24 rounded-full relative flex items-center justify-center overflow-hidden" style={{border: "3px solid rgba(212,175,55,0.6)", boxShadow: "0 0 20px rgba(212,175,55,0.15)"}}>
                {/* profile background sits behind avatar */}
                {profileBg && (
                  <img src={profileBg} alt="profile background" className="absolute inset-0 w-full h-full object-cover opacity-90" style={{filter: 'blur(0px)'}} />
                )}
                <div className="relative w-full h-full flex items-center justify-center" style={{background: avatarUrl ? 'transparent' : (!profileBg ? 'linear-gradient(135deg, rgba(10,26,51,0.9), rgba(0,25,72,0.9))' : 'transparent')}}>
                  {avatarUrl ? (
                    <img src={avatarUrl} alt="avatar" className="w-full h-full object-cover" />
                  ) : (
                    <FontAwesomeIcon icon={faUser} className="text-gold text-3xl" />
                  )}
                </div>
              </div>

              {isOwnProfile && (
                <button
                  type="button"
                  onClick={async () => {
                    setShowPicker(true);
                    setLoadingBgImages(true);
                    try {
                      const { data } = await api.get("/auth/backgrounds");
                      setBgImages(data.backgrounds || []);
                    } catch (err) {
                      setBgImages([]);
                    } finally {
                      setLoadingBgImages(false);
                    }
                  }}
                  title="Personnaliser le fond de profil"
                  className="absolute -bottom-1 -right-1 w-10 h-10 rounded-full flex items-center justify-center transition-all duration-200 hover:scale-110 active:scale-95"
                  style={{
                    background: "linear-gradient(135deg, #D4AF37, #B8860B)",
                    boxShadow: "0 2px 12px rgba(212,175,55,0.4)",
                    color: "white",
                  }}
                >
                  <FontAwesomeIcon icon={faCamera} className="text-sm" />
                </button>
              )}
            </div>

            <div className="flex-1 text-center sm:text-left min-w-0">
              <h1 className="text-gold-light font-bold text-xl truncate">
                {profile.pseudo}
              </h1>
              <p className="text-gray-500 text-sm mt-0.5">{profile.ref}</p>
              <div className="flex items-center gap-2 mt-2 justify-center sm:justify-start flex-wrap">
                <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full ${roleCfg.cls}`}>
                  <FontAwesomeIcon icon={roleCfg.icon} className="mr-1.5" />
                  {roleCfg.label}
                </span>
                {profile.level && (
                  <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-gray-100 text-gray-600">
                    {profile.level}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
