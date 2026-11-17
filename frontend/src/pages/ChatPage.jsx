import Sidebar from "../components/layout/Sidebar";
import ChatLayout from "../components/chat/ChatLayout";

export default function ChatPage() {
  return (
    <div className="flex h-app bg-surface overflow-hidden">
      <Sidebar />
      <div className="flex-1 overflow-hidden min-w-0 relative z-10 safe-x">
        <ChatLayout />
      </div>
    </div>
  );
}
