import { useState, useEffect, useCallback, useRef, useMemo } from "react";
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
  const [unread, setUnread] = useState({ global: 0, contacts: {} });
  const [contactTotal, setContactTotal] = useState(0);
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

  const fetchUnread = useCallback(async () => {
    try {
      const { data } = await api.get("/messages/unread");
      setUnread(data);
    } catch (err) {
      console.error(err);
    }
  }, []);

  const markGlobalRead = useCallback(async (messageId) => {
    try {
      await api.post("/messages/global/read", { messageId });
    } catch (err) {
      console.error(err);
    }
  }, []);

  useEffect(() => {
    api
      .get("/messages/contacts", { params: { limit: 500 } })
      .then(({ data }) => {
        const usersList = Array.isArray(data) ? data : data?.users;
        if (!Array.isArray(usersList)) return;
        const formatted = usersList.map((c) => ({
          id: c.id,
          name: c.pseudo,
          role: c.role,
          ref: c.ref,
          level: c.level,
          avatar: c.avatar || null,
        }));
        setContacts([GLOBAL_CONTACT, ...formatted]);
        if (data.total) setContactTotal(data.total);
      })
      .catch(console.error);
    fetchUnread();
  }, [fetchUnread]);

  const markSeen = useCallback(async (contact) => {
    if (contact.isGlobal) {
      const msgs = messagesRef.current["global"] || [];
      const last = msgs[msgs.length - 1];
      if (last) markGlobalRead(last.id);
      setUnread((prev) => ({ ...prev, global: 0 }));
      return;
    }
    const msgs = messagesRef.current[contact.id] || [];
    const unseenIds = msgs.filter((m) => !m.own && !m.seen).map((m) => m.id);
    if (unseenIds.length > 0) {
      try {
        await api.patch("/messages/seen", { ids: unseenIds });
      } catch (err) {
        console.error(err);
      }
    }
    setUnread((prev) => ({
      ...prev,
      contacts: { ...prev.contacts, [contact.id]: { ...prev.contacts[contact.id], unread: 0 } },
    }));
  }, [markGlobalRead]);

  const formatMsg = useCallback(
    (m) => ({
      id: m.id,
      sender: m.sender_pseudo || "Inconnu",
      senderAvatar: m.sender_avatar || null,
      senderId: m.sender_id,
      senderRole: m.sender_role || null,
      content: m.content || "",
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
          ({ data } = await api.get("/messages/global", { params: { limit: 200 } }));
        } else {
          ({ data } = await api.get(`/messages/private/${contact.id}`, { params: { limit: 100 } }));
        }
        const msgList = Array.isArray(data) ? data : data?.messages;
        if (!Array.isArray(msgList)) return;
        const formatted = msgList.map(formatMsg);
        messagesRef.current = { ...messagesRef.current, [contact.id]: formatted };
        setMessages((prev) => ({
          ...prev,
          [contact.id]: formatted,
        }));
      } catch (err) {
        console.error(err);
      } finally {
        if (!silent) setLoadingMessages(false);
      }
    },
    [formatMsg],
  );

  const loadOlderMessages = useCallback(async (contact) => {
    const currentMsgs = messagesRef.current[contact.id] || [];
    if (currentMsgs.length === 0) return;
    const oldestId = currentMsgs[0].id;
    try {
      let data;
      if (contact.isGlobal) {
        ({ data } = await api.get("/messages/global", { params: { before: oldestId, limit: 100 } }));
      } else {
        ({ data } = await api.get(`/messages/private/${contact.id}`, { params: { before: oldestId, limit: 100 } }));
      }
      const msgList = Array.isArray(data) ? data : data?.messages;
      if (!Array.isArray(msgList) || msgList.length === 0) return;
      const msgs = msgList.map(formatMsg);
      setMessages((prev) => ({
        ...prev,
        [contact.id]: [...msgs.reverse(), ...(prev[contact.id] || [])],
      }));
    } catch (err) {
      console.error(err);
    }
  }, [formatMsg]);

  useEffect(() => {
    if (activeContact) {
      (async () => {
        await loadMessages(activeContact);
        markSeen(activeContact);
      })();
    }
  }, [activeContact, loadMessages, markSeen]);

  useEffect(() => {
    let cancelled = false;
    let socket;

    getSocket()
      .then((s) => {
        if (cancelled) return;
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
                `${msg.sender}: ${msg.content.replace(/\[FILE:.+\]/, "[Fichier]")}`,
              );
            }
            if (!active?.isGlobal) {
              setUnread((prev) => ({ ...prev, global: prev.global + 1 }));
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
                msg.content.replace(/\[FILE:.+\]/, "[Fichier]"),
              );
            }
            if (active?.id !== otherId) {
              setUnread((prev) => ({
                ...prev,
                contacts: {
                  ...prev.contacts,
                  [otherId]: {
                    unread: (prev.contacts[otherId]?.unread || 0) + 1,
                    pending: prev.contacts[otherId]?.pending || 0,
                  },
                },
              }));
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
          let seenContactId = null;
          setMessages((prev) => {
            const updated = { ...prev };
            for (const key of Object.keys(updated)) {
              updated[key] = updated[key].map((m) => {
                if (m.id === messageId) {
                  seenContactId = key;
                  return { ...m, seen: true };
                }
                return m;
              });
            }
            return updated;
          });
          if (seenContactId && seenContactId !== "global") {
            setUnread((prev) => {
              const contact = prev.contacts[seenContactId];
              if (!contact || !contact.pending) return prev;
              return {
                ...prev,
                contacts: {
                  ...prev.contacts,
                  [seenContactId]: {
                    ...contact,
                    pending: Math.max(0, contact.pending - 1),
                  },
                },
              };
            });
          }
        });

        socket.on("message:deleted", ({ messageId }) => {
          setMessages((prev) => {
            const updated = { ...prev };
            for (const key of Object.keys(updated)) {
              updated[key] = updated[key].filter((m) => m.id !== messageId);
            }
            return updated;
          });
        });

        socket.on("unread:update", ({ contactId, unread: u, pending }) => {
          setUnread((prev) => ({
            ...prev,
            contacts: {
              ...prev.contacts,
              [contactId]: {
                unread: u ?? prev.contacts[contactId]?.unread ?? 0,
                pending: pending ?? prev.contacts[contactId]?.pending ?? 0,
              },
            },
          }));
        });

        if (cancelled) return;
      })
      .catch(console.error);

    return () => {
      cancelled = true;
    };
  }, [user, formatMsg]);

  const deleteMessage = async (messageId) => {
    try {
      await api.delete(`/messages/${messageId}`);
      setMessages((prev) => {
        const updated = { ...prev };
        for (const key of Object.keys(updated)) {
          updated[key] = updated[key].filter((m) => m.id !== messageId);
        }
        return updated;
      });
    } catch (err) {
      console.error(err);
    }
  };

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
        fixed inset-y-0 left-0 z-20 w-[85vw] max-w-80
        transform transition-transform duration-300 ease-out
        ${showContactList ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}
      `}
      >
        <ContactList
          contacts={contacts}
          activeId={activeContact.id}
          onSelect={handleSelectContact}
          onlineUsers={onlineUsers}
          unread={unread}
          totalContacts={contactTotal}
        />
      </div>

      {showContactList && (
        <div
          className="lg:hidden fixed inset-0 bg-black/50 z-10 animate-fade-in"
          onClick={() => setShowContactList(false)}
        />
      )}

      <div className="flex-1 flex flex-col min-w-0">
        <MessagePanel
          contact={activeContact}
          messages={messages[activeContact.id] || []}
          loading={loadingMessages}
          onSend={sendMessage}
          onDelete={deleteMessage}
          onOpenContacts={() => setShowContactList(true)}
          isAtBottom={isAtBottom}
          onAtBottomChange={setIsAtBottom}
          onScrollToBottom={handleScrollToBottom}
          onlineUsers={onlineUsers}
          onLoadOlder={() => loadOlderMessages(activeContact)}
        />
      </div>
    </div>
  );
}
