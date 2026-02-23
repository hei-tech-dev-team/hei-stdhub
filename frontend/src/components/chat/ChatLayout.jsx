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

  return (
    <div className="flex w-full h-screen">
      <ContactList
        contacts={DEMO_CONTACTS}
        activeId={activeContact.id}
        onSelect={(c) => setActiveContact(c)}
      />
      <MessagePanel
        contact={activeContact}
        messages={messages[activeContact.id] || []}
        onSend={sendMessage}
      />
    </div>
  );
}
