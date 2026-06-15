"use client";

import { useState } from "react";
import { PlatformSidebar } from "./PlatformSidebar";
import { LogOut, Menu, X, Shield } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

interface PlatformShellProps {
  userName: string;
  userRole: string;
  children: React.ReactNode;
}

export function PlatformShell({ userName, userRole, children }: PlatformShellProps) {
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/platform/login");
  }

  const initials = userName
    .split(" ")
    .map(n => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <div className="min-h-screen flex" style={{ background: "#0f0a1e" }}>
      {/* Mobile sidebar backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-72 transition-transform duration-300 lg:static lg:translate-x-0 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <PlatformSidebar userName={userName} userRole={userRole} onLogout={handleLogout} />
      </aside>

      {/* Main area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* TopBar */}
        <header
          className="sticky top-0 z-30 flex items-center gap-4 px-6 h-16 border-b shrink-0"
          style={{
            background: "rgba(26,5,51,0.95)",
            borderColor: "rgba(255,255,255,0.08)",
            backdropFilter: "blur(12px)",
          }}
        >
          {/* Mobile menu toggle */}
          <button
            className="lg:hidden text-white/60 hover:text-white transition-colors"
            onClick={() => setSidebarOpen(v => !v)}
          >
            {sidebarOpen ? <X size={22} /> : <Menu size={22} />}
          </button>

          <div className="flex-1" />

          {/* Platform Admin badge */}
          <div
            className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-extrabold tracking-wide uppercase"
            style={{ background: "rgba(107,31,138,0.25)", border: "1px solid rgba(107,31,138,0.4)", color: "#c084fc" }}
          >
            <Shield size={11} />
            Platform Admin
          </div>

          {/* User avatar */}
          <div className="flex items-center gap-3">
            <div className="text-right hidden sm:block">
              <p className="text-white text-sm font-bold leading-tight">{userName}</p>
              <p className="text-white/40 text-[11px] font-semibold capitalize">{userRole.replace("_", " ")}</p>
            </div>
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center text-white text-sm font-extrabold shrink-0"
              style={{ background: "linear-gradient(135deg, #2d1b69, #6b1f8a)" }}
            >
              {initials}
            </div>
          </div>

          {/* Logout */}
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 px-3 py-2 rounded-xl text-white/50 hover:text-white hover:bg-white/10 transition-all text-sm font-semibold"
          >
            <LogOut size={16} />
            <span className="hidden sm:inline">Logout</span>
          </button>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
