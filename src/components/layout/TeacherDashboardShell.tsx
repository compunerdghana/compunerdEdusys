"use client";

import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import { TeacherSidebar } from "./TeacherSidebar";
import { TopBar } from "./TopBar";
import { ToastProvider } from "@/components/ui/Toast";
import { syncEngine, type SyncState } from "@/lib/offline/sync";
import { Wifi, WifiOff, RefreshCw } from "lucide-react";

interface Props {
  userName: string;
  schoolName?: string;
  schoolLogo?: string;
  children: React.ReactNode;
}

export function TeacherDashboardShell({ userName, schoolName, schoolLogo, children }: Props) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const pathname = usePathname();
  
  // Sync Engine State
  const [syncState, setSyncState] = useState<SyncState>("online");
  const [pendingCount, setPendingCount] = useState(0);

  useEffect(() => {
    setSidebarOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!syncEngine) return;
    const unsubscribe = syncEngine.subscribe((state, count) => {
      setSyncState(state);
      setPendingCount(count);
    });
    return () => {
      unsubscribe();
    };
  }, []);

  return (
    <ToastProvider>
      <div className="flex h-screen overflow-hidden bg-[#f8f7ff]">
        {/* Overlay — mobile */}
        {sidebarOpen && (
          <div className="fixed inset-0 z-20 bg-black/50 md:hidden" onClick={() => setSidebarOpen(false)} />
        )}

        {/* Sidebar */}
        <div className={`fixed inset-y-0 left-0 z-30 transition-transform duration-300 md:relative md:translate-x-0 md:z-auto ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}`}>
          <TeacherSidebar userName={userName} schoolName={schoolName} schoolLogo={schoolLogo} />
        </div>

        {/* Main Workspace */}
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          {/* Custom Teacher TopBar wrapper */}
          <TopBar
            userName={userName}
            schoolName={schoolName}
            onMenuClick={() => setSidebarOpen((v) => !v)}
          />

          {/* Sync Engine Global Banner */}
          {syncState !== "online" && (
            <div className={`px-6 py-2.5 flex items-center justify-between text-[12px] font-bold border-b transition-all ${
              syncState === "offline" 
                ? "bg-amber-50 border-amber-200 text-amber-800" 
                : "bg-violet-50 border-violet-100 text-violet-800"
            }`}>
              <div className="flex items-center gap-2">
                {syncState === "offline" ? (
                  <>
                    <WifiOff size={14} className="text-amber-600 animate-pulse" />
                    <span>Working Offline Mode. All changes are saved locally.</span>
                  </>
                ) : (
                  <>
                    <RefreshCw size={14} className="text-violet-600 animate-spin" />
                    <span>Synchronising {pendingCount} pending academic records to server...</span>
                  </>
                )}
              </div>
              {pendingCount > 0 && (
                <span className="bg-black/5 border border-black/5 px-2.5 py-0.5 rounded-full text-[10px]">
                  {pendingCount} Pending Syncs
                </span>
              )}
            </div>
          )}

          {/* Page content */}
          <main className="flex-1 overflow-y-auto p-4 md:p-6 bg-[#f8f7ff]">
            {children}
          </main>
        </div>
      </div>
    </ToastProvider>
  );
}
