import Sidebar from "../components/layout/Sidebar";
import FeedPage from "./FeedPage";

export default function HomePage() {
  return (
    <div className="flex h-app bg-surface overflow-hidden">
      <Sidebar />
      <main
        className="flex-1 flex flex-col min-h-0 overflow-hidden
                       safe-x safe-top safe-bottom"
      >
        <FeedPage/>
      </main>
    </div>
  );
}
