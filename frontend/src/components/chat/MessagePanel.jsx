import { useState, useRef, useEffect, useMemo } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faPaperPlane,
  faPaperclip,
  faChevronLeft,
  faSpinner,
  faFile,
  faChevronDown,
} from "@fortawesome/free-solid-svg-icons";
import Avatar from "../ui/Avatar";
import { HEI_WHITE_LOGO } from "../../assets/logos";
import api from "../../api/axios";
import DOMPurify from "dompurify";

const SECOND = 1000;
const MINUTE = 60 * SECOND;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;
const GROUP_GAP = 5 * MINUTE;

const isSameDay = (a, b) =>
  a.getFullYear() === b.getFullYear() &&
  a.getMonth() === b.getMonth() &&
  a.getDate() === b.getDate();

const getDayDiff = (a, b) => {
  const ta = new Date(a.getFullYear(), a.getMonth(), a.getDate());
  const tb = new Date(b.getFullYear(), b.getMonth(), b.getDate());
  return Math.round((ta - tb) / DAY);
};

const formatTime = (date) =>
  date.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });

const formatDateLabel = (date) => {
  const now = new Date();
  const diff = getDayDiff(now, date);

  if (diff === 0) return "Aujourd'hui";
  if (diff === 1) return "Hier";
  if (diff < 7)
    return date.toLocaleDateString("fr-FR", { weekday: "long" });

  if (date.getFullYear() === now.getFullYear())
    return date.toLocaleDateString("fr-FR", {
      day: "numeric",
      month: "long",
    });

  return date.toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
};

const formatMessageTime = (date) => {
  const now = new Date();
  const diff = getDayDiff(now, date);

  if (diff === 0) return formatTime(date);
  if (diff === 1) return `Hier ${formatTime(date)}`;
  if (diff < 7)
    return `${date.toLocaleDateString("fr-FR", { weekday: "short" })} ${formatTime(date)}`;

  if (date.getFullYear() === now.getFullYear())
    return date.toLocaleDateString("fr-FR", {
      day: "numeric",
      month: "short",
    }) + ` ${formatTime(date)}`;

  return date.toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }) + ` ${formatTime(date)}`;
};

