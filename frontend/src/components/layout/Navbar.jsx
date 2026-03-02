import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faUser } from "@fortawesome/free-solid-svg-icons";
import { useAuth } from "../../context/AuthContext";
import { useNavigate } from "react-router-dom";

export default function Navbar({ title }) {
  const { user } = useAuth();
  const navigate = useNavigate();

  return (
    <header
      className="flex items-center justify-between
                       px-4 sm:px-6 lg:px-8 py-3 sm:py-4
                       bg-white border-b border-contact shrink-0
                       ml-0 lg:ml-0"
    >
      {/* Titre — décalé sur mobile pour laisser place au hamburger */}
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

      {/* Badge utilisateur */}
      <div
        onClick={() => navigate("/profile")}
        className="flex items-center gap-2 bg-surface px-3 sm:px-4
             py-2 rounded-full border border-contact cursor-pointer
             hover:border-navy transition"
      >
        <span
          className="font-semibold text-navy text-xs sm:text-sm
                         hidden xs:block max-w-24 sm:max-w-none truncate"
        >
          {user?.ref || user?.name || "Utilisateur"}
        </span>
        <div
          className="w-7 h-7 rounded-full bg-navy flex items-center
                        justify-center shrink-0"
        >
          <FontAwesomeIcon icon={faUser} className="text-white text-xs" />
        </div>
      </div>
    </header>
  );
}
