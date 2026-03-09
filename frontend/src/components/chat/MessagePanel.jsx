import { useState, useRef, useEffect } from "react";
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
    } catch (err) {
      await onSend(`[Fichier : ${file.name}]`);
    } finally {
      setSending(false);
      e.target.value = "";
    }
  };

  const isFileMessage = (content) => content.startsWith("[FILE:");

  const renderContent = (content) => {
    const fileMatchNew = content.match(/^\[FILE:(.+):(.+):(img|file)\]$/);
    if (fileMatchNew) {
      const [, filename, url, type] = fileMatchNew;
      if (type === "img") {
        return (
          <a href={url} target="_blank" rel="noreferrer">
            <img
              src={url}
              alt={filename}
              className="max-w-56 max-h-56 object-cover rounded-2xl
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
                      hover:text-blue-200 hover:underline text-xs font-medium px-3 py-2"
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
              className="max-w-56 max-h-56 object-cover rounded-2xl
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
                      hover:text-blue-200 hover:underline text-xs font-medium px-3 py-2"
        >
          <FontAwesomeIcon icon={faFile} />
          <span>{filename}</span>
        </a>
      );
    }

    // Texte normal — sanitiser XSS
    const clean = DOMPurify.sanitize(content);
    return <span dangerouslySetInnerHTML={{ __html: clean }} />;
  };

  const ContactAvatar = () => {
    if (contact.isGlobal) {
      return (
        <div
          className="w-9 h-9 rounded-full bg-white/10 border border-white/20
                        flex items-center justify-center shrink-0"
        >
          <img
            src={HEI_WHITE_LOGO}
            alt="HEI"
            className="w-5 h-5 object-cover"
          />
        </div>
      );
    }
    if (contact.avatar) {
      return (
        <div className="w-9 h-9 rounded-full overflow-hidden shrink-0 border-2 border-white/20">
          <img
            src={contact.avatar}
            alt={contact.name}
            className="w-full h-full object-cover"
          />
        </div>
      );
    }
    return <Avatar name={contact.name} size="md" color="bg-gold/30" />;
  };

  return (
    <div className="flex flex-col h-full bg-[#0f1e33]">
      {/* Header */}
      <div
        className="flex flex-col items-center justify-center
                      px-4 sm:px-5 py-3 sm:py-4
                      bg-[#1a2b45] border-b border-white/10 shrink-0 relative"
      >
        <button
          type="button"
          onClick={onOpenContacts}
          className="lg:hidden absolute right-4 top-1/2 -translate-y-1/2
                           w-8 h-8 rounded-full bg-white/10 text-white
                           flex items-center justify-center hover:bg-white/20 transition"
        >
          <FontAwesomeIcon icon={faChevronLeft} className="text-sm" />
        </button>
        <ContactAvatar />
        <div className="text-center mt-1">
          <h3 className="text-white font-bold text-sm">{contact.name}</h3>
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
        className="flex-1 overflow-y-auto px-3 sm:px-5 py-4 flex flex-col gap-3 relative"
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
          <div className="flex flex-col items-center justify-center h-full gap-3 opacity-30">
            <img
              src={HEI_WHITE_LOGO}
              alt="HEI"
              className="w-12 h-12 object-contain rounded-full"
            />
            <p className="text-white text-sm">Démarrez la conversation...</p>
          </div>
        )}

        {!loading &&
          messages.map((msg) => (
            <div
              key={msg.id}
              className={
                "flex items-end gap-2 " +
                (msg.own ? "flex-row-reverse" : "flex-row")
              }
            >
              {!msg.own &&
                (msg.senderAvatar ? (
                  <div className="w-7 h-7 rounded-full overflow-hidden shrink-0">
                    <img
                      src={msg.senderAvatar}
                      alt={msg.sender}
                      className="w-full h-full object-cover"
                    />
                  </div>
                ) : (
                  <Avatar name={msg.sender} size="sm" color="bg-white/20" />
                ))}
              <div
                className={
                  "flex flex-col max-w-[75%] sm:max-w-sm " +
                  (msg.own ? "items-end" : "items-start")
                }
              >
                {!msg.own && (
                  <span className="text-white/50 text-xs mb-1 ml-1 font-medium">
                    {msg.sender}
                  </span>
                )}
                <div
                  className={
                    "rounded-2xl shadow overflow-hidden " +
                    "text-xs sm:text-sm font-medium " +
                    (msg.own ? "rounded-br-sm" : "rounded-bl-sm") +
                    (isFileMessage(msg.content)
                      ? ""
                      : msg.own
                        ? " bg-gold text-white px-3 sm:px-4 py-2 sm:py-2.5"
                        : " bg-white/10 text-white px-3 sm:px-4 py-2 sm:py-2.5")
                  }
                >
                  {renderContent(msg.content)}
                </div>
                <div className="flex items-center gap-1 mt-1 mx-1">
                  <span className="text-white/30 text-xs">{msg.time}</span>
                  {msg.own && !msg.seen && (
                    <span className="text-white/30 text-xs">✓</span>
                  )}
                  {msg.own && msg.seen && (
                    <span className="text-gold text-xs">✓✓</span>
                  )}
                </div>
              </div>
            </div>
          ))}
        <div ref={bottomRef} />

        {!isAtBottom && (
          <button
            type="button"
            onClick={() => {
              onScrollToBottom();
              bottomRef.current?.scrollIntoView({ behavior: "smooth" });
            }}
            className="fixed bottom-20 right-6 w-10 h-10 rounded-full
                       bg-white/10 backdrop-blur-md border border-white/20
                       text-white flex items-center justify-center
                       hover:bg-white/20 transition shadow-lg z-10"
            title="Revenir en bas"
          >
            <FontAwesomeIcon icon={faChevronDown} className="text-sm" />
          </button>
        )}
      </div>

      {/* Zone saisie */}
      <div
        className="px-3 sm:px-4 py-3 bg-[#1a2b45]
                      border-t border-white/10 shrink-0"
      >
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="w-9 h-9 rounded-full border border-white/20
                             text-white/60 flex items-center justify-center
                             hover:bg-white/10 transition shrink-0"
          >
            <FontAwesomeIcon icon={faPaperclip} className="text-sm" />
          </button>
          <input
            ref={fileRef}
            type="file"
            className="hidden"
            onChange={handleFile}
          />

          <div
            className="flex-1 flex items-center bg-white/10 rounded-2xl
                          px-4 py-2.5 gap-2 border border-white/10"
          >
            <input
              className="flex-1 text-xs sm:text-sm text-white bg-transparent
                         focus:outline-none placeholder:text-white/30"
              placeholder="Écrire un message..."
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={handleKey}
            />
          </div>

          <button
            type="button"
            onClick={handleSend}
            disabled={!text.trim() || sending}
            className="w-9 h-9 rounded-full bg-gold text-white
                             flex items-center justify-center hover:opacity-90
                             transition shadow-lg shrink-0 disabled:opacity-40"
          >
            {sending ? (
              <FontAwesomeIcon
                icon={faSpinner}
                className="text-sm animate-spin"
              />
            ) : (
              <FontAwesomeIcon icon={faPaperPlane} className="text-sm" />
            )}
          </button>
        </div>
      </div>
    </div>
  );
}