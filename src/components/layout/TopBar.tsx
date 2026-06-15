"use client";

import { Bell, Menu } from "lucide-react";
import { getInitials } from "@/lib/utils";
import Link from "next/link";
import { useEffect, useState } from "react";

interface TopBarProps {
  userName?: string;
  schoolName?: string;
  onMenuClick?: () => void;
}

export function TopBar({ userName = "Admin", schoolName, onMenuClick }: TopBarProps) {
  const [displayName, setDisplayName] = useState(userName);

  // Listen for name changes from the AccountForm
  useEffect(() => {
    setDisplayName(userName);
  }, [userName]);

  useEffect(() => {
    function onNameChange(e: Event) {
      const name = (e as CustomEvent<string>).detail;
      if (name) setDisplayName(name);
    }
    window.addEventListener("user:namechange", onNameChange);
    return () => window.removeEventListener("user:namechange", onNameChange);
  }, []);

  return (
    <header className="h-16 bg-white border-b border-[var(--border)] flex items-center px-4 md:px-6 gap-4 shrink-0 shadow-sm">
      {/* Hamburger — mobile only */}
      <button onClick={onMenuClick}
        className="md:hidden w-9 h-9 flex items-center justify-center rounded-xl text-[var(--text-muted)] hover:bg-[var(--neutral-100)] transition-colors shrink-0">
        <Menu size={20} />
      </button>

      <div className="flex-1" />

      {/* Actions */}
      <div className="flex items-center gap-2">
        {/* Notification bell */}
        <button className="relative w-9 h-9 rounded-xl flex items-center justify-center text-[var(--text-muted)] hover:bg-[var(--neutral-100)] transition-colors">
          <Bell size={17} />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-[var(--danger)]" />
        </button>

        {/* Divider */}
        <div className="w-px h-6 bg-[var(--border)] mx-1" />

        {/* User avatar — links to personal settings */}
        <Link href="/settings" className="flex items-center gap-2.5 hover:opacity-90 transition-opacity">
          <div className="w-9 h-9 rounded-full flex items-center justify-center text-[11px] font-bold text-white shrink-0 ring-2 ring-transparent hover:ring-[#262262]/30 transition-all"
            style={{ background: "linear-gradient(135deg, #262262, #92278F)" }}>
            {getInitials(displayName)}
          </div>
          <div className="hidden md:block">
            <p className="text-[13px] font-bold text-[var(--text-strong)] leading-tight">{displayName}</p>
            {schoolName && <p className="text-[11px] text-[var(--text-muted)] leading-tight truncate max-w-[120px]">{schoolName}</p>}
          </div>
        </Link>
      </div>
    </header>
  );
}
