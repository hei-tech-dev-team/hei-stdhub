import { useState, useMemo, memo } from "react";
import { Link } from "react-router-dom";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faSearch,
  faPlus,
  faTimes,
  faSpinner,
  faComments,
  faStar,
} from "@fortawesome/free-solid-svg-icons";
import api from "../../api/axios";
import { useAuth } from "../../context/AuthContext";
import UserAvatar from "../ui/UserAvatar";

const ROLE_BADGE = {
  bde: { label: "BDE", cls: "bg-amber-50 text-amber-700" },
  teacher: { label: "Prof", cls: "bg-purple-50 text-purple-600" },
  admin: { label: "Admin", cls: "bg-red-50 text-red-600" },
};

function RoleBadge({ role }) {
  const cfg = ROLE_BADGE[role];
  if (!cfg) return null;
  return (
    <span className={`text-[9px] font-medium px-1.5 py-0.5 rounded-full ml-1.5 ${cfg.cls}`}>
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

const ContactList = memo(function ContactList({ contacts, activeId, onSelect, onlineUsers, unread, favorites, onToggleFavorite }) {
  const { user } = useAuth();
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("Tous");
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);

  const FILTERS = ["Tous", "Étudiant", "Prof", "Admin"];

  const sorted = useMemo(() => {
    return [...contacts].filter(Boolean).sort((a, b) => {
      if (a.isGlobal) return -1;
      if (b.isGlobal) return 1;

      // 1. Priorité aux favoris
      const aFav = favorites.includes(a.id);
      const bFav = favorites.includes(b.id);
      if (aFav && !bFav) return -1;
      if (!aFav && bFav) return 1;

      // 2. Priorité aux messages non lus
      const aUnread = unread?.contacts?.[a.id]?.unread || 0;
      const bUnread = unread?.contacts?.[b.id]?.unread || 0;
      if (aUnread && !bUnread) return -1;
      if (!aUnread && bUnread) return 1;

      // 3. Alphabétique
      return (a.name || "").localeCompare(b.name || "");
    });
  }, [contacts, unread, favorites]);

  const filtered = sorted.filter((c) =>
    (c.name || "").toLowerCase().includes(search.toLowerCase())
  ).filter((c) => {
    if (roleFilter === "Tous" || c.isGlobal) return true;
    if (roleFilter === "Prof") return c.role === "teacher";
    if (roleFilter === "Admin") return c.role === "admin";
    return true;
  });

  const getUnreadCount = (contact) => {
    if (contact.isGlobal) return unread?.global || 0;
    const c = unread?.contacts?.[contact.id];
    return c?.unread || 0;
  };

  const handleSearch = async (q) => {
    setSearchQuery(q);
    if (!q.trim()) {
      setSearchResults([]);
      return;
    }
    setSearching(true);
    try {
      const { data } = await api.get(`/messages/search?q=${encodeURIComponent(q)}`);
      setSearchResults(Array.isArray(data) ? data.filter((u) => u.id !== user.id) : []);
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
    if (!contact || contact.isGlobal) {
      if (!contact) return null;
      return (
        <div
          className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0
            ${isActive ? "bg-navy" : "bg-navy/10"}`}
        >
          <FontAwesomeIcon
            icon={faComments}
            className={`text-sm ${isActive ? "text-white" : "text-navy"}`}
          />
        </div>
      );
    }
    const online = onlineUsers.has(contact.id);
    const avatarInner = (
      <>
        <UserAvatar
          avatar={contact.avatar}
          name={contact.name}
          size="md"
          color={isActive ? "bg-navy" : "bg-navy/80"}
        />
        <span className="absolute -bottom-0.5 -right-0.5">
          <StatusDot online={online} />
        </span>
      </>
    );
    if (contact.ref) {
      return <Link to={`/user/${contact.ref}`} onClick={(e) => e.stopPropagation()} className="relative shrink-0 block hover:opacity-80 transition-opacity">{avatarInner}</Link>;
    }
    return <div className="relative shrink-0 block">{avatarInner}</div>;
  };

  return (
    <div className="w-full h-full bg-white border-r border-gray-100 flex flex-col relative">
      {/* Header */}
      <div className="px-4 pt-4 pb-3 shrink-0 border-b border-gray-100">
        <div className="relative">
          <FontAwesomeIcon
            icon={faSearch}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs pointer-events-none"
          />
          <input
            className="w-full bg-[#F6F7F8] border border-transparent rounded-xl
                       pl-9 pr-4 py-2.5 text-sm text-navy placeholder:text-gray-400
                       focus:outline-none focus:bg-white focus:border-gold/50 focus:ring-1 focus:ring-gold/20
                       transition-all duration-200"
            placeholder="Filtrer les conversations..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {/* Role Filters */}
        <div className="flex gap-1 mt-2 overflow-x-auto no-scrollbar">
          {FILTERS.map((f) => (
            <button
              key={f}
              onClick={() => setRoleFilter(f)}
              className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors shrink-0 ${
                roleFilter === f
                  ? "bg-navy text-white"
                  : "text-gray-400 hover:text-navy"
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {/* Contact list */}
      <div className="flex-1 overflow-y-auto px-2 py-2 space-y-1">
        {filtered.filter(Boolean).map((contact) => {
          const isActive = contact.id === activeId;
          const handleKey = (e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              onSelect(contact);
            }
          };
          return (
            <div
              key={contact.id}
              onClick={() => onSelect(contact)}
              onKeyDown={handleKey}
              role="button"
              tabIndex={0}
              className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl text-left transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-gold/20 ${
                isActive
                  ? "bg-surface"
                  : "hover:bg-surface/70"
              }`}
            >
              <ContactAvatar contact={contact} isActive={isActive} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-sm text-navy truncate">
                    {contact.name}
                  </span>
                  {!contact.isGlobal && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onToggleFavorite(contact.id);
                      }}
                      className={`shrink-0 transition-colors ${
                        favorites.includes(contact.id) ? "text-gold" : "text-gray-300 hover:text-navy"
                      }`}
                    >
                      <FontAwesomeIcon icon={faStar} className="text-[10px]" />
                    </button>
                  )}
                </div>
                {contact.role && (
                  <span className="text-xs font-medium text-gray-400 flex items-center mt-0.5 gap-1">
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
                <span className="min-w-[20px] h-5 rounded-full bg-gold text-navy-dark text-[10px] font-medium flex items-center justify-center px-1.5 shrink-0 self-center">
                  {getUnreadCount(contact) > 99 ? "99+" : getUnreadCount(contact)}
                </span>
              )}
            </div>
          );
        })}
      </div>

      {/* Search modal */}
      {showSearch && (
        <div className="absolute inset-0 bg-white z-30 flex flex-col p-4 animate-slide-up">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-navy font-bold text-sm">
              Nouvelle conversation<span className="text-gold">.</span>
            </h3>
            <button
              type="button"
              onClick={() => {
                setShowSearch(false);
                setSearchQuery("");
                setSearchResults([]);
              }}
              className="w-7 h-7 rounded-xl bg-[#F6F7F8] text-gray-400 hover:text-navy flex items-center justify-center transition-colors"
            >
              <FontAwesomeIcon icon={faTimes} className="text-xs" />
            </button>
          </div>

          <div className="relative mb-4">
            <FontAwesomeIcon
              icon={faSearch}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs pointer-events-none"
            />
            <input
              autoFocus
              className="w-full bg-[#F6F7F8] border border-transparent rounded-xl
                         pl-9 pr-4 py-2.5 text-sm text-navy placeholder:text-gray-400
                         focus:outline-none focus:bg-white focus:border-gold/50 focus:ring-1 focus:ring-gold/20
                         transition-all duration-200"
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
                  className="text-navy text-lg animate-spin"
                />
              </div>
            )}
            {!searching && searchQuery && searchResults.length === 0 && (
              <p className="text-gray-400 text-xs text-center py-8">
                Aucun utilisateur trouvé
              </p>
            )}
            {!searching &&
              searchResults.map((u) => (
                <div
                  key={u.id}
                  onClick={() => handleStartConversation(u)}
                  role="button"
                  tabIndex={0}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl mb-0.5 hover:bg-surface transition-colors text-left cursor-pointer focus:outline-none focus:ring-2 focus:ring-gold/20"
                >
                  <div className="relative shrink-0">
                    <UserAvatar
                      avatar={u.avatar}
                      name={u.pseudo}
                      size="md"
                      color="bg-navy"
                    />
                    <span className="absolute -bottom-0.5 -right-0.5">
                      <StatusDot online={onlineUsers.has(u.id)} />
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="font-semibold text-sm text-navy truncate flex items-center gap-1">
                      {u.pseudo}
                      <RoleBadge role={u.role} />
                    </span>
                    <span className="text-[11px] font-medium text-gray-400 truncate block">
                      {u.ref}
                    </span>
                  </div>
                </div>
              ))}
            {!searching && !searchQuery && (
              <p className="text-gray-400 text-xs text-center py-8">
                Tapez un pseudo ou une référence
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
          className="w-11 h-11 rounded-xl bg-navy text-white flex items-center
                     justify-center hover:bg-navy-dark transition-colors"
          title="Nouvelle conversation"
        >
          <FontAwesomeIcon icon={faPlus} className="text-sm" />
        </button>
      </div>
    </div>
  );
});

export default ContactList;