const formatTooltipDate = (date) =>
  date.toLocaleDateString("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }) + ` à ${formatTime(date)}`;

function DateSeparator({ date }) {
  return (
    <div className="flex items-center gap-3 my-4">
      <div className="flex-1 h-px bg-white/10" />
      <span className="text-white/40 text-xs font-medium shrink-0">
        {formatDateLabel(date)}
      </span>
      <div className="flex-1 h-px bg-white/10" />
    </div>
  );
}

function isFileMessage(content) {
  return content.startsWith("[FILE:");
}

function renderContent(content) {
  const fileMatchNew = content.match(/^\[FILE:(.+):(.+):(img|file)\]$/);
  if (fileMatchNew) {
    const [, filename, url, type] = fileMatchNew;
    if (type === "img") {
      return (
        <a href={url} target="_blank" rel="noreferrer">
          <img
            src={url}
            alt={filename}
            className="max-w-56 max-h-56 object-cover rounded-lg
                          cursor-pointer hover:opacity-90 transition block"
          />
        </a>
      );
    }
    return (
      <a
        href={url}
        target="_blank"
        rel="noreferrer"
        className="flex items-center gap-2 text-blue-300
                      hover:text-blue-200 hover:underline text-xs font-medium"
      >
        <FontAwesomeIcon icon={faFile} />
        <span>{filename}</span>
      </a>
    );
  }

  const fileMatchOld = content.match(/^\[FILE:(.+):(.+)\]$/);
  if (fileMatchOld) {
    const [, filename, url] = fileMatchOld;
    const isImage =
      /\.(jpg|jpeg|png|gif|webp)/i.test(url) ||
      /\.(jpg|jpeg|png|gif|webp)$/i.test(filename);
    if (isImage) {
      return (
        <a href={url} target="_blank" rel="noreferrer">
          <img
            src={url}
            alt={filename}
            className="max-w-56 max-h-56 object-cover rounded-lg
                          cursor-pointer hover:opacity-90 transition block"
          />
        </a>
      );
    }
    return (
      <a
        href={url}
        target="_blank"
        rel="noreferrer"
        className="flex items-center gap-2 text-blue-300
                      hover:text-blue-200 hover:underline text-xs font-medium"
      >
        <FontAwesomeIcon icon={faFile} />
        <span>{filename}</span>
      </a>
    );
  }

  const clean = DOMPurify.sanitize(content);
  return <span dangerouslySetInnerHTML={{ __html: clean }} />;
}

function MessageGroup({ messages, isOwn }) {
  const [hoveredId, setHoveredId] = useState(null);

  return (
    <div className={`flex flex-col ${isOwn ? "items-end" : "items-start"}`}>
      {messages.map((msg, idx) => {
        const isFirst = idx === 0;
        const date = new Date(msg.createdAt);
        const timeStr = formatTime(date);
        const tooltipStr = formatTooltipDate(date);

        if (isFileMessage(msg.content)) {
          return (
            <div key={msg.id} className="flex items-end gap-2 mb-1 max-w-[75%] sm:max-w-sm">
              {!isOwn && isFirst && (
                <div className="w-8 h-8 rounded-full overflow-hidden shrink-0 mb-0.5 self-end">
                  {msg.senderAvatar ? (
                    <img
                      src={msg.senderAvatar}
                      alt={msg.sender}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <Avatar name={msg.sender} size="sm" color="bg-[#5865f2]" />
                  )}
                </div>
              )}
              {!isOwn && !isFirst && <div className="w-8 shrink-0" />}
              <div className="flex flex-col items-end">
                <div
                  className={`rounded-lg overflow-hidden ${
                    isOwn
                      ? "bg-[#d4a017] text-white rounded-br-sm"
                      : "bg-[#2b2d31] text-white rounded-bl-sm"
                  }`}
                >
                  {renderContent(msg.content)}
                </div>
                <span className="text-white/20 text-[10px] mt-0.5 px-1">
                  {timeStr}
                </span>
              </div>
            </div>
          );
        }

        return (
          <div
            key={msg.id}
            className={`group relative flex items-end gap-2 mb-0.5 max-w-[75%] sm:max-w-sm ${
              isOwn ? "flex-row-reverse" : "flex-row"
            }`}
            onMouseEnter={() => setHoveredId(msg.id)}
            onMouseLeave={() => setHoveredId(null)}
          >
            {!isOwn && isFirst && (
              <div className="w-8 h-8 rounded-full overflow-hidden shrink-0 mb-0.5 self-end">
                {msg.senderAvatar ? (
                  <img
                    src={msg.senderAvatar}
                    alt={msg.sender}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <Avatar name={msg.sender} size="sm" color="bg-[#5865f2]" />
                )}
              </div>
            )}
            {!isOwn && !isFirst && <div className="w-8 shrink-0" />}

            <div className="flex flex-col">
              {isFirst && (
                <span
                  className={`text-[11px] font-semibold mb-0.5 ml-1 ${
                    isOwn ? "text-right text-white/40" : "text-[#d4a017]"
                  }`}
                >
                  {isOwn ? "Vous" : msg.sender}
                </span>
              )}
              <div className="flex items-end gap-1.5">
                {!isOwn && (
                  <span
                    className={`text-[10px] text-white/20 opacity-0 group-hover:opacity-100 transition-opacity select-none self-end pb-0.5 ${
                      hoveredId === msg.id ? "opacity-100" : ""
                    }`}
                    title={tooltipStr}
                  >
                    {timeStr}
                  </span>
                )}
                <div
                  className={`px-3 py-1.5 text-sm leading-relaxed ${
                    isOwn
                      ? "bg-[#d4a017] text-white rounded-2xl rounded-br-sm"
                      : "bg-[#2b2d31] text-white/90 rounded-2xl rounded-bl-sm"
                  }`}
                >
                  {renderContent(msg.content)}
                </div>
                {isOwn && (
                  <div className="flex items-center gap-0.5 self-end pb-0.5">
                    <span
                      className={`text-[10px] select-none transition-opacity ${
                        hoveredId === msg.id || !isFirst
                          ? "opacity-100"
                          : "opacity-0 group-hover:opacity-100"
                      } ${isOwn ? "text-white/20" : "text-white/20"}`}
                      title={tooltipStr}
                    >
                      {timeStr}
                    </span>
                    {!msg.seen && (
                      <span className="text-white/20 text-[10px]">✓</span>
                    )}
                    {msg.seen && (
                      <span className="text-[#d4a017] text-[10px]">✓✓</span>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default function MessagePanel({
  contact,
  messages,
  loading,
  onSend,
  onOpenContacts,
  isAtBottom,
  onAtBottomChange,
  onScrollToBottom,
}) {
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const bottomRef = useRef(null);
  const fileRef = useRef(null);
  const scrollRef = useRef(null);

  useEffect(() => {
    if (isAtBottom) {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isAtBottom]);

  const handleScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 60;
    onAtBottomChange(atBottom);
  };

  const handleSend = async () => {
    const trimmed = text.trim();
    if (!trimmed) return;
    setSending(true);
    await onSend(trimmed);
    setText("");
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
      await onSend(`[Fichier : ${file.name}]`);
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

  const ContactAvatar = () => {
    if (contact.isGlobal) {
      return (
        <div className="w-10 h-10 rounded-full bg-[#d4a017]/20 flex items-center justify-center shrink-0">
          <img
            src={HEI_WHITE_LOGO}
            alt="HEI"
            className="w-5 h-5 object-contain"
          />
        </div>
      );
    }
    if (contact.avatar) {
      return (
        <div className="w-10 h-10 rounded-full overflow-hidden shrink-0">
          <img
            src={contact.avatar}
            alt={contact.name}
            className="w-full h-full object-cover"
          />
        </div>
      );
    }
    return <Avatar name={contact.name} size="md" color="bg-[#5865f2]" />;
  };

  return (
    <div className="flex flex-col h-full bg-[#1e1f22]">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 sm:px-5 py-3 bg-[#2b2d31] border-b border-[#1e1f22] shrink-0 shadow-sm">
        <button
          type="button"
          onClick={onOpenContacts}
          className="lg:hidden w-8 h-8 rounded-lg bg-white/10 text-white
                     flex items-center justify-center hover:bg-white/20 transition"
        >
          <FontAwesomeIcon icon={faChevronLeft} className="text-sm" />
        </button>
        <ContactAvatar />
        <div className="flex-1 min-w-0">
          <h3 className="text-white font-bold text-base truncate">
            {contact.name}
          </h3>
          <p className="text-white/40 text-xs">
            {contact.isGlobal
              ? "Chat global – tous les membres"
              : contact.role === "teacher"
                ? "Professeur"
                : "Étudiant"}
          </p>
        </div>
      </div>

      {/* Messages */}
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto px-4 sm:px-6 py-4 flex flex-col relative"
      >
        {loading && (
          <div className="flex justify-center py-10">
            <FontAwesomeIcon
              icon={faSpinner}
              className="text-[#d4a017] text-2xl animate-spin"
            />
          </div>
        )}

        {!loading && messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full gap-3 opacity-30">
            <img
              src={HEI_WHITE_LOGO}
              alt="HEI"
              className="w-14 h-14 object-contain rounded-full"
            />
            <p className="text-white text-sm">Démarrez la conversation...</p>
          </div>
        )}

        {!loading &&
          grouped.map((item, idx) => {
            if (item.type === "separator") {
              return <DateSeparator key={`sep-${idx}`} date={item.date} />;
            }
            return (
              <div key={`g-${idx}`} className="mb-0.5">
                <MessageGroup
                  messages={item.messages}
                  isOwn={item.isOwn}
                />
              </div>
            );
          })}

        <div ref={bottomRef} />

        {!isAtBottom && (
          <button
            type="button"
            onClick={() => {
              onScrollToBottom();
              bottomRef.current?.scrollIntoView({ behavior: "smooth" });
            }}
            className="fixed bottom-20 right-6 w-10 h-10 rounded-full
                       bg-[#2b2d31] border border-white/10
                       text-white flex items-center justify-center
                       hover:bg-[#3a3c42] transition shadow-lg z-10"
            title="Revenir en bas"
          >
            <FontAwesomeIcon icon={faChevronDown} className="text-sm" />
          </button>
        )}
      </div>

      {/* Input */}
      <div className="px-4 sm:px-5 py-4 bg-[#2b2d31] border-t border-[#1e1f22] shrink-0">
        <div className="flex items-center gap-2 bg-[#1e1f22] rounded-lg px-4 py-2.5 border border-[#3a3c42] focus-within:border-[#d4a017] transition">
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="w-8 h-8 rounded-lg text-white/40 hover:text-white hover:bg-white/10 flex items-center justify-center transition shrink-0"
          >
            <FontAwesomeIcon icon={faPaperclip} className="text-sm" />
          </button>
          <input
            ref={fileRef}
            type="file"
            className="hidden"
            onChange={handleFile}
          />
          <input
            className="flex-1 text-sm text-white bg-transparent
                       focus:outline-none placeholder:text-white/20"
            placeholder="Écrire un message..."
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={handleKey}
          />
          <button
            type="button"
            onClick={handleSend}
            disabled={!text.trim() || sending}
            className="w-8 h-8 rounded-lg bg-[#d4a017] text-white
                     flex items-center justify-center hover:opacity-90
                     transition shrink-0 disabled:opacity-30 disabled:cursor-not-allowed"
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
