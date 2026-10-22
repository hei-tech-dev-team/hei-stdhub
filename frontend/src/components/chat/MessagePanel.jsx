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
  faReply,
  faCamera
} from "@fortawesome/free-solid-svg-icons";
import UserAvatar from "../ui/UserAvatar";
import { HEI_WHITE_LOGO, HEI_BLUE_LOGO } from "../../assets/logos";
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
const QUICK_REACTIONS = ["👍", "❤️", "😂", "😮", "😢", "😡"];

function ReactionPicker({ onReact, onClose }) {
  return (
    <div
      className="flex items-center gap-0.5 bg-white border border-gray-100 rounded-xl px-2 py-1.5 shadow-modal z-50 animate-fade-in"
      onMouseLeave={onClose}
    >
      {QUICK_REACTIONS.map((emoji) => (
        <button
          key={emoji}
          type="button"
          onClick={(e) => { e.stopPropagation(); onReact(emoji); onClose(); }}
          className="w-8 h-8 flex items-center justify-center text-lg transition-colors rounded-full hover:bg-surface"
        >
          {emoji}
        </button>
      ))}
    </div>
  );
}

function ReactionList({ reactions, currentUserId, onReact }) {
  if (!reactions?.length) return null;

  const grouped = reactions.reduce((acc, r) => {
    if (!acc[r.emoji]) acc[r.emoji] = { count: 0, hasOwn: false };
    acc[r.emoji].count++;
    if (r.userId === currentUserId) acc[r.emoji].hasOwn = true;
    return acc;
  }, {});

  return (
    <div className="flex flex-wrap gap-1 mt-1 px-1">
      {Object.entries(grouped).map(([emoji, { count, hasOwn }]) => (
        <button
          key={emoji}
          type="button"
          onClick={() => onReact(emoji)}
          title={hasOwn ? "Retirer ma réaction" : "Réagir"}
          className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium transition-colors ${
            hasOwn
              ? "bg-navy text-white"
              : "bg-surface text-navy hover:bg-contact/50"
          }`}
        >
          <span>{emoji}</span>
          <span className="font-medium tabular-nums">{count}</span>
        </button>
      ))}
    </div>
  );
}

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

function ChatAvatar({ avatar, name, userRef }) {
  const [failed, setFailed] = useState(false);
  const inner = !avatar || failed
    ? <UserAvatar name={name} size="sm" color="bg-navy" />
    : <img src={avatar} alt={name} className="w-full h-full object-cover" onError={() => setFailed(true)} />;
  if (userRef) return <Link to={`/user/${userRef}`} className="block w-full h-full">{inner}</Link>;
  return inner;
}

function DateSeparator({ date }) {
  return (
    <div className="flex items-center gap-3 my-4">
      <div className="flex-1 h-px bg-gray-100" />
      <span className="text-navy/40 text-[11px] font-medium shrink-0 px-1">
        {formatDateLabel(date)}
      </span>
      <div className="flex-1 h-px bg-gray-100" />
    </div>
  );
}

function ReplyQuote({ replyToContent, replyToSender, isOwn }) {
  if (!replyToContent) return null;

  const parsed  = parseFileContent(replyToContent);
  const isImage = parsed?.type === "img";
  const isFile  = parsed && !isImage;

  return (
    <div className={`flex items-center gap-2 mb-1 rounded-lg px-2.5 py-1.5
                     max-w-full text-xs min-w-0
                     ${isOwn ? "self-end bg-white/10" : "self-start bg-white"}`}>
      <FontAwesomeIcon icon={faReply}
        className={`text-[10px] shrink-0 ${isOwn ? "text-white/40" : "text-navy/30"}`} />

      <div className="flex-1 min-w-0">
        <p className={`text-[11px] font-semibold mb-0.5 truncate ${isOwn ? "text-gold-light" : "text-navy"}`}>
          {replyToSender}
        </p>
        {isFile ? (
          <div className={`flex items-center gap-1 text-[11px] ${isOwn ? "text-white/50" : "text-navy/50"}`}>
            <FontAwesomeIcon icon={faFile} className="text-[10px] shrink-0" />
            <span className="truncate">{parsed.filename}</span>
          </div>
        ) : (
          <p className={`text-[11px] truncate leading-snug ${isOwn ? "text-white/50" : "text-navy/50"}`}>
            {isImage ? <FontAwesomeIcon icon={faCamera}/> : getMessagePreview(replyToContent)}
          </p>
        )}
      </div>

      {isImage && (
        <img src={parsed.url} alt=""
          className="w-8 h-8 rounded-md object-cover shrink-0" />
      )}
    </div>
  );
}

function ReplyBar({ replyingTo, onCancel }) {
  if (!replyingTo) return null;
  return (
    <div className="absolute bottom-[calc(100%+0.5rem)] left-4 sm:left-6 right-4 sm:right-6
                    flex items-center gap-3 px-4 py-2.5 z-20
                    bg-surface border border-gray-100 rounded-xl shadow-card animate-fade-in">
      <FontAwesomeIcon icon={faReply} className="text-navy/40 text-xs shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-navy text-xs font-semibold mb-0.5 truncate">
          Répondre à {replyingTo.sender}
        </p>
        <p className="text-navy/50 text-xs truncate leading-snug">
          {getMessagePreview(replyingTo.content)}
        </p>
      </div>
      <button
        type="button"
        onClick={onCancel}
        className="w-7 h-7 rounded-lg text-gray-400 hover:text-navy
                   flex items-center justify-center transition-colors shrink-0"
        title="Annuler la réponse"
      >
        <FontAwesomeIcon icon={faXmark} className="text-sm" />
      </button>
    </div>
  );
}

function MessageActionSheet({ msg, isOwn, currentUserId, onReact, onClose, children }) {
  return (
    <>
      <div
        className="fixed inset-0 z-40 bg-navy/40"
        onClick={onClose}
        onTouchStart={(e) => e.stopPropagation()}
        onTouchEnd={(e) => e.stopPropagation()}
      />

      <div
        className="fixed bottom-0 inset-x-0 z-50 bg-white border-t border-gray-100
                   rounded-t-2xl shadow-modal animate-fade-in pb-safe"
        onTouchStart={(e) => e.stopPropagation()}
        onTouchEnd={(e) => e.stopPropagation()}
      >
        <div className="w-10 h-1 bg-contact rounded-full mx-auto mt-3 mb-5" />

        <div className="flex justify-around items-center px-6 pb-5">
          {QUICK_REACTIONS.map((emoji) => {
            const hasOwn = msg.reactions?.some(
              (r) => r.userId === currentUserId && r.emoji === emoji
            );
            return (
              <button
                key={emoji}
                type="button"
                onClick={() => { onReact(emoji); onClose(); }}
                className={`flex flex-col items-center gap-1.5 p-2 rounded-xl
                            transition-colors
                            ${hasOwn ? "bg-surface" : "active:bg-surface"}`}
              >
                <span className="text-3xl leading-none">{emoji}</span>
                {hasOwn && (
                  <span className="w-1.5 h-1.5 rounded-full bg-navy" />
                )}
              </button>
            );
          })}
        </div>

        <div className="h-px bg-gray-100 mx-5 mb-2" />

        <div className="flex flex-col pb-6">
          {children}
        </div>
      </div>
    </>
  );
}

function TextMessage({
  msg, isOwn, currentUserId,
  isFirst,
  onReact, onDelete, onImageClick, onDownload,
  pickerMsgId, setPickerMsgId, onReply
}) {
  const [actionSheetOpen, setActionSheetOpen] = useState(false);

  const isMobile = useRef(
    typeof window !== "undefined" && window.matchMedia("(max-width: 1023px)").matches
  ).current;

  const timeStr = formatTime(new Date(msg.createdAt));

  const longPressHandlers = useLongPress(
    () => { if (isMobile) setActionSheetOpen(true); },
    null,
  );

  return (
    <>
      <div
        className={`group relative flex items-end gap-2 mb-2
                    max-w-[95%] sm:max-w-[75%] min-w-0
                    ${isOwn ? "flex-row-reverse" : "flex-row"}
                    animate-message-in`}
        {...longPressHandlers}
        onContextMenu={(e) => e.preventDefault()}
      >
        {!isOwn && isFirst && (
          <div className="w-7 h-7 rounded-full overflow-hidden shrink-0 self-end">
            <ChatAvatar avatar={msg.senderAvatar} name={msg.sender} userRef={msg.senderRef} />
          </div>
        )}
        {!isOwn && !isFirst && <div className="w-7 shrink-0" />}

        <div className={`flex flex-col min-w-0 max-w-full ${isOwn ? "items-end" : "items-start"}`}>
          {isFirst && (
            <span className={`text-[11px] font-medium mb-1 ml-1 flex items-center
                              ${isOwn ? "text-navy/50" : "text-navy/50"}`}>
              {isOwn ? "Vous" : msg.senderRef
                ? <Link to={`/user/${msg.senderRef}`} className="hover:text-navy transition-colors">{msg.sender}</Link>
                : msg.sender}
              {!isOwn && <RoleBadge role={msg.senderRole} />}
            </span>
          )}

          <ReplyQuote
            replyToContent={msg.replyToContent}
            replyToSender={msg.replyToSender}
            isOwn={isOwn}
          />

          <div className="relative">
            {!isMobile && (
              <div className={`absolute top-1/2 -translate-y-1/2 flex items-center gap-1 z-10
                              opacity-0 group-hover:opacity-100 transition-opacity
                              ${isOwn ? "-left-[4.5rem]" : "-right-[4.5rem]"}`}>
                <button type="button"
                  onClick={() => onReply?.({ id: msg.id, sender: isOwn ? "Vous" : msg.sender, content: msg.content })}
                  className="w-7 h-7 rounded-full bg-white border border-gray-100 shadow-card
                            flex items-center justify-center text-xs text-gray-400
                            hover:text-navy transition-colors"
                  title="Répondre">
                  <FontAwesomeIcon icon={faReply} />
                </button>
                
                <button type="button"
                  onClick={() => setPickerMsgId(pickerMsgId === msg.id ? null : msg.id)}
                  className="w-7 h-7 rounded-full bg-white border border-gray-100 shadow-card
                            flex items-center justify-center text-sm text-gray-400
                            hover:text-navy transition-colors"
                  title="Réagir">
                  <FontAwesomeIcon icon={faSmile} />
                </button>
              </div>
            )}

            {!isMobile && pickerMsgId === msg.id && (
              <div className={`absolute bottom-full mb-1 z-50 ${isOwn ? "right-0" : "left-0"}`}>
                <ReactionPicker
                  onReact={(emoji) => onReact?.(msg.id, emoji)}
                  onClose={() => setPickerMsgId(null)}
                />
              </div>
            )}

            <div className={`px-4 py-2 text-sm leading-relaxed min-w-0 max-w-full
                             select-none
                             ${isOwn
                               ? "bg-navy text-white rounded-xl rounded-br-sm"
                               : "bg-surface text-navy rounded-xl rounded-bl-sm"
                             }`}>
              {renderContent(msg.content, onImageClick, () => onDelete?.(msg), isOwn, onDownload)}
            </div>
          </div>

          <ReactionList
            reactions={msg.reactions}
            currentUserId={currentUserId}
            onReact={(emoji) => onReact?.(msg.id, emoji)}
          />

          <div className={`flex items-center gap-1.5 mt-0.5 px-1
                           ${isOwn ? "flex-row-reverse" : "flex-row"}`}>
            <span className="text-[10px] font-medium text-navy/40">{timeStr}</span>
            {isOwn && (
              <>
                <span className={`text-[10px] font-medium ${msg.seen ? "text-navy/70" : "text-navy/30"}`}>
                  {msg.seen ? "✓✓" : "✓"}
                </span>
                <button
                  type="button"
                  onClick={() => onDelete?.(msg)}
                  className="opacity-0 group-hover:opacity-100 text-navy/30
                             hover:text-rose-600 transition-opacity text-[10px] ml-1"
                  title="Supprimer"
                >
                  <FontAwesomeIcon icon={faTrash} />
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {actionSheetOpen && (
        <MessageActionSheet
          msg={msg} isOwn={isOwn} currentUserId={currentUserId}
          onReact={(emoji) => onReact?.(msg.id, emoji)}
          onClose={() => setActionSheetOpen(false)}
        >
          <button type="button"
            onClick={() => {
              setActionSheetOpen(false);
              onReply?.({ id: msg.id, sender: isOwn ? "Vous" : msg.sender, content: msg.content });
            }}
            className="flex items-center gap-3 w-full px-6 py-4 text-sm font-medium text-navy hover:bg-surface transition-colors">
            <FontAwesomeIcon icon={faReply} className="text-gray-400" /> Répondre
          </button>
          {isOwn && (
            <button type="button"
              onClick={() => { setActionSheetOpen(false); onDelete?.(msg); }}
              className="flex items-center gap-3 w-full px-6 py-4 text-sm font-medium text-rose-600 hover:bg-rose-50 transition-colors">
              <FontAwesomeIcon icon={faTrash} /> Supprimer
            </button>
          )}
        </MessageActionSheet>
      )}
    </>
  );
}

function ImageMessage({ parsed }) {
  return (
    <img
      src={parsed.url}
      alt={parsed.filename}
      className="max-w-[200px] sm:max-w-[320px] max-h-[300px] w-auto h-auto
                 object-contain rounded-lg block select-none"
      loading="lazy"
      draggable={false}
      onContextMenu={(e) => e.preventDefault()}
      style={{ WebkitTouchCallout: "none" }}
    />
  );
}


function FileMessage({ parsed }) {
  return (
    <div className="flex items-center gap-2.5 py-2 px-2 bg-white rounded-lg max-w-full">
      <div className="flex flex-col items-center bg-surface rounded-lg shrink-0 py-2 px-3">
        <FontAwesomeIcon className="text-sm text-navy" icon={faFile} />
        <span className="text-[9px] font-medium text-navy/60 uppercase">
          {parsed.extension && `.${parsed.extension}`}
        </span>
      </div>
      <div className="flex flex-col text-navy text-xs font-medium min-w-0">
        <span className="truncate">{parsed.filename?.substring(0, 20)}...</span>
        <span className="text-navy/50">{parsed.size && `(${(parsed.size / 1024).toFixed(1)} KB)`}</span>
      </div>
    </div>
  );
}

function MediaMessage({
  msg, isOwn, isFirst, currentUserId,
  onReact, onDelete, onImageClick, onDownload,
  pickerMsgId, setPickerMsgId, onReply
}) {
  const [actionSheetOpen, setActionSheetOpen] = useState(false);

  const parsed  = parseFileContent(msg.content);
  const isImage = parsed?.type === "img";
  const isMobile = useRef(window.matchMedia("(max-width: 1023px)").matches).current;
  const timeStr = formatTime(new Date(msg.createdAt));

  const handleDownload = useCallback(async () => {
    try {
      const res  = await fetch(parsed.url);
      const blob = await res.blob();
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement("a");
      a.href = url;
      a.download = parsed.filename || "fichier";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch {
      window.open(parsed.url, "_blank");
    }
  }, [parsed.url, parsed.filename]);

  const longPressHandlers = useLongPress(
    () => setActionSheetOpen(true),
    () => isImage
      ? onImageClick?.({ url: parsed.url, filename: parsed.filename })
      : handleDownload(),
  );

  return (
    <>
      <div
        className={`group relative flex items-end gap-2 mb-2
                    max-w-[95%] sm:max-w-[75%] min-w-0
                    ${isOwn ? "flex-row-reverse" : "flex-row"}`}
      >
        {!isOwn && isFirst && (
          <div className="w-7 h-7 rounded-full overflow-hidden shrink-0 self-end">
            <ChatAvatar avatar={msg.senderAvatar} name={msg.sender} userRef={msg.senderRef} />
          </div>
        )}
        {!isOwn && !isFirst && <div className="w-7 shrink-0" />}

        <div className={`flex flex-col min-w-0 max-w-full ${isOwn ? "items-end" : "items-start"}`}>
          {isFirst && (
            <span className="text-[11px] font-medium mb-1 ml-1 flex items-center text-navy/50">
              {isOwn ? "Vous" : msg.senderRef
                ? <Link to={`/user/${msg.senderRef}`} className="hover:text-navy transition-colors">{msg.sender}</Link>
                : msg.sender}
              {!isOwn && <RoleBadge role={msg.senderRole} />}
            </span>
          )}

          <div className="relative">
            {!isMobile && (
              <div className={`absolute top-1/2 -translate-y-1/2 flex items-center gap-1 z-10
                              opacity-0 group-hover:opacity-100 transition-opacity
                              ${isOwn ? "-left-[4.5rem]" : "-right-[4.5rem]"}`}>
                <button type="button"
                  onClick={() => onReply?.({ id: msg.id, sender: isOwn ? "Vous" : msg.sender, content: msg.content })}
                  className="w-7 h-7 rounded-full bg-white border border-gray-100 shadow-card
                            flex items-center justify-center text-xs text-gray-400
                            hover:text-navy transition-colors"
                  title="Répondre">
                  <FontAwesomeIcon icon={faReply} />
                </button>
                
                <button type="button"
                  onClick={() => setPickerMsgId(pickerMsgId === msg.id ? null : msg.id)}
                  className="w-7 h-7 rounded-full bg-white border border-gray-100 shadow-card
                            flex items-center justify-center text-sm text-gray-400
                            hover:text-navy transition-colors"
                  title="Réagir">
                  <FontAwesomeIcon icon={faSmile} />
                </button>
              </div>
            )}

            {!isMobile && pickerMsgId === msg.id && (
              <div className={`absolute bottom-full mb-1 z-50 ${isOwn ? "right-0" : "left-0"}`}>
                <ReactionPicker
                  onReact={(emoji) => onReact?.(msg.id, emoji)}
                  onClose={() => setPickerMsgId(null)}
                />
              </div>
            )}

            {(msg.replyToContent) && (
                <div className="px-3 pt-2">
                  <ReplyQuote
                    replyToContent={msg.replyToContent}
                    replyToSender={msg.replyToSender}
                    isOwn={isOwn}
                  />
                </div>
              )}

            <div
              className={`rounded-xl overflow-hidden cursor-pointer p-1
                          ${isOwn ? "bg-navy" : "bg-surface"}`}
              {...longPressHandlers}
              onContextMenu={(e) => e.preventDefault()}
              style={{ WebkitTouchCallout: "none" }}
            >
              {isImage
                ? <ImageMessage parsed={parsed} />
                : <FileMessage  parsed={parsed} />
              }
            </div>
          </div>

          <ReactionList
            reactions={msg.reactions}
            currentUserId={currentUserId}
            onReact={(emoji) => onReact?.(msg.id, emoji)}
          />

          <div className={`flex items-center gap-1.5 mt-0.5 px-1
                           ${isOwn ? "flex-row-reverse" : "flex-row"}`}>
            <span className="text-[10px] font-medium text-navy/40">{timeStr}</span>
            {isOwn && (
              <span className={`text-[10px] font-medium ${msg.seen ? "text-navy/70" : "text-navy/30"}`}>
                {msg.seen ? "✓✓" : "✓"}
              </span>
            )}
          </div>
        </div>
      </div>

      {actionSheetOpen && (
        <MessageActionSheet
          msg={msg}
          isOwn={isOwn}
          currentUserId={currentUserId}
          onReact={(emoji) => onReact?.(msg.id, emoji)}
          onClose={() => setActionSheetOpen(false)}
        >
          {isImage && (
            <button type="button"
              onClick={() => { setActionSheetOpen(false); onImageClick?.({ url: parsed.url, filename: parsed.filename }); }}
              className="flex items-center gap-3 w-full px-6 py-4 text-sm font-medium text-navy hover:bg-surface transition-colors">
              <FontAwesomeIcon icon={faEye} className="text-gray-400" /> Visionner
            </button>
          )}

          <button type="button"
            onClick={() => {
              setActionSheetOpen(false);
              onReply?.({ id: msg.id, sender: isOwn ? "Vous" : msg.sender, content: msg.content });
            }}
            className="flex items-center gap-3 w-full px-6 py-4 text-sm font-medium text-navy hover:bg-surface transition-colors">
            <FontAwesomeIcon icon={faReply} className="text-gray-400" /> Répondre
          </button>

          <button type="button"
            onClick={() => { setActionSheetOpen(false); handleDownload(); }}
            className="flex items-center gap-3 w-full px-6 py-4 text-sm font-medium text-navy hover:bg-surface transition-colors">
            <FontAwesomeIcon icon={faDownload} className="text-gray-400" /> Télécharger
          </button>

          {isOwn && (
            <button type="button"
              onClick={() => { setActionSheetOpen(false); onDelete?.(msg); }}
              className="flex items-center gap-3 w-full px-6 py-4 text-sm font-medium text-rose-600 hover:bg-rose-50 transition-colors">
              <FontAwesomeIcon icon={faTrash} /> Supprimer
            </button>
          )}
        </MessageActionSheet>
      )}
    </>
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
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4 py-6 bg-navy/40">
      <div className="w-full max-w-sm rounded-2xl border border-gray-100 bg-white shadow-modal overflow-hidden animate-fade-in">
        <div className="flex items-start gap-3 p-5 border-b border-gray-100">
          <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">
            <FontAwesomeIcon icon={faTrash} className="text-sm" />
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="text-navy font-bold text-base">
              Supprimer ce message ?
            </h3>
            <p className="text-navy/50 text-xs mt-1 leading-relaxed">
              Cette action est définitive et le message disparaîtra de la conversation.
            </p>
          </div>
          <button
            type="button"
            onClick={onCancel}
            disabled={deleting}
            className="w-8 h-8 rounded-lg text-gray-400 hover:text-navy hover:bg-surface transition-colors disabled:opacity-40"
            title="Fermer"
          >
            <FontAwesomeIcon icon={faXmark} className="text-sm" />
          </button>
        </div>

        <div className="px-5 py-4">
          <div className="rounded-xl bg-surface px-4 py-3">
            <p className="text-navy/50 text-[11px] font-medium uppercase tracking-[0.1em] mb-1">
              Aperçu
            </p>
            <p className="text-navy text-sm leading-relaxed break-words">
              {getMessagePreview(message.content)}
            </p>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 px-5 pb-5">
          <button
            type="button"
            onClick={onCancel}
            disabled={deleting}
            className="px-4 py-2 rounded-xl text-sm font-medium text-navy bg-[#F6F7F8] hover:bg-white hover:ring-1 hover:ring-gold/50 transition disabled:opacity-40"
          >
            Annuler
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={deleting}
            className="px-4 py-2 rounded-xl bg-rose-500 text-white text-sm font-medium hover:bg-rose-600 transition disabled:opacity-60 disabled:cursor-not-allowed flex items-center gap-2"
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

function MessageGroup({ messages, isOwn, onDelete, onImageClick, onDownload, onReact, onReply, currentUserId }) {
  const [pickerMsgId, setPickerMsgId] = useState(null);

  return (
    <div className={`flex flex-col ${isOwn ? "items-end" : "items-start"}`}>
      {messages.map((msg, idx) => {
        const isFirst = idx === 0;
        const sharedProps = {
          msg, isOwn, isFirst, currentUserId,
          onReact, onDelete, onImageClick, onDownload,
          onReply,
          pickerMsgId, setPickerMsgId,
        };

        if (isFileMessage(msg.content)) {
          return <MediaMessage key={msg.id} {...sharedProps} />;
        }

        return <TextMessage key={msg.id} {...sharedProps} />;
      })}
    </div>
  );
}

function ContactAvatar({ contact, onlineUsers }) {
  if (contact.isGlobal) {
    return (
      <div className="w-10 h-10 rounded-full bg-navy flex items-center justify-center shrink-0">
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
        color="bg-navy"
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
  onReact,
  currentUserId,
  onReply,
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
  const [error, setError] = useState("");
  const bottomRef = useRef(null);
  const fileRef = useRef(null);
  const inputRef = useRef(null);
  const emojiButtonRef = useRef(null);
  const emojiPickerRef = useRef(null);
  const scrollRef = useRef(null);
  const prevScrollHeight = useRef(0);
  const prevMsgCount = useRef(messages.length);
  const [replyingTo, setReplyingTo] = useState(null); 

  const handleReact = useCallback(async (messageId, emoji) => {
    try {
      await onReact?.(messageId, emoji);
    } catch(err) {
      console.error("Failed to react:", err);
    }
  }, [onReact]);

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
    setReplyingTo(null);
  }, [contact.id]);

  useEffect(() => {
    const onKey = (e) => { if (e.key === "Escape") setReplyingTo(null); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

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

    setSending(true);

    try {
      if (selectedFile) {
        const fd = new FormData();
        fd.append("file", selectedFile);
        const { data } = await api.post("/messages/upload", fd);
        await onSend(
          `[FILE:${data.filename}:${data.url}:${data.isImage ? "img" : "file"}:${selectedFile.size}]`,
          replyingTo?.id ?? null,
        );
        setSelectedFile(null);
        setPreviewUrl(null);
      }

      if (trimmed && !selectedFile) {
        await onSend(trimmed, replyingTo?.id ?? null);
      }

      setText("");
      setReplyingTo(null);   
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
    <div className="flex flex-col h-full min-w-0 bg-white">
      {/* Header */}
      <div className="relative flex flex-col items-center justify-center gap-1.5 px-4 sm:px-6 py-3 sm:py-4 bg-white border-b border-gray-100 shrink-0">
        <Link 
          to={!contact.isGlobal && contact.ref ? `/user/${contact.ref}` : "#"} 
          className={`flex flex-col items-center gap-1.5 group ${!contact.isGlobal && contact.ref ? "hover:opacity-80 transition-opacity" : "cursor-default pointer-events-none"}`}
        >
          <ContactAvatar contact={contact} onlineUsers={onlineUsers} />
          <div className="min-w-0 text-center">
            <h3 className="text-navy font-semibold text-sm sm:text-base truncate flex items-center justify-center gap-1.5">
              {contact.name}
              {!contact.isGlobal && <RoleBadge role={contact.role} />}
            </h3>
            <p className="text-navy/40 text-xs font-medium mt-0.5 truncate">
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
          className="absolute right-4 sm:right-6 w-9 h-9 rounded-xl bg-[#F6F7F8] text-navy/70 flex items-center justify-center hover:text-navy hover:bg-white hover:ring-1 hover:ring-gold/50 transition-colors shrink-0"
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
            <span className="text-navy/50 text-[10px] font-medium hidden sm:inline">
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
          <div className="flex flex-col items-center justify-center h-full gap-3 select-none">
            <img
              src={HEI_BLUE_LOGO}
              alt="HEI"
              className="w-14 h-14 object-contain"
            />
            <p className="text-navy/40 text-xs sm:text-sm font-medium">Aucun message pour l'instant.</p>
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
                  onReact={handleReact}
                  onReply={setReplyingTo} 
                  currentUserId={currentUserId} 
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
                       bg-white border border-gray-100 shadow-modal
                       text-navy flex items-center justify-center
                       hover:bg-surface transition-colors z-10"
            title="Revenir en bas"
          >
            <FontAwesomeIcon icon={faChevronDown} className="text-sm" />
          </button>
        )}
      </div>

      {/* Input */}
      <div className="relative px-3 sm:px-6 py-3 sm:py-4 bg-white border-t border-gray-100 shrink-0">

        {error && (
          <div
            className="absolute bottom-[calc(100%+0.5rem)] right-4 sm:right-10 px-4 py-2 bg-[#FEF3F2] border border-[#FECACA] rounded-xl flex items-center gap-2 animate-fade-in shadow-card z-20 cursor-pointer"
            onClick={() => setError("")}
          >
            <FontAwesomeIcon icon={faTriangleExclamation} className="text-xs text-[#B42318] shrink-0" />
            <span className="text-xs text-[#B42318]">{error}</span>
          </div>
        )}
        {selectedFile && (
          <div className="absolute bottom-[calc(100%+0.5rem)] left-4 sm:left-10 p-3 bg-white border border-gray-100 rounded-xl flex items-center gap-4 animate-fade-in shadow-modal z-20">
            <div className="relative">
              {previewUrl ? (
                <img src={previewUrl} alt="Preview" className="w-16 h-16 object-cover rounded-lg bg-surface" />
              ) : (
                <div className="w-16 h-16 bg-surface rounded-lg flex items-center justify-center">
                  <FontAwesomeIcon icon={faFile} className="text-2xl text-navy/50" />
                </div>
              )}
              <button
                type="button"
                onClick={() => {
                  setSelectedFile(null);
                  setPreviewUrl(null);
                }}
                className="absolute -top-2 -right-2 w-6 h-6 bg-rose-500 rounded-full text-white text-xs flex items-center justify-center hover:bg-rose-600 transition-colors"
              >
                <FontAwesomeIcon icon={faXmark} />
              </button>
            </div>
            <div className="flex flex-col min-w-[120px] max-w-[200px]">
              <span className="text-sm text-navy font-medium truncate">{selectedFile.name}</span>
              <span className="text-xs text-navy/50">{(selectedFile.size / 1024).toFixed(1)} KB</span>
            </div>
          </div>
        )}

        <ReplyBar
          replyingTo={replyingTo}
          onCancel={() => setReplyingTo(null)}
        />

        <div className="relative flex items-center gap-2 bg-[#F6F7F8] rounded-xl px-2 sm:px-3 py-1.5 focus-within:bg-white focus-within:ring-1 focus-within:ring-gold/50 transition-all">
          {showEmojiPicker && (
            <div
              ref={emojiPickerRef}
              className="absolute bottom-full left-0 sm:left-4 mb-3 z-30 max-w-[calc(100vw-1rem)] overflow-hidden rounded-xl border border-gray-100 shadow-modal"
            >
              <Suspense
                fallback={
                  <div className="w-[min(360px,calc(100vw-1rem))] h-[420px] bg-white text-navy/50 flex items-center justify-center text-sm">
                    Chargement...
                  </div>
                }
              >
                <EmojiPicker
                  onEmojiClick={handleEmojiClick}
                  theme="light"
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
            className="w-9 h-9 rounded-lg text-gray-400 hover:text-navy hover:bg-white flex items-center justify-center transition-colors shrink-0"
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
            className={`w-9 h-9 rounded-lg flex items-center justify-center transition-colors shrink-0 ${
              showEmojiPicker
                ? "bg-navy text-white"
                : "text-gray-400 hover:text-navy hover:bg-white"
            }`}
          >
            <FontAwesomeIcon icon={faSmile} className="text-sm" />
          </button>
          <input
            ref={inputRef}
            className="flex-1 min-w-0 text-sm text-navy bg-transparent focus:outline-none placeholder:text-gray-400 py-2"
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
            className="w-9 h-9 rounded-xl bg-navy text-white flex items-center justify-center hover:bg-navy-dark transition-colors shrink-0 disabled:opacity-30 disabled:cursor-not-allowed"
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

      {lightboxImg && (
        <div
          className="fixed inset-0 bg-navy/95 z-50 flex flex-col items-center justify-center p-4 animate-fade-in cursor-zoom-out"
          onClick={() => setLightboxImg(null)}
        >
          <div
            className="absolute top-0 inset-x-0 h-16 bg-black/40 flex items-center justify-between px-6 text-white z-10"
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
            className="max-w-full max-h-[85vh] object-contain rounded-lg select-none"
          />
        </div>
      </div>
    )}
    </div>
  );
}
