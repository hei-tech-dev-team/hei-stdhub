import { useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faSearch,
  faPlus,
  faTimes,
  faSpinner,
  faUser,
  faComments,
  faEdit,
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

  const online = contacts.filter((c) => !c.isGlobal && onlineUsers.has(c.id));
  const offline = contacts.filter((c) => !c.isGlobal && !onlineUsers.has(c.id));
  const globalChat = contacts.filter((c) => c.isGlobal);

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

  const ContactRow = ({ contact }) => {
    const isActive = contact.id === activeId;
    const isGlobal = contact.isGlobal;
    const isOnline = onlineUsers.has(contact.id);

    return (
      <button
        type="button"
        onClick={() => onSelect(contact)}
        className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-all relative ${
          isActive
            ? "bg-white/10"
            : "hover:bg-white/5"
        }`}
      >
        {isActive && (
          <div className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-8 bg-gold rounded-full" />
        )}
        {isGlobal ? (
          <div className="w-10 h-10 rounded-full bg-gold/20 flex items-center justify-center shrink-0">
            <FontAwesomeIcon icon={faComments} className="text-gold text-sm" />
          </div>
        ) : (
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
              <Avatar name={contact.name} size="md" color="bg-gold" />
            )}
            <StatusDot online={isOnline} />
          </div>
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span
              className={`font-semibold text-sm truncate ${
                isActive ? "text-gold" : "text-white/90"
              }`}
            >
              {contact.name}
            </span>
            {isOnline && !isGlobal && (
              <span className="w-1.5 h-1.5 rounded-full bg-green-500 shrink-0" />
            )}
          </div>
          {contact.role && (
            <span className="text-xs text-white/40 capitalize">
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
  };

  return (
    <div className="w-full h-full bg-white/[0.08] backdrop-blur-2xl border-r border-white/10 flex flex-col relative">
      {/* Search bar */}
      <div className="px-4 pt-3 pb-2 shrink-0">
        <div className="relative">
          <FontAwesomeIcon
            icon={faSearch}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30 text-xs pointer-events-none"
          />
          <input
            className="w-full bg-white/10 border-0 rounded-full
                       pl-8 pr-4 py-2 text-sm text-white placeholder:text-white/30
                       focus:outline-none focus:ring-1 focus:ring-gold/50 transition"
            placeholder="Rechercher..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* Contact list */}
      <div className="flex-1 overflow-y-auto">
        {globalChat.map((contact) => (
          <ContactRow key={contact.id} contact={contact} />
        ))}

        {online.length > 0 && (
          <>
            <div className="px-4 pt-3 pb-1">
              <span className="text-[11px] font-semibold text-white/30 uppercase tracking-wider">
                En ligne — {online.length}
              </span>
            </div>
            {online.map((contact) => (
              <ContactRow key={contact.id} contact={contact} />
            ))}
          </>
        )}

        {offline.length > 0 && (
          <>
            <div className="px-4 pt-3 pb-1">
              <span className="text-[11px] font-semibold text-white/30 uppercase tracking-wider">
                Tout le monde
              </span>
            </div>
            {offline.map((contact) => (
              <ContactRow key={contact.id} contact={contact} />
            ))}
          </>
        )}

        {filtered.length === 0 && search && (
          <p className="text-white/30 text-sm text-center py-8">
            Aucune conversation
          </p>
        )}
      </div>

      {/* New conversation FAB */}
      <div className="px-4 pb-4 flex justify-end shrink-0">
        <button
          type="button"
          onClick={() => setShowSearch(true)}
          className="w-11 h-11 rounded-full bg-gold text-white flex items-center
                     justify-center hover:opacity-90 transition shadow-lg shadow-gold/20"
          title="Nouvelle conversation"
        >
          <FontAwesomeIcon icon={faEdit} className="text-sm" />
        </button>
      </div>

      {/* Search modal */}
      {showSearch && (
        <div className="absolute inset-0 bg-[#001948]/98 backdrop-blur-2xl z-30 flex flex-col p-4">
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
              className="w-8 h-8 rounded-full text-white/40 hover:text-white hover:bg-white/10 flex items-center justify-center transition"
            >
              <FontAwesomeIcon icon={faTimes} className="text-sm" />
            </button>
          </div>

          <div className="relative mb-4">
            <FontAwesomeIcon
              icon={faSearch}
              className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30 text-sm pointer-events-none"
            />
            <input
              autoFocus
              className="w-full bg-white/10 border border-white/20 rounded-full
                         pl-10 pr-4 py-2.5 text-sm text-white placeholder:text-white/30
                         focus:outline-none focus:border-gold transition"
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
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg mb-0.5 hover:bg-white/10 transition text-left"
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
                      <Avatar name={u.pseudo} size="md" color="bg-gold" />
                    )}
                    <StatusDot online={onlineUsers.has(u.id)} />
                  </div>
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
    </div>
  );
}
