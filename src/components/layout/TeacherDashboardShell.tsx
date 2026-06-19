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
      <div className="flex h-screen overflow-hidden bg-[#faf9fe] relative">
        <style>{`
          @keyframes float-orb {
            0%, 100% { transform: translateY(0px) scale(1); }
            50% { transform: translateY(-35px) scale(1.08); }
          }
          @keyframes float-orb-reverse {
            0%, 100% { transform: translateY(0px) scale(1); }
            50% { transform: translateY(30px) scale(0.92); }
          }
        `}</style>

        {/* Animated background orbs */}
        <div
          className="absolute top-[-100px] right-[-100px] w-[350px] h-[350px] rounded-full pointer-events-none opacity-[0.05] z-0"
          style={{
            background: "radial-gradient(circle, #7c3aed 0%, transparent 70%)",
            animation: "float-orb 15s ease-in-out infinite",
          }}
        />
        <div
          className="absolute bottom-[-100px] left-[10%] w-[300px] h-[300px] rounded-full pointer-events-none opacity-[0.04] z-0"
          style={{
            background: "radial-gradient(circle, #4f46e5 0%, transparent 70%)",
            animation: "float-orb-reverse 20s ease-in-out infinite",
          }}
        />

        {/* Overlay — mobile */}
        {sidebarOpen && (
          <div className="fixed inset-0 z-20 bg-black/50 md:hidden" onClick={() => setSidebarOpen(false)} />
        )}

        {/* Sidebar */}
        <div className={`fixed inset-y-0 left-0 z-30 transition-transform duration-300 md:relative md:translate-x-0 md:z-auto ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}`}>
          <TeacherSidebar userName={userName} schoolName={schoolName} schoolLogo={schoolLogo} />
        </div>

        {/* Main Workspace */}
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden relative z-10">
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
          <main className="flex-1 overflow-y-auto p-4 md:p-6 bg-[#faf9fe]/30 backdrop-blur-[1px] relative overflow-x-hidden">
            {/* Subtle grid pattern */}
            <div className="absolute inset-0 pointer-events-none opacity-[0.35] bg-[linear-gradient(to_right,#e4dffa_1px,transparent_1px),linear-gradient(to_bottom,#e4dffa_1px,transparent_1px)] bg-[size:24px_24px] z-0" />
            <div className="relative z-10">
              {children}
            </div>
          </main>
        </div>
      </div>
    </ToastProvider>
  );
}
