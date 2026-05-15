import { useState, useRef, useEffect, useMemo, lazy, Suspense } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faPaperPlane,
  faPaperclip,
  faChevronLeft,
  faSpinner,
  faFile,
  faChevronDown,
  faTrash,
  faSmile,
} from "@fortawesome/free-solid-svg-icons";
import Avatar from "../ui/Avatar";
import { HEI_WHITE_LOGO } from "../../assets/logos";
import api from "../../api/axios";
import DOMPurify from "dompurify";
import {
  isSameDay,
  GROUP_GAP,
  formatTime,
  formatDateLabel,
  formatTooltipDate,
  isFileMessage,
  parseFileContent,
} from "./chat-utils";

const EmojiPicker = lazy(() => import("emoji-picker-react"));

const ROLE_BADGE = {
  bde: { label: "BDE", cls: "bg-yellow-500/20 text-yellow-300" },
  teacher: { label: "Prof", cls: "bg-purple-500/20 text-purple-300" },
  admin: { label: "Admin", cls: "bg-red-500/20 text-red-300" },
};

function RoleBadge({ role }) {
  const cfg = ROLE_BADGE[role];
  if (!cfg) return null;
  return (
    <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ml-1.5 ${cfg.cls}`}>
      {cfg.label}
    </span>
  );
}

function ChatAvatar({ avatar, name }) {
  const [failed, setFailed] = useState(false);
  if (!avatar || failed) return <Avatar name={name} size="sm" color="bg-gold" />;
  return (
    <img
      src={avatar}
      alt={name}
      className="w-full h-full object-cover"
      onError={() => setFailed(true)}
    />
  );
}

function DateSeparator({ date }) {
  return (
    <div className="flex items-center gap-3 my-4">
      <div className="flex-1 h-px bg-white/10" />
      <span className="text-white/40 text-xs font-medium shrink-0 px-1">
        {formatDateLabel(date)}
      </span>
      <div className="flex-1 h-px bg-white/10" />
    </div>
  );
}

function renderContent(content) {
  const parsed = parseFileContent(content);
  if (parsed) {
    if (parsed.type === "img") {
      return (
        <a href={parsed.url} target="_blank" rel="noreferrer">
          <img
            src={parsed.url}
            alt={parsed.filename}
            className="max-w-56 max-h-56 object-cover rounded-lg cursor-pointer hover:opacity-90 transition block"
          />
        </a>
      );
    }
    return (
      <a
        href={parsed.url}
        target="_blank"
        rel="noreferrer"
        className="flex items-center gap-2 text-blue-300 hover:text-blue-200 hover:underline text-xs font-medium max-w-full"
      >
        <FontAwesomeIcon icon={faFile} />
        <span className="truncate">{parsed.filename}</span>
      </a>
    );
  }

  const clean = DOMPurify.sanitize(content);
  return (
    <span
      className="break-words overflow-wrap-anywhere whitespace-pre-wrap"
      dangerouslySetInnerHTML={{ __html: clean }}
    />
  );
}

function MessageGroup({ messages, isOwn, onDelete }) {
  const [hoveredId, setHoveredId] = useState(null);

  const handleDelete = (msgId) => {
    if (window.confirm("Supprimer ce message ?")) {
      onDelete?.(msgId);
    }
  };

  return (
    <div className={`flex flex-col ${isOwn ? "items-end" : "items-start"}`}>
      {messages.map((msg, idx) => {
        const isFirst = idx === 0;
        const date = new Date(msg.createdAt);
        const timeStr = formatTime(date);
        const tooltipStr = formatTooltipDate(date);

        if (isFileMessage(msg.content)) {
          return (
            <div key={msg.id} className="flex items-end gap-2 mb-1.5 max-w-[95%] sm:max-w-[75%] min-w-0">
              {!isOwn && isFirst && (
                <div className="w-7 h-7 rounded-full overflow-hidden shrink-0 mb-0.5 self-end ring-2 ring-white/20">
                  <ChatAvatar avatar={msg.senderAvatar} name={msg.sender} />
                </div>
              )}
              {!isOwn && !isFirst && <div className="w-7 shrink-0" />}
              <div className="flex flex-col items-end min-w-0">
                <div
                  className={`rounded-xl overflow-hidden ${
                    isOwn
                      ? "bg-gold text-navy-dark"
                      : "bg-white/10 border border-white/10 text-white"
                  }`}
                >
                  {renderContent(msg.content)}
                </div>
                <span className="text-navy-dark/50 text-[10px] mt-1 px-1">
                  {timeStr}
                </span>
              </div>
            </div>
          );
        }

        return (
          <div
            key={msg.id}
            className={`group relative flex items-end gap-2 mb-2 max-w-[95%] sm:max-w-[75%] min-w-0 ${
              isOwn ? "flex-row-reverse" : "flex-row"
            } animate-message-in`}
            style={{ animationDelay: `${idx * 0.03}s` }}
            onMouseEnter={() => setHoveredId(msg.id)}
            onMouseLeave={() => setHoveredId(null)}
          >
            {!isOwn && isFirst && (
              <div className="w-7 h-7 rounded-full overflow-hidden shrink-0 self-end ring-2 ring-white/20">
                <ChatAvatar avatar={msg.senderAvatar} name={msg.sender} />
              </div>
            )}
            {!isOwn && !isFirst && <div className="w-7 shrink-0" />}

            <div className={`flex flex-col min-w-0 max-w-full ${isOwn ? "items-end" : "items-start"}`}>
              {isFirst && (
                <span
                  className={`text-[11px] font-semibold mb-1 ml-1 flex items-center ${
                    isOwn ? "text-navy-dark" : "text-gold"
                  }`}
                >
                  {isOwn ? "Vous" : msg.sender}
                  {!isOwn && <RoleBadge role={msg.senderRole} />}
                </span>
              )}
              <div
                className={`px-4 py-2 text-sm leading-relaxed min-w-0 max-w-full ${
                  isOwn
                    ? "bg-gold text-navy-dark rounded-2xl rounded-br-sm"
                    : "bg-white/10 border border-white/10 text-white/90 rounded-2xl rounded-bl-sm"
                }`}
              >
                {renderContent(msg.content)}
              </div>
              <div className={`flex items-center gap-1.5 mt-0.5 px-1 ${isOwn ? "flex-row-reverse" : "flex-row"}`}>
                <span className="text-[10px] text-white/30">{timeStr}</span>
                {isOwn && (
                  <>
                    <span className={`text-[10px] ${msg.seen ? "text-gold" : "text-white/40"}`}>
                      {msg.seen ? "✓✓" : "✓"}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleDelete(msg.id)}
                      className="opacity-0 group-hover:opacity-100 text-white/30 hover:text-red-400 transition-all text-[10px] ml-1"
                      title="Supprimer"
                    >
                      <FontAwesomeIcon icon={faTrash} />
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function HeaderAvatar({ avatar, name }) {
  const [failed, setFailed] = useState(false);
  if (!avatar || failed) return <Avatar name={name} size="md" color="bg-gold" />;
  return (
    <div className="w-10 h-10 rounded-full overflow-hidden ring-2 ring-white/10">
      <img
        src={avatar}
        alt={name}
        className="w-full h-full object-cover"
        onError={() => setFailed(true)}
      />
    </div>
  );
}

function ContactAvatar({ contact, onlineUsers }) {
  if (contact.isGlobal) {
    return (
      <div className="w-10 h-10 rounded-full bg-gold/20 flex items-center justify-center shrink-0 ring-2 ring-white/10">
        <img
          src={HEI_WHITE_LOGO}
          alt="HEI"
          className="w-5 h-5 object-contain"
        />
      </div>
    );
  }
  const online = onlineUsers.has(contact.id);
  return (
    <div className="relative shrink-0">
      <HeaderAvatar avatar={contact.avatar} name={contact.name} />
      <span className="absolute -bottom-0.5 -right-0.5">
        <span
          className={`status-dot ${online ? "status-online" : "status-offline"}`}
        />
      </span>
    </div>
  );
}

export default function MessagePanel({
  contact,
  messages,
  loading,
  onSend,
  onDelete,
  onOpenContacts,
  isAtBottom,
  onAtBottomChange,
  onScrollToBottom,
  onlineUsers,
  onLoadOlder,
}) {
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const bottomRef = useRef(null);
  const fileRef = useRef(null);
  const inputRef = useRef(null);
  const emojiButtonRef = useRef(null);
  const emojiPickerRef = useRef(null);
  const scrollRef = useRef(null);
  const prevScrollHeight = useRef(0);
  const prevMsgCount = useRef(messages.length);

  useEffect(() => {
    if (isAtBottom) {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isAtBottom]);

  useEffect(() => {
    if (messages.length > prevMsgCount.current) {
      const el = scrollRef.current;
      if (el && !isAtBottom) {
        el.scrollTop = el.scrollHeight - prevScrollHeight.current;
      }
    }
    prevMsgCount.current = messages.length;
  }, [messages, isAtBottom]);

  useEffect(() => {
    setShowEmojiPicker(false);
  }, [contact.id]);

  useEffect(() => {
    if (!showEmojiPicker) return;

    const handlePointerDown = (event) => {
      const target = event.target;
      if (
        emojiPickerRef.current?.contains(target) ||
        emojiButtonRef.current?.contains(target)
      ) {
        return;
      }
      setShowEmojiPicker(false);
    };

    const handleEscape = (event) => {
      if (event.key === "Escape") setShowEmojiPicker(false);
    };

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [showEmojiPicker]);

  const handleScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 60;
    onAtBottomChange(atBottom);

    if (el.scrollTop < 80 && messages.length > 0 && !loadingOlder && onLoadOlder) {
      prevScrollHeight.current = el.scrollHeight;
      setLoadingOlder(true);
      onLoadOlder().finally(() => setLoadingOlder(false));
    }
  };

  const handleEmojiClick = (emojiData) => {
    const emoji = emojiData.emoji;
    const input = inputRef.current;

    if (!input) {
      setText((prev) => prev + emoji);
      return;
    }

    const start = input.selectionStart ?? text.length;
    const end = input.selectionEnd ?? text.length;
    const next = `${text.slice(0, start)}${emoji}${text.slice(end)}`;
    const cursor = start + emoji.length;

    setText(next);
    requestAnimationFrame(() => {
      input.focus();
      input.setSelectionRange(cursor, cursor);
    });
  };

  const handleSend = async () => {
    const trimmed = text.trim();
    if (!trimmed) return;
    setSending(true);
    await onSend(trimmed);
    setText("");
    setShowEmojiPicker(false);
    setSending(false);
    onAtBottomChange(true);
    setTimeout(
      () => bottomRef.current?.scrollIntoView({ behavior: "smooth" }),
      100,
    );
  };

  const handleKey = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleFile = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      alert("Fichier trop volumineux (max 10 Mo).");
      return;
    }
    setSending(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const { data } = await api.post("/messages/upload", fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      await onSend(
        `[FILE:${data.filename}:${data.url}:${data.isImage ? "img" : "file"}]`,
      );
    } catch {
      alert("Échec de l'upload du fichier.");
    } finally {
      setSending(false);
      e.target.value = "";
    }
  };

  const grouped = useMemo(() => {
    if (!messages.length) return [];

    const result = [];
    let currentGroup = null;
    let lastDate = null;

    for (const msg of messages) {
      const msgDate = new Date(msg.createdAt);

      if (lastDate && !isSameDay(msgDate, lastDate)) {
        result.push({ type: "separator", date: msgDate });
      }
      lastDate = msgDate;

      if (!currentGroup) {
        currentGroup = { isOwn: msg.own, messages: [msg] };
      } else {
        const prev = currentGroup.messages[currentGroup.messages.length - 1];
        const prevDate = new Date(prev.createdAt);
        const gap = msgDate.getTime() - prevDate.getTime();

        if (
          msg.own === currentGroup.isOwn &&
          msg.sender === prev.sender &&
          gap > 0 &&
          gap < GROUP_GAP
        ) {
          currentGroup.messages.push(msg);
        } else {
          result.push({ type: "group", ...currentGroup });
          currentGroup = { isOwn: msg.own, messages: [msg] };
        }
      }
    }

    if (currentGroup) {
      result.push({ type: "group", ...currentGroup });
    }

    return result;
  }, [messages]);

  return (
    <div className="flex flex-col h-full min-w-0">
      {/* Header */}
      <div className="relative flex flex-col items-center justify-center gap-1.5 px-4 sm:px-6 py-3 sm:py-4 bg-white/5 backdrop-blur-xl border-b border-white/10 shrink-0">
        <ContactAvatar contact={contact} onlineUsers={onlineUsers} />
        <div className="min-w-0 text-center">
          <h3 className="text-white font-bold text-sm sm:text-base truncate flex items-center justify-center gap-1.5">
            {contact.name}
            {!contact.isGlobal && <RoleBadge role={contact.role} />}
          </h3>
          <p className="text-white/40 text-xs mt-0.5 truncate">
            {contact.isGlobal
              ? "Chat global – tous les membres"
              : contact.role === "teacher"
                ? "Professeur"
                : contact.role === "bde"
                  ? "Bureau Des Étudiants"
                  : "Étudiant"}
          </p>
        </div>
        <button
          type="button"
          onClick={onOpenContacts}
          title="Liste des contacts"
          className="absolute right-4 sm:right-6 w-9 h-9 rounded-xl bg-gold text-navy flex items-center justify-center hover:bg-gold-light transition-all active:scale-95 shrink-0 shadow-lg shadow-gold/20"
        >
          <FontAwesomeIcon icon={faChevronLeft} className="text-sm" />
        </button>
      </div>

      {/* Messages */}
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto overflow-x-hidden px-1 sm:px-6 py-4 sm:py-6 flex flex-col relative"
      >
        {loading && (
          <div className="flex justify-center py-10">
            <FontAwesomeIcon
              icon={faSpinner}
              className="text-gold text-2xl animate-spin"
            />
          </div>
        )}

        {!loading && messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full gap-3 opacity-40 select-none">
            <img
              src={HEI_WHITE_LOGO}
              alt="HEI"
              className="w-14 h-14 object-contain rounded-full opacity-60"
            />
            <p className="text-white/50 text-xs sm:text-sm">Aucun message pour l'instant.</p>
          </div>
        )}

        {!loading &&
          grouped.map((item, idx) => {
            if (item.type === "separator") {
              return <DateSeparator key={`sep-${idx}`} date={item.date} />;
            }
            return (
              <div key={`g-${idx}`} className="mb-2 last:mb-0">
                <MessageGroup
                  messages={item.messages}
                  isOwn={item.isOwn}
                  onDelete={onDelete}
                />
              </div>
            );
          })}

        <div ref={bottomRef} />

        {!isAtBottom && messages.length > 0 && (
          <button
            type="button"
            onClick={() => {
              onScrollToBottom();
              bottomRef.current?.scrollIntoView({ behavior: "smooth" });
            }}
            className="fixed bottom-28 sm:bottom-32 right-6 sm:right-10 w-11 h-11 rounded-full
                       bg-white/10 backdrop-blur-xl border border-white/20
                       text-white flex items-center justify-center
                       hover:bg-white/20 hover:scale-105 active:scale-95
                       transition-all duration-200 shadow-lg z-10"
            title="Revenir en bas"
          >
            <FontAwesomeIcon icon={faChevronDown} className="text-sm" />
          </button>
        )}
      </div>

      {/* Input */}
      <div className="px-1 sm:px-6 py-3 sm:py-5 bg-white/5 backdrop-blur-xl border-t border-white/10 shrink-0">
        <div className="relative flex items-center gap-2 bg-white/10 rounded-xl px-2 sm:px-4 py-2 sm:py-3 border border-white/20 focus-within:border-gold transition-all">
          {showEmojiPicker && (
            <div
              ref={emojiPickerRef}
              className="absolute bottom-full left-0 sm:left-4 mb-3 z-30 max-w-[calc(100vw-1rem)] overflow-hidden rounded-2xl shadow-2xl shadow-black/40"
            >
              <Suspense
                fallback={
                  <div className="w-[min(360px,calc(100vw-1rem))] h-[420px] bg-[#222] text-white/60 flex items-center justify-center text-sm">
                    Chargement...
                  </div>
                }
              >
                <EmojiPicker
                  onEmojiClick={handleEmojiClick}
                  theme="dark"
                  emojiStyle="native"
                  suggestedEmojisMode="recent"
                  skinTonePickerLocation="SEARCH"
                  searchPlaceholder="Rechercher un emoji"
                  searchClearButtonLabel="Effacer"
                  lazyLoadEmojis
                  autoFocusSearch
                  width="min(360px, calc(100vw - 1rem))"
                  height={420}
                  previewConfig={{ showPreview: false }}
                />
              </Suspense>
            </div>
          )}
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            title="Joindre un fichier"
            className="w-10 h-10 rounded-lg text-white/40 hover:text-white hover:bg-white/10 flex items-center justify-center transition-all shrink-0 active:scale-90"
          >
            <FontAwesomeIcon icon={faPaperclip} className="text-sm" />
          </button>
          <input
            ref={fileRef}
            type="file"
            className="hidden"
            onChange={handleFile}
          />
          <button
            ref={emojiButtonRef}
            type="button"
            onClick={() => setShowEmojiPicker((open) => !open)}
            title="Ajouter un emoji"
            className={`w-10 h-10 rounded-lg flex items-center justify-center transition-all shrink-0 active:scale-90 ${
              showEmojiPicker
                ? "bg-gold text-navy"
                : "text-white/40 hover:text-white hover:bg-white/10"
            }`}
          >
            <FontAwesomeIcon icon={faSmile} className="text-sm" />
          </button>
          <input
            ref={inputRef}
            className="flex-1 min-w-0 text-sm text-white bg-transparent focus:outline-none placeholder:text-white/30"
            placeholder="Écrire un message..."
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={handleKey}
          />
          <button
            type="button"
            onClick={handleSend}
            disabled={!text.trim() || sending}
            className="w-10 h-10 rounded-xl bg-gold text-white flex items-center justify-center hover:bg-gold/90 hover:scale-105 active:scale-95 transition-all shrink-0 disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:scale-100"
          >
            {sending ? (
              <FontAwesomeIcon icon={faSpinner} className="text-sm animate-spin" />
            ) : (
              <FontAwesomeIcon icon={faPaperPlane} className="text-sm" />
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
