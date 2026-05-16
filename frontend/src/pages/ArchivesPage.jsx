import Sidebar from "../components/layout/Sidebar";
import Navbar from "../components/layout/Navbar";
import ArchiveGrid from "../components/archives/ArchiveGrid";

export default function ArchivesPage() {
  return (
    <div className="flex h-screen bg-surface overflow-hidden">
      <Sidebar />
      <main className="flex-1 flex flex-col h-full overflow-hidden">
        <Navbar title="Archives de cours" />
        <div className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto">
          <ArchiveGrid />
        </div>
      </main>
    </div>
  );
}