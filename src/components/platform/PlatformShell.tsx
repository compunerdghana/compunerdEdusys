"use client";

import { useState } from "react";
import { PlatformSidebar } from "./PlatformSidebar";
import { LogOut, Menu, X, Bell, Shield } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useRouter, usePathname } from "next/navigation";

interface PlatformShellProps {
  userName: string;
  userRole: string;
  children: React.ReactNode;
}

function getBreadcrumb(pathname: string) {
  const segments = pathname.replace("/platform", "").split("/").filter(Boolean);
  if (segments.length === 0) return [{ label: "Dashboard", href: "/platform/dashboard" }];
  return segments.map((seg, i) => ({
    label: seg.charAt(0).toUpperCase() + seg.slice(1).replace(/-/g, " "),
    href: "/platform/" + segments.slice(0, i + 1).join("/"),
  }));
}

export function PlatformShell({ userName, userRole, children }: PlatformShellProps) {
  const router = useRouter();
  const pathname = usePathname();
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

  const breadcrumbs = getBreadcrumb(pathname);

  return (
    <div className="min-h-screen flex" style={{ background: "#0f0a1e" }}>
      {/* Mobile sidebar backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar — fixed 260px */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-[260px] transition-transform duration-300 lg:static lg:translate-x-0 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <PlatformSidebar userName={userName} userRole={userRole} onLogout={handleLogout} />
      </aside>

      {/* Main area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* TopBar — white, 60px */}
        <header
          className="sticky top-0 z-30 flex items-center gap-4 px-6 shrink-0 bg-white border-b border-[#e8e4f3]"
          style={{ height: 60 }}
        >
          {/* Mobile menu toggle */}
          <button
            className="lg:hidden text-slate-500 hover:text-slate-800 transition-colors"
            onClick={() => setSidebarOpen(v => !v)}
          >
            {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
          </button>

          {/* Breadcrumb */}
          <nav className="hidden sm:flex items-center gap-1.5 text-[13px] font-semibold">
            <span className="text-slate-400">Platform</span>
            {breadcrumbs.map((crumb, i) => (
              <span key={crumb.href} className="flex items-center gap-1.5">
                <span className="text-slate-300">/</span>
                <span className={i === breadcrumbs.length - 1 ? "text-slate-800 font-bold" : "text-slate-400"}>
                  {crumb.label}
                </span>
              </span>
            ))}
          </nav>

          <div className="flex-1" />

          {/* Platform Admin badge */}
          <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-extrabold tracking-widest uppercase bg-violet-50 text-violet-700 border border-violet-100">
            <Shield size={10} />
            Platform Admin
          </div>

          {/* Bell */}
          <button className="relative w-9 h-9 flex items-center justify-center rounded-xl hover:bg-slate-50 text-slate-400 hover:text-slate-700 transition-colors border border-[#e8e4f3]">
            <Bell size={16} />
          </button>

          {/* User avatar + name */}
          <div className="flex items-center gap-2.5">
            <div className="hidden sm:block text-right">
              <p className="text-slate-800 text-[13px] font-bold leading-tight">{userName}</p>
              <p className="text-slate-400 text-[11px] font-semibold capitalize">{userRole.replace("_", " ")}</p>
            </div>
            <div
              className="w-8 h-8 rounded-xl flex items-center justify-center text-white text-xs font-extrabold shrink-0"
              style={{ background: "linear-gradient(135deg, #4f46e5, #7c3aed)" }}
            >
              {initials}
            </div>
          </div>

          {/* Logout */}
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 px-3 py-2 rounded-xl text-slate-500 hover:text-slate-800 hover:bg-slate-50 transition-all text-[13px] font-semibold border border-[#e8e4f3]"
          >
            <LogOut size={14} />
            <span className="hidden sm:inline">Logout</span>
          </button>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-6 bg-[#f8f7ff]">
          {children}
        </main>
      </div>
    </div>
  );
}
