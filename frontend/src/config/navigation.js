import {
  faBell,
  faBookOpen,
  faComments,
  faHouse,
  faUser,
} from "@fortawesome/free-solid-svg-icons";

export const MAIN_NAV_LINKS = [
  { to: "/", label: "Accueil", icon: faHouse, end: true },
  { to: "/archives", label: "Archives", icon: faBookOpen, end: false },
  { to: "/chat", label: "Chat", icon: faComments, end: false },
  { to: "/pings", label: "Ping Box", icon: faBell, end: false },
  { to: "/profile", label: "Profil", icon: faUser, end: false },
];

export const MAIN_TAB_PATHS = MAIN_NAV_LINKS.map(({ to }) => to);

export function isMainTabPath(pathname) {
  return MAIN_TAB_PATHS.includes(pathname);
}

/**
 * The bottom bar also covers secondary profile pages, but intentionally not
 * the admin/BDE interfaces or unauthenticated/error screens.
 */
export function isBottomBarPath(pathname) {
  return (
    isMainTabPath(pathname) ||
    pathname === "/suggestions" ||
    /^\/user\/[^/]+$/.test(pathname)
  );
}
