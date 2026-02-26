import { useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faHouse,
  faBookOpen,
  faFileAlt,
  faComments,
  faRightFromBracket,
  faBars,
  faTimes,
} from "@fortawesome/free-solid-svg-icons";
import { useAuth } from "../../context/AuthContext";
import { HEI_WHITE_LOGO } from "../../assets/logos";

const NAV_LINKS = [
  { to: "/", label: "Accueil", icon: faHouse, end: true },
  { to: "/archives", label: "Archives de cours", icon: faBookOpen, end: false },
  { to: "/td", label: "TD/Examen", icon: faFileAlt, end: false },
  { to: "/chat", label: "Chat", icon: faComments, end: false },
];

export default function Sidebar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const handleNavClick = () => setOpen(false);

  return (
    <>
      {/* ── Bouton hamburger mobile ── */}
      <button
        onClick={() => setOpen(true)}
        className="lg:hidden fixed top-4 left-4 z-50 w-10 h-10 rounded-xl
                   bg-navy text-white flex items-center justify-center
                   shadow-lg"
      >
        <FontAwesomeIcon icon={faBars} />
      </button>

      {/* ── Overlay mobile ── */}
      {open && (
        <div
          className="lg:hidden fixed inset-0 bg-black/50 z-40"
          onClick={() => setOpen(false)}
        />
      )}

      {/* ── Sidebar ── */}
      <aside
        className={`
          fixed lg:static inset-y-0 left-0 z-50
          w-60 min-h-screen bg-navy flex flex-col py-6 px-4 shrink-0
          transform transition-transform duration-300
          ${open ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}
        `}
      >
        {/* Logo + fermer mobile */}
        <div className="flex items-center justify-between px-2 mb-10">
          <div className="flex items-center gap-3">
            <img
              src={HEI_WHITE_LOGO}
              alt="HEI Logo"
              className="h-8 w-20 object-contain rounded-full"
            />
            <span className="text-white font-bold text-base">HEI STDhub</span>
          </div>
          <button
            onClick={() => setOpen(false)}
            className="lg:hidden text-white/50 hover:text-white transition"
          >
            <FontAwesomeIcon icon={faTimes} />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex flex-col gap-1 flex-1">
          {NAV_LINKS.map(({ to, label, icon, end }) => (
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
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>

        {/* Footer user */}
        <div className="border-t border-white/10 pt-4 mt-4">
          <p className="text-white/40 text-xs px-2 mb-1 uppercase tracking-widest">
            {user?.role === "teacher" ? "Professeur" : "Étudiant"}
          </p>
          <p className="text-white font-semibold text-sm px-2 mb-3 truncate">
            {user?.ref || user?.name || "—"}
          </p>
          <button
            onClick={handleLogout}
            className="sidebar-link w-full text-red-300 hover:text-red-200
                       hover:bg-red-500/10"
          >
            <FontAwesomeIcon icon={faRightFromBracket} className="w-4 h-4" />
            <span>Déconnexion</span>
          </button>
        </div>
      </aside>
    </>
  );
}
