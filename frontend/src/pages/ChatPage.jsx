import Sidebar from "../components/layout/Sidebar";
import ChatLayout from "../components/chat/ChatLayout";

export default function ChatPage() {
  return (
    <div className="flex h-screen bg-gradient-to-br from-[#0A1A33] via-[#001948] to-[#0A1A33] overflow-hidden relative">
      {/* Decorative glass orbs */}
      <div className="absolute -top-32 -left-32 w-96 h-96 bg-white/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute top-1/4 -right-24 w-64 h-64 bg-white/5 rounded-full blur-2xl pointer-events-none" />
      <div className="absolute bottom-0 left-1/3 w-80 h-80 bg-white/3 rounded-full blur-3xl pointer-events-none" />

      <Sidebar />
      <div className="flex-1 overflow-hidden min-w-0 relative z-10">
        <ChatLayout />
      </div>
    </div>
  );
}
