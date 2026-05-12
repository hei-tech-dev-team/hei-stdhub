import { useState, useMemo } from "react";
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

const ROLE_BADGE = {
  bde: { label: "BDE", cls: "bg-yellow-500/20 text-yellow-300 border-yellow-500/30" },
  teacher: { label: "Prof", cls: "bg-purple-500/20 text-purple-300 border-purple-500/30" },
  admin: { label: "Admin", cls: "bg-red-500/20 text-red-300 border-red-500/30" },
  alumni: { label: "Alumni", cls: "bg-amber-500/20 text-amber-300 border-amber-500/30" },
};

function RoleBadge({ role }) {
  const cfg = ROLE_BADGE[role];
  if (!cfg) return null;
  return (
    <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full border ml-1.5 ${cfg.cls}`}>
      {cfg.label}
    </span>
  );
}

function StatusDot({ online }) {
  return (
    <span
      className={`status-dot ${online ? "status-online" : "status-offline"}`}
    />
  );
}

export default function ContactList({ contacts, activeId, onSelect, onlineUsers, unread }) {
  const { user } = useAuth();
  const [search, setSearch] = useState("");
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);

  const sorted = useMemo(() => {
    return [...contacts].sort((a, b) => {
      const aUnread = a.isGlobal
        ? (unread?.global || 0)
        : ((unread?.contacts?.[a.id]?.unread || 0) + (unread?.contacts?.[a.id]?.pending || 0));
      const bUnread = b.isGlobal
        ? (unread?.global || 0)
        : ((unread?.contacts?.[b.id]?.unread || 0) + (unread?.contacts?.[b.id]?.pending || 0));
      if (aUnread && !bUnread) return -1;
      if (!aUnread && bUnread) return 1;
      return a.name.localeCompare(b.name);
    });
  }, [contacts, unread]);

  const filtered = sorted.filter((c) =>
    c.name.toLowerCase().includes(search.toLowerCase()),
  );

  const getUnreadCount = (contact) => {
    if (contact.isGlobal) return unread?.global || 0;
    const c = unread?.contacts?.[contact.id];
    return (c?.unread || 0) + (c?.pending || 0);
  };

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
            ${isActive ? "bg-gold" : "bg-white/10"}`}
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
            color={isActive ? "bg-gold" : "bg-white/10"}
          />
        )}
        <span className="absolute -bottom-0.5 -right-0.5">
          <StatusDot online={online} />
        </span>
      </div>
    );
  };

  return (
    <div className="w-full h-full bg-white/5 backdrop-blur-xl border-r border-white/10 flex flex-col relative">
      {/* Header */}
      <div className="px-5 pt-5 pb-4 shrink-0 border-b border-white/10">
        <div className="flex items-center gap-3 mb-4">
          <div className="relative shrink-0">
            {user?.avatar ? (
              <div className="w-10 h-10 rounded-full overflow-hidden border-2 border-gold">
                <img
                  src={user.avatar}
                  alt="moi"
                  className="w-full h-full object-cover"
                />
              </div>
            ) : (
              <div className="w-10 h-10 rounded-full bg-gold/20 flex items-center justify-center border-2 border-gold">
                <FontAwesomeIcon icon={faUser} className="text-gold text-sm" />
              </div>
            )}
            <span className="absolute -bottom-0.5 -right-0.5">
              <StatusDot online={true} />
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-white font-bold text-base truncate">
              {user?.pseudo || user?.ref || "Chat"}
            </h2>
            <span className="text-white/40 text-xs">Messages</span>
          </div>
        </div>

        <div className="relative">
          <FontAwesomeIcon
            icon={faSearch}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30 text-sm pointer-events-none"
          />
          <input
            className="w-full bg-white/10 border border-white/20 rounded-xl
                       pl-9 pr-4 py-2.5 text-sm text-white placeholder:text-white/30
                       focus:outline-none focus:border-gold transition-all duration-200 ease-out"
            placeholder="Filtrer les conversations..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* Contact list */}
      <div className="flex-1 overflow-y-auto px-2 sm:px-3 py-2 sm:py-3 space-y-0.5">
        {filtered.map((contact) => {
          const isActive = contact.id === activeId;
          return (
            <button
              key={contact.id}
              type="button"
              onClick={() => onSelect(contact)}
              className={`w-full flex items-center gap-3 px-3 sm:px-4 py-3 sm:py-3.5 rounded-xl text-left transition-all duration-200 active:scale-[0.98] ${
                isActive
                  ? "bg-gold/20"
                  : "hover:bg-white/10"
              }`}
            >
              <ContactAvatar contact={contact} isActive={isActive} />
              <div className="flex-1 min-w-0">
                <span
                  className={`font-semibold text-sm truncate block ${
                    isActive ? "text-gold" : "text-white"
                  }`}
                >
                  {contact.name}
                </span>
                {contact.role && (
                  <span className="text-xs text-white/40 flex items-center mt-0.5 gap-1">
                    {contact.role === "teacher"
                      ? "Professeur"
                      : contact.role === "admin"
                        ? "Admin"
                        : contact.role === "bde"
                          ? "BDE"
                          : "Étudiant"}
                    <RoleBadge role={contact.role} />
                  </span>
                )}
              </div>
              {getUnreadCount(contact) > 0 && (
                <span className="min-w-[20px] h-5 rounded-full bg-gold text-navy text-[11px] font-bold flex items-center justify-center px-1.5 shrink-0">
                  {getUnreadCount(contact) > 99 ? "99+" : getUnreadCount(contact)}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Search modal */}
      {showSearch && (
        <div className="absolute inset-0 bg-[#001948]/95 backdrop-blur-2xl z-30 flex flex-col p-4 sm:p-5 animate-slide-up">
          <div className="flex items-center justify-between mb-4 sm:mb-5">
            <h3 className="text-white font-bold text-sm sm:text-base">
              Nouvelle conversation
            </h3>
            <button
              type="button"
              onClick={() => {
                setShowSearch(false);
                setSearchQuery("");
                setSearchResults([]);
              }}
              className="w-8 h-8 rounded-lg text-white/40 hover:text-white hover:bg-white/10 flex items-center justify-center transition-all"
            >
              <FontAwesomeIcon icon={faTimes} />
            </button>
          </div>

          <div className="relative mb-4 sm:mb-5">
            <FontAwesomeIcon
              icon={faSearch}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30 text-sm pointer-events-none"
            />
            <input
              autoFocus
              className="w-full bg-white/10 border border-white/20 rounded-xl
                         pl-9 pr-4 py-2.5 sm:py-3 text-sm text-white placeholder:text-white/30
                         focus:outline-none focus:border-gold transition-all"
              placeholder="Rechercher un pseudo ou une référence..."
              value={searchQuery}
              onChange={(e) => handleSearch(e.target.value)}
            />
          </div>

          <div className="flex-1 overflow-y-auto -mx-1 px-1">
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
                  className="w-full flex items-center gap-3 px-3 sm:px-4 py-3 rounded-xl mb-0.5 hover:bg-white/10 transition-all text-left active:scale-[0.98]"
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
                      <Avatar name={u.pseudo} size="md" color="bg-white/10" />
                    )}
                    <span className="absolute -bottom-0.5 -right-0.5">
                      <StatusDot online={onlineUsers.has(u.id)} />
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="font-semibold text-sm text-white truncate block flex items-center">
                      {u.pseudo}
                      <RoleBadge role={u.role} />
                    </span>
                    <span className="text-xs text-white/40 truncate block">
                      {u.ref} ·{" "}
                      {u.role === "teacher" ? "Professeur" : u.role === "bde" ? "BDE" : u.role === "alumni" ? "Alumni" : "Étudiant"}
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

      {/* New conversation button */}
      <div className="px-5 pb-5 flex justify-end shrink-0">
        <button
          type="button"
          onClick={() => setShowSearch(true)}
          className="w-11 h-11 rounded-full bg-gold text-white flex items-center
                     justify-center hover:bg-gold/90 hover:scale-105 active:scale-95
                     transition-all duration-200 ease-out shadow-lg shadow-gold/30"
          title="Nouvelle conversation"
        >
          <FontAwesomeIcon icon={faPlus} className="text-sm" />
        </button>
      </div>
    </div>
  );
}
