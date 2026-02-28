import { useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faSearch,
  faPlus,
  faTimes,
  faSpinner,
} from "@fortawesome/free-solid-svg-icons";
import api from "../../api/axios";
import { useAuth } from "../../context/AuthContext";
import Avatar from "../ui/Avatar";

export default function ContactList({ contacts, activeId, onSelect }) {
  const { user } = useAuth();
  const [search, setSearch] = useState("");
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);

  // Filtre la liste des contacts affichés
  const filtered = contacts.filter((c) =>
    c.name.toLowerCase().includes(search.toLowerCase()),
  );

  // Recherche dans la BDD
  const handleSearch = async (q) => {
    setSearchQuery(q);
    if (!q.trim()) {
      setSearchResults([]);
      return;
    }
    setSearching(true);
    try {
      const { data } = await api.get(`/messages/search?q=${q}`); // Exclure les contacts déjà dans la liste et soi-même
      // On exclut seulement soi-même
      setSearchResults(data.filter((u) => u.id !== user.id));
    } catch (err) {
      console.error(err);
    } finally {
      setSearching(false);
    }
  };

  const handleStartConversation = (u) => {
    onSelect({
      id: u.id,
      name: u.pseudo,
      role: u.role,
      ref: u.ref,
    });
    setShowSearch(false);
    setSearchQuery("");
    setSearchResults([]);
  };

  return (
    <div className="w-full h-full bg-navy-dark flex flex-col">
      {/* Header */}
      <div className="px-4 sm:px-5 pt-5 pb-4 shrink-0">
        <h2 className="text-white font-bold text-sm sm:text-base mb-4 truncate">
          {user?.pseudo || user?.ref || "Chat"}
        </h2>

        {/* Recherche dans la liste */}
        <div className="relative">
          <FontAwesomeIcon
            icon={faSearch}
            className="absolute left-3 top-1/2 -translate-y-1/2
                       text-gray-400 text-sm pointer-events-none"
          />
          <input
            className="w-full bg-white/10 border border-white/10
                       rounded-xl pl-9 pr-4 py-2 text-sm text-white
                       placeholder:text-gray-400 focus:outline-none
                       focus:border-gold transition"
            placeholder="Filtrer les conversations..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* Liste contacts */}
      <div className="flex-1 overflow-y-auto px-2 sm:px-3 pb-4">
        {filtered.map((contact) => {
          const isActive = contact.id === activeId;
          return (
            <button
              key={contact.id}
              type="button"
              onClick={() => onSelect(contact)}
              className={
                "w-full flex items-center gap-3 px-3 py-3 " +
                "rounded-xl mb-1 text-left transition-all " +
                (isActive ? "bg-gold" : "hover:bg-white/10")
              }
            >
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
              <div className="flex-1 min-w-0">
                <span
                  className={
                    "font-semibold text-sm truncate block " +
                    (isActive ? "text-navy-dark" : "text-white")
                  }
                >
                  {contact.name}
                </span>
                {contact.role && (
                  <span
                    className={
                      "text-xs capitalize " +
                      (isActive ? "text-navy/60" : "text-white/40")
                    }
                  >
                    {contact.role === "teacher" ? "Professeur" : "Étudiant"}
                  </span>
                )}
              </div>
            </button>
          );
        })}
      </div>

      {/* Modal recherche nouvelle conversation */}
      {showSearch && (
        <div className="absolute inset-0 bg-navy-dark z-30 flex flex-col p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-white font-bold text-sm">
              Nouvelle conversation
            </h3>
            <button
              type="button"
              onClick={() => {
                setShowSearch(false);
                setSearchQuery("");
                setSearchResults([]);
              }}
              className="text-white/60 hover:text-white transition"
            >
              <FontAwesomeIcon icon={faTimes} />
            </button>
          </div>

          {/* Input recherche */}
          <div className="relative mb-4">
            <FontAwesomeIcon
              icon={faSearch}
              className="absolute left-3 top-1/2 -translate-y-1/2
                         text-gray-400 text-sm pointer-events-none"
            />
            <input
              autoFocus
              className="w-full bg-white/10 border border-white/10
                         rounded-xl pl-9 pr-4 py-2.5 text-sm text-white
                         placeholder:text-gray-400 focus:outline-none
                         focus:border-gold transition"
              placeholder="Rechercher un pseudo ou une référence..."
              value={searchQuery}
              onChange={(e) => handleSearch(e.target.value)}
            />
          </div>

          {/* Résultats */}
          <div className="flex-1 overflow-y-auto">
            {searching && (
              <div className="flex justify-center py-8">
                <FontAwesomeIcon
                  icon={faSpinner}
                  className="text-gold text-xl animate-spin"
                />
              </div>
            )}

            {!searching && searchQuery && searchResults.length === 0 && (
              <p className="text-white/40 text-sm text-center py-8">
                Aucun utilisateur trouvé
              </p>
            )}

            {!searching &&
              searchResults.map((u) => (
                <button
                  key={u.id}
                  type="button"
                  onClick={() => handleStartConversation(u)}
                  className="w-full flex items-center gap-3 px-3 py-3
                           rounded-xl mb-1 hover:bg-white/10 transition text-left"
                >
                  <Avatar name={u.pseudo} size="md" color="bg-white/20" />
                  <div className="flex-1 min-w-0">
                    <span className="font-semibold text-sm text-white truncate block">
                      {u.pseudo}
                    </span>
                    <span className="text-xs text-white/40">
                      {u.ref} ·{" "}
                      {u.role === "teacher" ? "Professeur" : "Étudiant"}
                    </span>
                  </div>
                </button>
              ))}

            {!searching && !searchQuery && (
              <p className="text-white/30 text-xs text-center py-8">
                Tapez un pseudo ou une référence STD/PROF
              </p>
            )}
          </div>
        </div>
      )}

      {/* Bouton nouvelle conversation */}
      <div className="px-4 pb-5 flex justify-end shrink-0">
        <button
          type="button"
          onClick={() => setShowSearch(true)}
          className="w-11 h-11 sm:w-12 sm:h-12 rounded-full bg-gold
                     text-white flex items-center justify-center
                     hover:opacity-90 transition shadow-lg"
          title="Nouvelle conversation"
        >
          <FontAwesomeIcon icon={faPlus} />
        </button>
      </div>
    </div>
  );
}
