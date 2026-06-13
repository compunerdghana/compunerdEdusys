"use client";

import { SyncBadge } from "@/components/sync/SyncBadge";
import { getInitials } from "@/lib/utils";
import { Bell } from "lucide-react";

interface TopBarProps {
  userName?: string;
  schoolName?: string;
  title?: string;
}

export function TopBar({ userName = "Admin", schoolName, title }: TopBarProps) {
  const hour = new Date().getHours();
  const greeting =
    hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  return (
    <header className="h-14 bg-white border-b border-[var(--border)] flex items-center px-6 gap-4 shrink-0">
      <div className="flex-1 min-w-0">
        {title ? (
          <h1 className="text-[15px] font-bold text-[var(--text-strong)] truncate">{title}</h1>
        ) : (
          <p className="text-[15px] font-semibold text-[var(--text-strong)] truncate">
            {greeting}, {userName.split(" ")[0]}
          </p>
        )}
        {schoolName && (
          <p className="text-xs text-[var(--text-muted)] truncate">{schoolName}</p>
        )}
      </div>

      <SyncBadge />

      <button className="relative w-8 h-8 rounded-full flex items-center justify-center text-[var(--text-muted)] hover:bg-[var(--neutral-100)] transition-colors">
        <Bell size={16} />
      </button>

      <div className="w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-bold text-white shrink-0" style={{ background: "var(--gradient-brand)" }}>
        {getInitials(userName)}
      </div>
    </header>
  );
}
