import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import api from "../api/axios";
import { useAuth } from "../context/AuthContext";
import Sidebar from "../components/layout/Sidebar";
import Navbar from "../components/layout/Navbar";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faUser,
  faUserGraduate,
  faChalkboardTeacher,
  faUserShield,
  faUsers,
  faCommentDots,
  faSpinner,
  faArrowLeft,
  faBell,
  faCheckCircle,
} from "@fortawesome/free-solid-svg-icons";

const ROLE_CFG = {
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
  bde: {
    label: "BDE",
    icon: faUsers,
    cls: "bg-amber-50 text-amber-700",
  },
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
    api.get(`/auth/user/${ref.toUpperCase()}`)
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
            <FontAwesomeIcon icon={faSpinner} className="text-navy/50 text-2xl animate-spin" />
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
            <Link to="/chat" className="text-navy text-sm font-medium hover:underline">
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
        <main className="flex-1 overflow-y-auto custom-scrollbar">
          <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-4">
            {/* Identity */}
            <div
              className={`card p-5 transition-all duration-500 ${
                visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
              }`}
            >
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-full bg-surface flex items-center justify-center overflow-hidden shrink-0">
                  {avatarUrl ? (
                    <img src={avatarUrl} alt="avatar" className="w-full h-full object-cover" />
                  ) : (
                    <FontAwesomeIcon icon={faUser} className="text-navy/40" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h1 className="text-navy font-bold text-lg truncate">{profile.pseudo}</h1>
                    <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${roleCfg.cls}`}>
                      <FontAwesomeIcon icon={roleCfg.icon} className="mr-1" />
                      {roleCfg.label}
                    </span>
                  </div>
                  <p className="text-gray-400 text-xs mt-0.5">{profile.ref}</p>
                </div>
              </div>
            </div>

            {/* Info */}
            <div
              className={`card p-5 transition-all duration-500 ${
                visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
              }`}
              style={{ transitionDelay: "100ms" }}
            >
              <h2 className="field-label">Informations</h2>
              <div className="grid grid-cols-2 gap-x-4 gap-y-3">
                {[
                  ["Nom", profile.nom],
                  ["Prénom", profile.prenom],
                  ["Référence", profile.ref],
                  ["Rôle", roleCfg.label],
                ].map(([label, val]) => (
                  <div key={label}>
                    <p className="text-[11px] text-navy/50 uppercase tracking-[0.1em] font-medium mb-1">{label}</p>
                    <p className="font-medium text-navy text-sm truncate">{val || "—"}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Actions */}
            <div
              className={`card p-5 transition-all duration-500 ${
                visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
              }`}
              style={{ transitionDelay: "150ms" }}
            >
              <h2 className="field-label">Actions</h2>
              <div className="flex flex-col gap-3">
                <Link
                  to={`/chat?contact=${profile.id}`}
                  className="flex items-center gap-3 px-4 py-3 rounded-xl bg-surface hover:bg-navy/5 transition-colors group"
                >
                  <FontAwesomeIcon icon={faCommentDots} className="text-navy/50 text-sm shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-navy font-medium text-sm">Envoyer un message</p>
                    <p className="text-gray-400 text-xs mt-0.5 truncate">Discuter avec {profile.pseudo}</p>
                  </div>
                  <FontAwesomeIcon icon={faArrowLeft} className="text-gray-300 text-xs rotate-180 shrink-0" />
                </Link>

                <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-surface">
                  <FontAwesomeIcon icon={faBell} className="text-navy/50 text-sm shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-navy font-medium text-sm">Envoyer un ping</p>
                    {pingState === "idle" && (
                      <p className="text-gray-400 text-xs mt-0.5 truncate">Attirer l'attention de {profile.pseudo}</p>
                    )}
                    {pingState === "sending" && (
                      <p className="text-navy/70 text-xs mt-0.5">
                        <FontAwesomeIcon icon={faSpinner} className="animate-spin mr-1" />
                        Envoi en cours...
                      </p>
                    )}
                    {pingState === "sent" && (
                      <p className="text-green-600 text-xs mt-0.5">
                        <FontAwesomeIcon icon={faCheckCircle} className="mr-1" />
                        {pingMsg}
                      </p>
                    )}
                    {(pingState === "exists" || pingState === "self") && (
                      <p className="text-[#B42318] text-xs mt-0.5">{pingMsg}</p>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={handlePing}
                    disabled={pingState === "sending"}
                    className={`shrink-0 px-4 py-2 rounded-xl text-xs font-medium transition-colors disabled:opacity-50 ${
                      pingState === "sent"
                        ? "bg-green-50 text-green-700 border border-green-200"
                        : "bg-navy text-white hover:bg-navy-dark"
                    }`}
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
        </main>
      </div>
    </div>
  );
}
