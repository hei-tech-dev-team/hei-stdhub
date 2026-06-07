import { useState, useRef, useEffect, useMemo, useCallback, lazy, Suspense } from "react";
import { Link } from "react-router-dom";
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
  faXmark,
  faDownload,
  faEye,
  faShieldHalved,
  faTriangleExclamation,
} from "@fortawesome/free-solid-svg-icons";
import UserAvatar from "../ui/UserAvatar";
import { HEI_WHITE_LOGO } from "../../assets/logos";
import api from "../../api/axios";
import DOMPurify from "dompurify";
import {
  isSameDay,
  GROUP_GAP,
  formatTime,
  formatDateLabel,
  isFileMessage,
  parseFileContent,
} from "./chat-utils";
import { useLongPress } from "./useLongPress";

const EmojiPicker = lazy(() => import("emoji-picker-react"));

const PROFANITY_WORDS = new Set([
  "fuck", "fucker", "fucking", "shit", "shithead", "bullshit", "bitch", "bastard",
  "asshole", "ass", "damn", "damnit", "piss", "pissed", "crap", "dick", "dickhead",
  "cock", "cockhead", "prick", "slut", "whore", "nigger", "nigga", "cunt", "twat",
  "wanker", "motherfucker", "s.o.b", "son of a bitch", "sonofabitch",
  "faggot", "fag", "dyke", "tranny", "trannie", "homo", "queer", "sissy",
  "bender", "pansy", "fairy", "fruitcake", "fruit", "ladyboy", "shemale",
  "he-she", "transvestite",
  "putain", "pute", "connard", "connasse", "encule", "enculer", "enculé", "enculée",
  "foutre", "foutu", "merde", "bordel", "salope", "salaud", "batard", "bâtard",
  "con", "conne", "cul", "bite", "couille", "couilles", "nique", "niquer",
  "ta gueule", "tg", "ferme ta gueule", "va te faire foutre", "va te faire enculer",
  "fils de pute", "filsdepute", "fdp", "ntm", "nique ta mere",
  "abruti", "abrutie", "debile", "débile", "imbecile", "imbécile", "crétin", "cretin",
  "trou du cul", "trouduc", "trou de cul", "encule de ta race", "enculé de ta race",
  "gros con", "grosse conne",
  "pédé", "pede", "pédale", "pedale", "tapette", "gouine", "tarlouze",
  "folle", "fiotte", "travelo", "pd",
  "bougnoule", "bougoule", "renoi", "bougnoul", "raton", "bic", "bicot", "boug", "singe", "gorille",
  "fory", "bibity", "bobota", "kimaso", "kdj", "kndj", "kindaso", "kindinalika",
  "lln", "lelena", "lelikeee", "pory", "pr", "rp", "por", "pox", "px",
  "masosopory", "msspr", "masspr", "lindinakika", "tay amin'amany",
  "manemany", "mnmn", "nemany", "ninanem", "ninaneman", "lataka", "ltk",
  "tingy", "chatte", "lely",
  "kill yourself", "kys", "kill urself", "go die", "go kill yourself",
  "f4ck", "fck", "fuk", "sh1t", "b1tch", "a$$", "d1ck", "c0ck",
  "p3d3", "p3d", "t@pette", "tap3tte", "g0uine", "gouin3",
  "ad@l@", "b@d0", "pel@k@",
]);

function containsProfanity(text) {
  if (!text) return false;
  const normalized = text.toLowerCase()
    .replace(/[0-9@!$]+/g, (m) => {
      const map = { "0": "o", "1": "i", "3": "e", "4": "a", "5": "s", "!": "i", "$": "s", "@": "a" };
      return m.split("").map((c) => map[c] || c).join("");
    })
    .replace(/\s+/g, " ").trim();
  for (const word of PROFANITY_WORDS) {
    if (normalized.includes(word.toLowerCase())) return true;
  }
  return false;
}

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

