import Sidebar from "../components/layout/Sidebar";
import FeedPage from "./FeedPage";
import { useAuth } from "../context/AuthContext";

export default function HomePage() {
  return (
    <div className="flex h-screen bg-surface overflow-hidden">
      <Sidebar />
      <main
        className="flex-1 flex flex-col min-h-screen overflow-hidden
                       pl-0 lg:pl-0"
      >
        <FeedPage/>
      </main>
    </div>
  );
}
