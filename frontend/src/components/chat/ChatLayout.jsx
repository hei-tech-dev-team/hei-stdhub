import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import api from "../../api/axios";
import { useAuth } from "../../context/AuthContext";
import { getSocket, onConnectionChange } from "../../socket";
import ContactList from "./ContactList";
import MessagePanel from "./MessagePanel";

const GLOBAL_CONTACT = {
  id: "global",
  name: "Chat global",
  isGlobal: true,
};

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
  const [searchParams, setSearchParams] = useSearchParams();
  const [contacts, setContacts] = useState([GLOBAL_CONTACT]);
  const [activeContact, setActiveContact] = useState(GLOBAL_CONTACT);
  const [messages, setMessages] = useState({});
  const [showContactList, setShowContactList] = useState(false);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [onlineUsers, setOnlineUsers] = useState(new Set());
  const [isAtBottom, setIsAtBottom] = useState(true);
  const [unread, setUnread] = useState({ global: 0, contacts: {} });
  const [contactTotal, setContactTotal] = useState(0);
  const [favorites, setFavorites] = useState([]);
  const [typingUsers, setTypingUsers] = useState({});
  const [socketState, setSocketState] = useState("connecting");

  const typingTimeoutRef = useRef(null);
  const lastTypingEmitRef = useRef(0);
  const TYPING_TIMEOUT_MS = 3000;
  const TYPING_THROTTLE_MS = 1500;

  useEffect(() => {
    api.get("/messages/favorites")
      .then(({ data }) => setFavorites(Array.isArray(data) ? data : []))
      .catch(() => setFavorites([]));
  }, []);

  const toggleFavorite = useCallback(async (id) => {
    setFavorites((prev) => {
      const isFav = prev.includes(id);
      if (isFav) {
        api.delete(`/messages/favorites/${id}`)
          .catch(() => {
            setFavorites((p) => [...p, id]);
          });
        return prev.filter((fid) => fid !== id);
      }
      api.post("/messages/favorites", { contact_id: id })
        .catch(() => {
          setFavorites((p) => p.filter((fid) => fid !== id));
        });
      return [...prev, id];
    });
  }, []);
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
      .get("/messages/contacts", { params: { limit: 200 } })
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

        const contactParam = searchParams.get("contact");
        if (contactParam) {
          const target = formatted.find((c) => String(c.id) === contactParam);
          if (target) setActiveContact(target);
          setSearchParams({}, { replace: true });
        }
      })
      .catch(console.error);
    fetchUnread();
  }, [fetchUnread, searchParams, setSearchParams]);

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
      senderRef: m.sender_ref || null,
      content: m.content || "",
      own: m.sender_id === user.id,
      seen: m.seen || false,
      createdAt: m.created_at,
      reactions: Array.isArray(m.reactions) ? m.reactions : [],
      replyToId:      m.reply_to_id     ?? null,
      replyToContent: m.reply_to_content ?? null,
      replyToSender:  m.reply_to_sender  ?? null,
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
        [contact.id]: [[...msgs].reverse(), ...(prev[contact.id] || [])].flat(),
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

  const emitTyping = useCallback(async (isTyping) => {
    const contact = activeContactRef.current;
    if (!contact) return;
    const now = Date.now();
    if (isTyping && now - lastTypingEmitRef.current < TYPING_THROTTLE_MS) return;
    lastTypingEmitRef.current = now;

    try {
      const s = await getSocket();
      s.emit(isTyping ? "typing:started" : "typing:stopped", {
        contactId: contact.isGlobal ? "global" : contact.id,
        isGlobal: contact.isGlobal,
      });
    } catch {}
  }, []);

  const emitTypingThrottled = useCallback((isTyping) => {
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    emitTyping(isTyping);
    if (isTyping) {
      typingTimeoutRef.current = setTimeout(() => {
        emitTyping(false);
      }, TYPING_TIMEOUT_MS);
    }
  }, [emitTyping]);

  useEffect(() => {
    let cancelled = false;
    let socket;
    let cleanupListener;

    cleanupListener = onConnectionChange((state) => {
      setSocketState(state);
      if (state === "reconnected" || state === "connected") {
        getSocket().then((s) => {
          s.emit("user:join", user.id);
          fetchUnread();
          if (activeContactRef.current) {
            markSeen(activeContactRef.current);
          }
        }).catch(console.error);
      }
    });

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

        socket.on("typing:started", ({ userId, pseudo }) => {
          const active = activeContactRef.current;
          if (!active) return;
          if (active.isGlobal) {
            setTypingUsers((prev) => ({ ...prev, [userId]: pseudo }));
          } else if (String(userId) === String(active.id)) {
            setTypingUsers((prev) => ({ ...prev, [userId]: pseudo }));
          }
        });

        socket.on("typing:stopped", ({ userId }) => {
          setTypingUsers((prev) => {
            const next = { ...prev };
            delete next[userId];
            return next;
          });
        });

        socket.on("message:reaction", ({ messageId, reactions }) => {
          setMessages((prev) => {
            const updated = { ...prev };
            for (const key of Object.keys(updated)) {
              updated[key] = updated[key].map((m) =>
                m.id === messageId ? { ...m, reactions } : m
              );
            }
            return updated;
          });
        });

        if (cancelled) return;
      })
      .catch(console.error);

    return () => {
      cancelled = true;
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      if (cleanupListener) cleanupListener();
      if (socket) {
        socket.off("message:global");
        socket.off("message:private");
        socket.off("user:online");
        socket.off("user:offline");
        socket.off("message:seen");
        socket.off("message:deleted");
        socket.off("unread:update");
        socket.off("typing:started");
        socket.off("typing:stopped");
        socket.off("message:reaction"); 
      }
    };
  }, [user, formatMsg, fetchUnread, markSeen]);

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

  const sendMessage = async (content, replyToId = null) => {
    try {
      const payload = activeContact.isGlobal
        ? { content, is_global: true, reply_to_id: replyToId }
        : { content, receiver_id: activeContact.id, is_global: false, reply_to_id: replyToId };
      await api.post("/messages", payload);
      emitTyping(false);
    } catch (err) {
      console.error(err);
    }
  };

  const handleReact = useCallback(async (messageId, emoji) => {
    setMessages((prev) => {
      const updated = { ...prev };
      for (const key of Object.keys(updated)) {
        updated[key] = updated[key].map((m) => {
          if (m.id !== messageId) return m;
          const reactions = m.reactions || [];
          const mine = reactions.find((r) => r.userId === user.id);

          let newReactions;
          if (!mine) {
            newReactions = [...reactions, { userId: user.id, userName: user.pseudo, emoji }];
          } else if (mine.emoji === emoji) {
            newReactions = reactions.filter((r) => r.userId !== user.id);
          } else {
            newReactions = reactions.map((r) =>
              r.userId === user.id ? { ...r, emoji } : r
            );
          }
          return { ...m, reactions: newReactions };
        });
      }
      return updated;
    });

    try {
      await api.post(`/messages/${messageId}/reactions`, { emoji });
    } catch (err) {
      console.error("Erreur réaction:", err);
      loadMessages(activeContactRef.current, true);
    }
  }, [user, loadMessages]);


  const handleSelectContact = useCallback((contact) => {
    setActiveContact(contact);
    setShowContactList(false);
    setIsAtBottom(true);
    setTypingUsers({});
  }, []);

  const handleScrollToBottom = () => {
    setIsAtBottom(true);
  };

  const typingList = useMemo(() => {
    return Object.values(typingUsers).filter(Boolean);
  }, [typingUsers]);

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
          favorites={favorites}
          onToggleFavorite={toggleFavorite}
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
          typingUsers={typingList}
          socketState={socketState}
          onTypingChange={emitTypingThrottled}
          onReact={handleReact}
          currentUserId={user.id}  
        />
      </div>
    </div>
  );
}
