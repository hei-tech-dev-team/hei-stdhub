import Sidebar      from "../components/layout/Sidebar";
import Navbar       from "../components/layout/Navbar";
import ArchiveGrid  from "../components/archives/ArchiveGrid";

export default function ArchivesPage() {
  return (
    <div className="flex min-h-screen bg-surface">
      <Sidebar />
      <main className="flex-1 flex flex-col min-h-screen overflow-hidden">
        <Navbar title="Archives de cours" />
        <div className="flex-1 p-8 overflow-y-auto">
          <ArchiveGrid />
        </div>
      </main>
    </div>
  );
}