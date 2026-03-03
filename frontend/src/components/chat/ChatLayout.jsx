import { useState, useEffect, useCallback } from "react";
import api from "../../api/axios";
import { useAuth } from "../../context/AuthContext";
import { getSocket } from "../../socket";
import ContactList from "./ContactList";
import MessagePanel from "./MessagePanel";

const GLOBAL_CONTACT = {
  id: "global",
  name: "HEI STDhub — Chat Global",
  isGlobal: true,
};

export default function ChatLayout() {
  const { user } = useAuth();
  const [contacts, setContacts] = useState([GLOBAL_CONTACT]);
  const [activeContact, setActiveContact] = useState(GLOBAL_CONTACT);
  const [messages, setMessages] = useState({});
  const [showContactList, setShowContactList] = useState(false);
  const [loadingMessages, setLoadingMessages] = useState(false);

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
        }));
        setContacts([GLOBAL_CONTACT, ...formatted]);
      })
      .catch(console.error);
  }, []);

  const formatMsg = useCallback(
    (m) => ({
      id: m.id,
      sender: m.sender_pseudo || "Inconnu",
      content: m.content,
      own: m.sender_id === user.id,
      seen: m.seen || false,
      time: new Date(m.created_at).toLocaleTimeString("fr-FR", {
        hour: "2-digit",
        minute: "2-digit",
      }),
    }),
    [user],
  );

  const loadMessages = useCallback(
    async (contact) => {
      setLoadingMessages(true);
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
        setLoadingMessages(false);
      }
    },
    [formatMsg],
  );

  useEffect(() => {
    if (activeContact) loadMessages(activeContact);
  }, [activeContact, loadMessages]);

  // ── Socket.io listeners ──
  useEffect(() => {
    let cleanup = () => {};

    const handleGlobal = (msg) => {
      const formatted = formatMsg(msg);
      setMessages((prev) => ({
        ...prev,
        global: [...(prev.global || []), formatted],
      }));
    };

    const handlePrivate = (msg) => {
      const contactId =
        msg.sender_id === user.id ? msg.receiver_id : msg.sender_id;
      const formatted = formatMsg(msg);
      setMessages((prev) => ({
        ...prev,
        [contactId]: [...(prev[contactId] || []), formatted],
      }));
      if (msg.sender_id !== user.id && activeContact.id === contactId) {
        api.patch(`/messages/${msg.id}/seen`).catch(console.error);
      }
    };

    const handleSeen = ({ messageId }) => {
      setMessages((prev) => {
        const updated = { ...prev };
        Object.keys(updated).forEach((key) => {
          updated[key] = updated[key]?.map((m) =>
            m.id === messageId ? { ...m, seen: true } : m,
          );
        });
        return updated;
      });
    };

    getSocket().then((socket) => {
      socket.on("message:global", handleGlobal);
      socket.on("message:private", handlePrivate);
      socket.on("message:seen", handleSeen);
      cleanup = () => {
        socket.off("message:global", handleGlobal);
        socket.off("message:private", handlePrivate);
        socket.off("message:seen", handleSeen);
      };
    });

    return () => cleanup();
  }, [user, activeContact, formatMsg]);

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
        />
      </div>

      {showContactList && (
        <div
          className="lg:hidden fixed inset-0 bg-black/40 z-10"
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
        />
      </div>
    </div>
  );
}
