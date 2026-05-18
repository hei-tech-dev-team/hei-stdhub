import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import api from "../api/axios";
import { useAuth } from "../context/AuthContext";
import Sidebar from "../components/layout/Sidebar";
import Navbar from "../components/layout/Navbar";
import WaveAnimation from "../components/ui/WaveAnimation";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faUser,
  faUserGraduate,
  faChalkboardTeacher,
  faUserShield,
  faUsers,
  faGraduationCap,
  faIdCard,
  faCommentDots,
  faSpinner,
  faArrowLeft,
  faBell,
  faCheckCircle,
} from "@fortawesome/free-solid-svg-icons";

const ROLE_CFG = {
  student: { label: "Étudiant", icon: faUserGraduate, cls: "bg-cyan-500/20 text-cyan-300" },
  teacher: { label: "Professeur", icon: faChalkboardTeacher, cls: "bg-purple-500/20 text-purple-300" },
  admin: { label: "Admin", icon: faUserShield, cls: "bg-red-500/20 text-red-300" },
  bde: { label: "BDE", icon: faUsers, cls: "bg-yellow-500/20 text-yellow-300" },
  alumni: { label: "Alumni", icon: faGraduationCap, cls: "bg-amber-500/20 text-amber-300" },
};

export default function UserProfilePage() {
  const { ref } = useParams();
  const { user } = useAuth();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [pingState, setPingState] = useState("idle"); // idle | sending | sent | error | self | exists
  const [pingMsg, setPingMsg] = useState("");
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    requestAnimationFrame(() => setVisible(true));
  }, []);

  useEffect(() => {
    if (!ref) return;
    setLoading(true);
    setError("");
    api
      .get(`/auth/user/${ref.toUpperCase()}`)
      .then(({ data }) => {
        setProfile(data);
      })
      .catch((err) => {
        setError(err.response?.data?.error || "Utilisateur introuvable.");
      })
      .finally(() => setLoading(false));
  }, [ref]);

  if (loading) {
    return (
      <div className="flex h-screen bg-surface overflow-hidden">
        <Sidebar />
        <div className="flex-1 flex flex-col overflow-hidden">
          <Navbar title="Profil" />
          <main className="flex-1 flex items-center justify-center">
            <FontAwesomeIcon icon={faSpinner} className="text-gold text-3xl animate-spin" />
          </main>
        </div>
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="flex h-screen bg-surface overflow-hidden">
        <Sidebar />
        <div className="flex-1 flex flex-col overflow-hidden">
          <Navbar title="Profil" />
          <main className="flex-1 flex flex-col items-center justify-center gap-4">
            <p className="text-gray-400 text-sm">{error || "Utilisateur introuvable."}</p>
            <Link
              to="/chat"
              className="text-gold text-sm hover:underline font-semibold"
            >
              <FontAwesomeIcon icon={faArrowLeft} className="mr-2" />
              Retour au chat
            </Link>
          </main>
        </div>
      </div>
    );
  }

  const isOwnProfile = user.id === profile.id;

  const handlePing = async () => {
    if (isOwnProfile) {
      setPingState("self");
      setPingMsg("Vous ne pouvez pas vous envoyer un ping à vous-même.");
      return;
    }
    setPingState("sending");
    setPingMsg("");
    try {
      await api.post("/pings", { receiver_id: profile.id });
      setPingState("sent");
      setPingMsg("Ping envoyé !");
    } catch (err) {
      const errorMsg = err.response?.data?.error || "Erreur lors de l'envoi du ping.";
      setPingState("exists");
      setPingMsg(errorMsg);
    }
  };

  const roleCfg = ROLE_CFG[profile.role] || ROLE_CFG.student;
  const avatarUrl = profile.avatar || null;

  return (
    <div className="flex h-screen bg-surface overflow-hidden">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Navbar title={`Profil de ${profile.pseudo}`} />
        <main className="flex-1 overflow-y-auto relative">
          <div className="max-w-2xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-6 sm:py-8 relative z-10">
            {/* Animated profile header */}
            <div
              className={`transition-all duration-700 ease-out ${
                visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"
              }`}
            >
              <div
                className="rounded-2xl overflow-hidden mb-6 relative"
                style={{
                  background: "linear-gradient(135deg, #0A1A33 0%, #001948 50%, #0A1A33 100%)",
                  border: "1px solid rgba(212,175,55,0.15)",
                  boxShadow: "0 8px 32px rgba(0,0,0,0.3), 0 0 40px rgba(212,175,55,0.08), inset 0 1px 0 rgba(255,255,255,0.05)",
                }}
              >
                {/* Cover area with waves at bottom */}
                <div className="h-28 sm:h-36 relative overflow-hidden">
                  <div
                    className="absolute inset-0"
                    style={{
                      background: "linear-gradient(180deg, #0A1A33 0%, #001948 60%, #0A1A33 100%)",
                    }}
                  />
                  {/* Subtle grid pattern */}
                  <div
                    className="absolute inset-0 opacity-[0.03]"
                    style={{
                      backgroundImage: `linear-gradient(rgba(212,175,55,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(212,175,55,0.5) 1px, transparent 1px)`,
                      backgroundSize: "40px 40px",
                    }}
                  />
                  <WaveAnimation />
                </div>

                {/* Avatar + info */}
                <div className="px-6 pb-6 -mt-12 relative">
                  <div className="flex flex-col sm:flex-row items-center sm:items-end gap-4">
                    <div className="relative shrink-0">
                      <div
                        className="w-24 h-24 rounded-full flex items-center justify-center overflow-hidden"
                        style={{
                          border: "3px solid rgba(212,175,55,0.6)",
                          boxShadow: "0 0 20px rgba(212,175,55,0.15)",
                          background: avatarUrl
                            ? "transparent"
                            : "linear-gradient(135deg, rgba(10,26,51,0.9), rgba(0,25,72,0.9))",
                        }}
                      >
                        {avatarUrl ? (
                          <img src={avatarUrl} alt="avatar" className="w-full h-full object-cover" />
                        ) : (
                          <FontAwesomeIcon icon={faUser} className="text-gold text-3xl" />
                        )}
                      </div>
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
                    ["Nom", profile.nom, faUser],
                    ["Prénom", profile.prenom, faUser],
                    ["Référence", profile.ref, faIdCard],
                    ["Rôle", roleCfg.label, roleCfg.icon],
                  ].map(([label, val, icon]) => (
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
                      <p className="text-xs text-gray-400 mt-0.5">
                        Discuter avec {profile.pseudo}
                      </p>
                    </div>
                    <svg className="w-4 h-4 text-gray-300 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
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
                          Attirer l'attention de {profile.pseudo}
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
      </div>
    </div>
  );
}
