import { useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faSearch,
  faPlus,
  faTimes,
  faSpinner,
  faUser,
  faComments,
} from "@fortawesome/free-solid-svg-icons";
import api from "../../api/axios";
import { useAuth } from "../../context/AuthContext";
import Avatar from "../ui/Avatar";

function StatusDot({ online }) {
  return (
    <span
      className={`status-dot ${online ? "status-online" : "status-offline"}`}
    />
  );
}

export default function ContactList({ contacts, activeId, onSelect, onlineUsers }) {
  const { user } = useAuth();
  const [search, setSearch] = useState("");
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);

  const filtered = contacts.filter((c) =>
    c.name.toLowerCase().includes(search.toLowerCase()),
  );

  const handleSearch = async (q) => {
    setSearchQuery(q);
    if (!q.trim()) {
      setSearchResults([]);
      return;
    }
    setSearching(true);
    try {
      const { data } = await api.get(`/messages/search?q=${q}`);
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
      avatar: u.avatar,
    });
    setShowSearch(false);
    setSearchQuery("");
    setSearchResults([]);
  };

  const ContactAvatar = ({ contact, isActive }) => {
    if (contact.isGlobal) {
      return (
        <div
          className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0
            ${isActive ? "bg-[#d4a017]" : "bg-[#3a3c42]"}`}
        >
          <FontAwesomeIcon
            icon={faComments}
            className={`text-sm ${isActive ? "text-white" : "text-white/60"}`}
          />
        </div>
      );
    }
    const online = onlineUsers.has(contact.id);
    return (
      <div className="relative shrink-0">
        {contact.avatar ? (
          <div className="w-10 h-10 rounded-full overflow-hidden">
            <img
              src={contact.avatar}
              alt={contact.name}
              className="w-full h-full object-cover"
            />
          </div>
        ) : (
          <Avatar
            name={contact.name}
            size="md"
            color={isActive ? "bg-[#d4a017]" : "bg-[#3a3c42]"}
          />
        )}
        <span className="absolute -bottom-0.5 -right-0.5">
          <StatusDot online={online} />
        </span>
      </div>
    );
  };

  return (
    <div className="w-full h-full bg-[#2b2d31] glass-border flex flex-col relative">
      {/* Header */}
      <div className="px-4 pt-4 pb-3 shrink-0 border-b border-[#1e1f22]">
        <div className="flex items-center gap-3 mb-3">
          <div className="relative shrink-0">
            {user?.avatar ? (
              <div className="w-8 h-8 rounded-full overflow-hidden border-2 border-[#d4a017]">
                <img
                  src={user.avatar}
                  alt="moi"
                  className="w-full h-full object-cover"
                />
              </div>
            ) : (
              <div className="w-8 h-8 rounded-full bg-[#d4a017]/20 flex items-center justify-center border-2 border-[#d4a017]">
                <FontAwesomeIcon icon={faUser} className="text-[#d4a017] text-xs" />
              </div>
            )}
            <span className="absolute -bottom-0.5 -right-0.5">
              <StatusDot online={true} />
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-white font-bold text-sm truncate">
              {user?.pseudo || user?.ref || "Chat"}
            </h2>
            <span className="text-white/30 text-xs">Messages</span>
          </div>
        </div>

        <div className="relative">
          <FontAwesomeIcon
            icon={faSearch}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30 text-sm pointer-events-none"
          />
          <input
            className="w-full bg-[#1e1f22] border border-[#3a3c42] rounded-lg
                       pl-9 pr-4 py-2 text-sm text-white placeholder:text-white/20
                       focus:outline-none focus:border-[#d4a017] transition"
            placeholder="Filtrer les conversations..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* Contact list */}
      <div className="flex-1 overflow-y-auto px-2 py-2">
        {filtered.map((contact) => {
          const isActive = contact.id === activeId;
          return (
            <button
              key={contact.id}
              type="button"
              onClick={() => onSelect(contact)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg mb-0.5 text-left transition-all ${
                isActive ? "bg-[#d4a017]/20" : "hover:bg-white/5"
              }`}
            >
              <ContactAvatar contact={contact} isActive={isActive} />
              <div className="flex-1 min-w-0">
                <span
                  className={`font-semibold text-sm truncate block ${
                    isActive ? "text-[#d4a017]" : "text-white"
                  }`}
                >
                  {contact.name}
                </span>
                {contact.role && (
                  <span className="text-xs text-white/30 capitalize">
                    {contact.role === "teacher"
                      ? "Professeur"
                      : contact.role === "admin"
                        ? "Admin"
                        : "Étudiant"}
                  </span>
                )}
              </div>
            </button>
          );
        })}
      </div>

      {/* Search modal */}
      {showSearch && (
        <div className="absolute inset-0 bg-[#2b2d31]/95 glass backdrop-blur-2xl z-30 flex flex-col p-4">
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
              className="text-white/40 hover:text-white transition"
            >
              <FontAwesomeIcon icon={faTimes} />
            </button>
          </div>

          <div className="relative mb-4">
            <FontAwesomeIcon
              icon={faSearch}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30 text-sm pointer-events-none"
            />
            <input
              autoFocus
              className="w-full bg-[#1e1f22] border border-[#3a3c42] rounded-lg
                         pl-9 pr-4 py-2.5 text-sm text-white placeholder:text-white/20
                         focus:outline-none focus:border-[#d4a017] transition"
              placeholder="Rechercher un pseudo ou une référence..."
              value={searchQuery}
              onChange={(e) => handleSearch(e.target.value)}
            />
          </div>

          <div className="flex-1 overflow-y-auto">
            {searching && (
              <div className="flex justify-center py-8">
                <FontAwesomeIcon
                  icon={faSpinner}
                  className="text-[#d4a017] text-xl animate-spin"
                />
              </div>
            )}
            {!searching && searchQuery && searchResults.length === 0 && (
              <p className="text-white/30 text-sm text-center py-8">
                Aucun utilisateur trouvé
              </p>
            )}
            {!searching &&
              searchResults.map((u) => (
                <button
                  key={u.id}
                  type="button"
                  onClick={() => handleStartConversation(u)}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg mb-0.5 hover:bg-white/5 transition text-left"
                >
                  <div className="relative shrink-0">
                    {u.avatar ? (
                      <div className="w-10 h-10 rounded-full overflow-hidden">
                        <img
                          src={u.avatar}
                          alt={u.pseudo}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    ) : (
                      <Avatar name={u.pseudo} size="md" color="bg-[#3a3c42]" />
                    )}
                    <span className="absolute -bottom-0.5 -right-0.5">
                      <StatusDot online={onlineUsers.has(u.id)} />
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="font-semibold text-sm text-white truncate block">
                      {u.pseudo}
                    </span>
                    <span className="text-xs text-white/30">
                      {u.ref} ·{" "}
                      {u.role === "teacher" ? "Professeur" : "Étudiant"}
                    </span>
                  </div>
                </button>
              ))}
            {!searching && !searchQuery && (
              <p className="text-white/20 text-xs text-center py-8">
                Tapez un pseudo ou une référence STD/PROF
              </p>
            )}
          </div>
        </div>
      )}

      {/* New conversation button */}
      <div className="px-4 pb-4 flex justify-end shrink-0">
        <button
          type="button"
          onClick={() => setShowSearch(true)}
          className="w-10 h-10 rounded-full bg-[#d4a017] text-white flex items-center
                     justify-center hover:opacity-90 transition shadow-lg"
          title="Nouvelle conversation"
        >
          <FontAwesomeIcon icon={faPlus} />
        </button>
      </div>
    </div>
  );
}
