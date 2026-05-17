import { useState, useEffect, useRef } from "react";
import { NavLink, useNavigate, useLocation } from "react-router-dom";
import api from "../../api/axios";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faHouse,
  faBookOpen,
  faFileAlt,
  faComments,
  faRightFromBracket,
  faBars,
  faTimes,
  faUserShield,
  faLightbulb,
  faUsersRectangle,
  faBell,
} from "@fortawesome/free-solid-svg-icons";
import { useAuth } from "../../context/AuthContext";
import { HEI_BLUE_LOGO } from "../../assets/logos";

const NAV_LINKS = [
  { to: "/", label: "Accueil", icon: faHouse, end: true },
  { to: "/archives", label: "Archives", icon: faBookOpen, end: false },
  { to: "/td", label: "TD / Examen", icon: faFileAlt, end: false },
  { to: "/chat", label: "Chat", icon: faComments, end: false },
  { to: "/pings", label: "Ping Box", icon: faBell, end: false },
];

const ALUMNI_NAV_LINKS = [
  { to: "/", label: "Accueil", icon: faHouse, end: true },
  { to: "/chat", label: "Chat", icon: faComments, end: false },
];

export default function Sidebar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  const [unreadCount, setUnreadCount] = useState(0);
  const prevUnreadRef = useRef(0);

  const playNotificationSound = () => {
    const audio = new Audio("https://assets.mixkit.co/active_storage/sfx/2354/2354-preview.mp3");
    audio.volume = 0.4;
    audio.play().catch(() => {}); // Évite l'erreur si le navigateur bloque l'autoplay
  };

  useEffect(() => {
    if (!user) return;

    // Demander la permission pour les notifications système dès que possible
    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission();
    }

    if (location.pathname === "/pings") {
      setPendingCount(0);
    }

    const updateCounts = async () => {
      try {
        const [pingsRes, unreadRes] = await Promise.all([
          api.get("/pings"),
          api.get("/messages/unread")
        ]);

        const pings = Array.isArray(pingsRes.data) ? pingsRes.data : [];
        setPendingCount(pings.filter(p => p.receiver_id === user.id && p.status === "pending").length);

        const totalUnread = (unreadRes.data.global || 0) + 
          Object.values(unreadRes.data.contacts || {}).reduce((acc, c) => acc + (c.unread || 0), 0);
        
        // Jouer un son si un nouveau message arrive et qu'on n'est pas déjà dans le chat
        if (totalUnread > prevUnreadRef.current && location.pathname !== "/chat") {
          playNotificationSound();
        }
        
        setUnreadCount(location.pathname === "/chat" ? 0 : totalUnread);
        prevUnreadRef.current = totalUnread;
      } catch (err) {
        console.error("Erreur lors de la mise à jour des badges :", err);
      }
    };

    updateCounts();
    const interval = setInterval(updateCounts, 10000); // Vérification toutes les 10 secondes
    return () => clearInterval(interval);
  }, [user, location.pathname]);

  const handleLogout = () => {
    logout();
    navigate("/login");
  };
  const handleNavClick = () => setOpen(false);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="lg:hidden fixed top-3 left-3 z-50 touch-target rounded-xl
                   bg-navy text-white shadow-lg"
      >
        <FontAwesomeIcon icon={faBars} className="text-base" />
      </button>

      {open && (
        <div
          className="lg:hidden fixed inset-0 bg-black/50 z-40"
          onClick={() => setOpen(false)}
        />
      )}

      <aside
        className={`
        fixed lg:static inset-y-0 left-0 z-50
        w-60 min-h-screen bg-navy flex flex-col py-6 px-4 shrink-0
        transform transition-transform duration-300
        ${open ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}
      `}
      >
        <div className="flex items-center justify-between px-2 mb-10">
          <div className="flex items-center gap-3">
            <img
              src={HEI_BLUE_LOGO}
              alt="HEI"
              className="h-8 w-8 object-contain rounded-full"
            />
            <span className="text-white font-bold text-base">HEI STDhub</span>
          </div>
          <button
            onClick={() => setOpen(false)}
            className="lg:hidden touch-target text-white/50 hover:text-white transition"
          >
            <FontAwesomeIcon icon={faTimes} className="text-base" />
          </button>
        </div>

        <nav className="flex flex-col gap-1 flex-1">
          {/* Alumni: accès limité */}
          {(user?.role === "alumni" ? ALUMNI_NAV_LINKS : NAV_LINKS).map(({ to, label, icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              onClick={handleNavClick}
              className={({ isActive }) =>
                isActive ? "sidebar-link-active" : "sidebar-link"
              }
            >
              <FontAwesomeIcon icon={icon} className="w-4 h-4 shrink-0" />
              <span className="truncate">{label}</span>
              {to === "/chat" && unreadCount > 0 && (
                <span className="ml-auto min-w-[20px] h-5 rounded-full bg-gold text-navy text-[10px] font-bold flex items-center justify-center px-1.5 shadow-lg animate-pulse">
                  {unreadCount > 99 ? "99+" : unreadCount}
                </span>
              )}
              {to === "/pings" && pendingCount > 0 && (
                <span className="ml-auto min-w-[20px] h-5 rounded-full bg-gold text-navy text-[10px] font-bold flex items-center justify-center px-1.5">
                  {pendingCount > 99 ? "99+" : pendingCount}
                </span>
              )}
            </NavLink>
          ))}

          {/* Suggestions — visible par étudiants, profs et alumni */}
          {["student", "teacher", "alumni"].includes(user?.role) && (
            <NavLink
              to="/suggestions"
              end={false}
              onClick={handleNavClick}
              className={({ isActive }) =>
                isActive ? "sidebar-link-active" : "sidebar-link"
              }
            >
              <FontAwesomeIcon
                icon={faLightbulb}
                className="w-4 h-4 shrink-0"
              />
              <span className="truncate">Suggestions BDE</span>
            </NavLink>
          )}

          {/* Interface BDE — visible par les membres BDE uniquement */}
          {user?.role === "bde" && (
            <NavLink
              to="/bde"
              end={false}
              onClick={handleNavClick}
              className={({ isActive }) =>
                isActive ? "sidebar-link-active" : "sidebar-link"
              }
            >
              <FontAwesomeIcon
                icon={faUsersRectangle}
                className="w-4 h-4 shrink-0"
              />
              <span className="truncate"> BAL BDE</span>
            </NavLink>
          )}

          {/* Admin */}
          {user?.role === "admin" && (
            <NavLink
              to="/admin"
              end={false}
              onClick={handleNavClick}
              className={({ isActive }) =>
                isActive ? "sidebar-link-active" : "sidebar-link"
              }
            >
              <FontAwesomeIcon
                icon={faUserShield}
                className="w-4 h-4 shrink-0"
              />
              <span className="truncate">Administration</span>
            </NavLink>
          )}
        </nav>

        <div className="border-t border-white/10 pt-4 mt-4">
          <p className="text-white/40 text-xs px-2 mb-1 uppercase tracking-widest truncate">
            {user?.role === "teacher"
              ? "Professeur"
              : user?.role === "admin"
                ? "Admin"
                : user?.role === "bde"
                  ? "BDE"
                  : user?.role === "alumni"
                    ? `Alumni${user?.promo ? ` · Promo ${user.promo}` : ""}`
                    : "Étudiant"}
          </p>
          <p className="text-white font-semibold text-sm px-2 mb-3 truncate">
            {user?.pseudo || user?.ref || "—"}
          </p>
          <button
            onClick={handleLogout}
            className="sidebar-link w-full text-red-300 hover:text-red-200 hover:bg-red-500/10"
          >
            <FontAwesomeIcon icon={faRightFromBracket} className="w-4 h-4" />
            <span>Déconnexion</span>
          </button>
        </div>
      </aside>
    </>
  );
}
