import { useState, useRef, useEffect } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faPaperPlane,
  faPlus,
  faSmile,
  faUser,
} from "@fortawesome/free-solid-svg-icons";
import { HEI_WHITE_LOGO } from "../../assets/logos";
import Avatar from "../ui/Avatar";

export default function MessagePanel({ contact, messages, onSend }) {
  const [text,    setText]    = useState("");
  const bottomRef             = useRef(null);

  /* Scroll auto vers le bas */
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = () => {
    const trimmed = text.trim();
    if (!trimmed) return;
    onSend(trimmed);
    setText("");
  };

  const handleKey = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex-1 flex flex-col bg-[#1a2b45]">

      {/* ── Header conversation ── */}
      <div className="flex items-center gap-4 px-6 py-4 bg-navy-dark
                      border-b border-white/10 shrink-0">
        {contact.isGlobal ? (
          <div className="w-10 h-10 rounded-full bg-navy
                          flex items-center justify-center shrink-0">
            <img
              src={HEI_WHITE_LOGO}
              alt="HEI"
              className="w-6 h-6 object-contain"
            />
          </div>
        ) : (
          <Avatar name={contact.name} size="md" color="bg-navy" />
        )}

        <div>
          <h3 className="text-white font-bold text-sm">
            {contact.name}
          </h3>
          {contact.isGlobal && (
            <p className="text-white/40 text-xs">
              Chat global – tous les membres
            </p>
          )}
          {contact.role && (
            <p className="text-white/40 text-xs capitalize">
              {contact.role === "teacher" ? "Professeur" : "Étudiant"}
            </p>
          )}
        </div>
      </div>

      {/* ── Zone des messages ── */}
      <div className="flex-1 overflow-y-auto px-6 py-4 flex flex-col gap-3">
        {messages.length === 0 && (
          <div className="text-center text-white/30 text-sm mt-10">
            Démarrez la conversation...
          </div>
        )}

        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex items-end gap-2
                        ${msg.own ? "flex-row-reverse" : "flex-row"}`}
          >
            {/* Avatar expéditeur */}
            {!msg.own && (
              <Avatar
                name={msg.sender}
                size="sm"
                color="bg-white/20"
              />
            )}

            {/* Bulle */}
            <div
              className={`flex flex-col max-w-xs lg:max-w-md
                          ${msg.own ? "items-end" : "items-start"}`}
            >
              {!msg.own && (
                <span className="text-white/40 text-xs mb-1 ml-1">
                  {msg.sender}
                </span>
              )}
              <div
                className={`px-4 py-2.5 rounded-2xl text-sm font-medium shadow
                            ${msg.own
                              ? "bg-white text-navy rounded-br-sm"
                              : "bg-white/15 text-white rounded-bl-sm"}`}
              >
                {msg.content}
              </div>
              <span className="text-white/30 text-xs mt-1 mx-1">
                {msg.time}
              </span>
            </div>
          </div>
        ))}

        <div ref={bottomRef} />
      </div>

      {/* ── Zone de saisie ── */}
      <div className="px-4 py-4 bg-navy-dark border-t border-white/10 shrink-0">
        <div className="flex items-center gap-3">

          {/* Input texte */}
          <div className="flex-1 flex items-center bg-white
                          rounded-2xl px-4 py-2.5 gap-2">
            <input
              className="flex-1 text-sm text-navy bg-transparent
                         focus:outline-none placeholder:text-gray-400"
              placeholder="Écrire un message..."
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={handleKey}
            />
            <button
              className="text-gray-400 hover:text-gold transition shrink-0"
              title="Emoji"
            >
              <FontAwesomeIcon icon={faSmile} className="text-base" />
            </button>
          </div>

          {/* Envoyer */}
          <button
            onClick={handleSend}
            className="w-11 h-11 rounded-full bg-gold text-white
                       flex items-center justify-center
                       hover:opacity-90 transition shadow-lg shrink-0"
            title="Envoyer"
          >
            <FontAwesomeIcon icon={faPaperPlane} className="text-sm" />
          </button>

          {/* Pièce jointe */}
          <button
            className="w-11 h-11 rounded-full bg-navy-dark
                       border border-white/20 text-white/60
                       flex items-center justify-center
                       hover:bg-white/10 transition shrink-0"
            title="Ajouter fichier ou image"
            onClick={() =>
              document.getElementById("chat-file").click()
            }
          >
            <FontAwesomeIcon icon={faPlus} className="text-sm" />
          </button>
          <input
            id="chat-file"
            type="file"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files[0];
              if (f) onSend(`[Fichier : ${f.name}]`);
            }}
          />

        </div>
      </div>

    </div>
  );
}