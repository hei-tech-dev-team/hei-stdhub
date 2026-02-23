import { useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faSearch, faPlus } from "@fortawesome/free-solid-svg-icons";
import { useAuth } from "../../context/AuthContext";
import Avatar from "../ui/Avatar";

export default function ContactList({ contacts, activeId, onSelect }) {
  const { user } = useAuth();
  const [search, setSearch] = useState("");

  const filtered = contacts.filter((c) =>
    c.name.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div className="w-72 shrink-0 bg-navy-dark flex flex-col h-full">
      {/* ── Header ── */}
      <div className="px-5 pt-6 pb-4">
        <h2 className="text-white font-bold text-base mb-4">
          {user?.ref || user?.name || "Chat"}
        </h2>

        {/* Barre de recherche */}
        <div className="relative">
          <FontAwesomeIcon
            icon={faSearch}
            className="absolute left-3 top-1/2 -translate-y-1/2
                       text-gray-400 text-sm"
          />
          <input
            className="w-full bg-white/10 border border-white/10
                       rounded-xl pl-9 pr-4 py-2 text-sm text-white
                       placeholder:text-gray-400 focus:outline-none
                       focus:border-gold transition"
            placeholder="Rechercher..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* ── Liste des contacts ── */}
      <div className="flex-1 overflow-y-auto px-3 pb-4">
        {filtered.map((contact) => {
          const isActive = contact.id === activeId;

          return (
            <button
              key={contact.id}
              onClick={() => onSelect(contact)}
              className={`w-full flex items-center gap-3 px-3 py-3
                          rounded-xl mb-1 text-left transition-all
                          ${isActive ? "bg-gold" : "hover:bg-white/10"}`}
            >
              {/* Avatar ou icône globale */}
              {contact.isGlobal ? (
                <div
                  className="w-9 h-9 rounded-full bg-navy
                                flex items-center justify-center shrink-0"
                >
                  <span className="text-gold font-bold text-xs">HEI</span>
                </div>
              ) : (
                <Avatar
                  name={contact.name}
                  size="md"
                  color={isActive ? "bg-navy" : "bg-white/20"}
                />
              )}

              {/* Nom + rôle */}
              <div className="flex-1 min-w-0">
                <span
                  className={`font-semibold text-sm truncate block
                              ${isActive ? "text-navy-dark" : "text-white"}`}
                >
                  {contact.name}
                </span>
                {contact.role && (
                  <span
                    className={`text-xs capitalize
                                ${isActive ? "text-navy/60" : "text-white/40"}`}
                  >
                    {contact.role === "teacher" ? "Professeur" : "Étudiant"}
                  </span>
                )}
              </div>
            </button>
          );
        })}
      </div>

      {/* ── Bouton nouveau message ── */}
      <div className="px-4 pb-5 flex justify-end">
        <button
          className="w-12 h-12 rounded-full bg-gold text-white
                     flex items-center justify-center
                     hover:opacity-90 transition shadow-lg"
          title="Nouvelle conversation"
        >
          <FontAwesomeIcon icon={faPlus} />
        </button>
      </div>
    </div>
  );
}
