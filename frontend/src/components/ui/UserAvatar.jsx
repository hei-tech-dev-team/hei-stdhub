import { useEffect, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faUser } from "@fortawesome/free-solid-svg-icons";

const SIZES = {
  xs: "w-6 h-6 text-[10px]",
  sm: "w-7 h-7 text-xs",
  md: "w-9 h-9 text-sm",
  lg: "w-10 h-10 text-sm",
  xl: "w-24 h-24 text-3xl",
};

export default function UserAvatar({
  avatar,
  name,
  size = "md",
  color = "bg-navy",
  className = "",
  imageClassName = "",
  alt,
}) {
  const [failed, setFailed] = useState(false);
  const initial = name ? name.charAt(0).toUpperCase() : null;
  const sizeClass = SIZES[size] || SIZES.md;

  useEffect(() => {
    setFailed(false);
  }, [avatar]);

  return (
    <div
      className={`${sizeClass} ${color} rounded-full flex items-center justify-center text-white font-bold shrink-0 overflow-hidden ring-1 ring-black/5 ${className}`}
    >
      {avatar && !failed ? (
        <img
          src={avatar}
          alt={alt || name || "avatar"}
          className={`w-full h-full object-cover ${imageClassName}`}
          onError={() => setFailed(true)}
        />
      ) : (
        initial || <FontAwesomeIcon icon={faUser} className="text-current" />
      )}
    </div>
  );
}
