"use client";

import { Bell, Search, Menu } from "lucide-react";
import { getInitials } from "@/lib/utils";

interface TopBarProps {
  userName?: string;
  schoolName?: string;
  onMenuClick?: () => void;
}

export function TopBar({ userName = "Admin", schoolName, onMenuClick }: TopBarProps) {
  return (
    <header className="h-16 bg-white border-b border-[var(--border)] flex items-center px-4 md:px-6 gap-4 shrink-0 shadow-sm">
      {/* Hamburger — mobile only */}
      <button onClick={onMenuClick}
        className="md:hidden w-9 h-9 flex items-center justify-center rounded-xl text-[var(--text-muted)] hover:bg-[var(--neutral-100)] transition-colors shrink-0">
        <Menu size={20} />
      </button>

      {/* Search */}
      <div className="flex-1 max-w-sm hidden sm:block">
        <div className="relative">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-subtle)]" />
          <input
            type="search"
            placeholder="Search here..."
            className="w-full h-9 pl-9 pr-4 rounded-2xl bg-[var(--neutral-100)] border border-transparent text-[14px] text-[var(--text-body)] placeholder:text-[var(--text-subtle)] outline-none focus:border-[var(--ring)] focus:bg-white transition-all"
          />
        </div>
      </div>

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

        {/* User */}
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-full flex items-center justify-center text-[11px] font-bold text-white shrink-0"
            style={{ background: "linear-gradient(135deg, #262262, #92278F)" }}>
            {getInitials(userName)}
          </div>
          <div className="hidden md:block">
            <p className="text-[13px] font-bold text-[var(--text-strong)] leading-tight">{userName}</p>
            {schoolName && <p className="text-[11px] text-[var(--text-muted)] leading-tight truncate max-w-[120px]">{schoolName}</p>}
          </div>
        </div>
      </div>
    </header>
  );
}