function ChatAvatar({ avatar, name, userRef }) {
  const [failed, setFailed] = useState(false);
  const inner = !avatar || failed
    ? <UserAvatar name={name} size="sm" color="bg-gold" />
    : <img src={avatar} alt={name} className="w-full h-full object-cover" onError={() => setFailed(true)} />;
  if (userRef) return <Link to={`/user/${userRef}`} className="block w-full h-full">{inner}</Link>;
  return inner;
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

function ImageMessage({ parsed, onImageClick, onDelete, onDownload, isOwn }) {
  const [showActions, setShowActions] = useState(false);
  const isMobile = window.matchMedia("(max-width: 1023px)").matches;

   const handlers = useLongPress(
    () => setShowActions(true),
    () => onImageClick?.({ url: parsed.url, filename: parsed.filename }),
  );

  return (
    <div className="relative z-[45]" {...handlers}>
      <img
        src={parsed.url}
        alt={parsed.filename}
        className="max-w-[200px] sm:max-w-[320px] max-h-[300px] w-auto h-auto object-contain rounded-lg block bg-black/20 select-none"
        loading="lazy"
        draggable={false}
        onContextMenu={(e) => e.preventDefault()}
        style={{ WebkitTouchCallout: "none" }}
      />

       {showActions && (
        <>
          <div className="fixed inset-0 z-40" onClick={(e) => { e.stopPropagation(); setShowActions(false); }} onTouchStart={(e) => e.stopPropagation()}
                  onTouchEnd={(e) => e.stopPropagation()} />

          {isMobile ? (
            <div className="fixed bottom-0 inset-x-0 z-50 bg-navy-dark border-t border-white/10 rounded-t-2xl shadow-2xl animate-fade-in pb-safe"
                  onTouchStart={(e) => e.stopPropagation()}
                  onTouchEnd={(e) => e.stopPropagation()}
            >
              <div className="w-10 h-1 bg-white/20 rounded-full mx-auto mt-3 mb-4" />
              <button type="button"
                onClick={(e) => { e.stopPropagation(); setShowActions(false); onImageClick?.({ url: parsed.url, filename: parsed.filename }); }}
                className="flex items-center gap-3 w-full px-6 py-4 text-sm text-white hover:bg-white/5 transition">
                <FontAwesomeIcon icon={faEye} /> Visionner
              </button>
              <button type="button"
                onClick={(e) => { e.stopPropagation(); setShowActions(false); onDownload?.(parsed.url, parsed.filename); }}
                className="flex items-center gap-3 w-full px-6 py-4 text-sm text-white hover:bg-white/5 transition">
                <FontAwesomeIcon icon={faDownload} /> Télécharger
              </button>
              {isOwn && (
                <button type="button"
                  onClick={(e) => { e.stopPropagation(); setShowActions(false); onDelete?.(); }}
                  className="flex items-center gap-3 w-full px-6 py-4 text-sm text-red-400 hover:bg-white/5 transition">
                  <FontAwesomeIcon icon={faTrash} /> Supprimer
                </button>
              )}
              <div className="h-4" />
            </div>
          ) : (
            <div className="absolute bottom-full left-0 mb-2 z-50 bg-navy-dark border border-white/10 rounded-xl shadow-xl overflow-hidden animate-fade-in">
              <button type="button"
                onClick={() => { setShowActions(false); onDelete?.(); }}
                className="flex items-center gap-2 px-4 py-3 text-sm text-red-400 hover:bg-white/5 transition w-full whitespace-nowrap">
                <FontAwesomeIcon icon={faTrash} className="text-xs" />
                Supprimer le message
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function FileMessage({ parsed, onShowDeleteChange }) {
  const handleDownload = useCallback(async () => {
    try {
      const response = await fetch(parsed.url);
      const blob = await response.blob();
      const localUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = localUrl;
      a.download = parsed.filename || "fichier";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(localUrl);
    } catch {
      window.open(parsed.url, "_blank");
    }
  }, [parsed.url, parsed.filename]);

  const handlers = useLongPress(
    () => onShowDeleteChange?.(true),
    handleDownload,
  );

  return (
    <div
      className="relative flex items-center gap-2 py-3 px-2 bg-blue-900/90 hover:bg-blue-900 cursor-pointer transition-all max-w-full"
      {...handlers}
      onContextMenu={(e) => e.preventDefault()}
      style={{ WebkitTouchCallout: "none" }}
    >
      <div className="flex flex-col items-center bg-gold-700/10 border-2 border-gold rounded-lg shrink-0 py-2 px-3">
        <FontAwesomeIcon className="text-sm text-gold" icon={faFile} />
        <span className="text-[9px] font-bold text-gold uppercase">
          {parsed.extension && `.${parsed.extension}`}
        </span>
      </div>
      <div className="flex flex-col text-blue-300 text-xs font-medium">
        <span className="truncate">{parsed.filename?.substring(0, 20)}...</span>
        <span>{parsed.size && `(${(parsed.size / 1024).toFixed(1)} KB)`}</span>
      </div>
    </div>
  );
}

function renderContent(content, onImageClick, onDelete, isOwn, onDownload, msgId, showDelete, onShowDeleteChange) {
  const parsed = parseFileContent(content);
  if (parsed) {
    if (parsed.type === "img") {
      return (
        <ImageMessage
          parsed={parsed}
          onImageClick={onImageClick}
          onDelete={onDelete}
          onDownload={onDownload} 
          isOwn={isOwn}
        />
      );
    }
    return (
      <FileMessage
        parsed={parsed}
        onShowDeleteChange={onShowDeleteChange}
      />
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

function getMessagePreview(content) {
  const parsed = parseFileContent(content);
  if (parsed) {
    return parsed.type === "img"
      ? "Image jointe"
      : `Fichier joint : ${parsed.filename}`;
  }

  const compact = String(content || "").replace(/\s+/g, " ").trim();
  if (!compact) return "Message vide";
  return compact.length > 120 ? `${compact.slice(0, 120)}...` : compact;
}

function DeleteMessageDialog({ message, deleting, onCancel, onConfirm }) {
  if (!message) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4 py-6 bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-sm rounded-xl border border-white/10 bg-navy-dark shadow-2xl shadow-black/50 overflow-hidden animate-fade-in">
        <div className="flex items-start gap-3 p-5 border-b border-white/10">
          <div className="w-10 h-10 rounded-xl bg-red-500/15 text-red-300 flex items-center justify-center shrink-0">
            <FontAwesomeIcon icon={faTrash} className="text-sm" />
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="text-white font-bold text-base">
              Supprimer ce message ?
            </h3>
            <p className="text-white/50 text-xs mt-1 leading-relaxed">
              Cette action est définitive et le message disparaîtra de la conversation.
            </p>
          </div>
          <button
            type="button"
            onClick={onCancel}
            disabled={deleting}
            className="w-8 h-8 rounded-lg text-white/40 hover:text-white hover:bg-white/10 transition disabled:opacity-40"
            title="Fermer"
          >
            <FontAwesomeIcon icon={faXmark} className="text-sm" />
          </button>
        </div>

        <div className="px-5 py-4">
          <div className="rounded-xl bg-white/5 border border-white/10 px-4 py-3">
            <p className="text-white/45 text-[11px] font-semibold uppercase tracking-wide mb-1">
              Aperçu
            </p>
            <p className="text-white/80 text-sm leading-relaxed break-words">
              {getMessagePreview(message.content)}
            </p>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 px-5 pb-5">
          <button
            type="button"
            onClick={onCancel}
            disabled={deleting}
            className="px-4 py-2 rounded-xl text-sm font-semibold text-white/70 hover:text-white hover:bg-white/10 transition disabled:opacity-40"
          >
            Annuler
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={deleting}
            className="px-4 py-2 rounded-xl bg-red-500 text-white text-sm font-bold hover:bg-red-400 transition disabled:opacity-60 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {deleting && (
              <FontAwesomeIcon icon={faSpinner} className="text-xs animate-spin" />
            )}
            Supprimer
          </button>
        </div>
      </div>

    </div>
  );
}

function MessageGroup({ messages, isOwn, onDelete, onImageClick, onDownload }) {
  const [showDeleteFileId, setShowDeleteFileId] = useState(null);

  const handleDelete = (msg) => {
    onDelete?.(msg);
  };

  return (
    <div className={`flex flex-col ${isOwn ? "items-end" : "items-start"}`}>
      {messages.map((msg, idx) => {
        const isFirst = idx === 0;
        const date = new Date(msg.createdAt);
        const timeStr = formatTime(date);

        if (isFileMessage(msg.content)) {
          return (
            <div
              key={msg.id}
              className="group flex flex-col items-end mb-1.5 max-w-[95%] sm:max-w-[75%] min-w-0"
            >
              <div className="flex  items-center gap-2">
                {isOwn && showDeleteFileId === msg.id && (
                  <>
                    <div className="fixed inset-0 z-40"
                      onTouchStart={(e) => e.stopPropagation()}
                      onTouchEnd={(e) => { e.stopPropagation(); setShowDeleteFileId(null); }}
                      onClick={() => setShowDeleteFileId(null)}
                    />
                    <div className="relative z-50">
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); setShowDeleteFileId(null); handleDelete(msg); }}
                        className="w-7 h-7 rounded-full bg-red-500 text-white text-xs flex items-center justify-center shadow-lg shrink-0"
                      >
                        <FontAwesomeIcon icon={faTrash} />
                      </button>
                    </div>
                  </>
                )}

                <div className={`rounded-xl overflow-hidden ${isOwn ? "bg-gold/95 text-navy-dark" : "bg-white/[0.08] border border-white/10 text-white"}`}>
                  {renderContent(msg.content, onImageClick, () => handleDelete(msg), isOwn, onDownload, msg.id, showDeleteFileId === msg.id, (v) => setShowDeleteFileId(v ? msg.id : null))}
                </div>
              </div>

              <div className="flex items-center gap-1.5 mt-0.5 px-1 flex-row-reverse">
                <span className="text-[10px] text-white/30">{timeStr}</span>
                {isOwn && (
                  <button
                    type="button"
                    onClick={() => handleDelete(msg)}
                    className="hidden sm:block opacity-0 group-hover:opacity-100 text-white/30 hover:text-red-400 transition-all text-[10px] ml-1"
                    title="Supprimer"
                  >
                    <FontAwesomeIcon icon={faTrash} />
                  </button>
                )}
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
          >
            {!isOwn && isFirst && (
              <div className="w-7 h-7 rounded-full overflow-hidden shrink-0 self-end ring-2 ring-white/20">
                <ChatAvatar avatar={msg.senderAvatar} name={msg.sender} userRef={msg.senderRef} />
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
                  {isOwn ? "Vous" : msg.senderRef ? (
                    <Link to={`/user/${msg.senderRef}`} className="hover:underline">
                      {msg.sender}
                    </Link>
                  ) : (
                    msg.sender
                  )}
                  {!isOwn && <RoleBadge role={msg.senderRole} />}
                </span>
              )}
              <div
                className={`px-4 py-2 text-sm leading-relaxed min-w-0 max-w-full ${
                  isOwn
                    ? "bg-gold/95 text-navy-dark rounded-xl rounded-br-sm shadow-sm shadow-black/10"
                    : "bg-white/[0.08] border border-white/10 text-white/90 rounded-xl rounded-bl-sm"
                }`}
              >
                {renderContent(msg.content, onImageClick, () => handleDelete(msg), isOwn, onDownload)}
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
                      onClick={() => handleDelete(msg)}
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
      <UserAvatar
        avatar={contact.avatar}
        name={contact.name}
        size="lg"
        color="bg-gold"
        className="ring-2 ring-white/10"
      />
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
  typingUsers,
  socketState,
  onTypingChange,
}) {
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [lightboxImg, setLightboxImg] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deletingMessage, setDeletingMessage] = useState(false);
  const [profanityModal, setProfanityModal] = useState(null);
  const [error, setError] = useState("");
  const bottomRef = useRef(null);
  const fileRef = useRef(null);
  const inputRef = useRef(null);
  const emojiButtonRef = useRef(null);
  const emojiPickerRef = useRef(null);
  const scrollRef = useRef(null);
  const prevScrollHeight = useRef(0);
  const prevMsgCount = useRef(messages.length);

  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    }
  }, [previewUrl]);

  const handleDownloadImg = async (url, filename) => {
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const localUrl = URL.createObjectURL(blob);
      
      const a = document.createElement("a");
      a.href = localUrl;
      a.download = filename || "image";
      document.body.appendChild(a);
      a.click();
      
      document.body.removeChild(a);
      URL.revokeObjectURL(localUrl);
    } catch (_error) {
      window.open(url, "_blank");
    }
  };

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
    document.addEventListener("touchstart", handlePointerDown, { passive: true });
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("touchstart", handlePointerDown);
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
    setError("");
    const trimmed = text.trim();
    if (!trimmed && !selectedFile) return;

    if (contact.isGlobal && containsProfanity(trimmed)) {
      setProfanityModal({ type: "message" });
      return;
    }

    setSending(true);

    try {
      if (selectedFile) {
        const fd = new FormData();
        fd.append("file", selectedFile);
        const { data } = await api.post("/messages/upload", fd);
        await onSend(
          `[FILE:${data.filename}:${data.url}:${data.isImage ? "img" : "file"}:${selectedFile.size}]`,
        );
        setSelectedFile(null);
        setPreviewUrl(null);
      }

      if (trimmed && !selectedFile) {
        await onSend(trimmed);
      }

      setText("");
      setShowEmojiPicker(false);
    } catch (_err) {
      setError("Erreur lors de l'envoi du message.");
    } finally {
      setSending(false);
      onAtBottomChange(true);
      setTimeout(
        () => bottomRef.current?.scrollIntoView({ behavior: "smooth" }),
        100,
      );
    }
  };

  const handleKey = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleFile = async (e) => {
    setError("");
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      setError("Fichier trop volumineux (max 10 Mo).");
      return;
    }
    setSelectedFile(file);
    if (contact.isGlobal && containsProfanity(file.name)) {
      setProfanityModal({ type: "file", fileName: file.name });
      e.target.value = "";
      return;
    }
    if (file.type.startsWith("image/")) {
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
    } else {
      setPreviewUrl(null);
    }
    e.target.value = "";
  };

  const requestDeleteMessage = (message) => {
    setShowEmojiPicker(false);
    setDeleteTarget(message);
  };

  const cancelDeleteMessage = () => {
    if (deletingMessage) return;
    setDeleteTarget(null);
  };

  const confirmDeleteMessage = async () => {
    if (!deleteTarget || deletingMessage) return;
    setDeletingMessage(true);
    try {
      await onDelete?.(deleteTarget.id);
      setDeleteTarget(null);
    } finally {
      setDeletingMessage(false);
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
        <Link 
          to={!contact.isGlobal && contact.ref ? `/user/${contact.ref}` : "#"} 
          className={`flex flex-col items-center gap-1.5 group ${!contact.isGlobal && contact.ref ? "hover:opacity-80 transition-opacity" : "cursor-default pointer-events-none"}`}
        >
          <ContactAvatar contact={contact} onlineUsers={onlineUsers} />
          <div className="min-w-0 text-center">
            <h3 className="text-white font-bold text-sm sm:text-base truncate flex items-center justify-center gap-1.5 group-hover:text-gold transition-colors">
              {contact.name}
              {!contact.isGlobal && <RoleBadge role={contact.role} />}
            </h3>
            <p className="text-white/40 text-xs mt-0.5 truncate">
              {typingUsers && typingUsers.length > 0
                ? typingUsers.length === 1
                  ? `${typingUsers[0]} est en train d'écrire…`
                  : `${typingUsers.length} personnes écrivent…`
                : contact.isGlobal
                  ? "Chat global – tous les membres"
                  : contact.role === "teacher"
                    ? "Professeur"
                    : contact.role === "bde"
                      ? "Bureau des étudiants"
                      : "Étudiant"}
            </p>
          </div>
        </Link>
        <button
          type="button"
          onClick={onOpenContacts}
          title="Liste des contacts"
          className="absolute right-4 sm:right-6 w-9 h-9 rounded-xl bg-gold text-navy flex items-center justify-center hover:bg-gold-light transition-all active:scale-95 shrink-0 shadow-lg shadow-gold/20"
        >
          <FontAwesomeIcon icon={faChevronLeft} className="text-sm" />
        </button>
        {socketState && socketState !== "connected" && (
          <div className="absolute left-4 top-1/2 -translate-y-1/2 flex items-center gap-1.5">
            <span className={`w-2 h-2 rounded-full ${
              socketState === "reconnecting" ? "bg-amber-400 animate-pulse" :
              socketState === "connect_error" || socketState === "reconnect_failed" ? "bg-red-400" :
              "bg-gray-400"
            }`} />
            <span className="text-white/50 text-[10px] hidden sm:inline">
              {socketState === "reconnecting" ? "Reconnexion…" :
               socketState === "connect_error" || socketState === "reconnect_failed" ? "Hors ligne" :
               "Connexion…"}
            </span>
          </div>
        )}
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
                  onDelete={requestDeleteMessage}
                  onImageClick={setLightboxImg}
                  onDownload={(url, filename) => handleDownloadImg(url, filename)}
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
      <div className="relative px-1 sm:px-6 py-3 sm:py-5 bg-white/5 backdrop-blur-xl border-t border-white/10 shrink-0">

        {error && (
          <div
            className="absolute bottom-[calc(100%+0.5rem)] right-4 sm:right-10 px-4 py-2 bg-red-500/20 border border-red-400/30 rounded-xl backdrop-blur-md flex items-center gap-2 animate-fade-in shadow-xl z-20 cursor-pointer"
            onClick={() => setError("")}
          >
            <FontAwesomeIcon icon={faTriangleExclamation} className="text-xs text-red-300 shrink-0" />
            <span className="text-xs text-red-300">{error}</span>
          </div>
        )}
        {selectedFile && (
          <div className="absolute bottom-[calc(100%+0.5rem)] left-4 sm:left-10 p-3 bg-navy-dark/95 border border-white/20 rounded-xl backdrop-blur-md flex items-center gap-4 animate-fade-in shadow-xl z-20">
            <div className="relative">
              {previewUrl ? (
                <img src={previewUrl} alt="Preview" className="w-16 h-16 object-cover rounded-lg ring-2 ring-white/10" />
              ) : (
                <div className="w-16 h-16 bg-white/5 rounded-lg flex items-center justify-center ring-2 ring-white/10">
                  <FontAwesomeIcon icon={faFile} className="text-2xl text-gold" />
                </div>
              )}
              <button
                type="button"
                onClick={() => {
                  setSelectedFile(null);
                  setPreviewUrl(null);
                }}
                className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 rounded-full text-white text-xs flex items-center justify-center hover:bg-red-400 transition-colors shadow-lg"
              >
                <FontAwesomeIcon icon={faXmark} />
              </button>
            </div>
            <div className="flex flex-col min-w-[120px] max-w-[200px]">
              <span className="text-sm text-white font-medium truncate">{selectedFile.name}</span>
              <span className="text-xs text-white/50">{(selectedFile.size / 1024).toFixed(1)} KB</span>
            </div>
          </div>
        )}

        <div className="relative flex items-center gap-2 bg-white/10 rounded-xl px-2 sm:px-4 py-2 sm:py-3 border border-white/20 focus-within:border-gold transition-all">
          {showEmojiPicker && (
            <div
              ref={emojiPickerRef}
              className="absolute bottom-full left-0 sm:left-4 mb-3 z-30 max-w-[calc(100vw-1rem)] overflow-hidden rounded-xl shadow-2xl shadow-black/40"
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
            onChange={(e) => {
              setText(e.target.value);
              if (error) setError("");
              if (onTypingChange) onTypingChange(e.target.value.length > 0);
            }}
            onKeyDown={handleKey}
          />
          <button
            type="button"
            onClick={handleSend}
            disabled={(!text.trim() && !selectedFile) || sending}
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

      <DeleteMessageDialog
        message={deleteTarget}
        deleting={deletingMessage}
        onCancel={cancelDeleteMessage}
        onConfirm={confirmDeleteMessage}
      />

      {profanityModal && (
        <div
          className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in"
          onClick={() => setProfanityModal(null)}
        >
          <div
            className="w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden animate-slide-up"
            onClick={(e) => e.stopPropagation()}
          >
            <div
              className="p-6 text-center"
              style={{
                background: "linear-gradient(160deg, #0A1A33 0%, #001948 50%, #0A1A33 100%)",
              }}
            >
              <div
                className="w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center"
                style={{ background: "rgba(239, 68, 68, 0.15)" }}
              >
                <FontAwesomeIcon
                  icon={faTriangleExclamation}
                  className="text-red-400 text-2xl"
                />
              </div>
              <h3 className="text-white text-lg font-bold mb-2">
                Contenu inapproprie detecte
              </h3>
              <div className="w-12 h-0.5 mx-auto rounded-full bg-red-400/50 mb-4" />
              <p className="text-white/70 text-sm leading-relaxed">
                {profanityModal.type === "file" ? (
                  <>
                    Le nom de fichier <span className="text-white font-semibold">"{profanityModal.fileName}"</span> contient des propos non autorises.
                  </>
                ) : (
                  <>
                    Votre message contient des propos non autorises. Veuillez respecter les autres membres de la communaute.
                  </>
                )}
              </p>
            </div>

            <div className="px-6 pb-6 pt-4 flex flex-col gap-3">
              <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-xl p-3">
                <FontAwesomeIcon
                  icon={faShieldHalved}
                  className="text-amber-500 text-sm mt-0.5 shrink-0"
                />
                <p className="text-amber-700 text-xs leading-relaxed">
                   Les propos injurieux, discriminatoires ou offensants sont interdits dans le chat global. Les messages prives ne sont pas concernes.
                </p>
              </div>

              <button
                onClick={() => setProfanityModal(null)}
                className="w-full py-3 rounded-2xl font-bold text-sm text-white transition-all duration-200 active:scale-[0.98]"
                style={{
                  background: "linear-gradient(135deg, #0A1A33, #001948)",
                  boxShadow: "0 4px 16px rgba(0,25,72,0.25)",
                }}
              >
                Compris, je vais modifier
              </button>
            </div>
          </div>
        </div>
      )}

      {lightboxImg && (
        <div
          className="fixed inset-0 bg-black/95 backdrop-blur-sm z-50 flex flex-col items-center justify-center p-4 animate-fade-in cursor-zoom-out"
          onClick={() => setLightboxImg(null)}
        >
          <div
            className="absolute top-0 inset-x-0 h-16 bg-gradient-to-b from-black/80 to-transparent flex items-center justify-between px-6 text-white z-10"
            onClick={(e) => e.stopPropagation()}
          >
            <span className="text-sm font-medium truncate max-w-[60%] sm:max-w-[80%]">
              {lightboxImg.filename}
            </span>
            <div className="flex items-center gap-3">
            <button
              onClick={() => handleDownloadImg(lightboxImg.url, lightboxImg.filename)}
              className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors text-white"
              title="Télécharger l'image"
            >
              <FontAwesomeIcon icon={faDownload} className="text-sm" />
            </button>
            <button
              onClick={() => setLightboxImg(null)}
              className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors text-white"
              title="Fermer"
            >
              <FontAwesomeIcon icon={faXmark} className="text-base" />
            </button>
          </div>
        </div>

        <div
          className="relative max-w-full max-h-[85vh] flex items-center justify-center"
          onClick={(e) => e.stopPropagation()}
        >
          <img
            src={lightboxImg.url}
            alt={lightboxImg.filename}
            className="max-w-full max-h-[85vh] object-contain rounded-lg shadow-2xl select-none animate-scale-in"
          />
        </div>
      </div>
    )}
    </div>
  );
}
