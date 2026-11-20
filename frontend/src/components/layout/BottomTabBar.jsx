import { NavLink } from "react-router-dom";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { MAIN_NAV_LINKS } from "../../config/navigation";

/**
 * Mobile-only primary navigation. It deliberately mirrors the sidebar links
 * so both navigation surfaces stay in sync.
 */
export default function BottomTabBar() {
  return (
    <nav
      aria-label="Navigation principale"
      className="fixed inset-x-0 bottom-0 z-30 border-t border-gray-100 bg-white
                 pb-[env(safe-area-inset-bottom,0px)] lg:hidden"
    >
      <div className="flex items-stretch pl-[env(safe-area-inset-left,0px)] pr-[env(safe-area-inset-right,0px)]">
        {MAIN_NAV_LINKS.map(({ to, label, icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              `flex min-h-[4rem] flex-1 flex-col items-center justify-center gap-1 px-1 py-2
               text-[10px] font-semibold transition-colors ${
                 isActive ? "text-navy" : "text-gray-400 hover:text-navy"
               }`
            }
          >
            {({ isActive }) => (
              <>
                <FontAwesomeIcon
                  icon={icon}
                  className={`text-base ${isActive ? "text-gold" : ""}`}
                />
                <span className="truncate">{label}</span>
              </>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
