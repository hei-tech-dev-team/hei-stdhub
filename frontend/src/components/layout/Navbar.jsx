import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faUser } from "@fortawesome/free-solid-svg-icons";
import { useAuth } from "../../context/AuthContext";

export default function Navbar({ title }) {
  const { user } = useAuth();

  return (
    <header
      className="flex items-center justify-between px-8 py-4 bg-white
                       border-b border-contact shrink-0"
    >
      {/* Titre de page */}
      {title ? (
        <div
          className="bg-navy-dark text-white font-bold text-xs px-6 py-2
                        rounded-full uppercase tracking-widest"
        >
          {title}
        </div>
      ) : (
        <div />
      )}

      {/* Badge utilisateur */}
      <div
        className="flex items-center gap-2 bg-surface px-4 py-2
                      rounded-full border border-contact"
      >
        <span className="font-semibold text-navy text-sm">
          {user?.ref || user?.name || "Utilisateur"}
        </span>
        <div className="w-7 h-7 rounded-full bg-navy flex items-center justify-center">
          <FontAwesomeIcon icon={faUser} className="text-white text-xs" />
        </div>
      </div>
    </header>
  );
}
