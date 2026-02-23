import Sidebar from "../components/layout/Sidebar";
import ChatLayout from "../components/chat/ChatLayout";

export default function ChatPage() {
  return (
    <div className="flex min-h-screen bg-navy-dark">
      <Sidebar />
      <div className="flex-1 overflow-hidden">
        <ChatLayout />
      </div>
    </div>
  );
}
