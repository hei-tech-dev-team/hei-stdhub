import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faUser } from "@fortawesome/free-solid-svg-icons";

export default function Navbar({ title }) {
  const { user } = useAuth();
  const navigate = useNavigate();

  const avatarUrl = user?.avatar
    ? `${import.meta.env.VITE_API_URL || "http://localhost:3001"}/${user.avatar}`
    : null;

  return (
    <header
      className="flex items-center justify-between
                       px-4 sm:px-6 lg:px-8 py-3 sm:py-4
                       bg-white border-b border-contact shrink-0"
    >
      <div className="ml-12 lg:ml-0">
        {title ? (
          <div
            className="bg-navy-dark text-white font-bold
                          text-xs px-4 sm:px-6 py-2 rounded-full
                          uppercase tracking-widest"
          >
            {title}
          </div>
        ) : (
          <div />
        )}
      </div>

      <div
        onClick={() => navigate("/profile")}
        className="flex items-center gap-2 bg-surface px-3 sm:px-4
                   py-2 rounded-full border border-contact
                   cursor-pointer hover:border-navy transition"
      >
        <span
          className="font-semibold text-navy text-xs sm:text-sm
                         hidden xs:block max-w-24 sm:max-w-none truncate"
        >
          {user?.pseudo || user?.ref || "Utilisateur"}
        </span>
        <div
          className="w-7 h-7 rounded-full bg-navy flex items-center
                        justify-center shrink-0 overflow-hidden"
        >
          {avatarUrl ? (
            <img
              src={avatarUrl}
              alt="avatar"
              className="w-full h-full object-cover"
            />
          ) : (
            <FontAwesomeIcon icon={faUser} className="text-white text-xs" />
          )}
        </div>
      </div>
    </header>
  );
}
