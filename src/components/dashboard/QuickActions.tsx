"use client";

import Link from "next/link";
import { type LucideIcon } from "lucide-react";
import { Card } from "@/components/ui/Card";

interface Action {
  label: string;
  href: string;
  icon: LucideIcon;
  color?: string;
}

interface QuickActionsProps {
  actions: Action[];
  role?: string;
}

export function QuickActions({ actions }: QuickActionsProps) {
  return (
    <Card>
      <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[var(--text-muted)] mb-4">Quick actions</p>
      <div className="grid grid-cols-3 gap-3">
        {actions.map((a) => (
          <Link key={a.label} href={a.href}>
            <div className="flex flex-col items-center gap-2 p-3 rounded-xl border border-[var(--border)] hover:border-[var(--ring)] hover:bg-[var(--brand-subtle)] transition-all cursor-pointer text-center">
              <div
                className="w-9 h-9 rounded-xl flex items-center justify-center"
                style={{ background: a.color ?? "var(--brand-subtle)" }}
              >
                <a.icon size={16} className="text-[var(--brand)]" />
              </div>
              <span className="text-[11px] font-semibold text-[var(--text-body)] leading-tight">{a.label}</span>
            </div>
          </Link>
        ))}
      </div>
    </Card>
  );
}
