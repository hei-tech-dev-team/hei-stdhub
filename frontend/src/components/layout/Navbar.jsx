import { useNavigate } from "react-router-dom";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faUser, faGraduationCap } from "@fortawesome/free-solid-svg-icons";
import { useAuth } from "../../context/AuthContext";

export default function Navbar({ title }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const avatarUrl = user?.avatar || null;
  const isAlumni = user?.role === "alumni";

  return (
    <header
      className="flex items-center justify-between
                       px-4 sm:px-6 lg:px-8 py-3 sm:py-4
                       bg-white border-b border-contact shrink-0"
    >
      <div className="ml-12 lg:ml-0 flex items-center gap-3">
        {isAlumni && (
          <span className="inline-flex items-center gap-1 bg-amber-100 text-amber-700 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wide">
            <FontAwesomeIcon icon={faGraduationCap} className="text-[10px]" />
            Alumni{user?.promo ? ` ${user.promo}` : ""}
          </span>
        )}
        {title ? (
          <div
            className="bg-navy-dark text-white font-bold text-xs
                          px-4 sm:px-6 py-2 rounded-full uppercase tracking-widest"
          >
            {title}
          </div>
        ) : (
          <div />
        )}
      </div>

      <div
        onClick={() => navigate("/profile")}
        className="flex items-center gap-2 bg-surface px-3 sm:px-4 py-2
                      rounded-full border border-contact cursor-pointer
                      hover:border-navy transition"
      >
        <span
          className="font-semibold text-navy text-xs sm:text-sm
                         hidden sm:block max-w-32 truncate"
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
