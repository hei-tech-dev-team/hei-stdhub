import { useState, useEffect, useCallback, useRef } from "react";
import api from "../../api/axios";
import { useAuth } from "../../context/AuthContext";
import { getSocket, disconnectSocket } from "../../socket";
import ContactList from "./ContactList";
import MessagePanel from "./MessagePanel";

const GLOBAL_CONTACT = {
  id: "global",
  name: "Chat global",
  isGlobal: true,
};

function requestNotifyPermission() {
  if (!("Notification" in window)) return;
  if (Notification.permission === "default") {
    Notification.requestPermission();
  }
}

function showNotification(title, body) {
  if (!("Notification" in window)) return;
  if (Notification.permission !== "granted") return;
  if (!document.hidden) return;

  try {
    const n = new Notification(title, {
      body,
      icon: "/hei-logo.png",
      tag: "hei-chat",
    });
    setTimeout(() => n.close(), 5000);
  } catch {
    // Notification non supportée ou refusée
  }
}

export default function ChatLayout() {
  const { user } = useAuth();
  const [contacts, setContacts] = useState([GLOBAL_CONTACT]);
  const [activeContact, setActiveContact] = useState(GLOBAL_CONTACT);
  const [messages, setMessages] = useState({});
  const [showContactList, setShowContactList] = useState(false);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [onlineUsers, setOnlineUsers] = useState(new Set());
  const [isAtBottom, setIsAtBottom] = useState(true);
  const activeContactRef = useRef(activeContact);
  const isAtBottomRef = useRef(true);
  const messagesRef = useRef(messages);

  useEffect(() => {
    activeContactRef.current = activeContact;
  }, [activeContact]);

  useEffect(() => {
    isAtBottomRef.current = isAtBottom;
  }, [isAtBottom]);

  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  useEffect(() => {
    requestNotifyPermission();
  }, []);

  useEffect(() => {
    api
      .get("/messages/contacts")
      .then(({ data }) => {
        const formatted = data.map((c) => ({
          id: c.id,
          name: c.pseudo,
          role: c.role,
          ref: c.ref,
          level: c.level,
          avatar: c.avatar || null,
        }));
        setContacts([GLOBAL_CONTACT, ...formatted]);
      })
      .catch(console.error);
  }, []);

  const formatMsg = useCallback(
    (m) => ({
      id: m.id,
      sender: m.sender_pseudo || "Inconnu",
      senderAvatar: m.sender_avatar || null,
      senderId: m.sender_id,
      content: m.content,
      own: m.sender_id === user.id,
      seen: m.seen || false,
      createdAt: m.created_at,
    }),
    [user],
  );

  const loadMessages = useCallback(
    async (contact, silent = false) => {
      if (!silent) setLoadingMessages(true);
      try {
        let data;
        if (contact.isGlobal) {
          ({ data } = await api.get("/messages/global"));
        } else {
          ({ data } = await api.get(`/messages/private/${contact.id}`));
        }
        setMessages((prev) => ({
          ...prev,
          [contact.id]: data.map(formatMsg),
        }));
      } catch (err) {
        console.error(err);
      } finally {
        if (!silent) setLoadingMessages(false);
      }
    },
    [formatMsg],
  );

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (activeContact) loadMessages(activeContact);
  }, [activeContact, loadMessages]);

  // Socket.IO + push notifications
  useEffect(() => {
    let socket;

    getSocket()
      .then((s) => {
        socket = s;
        socket.emit("user:join", user.id);

        socket.on("message:global", (data) => {
          const msg = formatMsg(data);
          setMessages((prev) => {
            const existing = prev["global"] || [];
            if (existing.some((m) => m.id === msg.id)) return prev;
            return { ...prev, global: [...existing, msg] };
          });

          if (!msg.own) {
            const active = activeContactRef.current;
            if (document.hidden || !active?.isGlobal) {
              showNotification(
                "HEI STDhub – Chat global",
                `${msg.sender}: ${msg.content.replace(/\[FILE:.+\]/, "📎 Fichier")}`,
              );
            }
          }
        });

        socket.on("message:private", (data) => {
          const msg = formatMsg(data);
          const otherId = msg.senderId === user.id ? data.receiver_id : msg.senderId;

          setMessages((prev) => {
            const existing = prev[otherId] || [];
            if (existing.some((m) => m.id === msg.id)) return prev;
            return { ...prev, [otherId]: [...existing, msg] };
          });

          if (!msg.own) {
            const active = activeContactRef.current;
            if (document.hidden || active?.id !== otherId) {
              showNotification(
                `Message de ${msg.sender}`,
                msg.content.replace(/\[FILE:.+\]/, "📎 Fichier"),
              );
            }
          }
        });

        socket.on("user:online", (userId) => {
          setOnlineUsers((prev) => new Set(prev).add(userId));
        });

        socket.on("user:offline", (userId) => {
          setOnlineUsers((prev) => {
            const next = new Set(prev);
            next.delete(userId);
            return next;
          });
        });

        socket.on("message:seen", ({ messageId }) => {
          setMessages((prev) => {
            const updated = { ...prev };
            for (const key of Object.keys(updated)) {
              updated[key] = updated[key].map((m) =>
                m.id === messageId ? { ...m, seen: true } : m,
              );
            }
            return updated;
          });
        });
      })
      .catch(console.error);

    return () => {
      disconnectSocket();
    };
  }, [user, formatMsg]);

  const sendMessage = async (content) => {
    try {
      const payload = activeContact.isGlobal
        ? { content, is_global: true }
        : { content, receiver_id: activeContact.id, is_global: false };
      await api.post("/messages", payload);
    } catch (err) {
      console.error(err);
    }
  };

  const handleSelectContact = (contact) => {
    setActiveContact(contact);
    setShowContactList(false);
    setIsAtBottom(true);
  };

  const handleScrollToBottom = () => {
    setIsAtBottom(true);
  };

  return (
    <div className="flex w-full h-screen overflow-hidden">
      <div
        className={`
        lg:relative lg:translate-x-0 lg:w-72 lg:flex lg:shrink-0
        fixed inset-y-0 left-0 z-20 w-72
        transform transition-transform duration-300
        ${showContactList ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}
      `}
      >
        <ContactList
          contacts={contacts}
          activeId={activeContact.id}
          onSelect={handleSelectContact}
          onlineUsers={onlineUsers}
        />
      </div>

      {showContactList && (
        <div
          className="lg:hidden fixed inset-0 bg-black/60 backdrop-blur-sm z-10"
          onClick={() => setShowContactList(false)}
        />
      )}

      <div className="flex-1 flex flex-col min-w-0">
        <MessagePanel
          contact={activeContact}
          messages={messages[activeContact.id] || []}
          loading={loadingMessages}
          onSend={sendMessage}
          onOpenContacts={() => setShowContactList(true)}
          isAtBottom={isAtBottom}
          onAtBottomChange={setIsAtBottom}
          onScrollToBottom={handleScrollToBottom}
          onlineUsers={onlineUsers}
        />
      </div>
    </div>
  );
}
