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
  faUserShield,
  faLightbulb,
  faUsersRectangle,
  faBell,
} from "@fortawesome/free-solid-svg-icons";
import { useAuth } from "../../context/AuthContext";
import { HEI_BLUE_LOGO } from "../../assets/logos";
import GlassDomeLogo from "../ui/GlassDomeLogo";
import UserAvatar from "../ui/UserAvatar";

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
  const [open, setOpen] = useState(false);

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
            <GlassDomeLogo size="h-9 w-9" />
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
          <button
            type="button"
            onClick={() => {
              setOpen(false);
              navigate("/profile");
            }}
            className="w-full flex items-center gap-3 px-2 py-2 rounded-xl hover:bg-white/10 transition text-left mb-2"
            title="Modifier le profil"
          >
            <UserAvatar
              avatar={user?.avatar}
              name={user?.pseudo || user?.ref}
              size="lg"
              color="bg-gold"
              className="ring-2 ring-white/10"
            />
            <div className="min-w-0">
              <p className="text-white/40 text-xs uppercase tracking-widest truncate">
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
              <p className="text-white font-semibold text-sm truncate">
                {user?.pseudo || user?.ref || "—"}
              </p>
            </div>
          </button>
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
