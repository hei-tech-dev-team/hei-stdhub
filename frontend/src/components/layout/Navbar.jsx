import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import UserAvatar from "../ui/UserAvatar";

export default function Navbar({ title }) {
  const { user } = useAuth();
  const navigate = useNavigate();

  return (
    <header
      className="flex items-center justify-between
                       px-4 sm:px-6 lg:px-8 py-3 sm:py-4
                       bg-white border-b border-contact shrink-0"
    >
      <div className="ml-12 lg:ml-0 flex items-center gap-3">
        {title ? (
          <h1 className="text-[11px] font-semibold text-navy/50 uppercase tracking-[0.1em]">
            {title}
          </h1>
        ) : (
          <div />
        )}
      </div>

      <div
        onClick={() => navigate("/profile")}
        className="group flex items-center gap-2 bg-[#F6F7F8] px-3 sm:px-4 py-1.5 sm:py-2
                      rounded-xl cursor-pointer
                      hover:bg-white hover:ring-1 hover:ring-gold/50 transition"
        title="Modifier le profil"
      >
        <span
          className="font-semibold text-navy text-xs sm:text-sm
                         hidden sm:block max-w-32 truncate"
        >
          {user?.pseudo || user?.ref || "Utilisateur"}
        </span>
        <UserAvatar
          avatar={user?.avatar}
          name={user?.pseudo || user?.ref}
          size="sm"
          color="bg-navy"
        />
      </div>
    </header>
  );
}
