import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faComments,
  faLightbulb,
  faUser,
  faGraduationCap,
  faExternalLinkAlt,
} from "@fortawesome/free-solid-svg-icons";
import { useNavigate } from "react-router-dom";
import Navbar from "../layout/Navbar";
import { useAuth } from "../../context/AuthContext";

const QUICK_LINKS = [
  {
    to: "/chat",
    icon: faComments,
    label: "Chat",
    desc: "Retrouvez vos anciens camarades",
    color: "bg-blue-50 text-blue-600",
  },
  {
    to: "/suggestions",
    icon: faLightbulb,
    label: "Suggestions BDE",
    desc: "Partagez vos idées pour HEI",
    color: "bg-amber-50 text-amber-600",
  },
  {
    to: "/profile",
    icon: faUser,
    label: "Mon Profil",
    desc: "Modifiez vos informations",
    color: "bg-purple-50 text-purple-600",
  },
];

export default function AlumniHome() {
  const { user } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="flex flex-col h-full">
      <Navbar />
      <div className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto">
        {/* Hero */}
        <div className="bg-gradient-to-br from-navy to-navy-dark rounded-2xl p-6 sm:p-8 mb-6 text-white">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-14 h-14 rounded-2xl bg-gold/20 flex items-center justify-center">
              <FontAwesomeIcon icon={faGraduationCap} className="text-gold text-2xl" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold">
                Bonjour, {user?.prenom}
              </h1>
              <p className="text-white/60 text-sm mt-0.5">
                {user?.promo === "G" || user?.promo === "H"
                  ? `Promotion ${user.promo} · Ancien étudiant HEI`
                  : "Ancien étudiant HEI"}
              </p>
            </div>
          </div>
          <p className="text-white/70 text-sm leading-relaxed max-w-lg">
            Bienvenue sur l&apos;espace Alumni HEI. Restez connecté avec la
            communauté, participez aux discussions et suggérez vos idées pour
            améliorer l&apos;école.
          </p>
        </div>

        {/* Quick links */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {QUICK_LINKS.map((link) => (
            <button
              key={link.to}
              type="button"
              onClick={() => navigate(link.to)}
              className="bg-white rounded-2xl shadow-sm border border-contact p-5 text-left
                         hover:shadow-md hover:border-navy/30 transition-all duration-200
                         group"
            >
              <div
                className={`w-10 h-10 rounded-xl ${link.color} flex items-center justify-center mb-3`}
              >
                <FontAwesomeIcon icon={link.icon} className="text-lg" />
              </div>
              <h3 className="font-bold text-navy text-sm mb-1 group-hover:text-gold transition-colors">
                {link.label}
              </h3>
              <p className="text-xs text-gray-400">{link.desc}</p>
              <div className="mt-3 flex items-center gap-1 text-xs text-gold font-semibold opacity-0 group-hover:opacity-100 transition-opacity">
                Accéder <FontAwesomeIcon icon={faExternalLinkAlt} className="text-[10px]" />
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
