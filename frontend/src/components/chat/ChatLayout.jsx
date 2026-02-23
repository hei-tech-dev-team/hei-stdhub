import { useState } from "react";
import ContactList from "./ContactList";
import MessagePanel from "./MessagePanel";

const DEMO_CONTACTS = [
  { id: "global", name: "HEI STDhub global chat", isGlobal: true },
  { id: "dr-toky", name: "Dr Toky", role: "teacher" },
  { id: "mr-larry", name: "Mr Larry", role: "teacher" },
  { id: "mr-ryan", name: "Mr Ryan", role: "teacher" },
  { id: "mr-julien", name: "Mr Julien", role: "teacher" },
  { id: "std25002", name: "STD25002", role: "student" },
  { id: "std25003", name: "STD25003", role: "student" },
  { id: "std24001", name: "STD24001", role: "student" },
];

const DEMO_MESSAGES = {
  global: [
    {
      id: 1,
      sender: "STD25001",
      content: "Bonjour à tous !",
      own: false,
      time: "09:00",
    },
    {
      id: 2,
      sender: "STD24001",
      content: "Salut ! Le TD de WEB2 c'est pour quand ?",
      own: false,
      time: "09:05",
    },
    {
      id: 3,
      sender: "Dr Toky",
      content: "Pour vendredi prochain.",
      own: false,
      time: "09:10",
    },
    {
      id: 4,
      sender: "Moi",
      content: "Merci Dr Toky !",
      own: true,
      time: "09:12",
    },
  ],
  "dr-toky": [
    {
      id: 1,
      sender: "Dr Toky",
      content: "Avez-vous des questions sur le cours ?",
      own: false,
      time: "10:00",
    },
  ],
};

export default function ChatLayout() {
  const [activeContact, setActiveContact] = useState(DEMO_CONTACTS[0]);
  const [messages, setMessages] = useState(DEMO_MESSAGES);
  const [showContactList, setShowContactList] = useState(true);

  const sendMessage = (content) => {
    const msg = {
      id: Date.now(),
      sender: "Moi",
      content,
      own: true,
      time: new Date().toLocaleTimeString("fr-FR", {
        hour: "2-digit",
        minute: "2-digit",
      }),
    };
    setMessages((prev) => ({
      ...prev,
      [activeContact.id]: [...(prev[activeContact.id] || []), msg],
    }));
  };

  const handleSelectContact = (contact) => {
    setActiveContact(contact);
    setShowContactList(false);
  };

  return (
    <div className="flex w-full h-screen overflow-hidden">
      {/* ── ContactList — visible sur md+, drawer sur mobile ── */}
      <div
        className={`
          absolute md:static inset-y-0 left-0 z-20
          w-full sm:w-72 md:w-64 lg:w-72
          transform transition-transform duration-300
          ${
            showContactList
              ? "translate-x-0"
              : "-translate-x-full md:translate-x-0"
          }
        `}
      >
        <ContactList
          contacts={DEMO_CONTACTS}
          activeId={activeContact.id}
          onSelect={handleSelectContact}
        />
      </div>

      {/* ── Overlay mobile quand contacts ouverts ── */}
      {showContactList && (
        <div
          className="md:hidden fixed inset-0 bg-black/40 z-10"
          onClick={() => setShowContactList(false)}
        />
      )}

      {/* ── MessagePanel ── */}
      <div className="flex-1 flex flex-col min-w-0">
        <MessagePanel
          contact={activeContact}
          messages={messages[activeContact.id] || []}
          onSend={sendMessage}
          onOpenContacts={() => setShowContactList(true)}
        />
      </div>
    </div>
  );
}
