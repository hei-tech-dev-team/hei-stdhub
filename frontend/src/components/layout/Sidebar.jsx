import { NavLink, useNavigate } from "react-router-dom";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faHouse,
  faBookOpen,
  faFileAlt,
  faComments,
  faRightFromBracket,
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

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <aside className="w-60 min-h-screen bg-navy flex flex-col py-6 px-4 shrink-0">
      {/* ── Logo ── */}
      <div className="flex items-center gap-3 px-2 mb-10">
        <img
          src={HEI_WHITE_LOGO}
          alt="HEI Logo"
          className="h-8 w-8 object-contain"
        />
        <span className="text-white font-bold text-base leading-tight">
          HEI STDhub
        </span>
      </div>

      {/* ── Navigation ── */}
      <nav className="flex flex-col gap-1 flex-1">
        {NAV_LINKS.map(({ to, label, icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              isActive ? "sidebar-link-active" : "sidebar-link"
            }
          >
            <FontAwesomeIcon icon={icon} className="w-4 h-4 shrink-0" />
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>

      {/* ── Infos utilisateur + Déconnexion ── */}
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
  );
}
