import { useState, useEffect, useCallback } from "react";
import api from "../../api/axios";
import { useAuth } from "../../context/AuthContext";
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
        const formatted = data.map((m) => ({
          id: m.id,
          sender: m.sender_pseudo || "Inconnu",
          content: m.content,
          own: m.sender_id === user.id,
          time: new Date(m.created_at).toLocaleTimeString("fr-FR", {
            hour: "2-digit",
            minute: "2-digit",
          }),
        }));
        setMessages((prev) => ({ ...prev, [contact.id]: formatted }));
      } catch (err) {
        console.error(err);
      } finally {
        setLoadingMessages(false);
      }
    },
    [user],
  );

  useEffect(() => {
    if (activeContact) loadMessages(activeContact);
  }, [activeContact, loadMessages]);

  const sendMessage = async (content) => {
    try {
      const payload = activeContact.isGlobal
        ? { content, is_global: true }
        : { content, receiver_id: activeContact.id, is_global: false };
      const { data } = await api.post("/messages", payload);
      const newMsg = {
        id: data.id,
        sender: user.pseudo,
        content: data.content,
        own: true,
        time: new Date(data.created_at).toLocaleTimeString("fr-FR", {
          hour: "2-digit",
          minute: "2-digit",
        }),
      };
      setMessages((prev) => ({
        ...prev,
        [activeContact.id]: [...(prev[activeContact.id] || []), newMsg],
      }));
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
      {/* ContactList — toujours visible desktop, drawer mobile */}
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

      {/* Overlay mobile */}
      {showContactList && (
        <div
          className="lg:hidden fixed inset-0 bg-black/40 z-10"
          onClick={() => setShowContactList(false)}
        />
      )}

      {/* MessagePanel */}
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
