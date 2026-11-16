import { useState, useEffect, useRef, useCallback } from "react";
import Sidebar from "../components/layout/Sidebar";
import Navbar from "../components/layout/Navbar";
import ArchiveGrid from "../components/archives/ArchiveGrid";
import usePullToRefresh from "../hooks/usePullToRefresh";
import PullToRefreshIndicator from "../components/ui/PullToRefreshIndicator";

export default function ArchivesPage() {
  const [mounted, setMounted] = useState(false);
  const scrollRef = useRef(null);
  const gridRef = useRef(null);

  const refreshArchives = useCallback(
    () => gridRef.current?.refresh?.() ?? Promise.resolve(),
    [],
  );

  const { pullDistance, refreshing } = usePullToRefresh({
    rootRef: scrollRef,
    onRefresh: refreshArchives,
  });

  useEffect(() => {
    requestAnimationFrame(() => setMounted(true));
  }, []);

  return (
    <div className="flex h-app bg-surface overflow-hidden">
      <Sidebar />
      <main className="flex-1 flex flex-col min-h-0 safe-x safe-bottom">
        <Navbar title="Archives de cours" />
        <div
          ref={scrollRef}
          className="flex-1 overflow-y-auto overflow-x-hidden pb-16 lg:pb-0"
        >
          <PullToRefreshIndicator
            pullDistance={pullDistance}
            refreshing={refreshing}
          />
          <div
            className={`transition-all duration-700 px-4 sm:px-6 lg:px-8 py-6 sm:py-8 ${
              mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"
            }`}
          >
            <div className="bg-navy rounded-2xl px-6 py-7 sm:px-8">
              <h1 className="text-white text-xl sm:text-2xl font-bold tracking-tight">
                Archives de cours
                <span className="text-gold">.</span>
              </h1>
              <p className="text-white/50 text-sm mt-2 leading-relaxed">
                Accédez aux supports pédagogiques par UE
              </p>
            </div>
            <div className="mt-6">
              <ArchiveGrid ref={gridRef} />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
