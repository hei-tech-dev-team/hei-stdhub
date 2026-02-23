import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faUser } from "@fortawesome/free-solid-svg-icons";

/**
 * Avatar
 * @param {string} name   – affiche l'initiale
 * @param {string} size   – "sm" | "md" | "lg"
 * @param {string} color  – classe Tailwind bg (ex: "bg-navy")
 */
export default function Avatar({ name, size = "md", color = "bg-navy" }) {
  const sizes = {
    sm: "w-7 h-7 text-xs",
    md: "w-9 h-9 text-sm",
    lg: "w-12 h-12 text-base",
  };

  const initial = name ? name.charAt(0).toUpperCase() : null;

  return (
    <div
      className={`${sizes[size]} ${color} rounded-full flex items-center
                  justify-center text-white font-bold shrink-0`}
    >
      {initial ?? <FontAwesomeIcon icon={faUser} className="text-white" />}
    </div>
  );
}
