import { useState, useEffect, useCallback, useRef } from "react";
import api from "../../api/axios";
import { useAuth } from "../../context/AuthContext";
import ContactList from "./ContactList";
import MessagePanel from "./MessagePanel";

const GLOBAL_CONTACT = {
  id: "global",
  name: "Chat global",
  isGlobal: true,
};

export default function ChatLayout() {
  const { user } = useAuth();
  const [contacts, setContacts] = useState([GLOBAL_CONTACT]);
  const [activeContact, setActiveContact] = useState(GLOBAL_CONTACT);
  const [messages, setMessages] = useState({});
  const [showContactList, setShowContactList] = useState(false);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [isAtBottom, setIsAtBottom] = useState(true);
  const activeContactRef = useRef(activeContact);
  const isAtBottomRef = useRef(true);
  const pollingRef = useRef(null);

  useEffect(() => {
    activeContactRef.current = activeContact;
  }, [activeContact]);

  useEffect(() => {
    isAtBottomRef.current = isAtBottom;
  }, [isAtBottom]);

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
    if (activeContact) loadMessages(activeContact);
  }, [activeContact, loadMessages]);

  useEffect(() => {
    pollingRef.current = setInterval(() => {
      if (isAtBottomRef.current) {
        loadMessages(activeContactRef.current, true);
      }
    }, 3000);
    return () => clearInterval(pollingRef.current);
  }, [loadMessages]);

  const sendMessage = async (content) => {
    try {
      const payload = activeContact.isGlobal
        ? { content, is_global: true }
        : { content, receiver_id: activeContact.id, is_global: false };
      await api.post("/messages", payload);
      loadMessages(activeContact, true);
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
    loadMessages(activeContactRef.current, true);
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
          isAtBottom={isAtBottom}
          onAtBottomChange={setIsAtBottom}
          onScrollToBottom={handleScrollToBottom}
        />
      </div>
    </div>
  );
}
