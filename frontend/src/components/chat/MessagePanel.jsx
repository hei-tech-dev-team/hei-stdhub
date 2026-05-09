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
import {
  isSameDay,
  GROUP_GAP,
  formatTime,
  formatDateLabel,
  formatTooltipDate,
  isFileMessage,
  parseFileContent,
} from "./chat-utils";

function DateSeparator({ date }) {
  return (
    <div className="flex items-center gap-3 my-5">
      <div className="flex-1 h-px bg-white/10" />
      <span className="text-white/40 text-[11px] font-medium shrink-0">
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
            className="max-w-56 max-h-56 object-cover rounded-lg
                          cursor-pointer hover:opacity-90 transition block"
          />
        </a>
      );
    }
    return (
      <a
        href={parsed.url}
        target="_blank"
        rel="noreferrer"
        className="flex items-center gap-2 text-blue-300
                      hover:text-blue-200 hover:underline text-xs font-medium"
      >
        <FontAwesomeIcon icon={faFile} />
        <span>{parsed.filename}</span>
      </a>
    );
  }

  const clean = DOMPurify.sanitize(content);
  return <span dangerouslySetInnerHTML={{ __html: clean }} />;
}

function MessageBubble({ msg, isOwn, isFirst, isGroupStart }) {
  const [hovered, setHovered] = useState(false);
  const date = new Date(msg.createdAt);
  const timeStr = formatTime(date);
  const tooltipStr = formatTooltipDate(date);

  return (
    <div
      className={`flex items-end gap-2 mb-0.5 max-w-[75%] sm:max-w-md ${
        isOwn ? "ml-auto flex-row-reverse" : "mr-auto flex-row"
      }`}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Avatar column */}
      {!isOwn && isGroupStart ? (
        <div className="w-7 h-7 rounded-full overflow-hidden shrink-0 self-end ring-2 ring-white/10 mb-0.5">
          {msg.senderAvatar ? (
            <img
              src={msg.senderAvatar}
              alt={msg.sender}
              className="w-full h-full object-cover"
            />
          ) : (
            <Avatar name={msg.sender} size="sm" color="bg-gold" />
          )}
        </div>
      ) : !isOwn ? (
        <div className="w-7 shrink-0" />
      ) : null}

      <div className={`flex flex-col ${isOwn ? "items-end" : "items-start"}`}>
        {/* Sender name */}
        {isGroupStart && (
          <span
            className={`text-[11px] font-semibold mb-1 ${
              isOwn ? "text-white/40 ml-auto" : "text-gold ml-1"
            }`}
          >
            {isOwn ? "Vous" : msg.sender}
          </span>
        )}

        <div className="flex items-end gap-1.5">
          {/* Timestamp left (other's messages) */}
          {!isOwn && (
            <span
              className={`text-[10px] text-white/30 select-none self-end pb-1.5 transition-opacity ${
                hovered ? "opacity-100" : "opacity-0"
              }`}
              title={tooltipStr}
            >
              {timeStr}
            </span>
          )}

          {/* Bubble */}
          <div
            className={`px-3 py-2 text-sm leading-relaxed ${
              isOwn
                ? "bg-navy text-white rounded-2xl rounded-br-md"
                : "bg-white/10 border border-white/10 text-white/90 rounded-2xl rounded-bl-md"
            }`}
          >
            {isFileMessage(msg.content) ? (
              <div
                className={`rounded-lg overflow-hidden ${
                  isOwn ? "text-white" : ""
                }`}
              >
                {renderContent(msg.content)}
              </div>
            ) : (
              renderContent(msg.content)
            )}
          </div>

          {/* Timestamp right + seen (own messages) */}
          {isOwn && (
            <div className="flex items-center gap-0.5 self-end pb-1.5">
              <span
                className={`text-[10px] text-white/30 select-none transition-opacity ${
                  hovered ? "opacity-100" : "opacity-0"
                }`}
                title={tooltipStr}
              >
                {timeStr}
              </span>
              {!msg.seen && (
                <span className="text-white/30 text-[10px]">✓</span>
              )}
              {msg.seen && (
                <span className="text-gold text-[10px]">✓✓</span>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function MessageGroup({ messages, isOwn }) {
  return (
    <div className={`flex flex-col ${isOwn ? "items-end" : "items-start"}`}>
      {messages.map((msg, idx) => (
        <MessageBubble
          key={msg.id}
          msg={msg}
          isOwn={isOwn}
          isFirst={idx === 0}
          isGroupStart={idx === 0}
        />
      ))}
    </div>
  );
}

function ContactAvatar({ contact, onlineUsers }) {
  if (contact.isGlobal) {
    return (
      <div className="w-9 h-9 rounded-full bg-gold/20 flex items-center justify-center shrink-0 ring-2 ring-white/10">
        <img
          src={HEI_WHITE_LOGO}
          alt="HEI"
          className="w-4 h-4 object-contain"
        />
      </div>
    );
  }
  const online = onlineUsers.has(contact.id);
  return (
    <div className="relative shrink-0">
      {contact.avatar ? (
        <div className="w-9 h-9 rounded-full overflow-hidden ring-2 ring-white/10">
          <img
            src={contact.avatar}
            alt={contact.name}
            className="w-full h-full object-cover"
          />
        </div>
      ) : (
        <Avatar name={contact.name} size="md" color="bg-gold" />
      )}
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
  onOpenContacts,
  isAtBottom,
  onAtBottomChange,
  onScrollToBottom,
  onlineUsers,
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

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 sm:px-5 py-3 bg-white/5 backdrop-blur-xl border-b border-white/10 shrink-0">
        <button
          type="button"
          onClick={onOpenContacts}
          className="lg:hidden w-8 h-8 rounded-full bg-white/10 text-white
                     flex items-center justify-center hover:bg-white/20 transition"
        >
          <FontAwesomeIcon icon={faChevronLeft} className="text-sm" />
        </button>
        <ContactAvatar contact={contact} onlineUsers={onlineUsers} />
        <div className="flex-1 min-w-0">
          <h3 className="text-white font-semibold text-sm truncate leading-tight">
            {contact.name}
          </h3>
          <p className="text-white/40 text-[11px]">
            {contact.isGlobal
              ? "Chat global"
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
              className="text-gold text-2xl animate-spin"
            />
          </div>
        )}

        {!loading && messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full gap-3 opacity-40">
            <img
              src={HEI_WHITE_LOGO}
              alt="HEI"
              className="w-14 h-14 object-contain rounded-full opacity-60"
            />
            <p className="text-white/60 text-sm">Démarrez la conversation...</p>
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
            className="fixed bottom-20 right-6 w-9 h-9 rounded-full
                       bg-white/10 backdrop-blur-xl border border-white/20
                       text-white flex items-center justify-center
                       hover:bg-white/20 transition shadow-lg z-10"
            title="Revenir en bas"
          >
            <FontAwesomeIcon icon={faChevronDown} className="text-xs" />
          </button>
        )}
      </div>

      {/* Input */}
      <div className="px-4 sm:px-5 py-3 bg-white/5 backdrop-blur-xl border-t border-white/10 shrink-0">
        <div className="flex items-center gap-2 bg-white/10 rounded-full px-4 py-2 border border-white/20 focus-within:border-gold transition">
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="w-7 h-7 rounded-full text-white/40 hover:text-white hover:bg-white/10 flex items-center justify-center transition shrink-0"
          >
            <FontAwesomeIcon icon={faPaperclip} className="text-xs" />
          </button>
          <input
            ref={fileRef}
            type="file"
            className="hidden"
            onChange={handleFile}
          />
          <input
            className="flex-1 text-sm text-white bg-transparent
                       focus:outline-none placeholder:text-white/30"
            placeholder="Écrire un message..."
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={handleKey}
          />
          <button
            type="button"
            onClick={handleSend}
            disabled={!text.trim() || sending}
            className="w-7 h-7 rounded-full bg-gold text-white
                     flex items-center justify-center hover:opacity-90
                     transition shrink-0 disabled:opacity-30 disabled:cursor-not-allowed"
          >
            {sending ? (
              <FontAwesomeIcon icon={faSpinner} className="text-xs animate-spin" />
            ) : (
              <FontAwesomeIcon icon={faPaperPlane} className="text-xs" />
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
