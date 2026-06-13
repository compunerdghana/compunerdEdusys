"use client";

import { type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface StatCardProps {
  label: string;
  value: string | number;
  sub?: string;
  icon: LucideIcon;
  color?: "brand" | "success" | "warning" | "danger" | "info" | "accent";
  trend?: { value: number; label: string };
}

const colors = {
  brand:   { bg: "var(--brand-subtle)",   icon: "var(--brand)",   text: "var(--brand)" },
  success: { bg: "var(--success-bg)",     icon: "var(--success)", text: "var(--success)" },
  warning: { bg: "var(--warning-bg)",     icon: "var(--warning)", text: "var(--warning)" },
  danger:  { bg: "var(--danger-bg)",      icon: "var(--danger)",  text: "var(--danger)" },
  info:    { bg: "var(--info-bg)",        icon: "var(--info)",    text: "var(--info)" },
  accent:  { bg: "var(--accent-subtle)",  icon: "var(--accent)",  text: "var(--accent)" },
};

export function StatCard({ label, value, sub, icon: Icon, color = "brand", trend }: StatCardProps) {
  const c = colors[color];
  return (
    <div className="bg-[var(--surface)] rounded-2xl p-4 shadow-[var(--shadow-sm)] border border-[var(--border)] flex flex-col gap-3 hover:shadow-[var(--shadow-md)] transition-shadow">
      <div className="flex items-start justify-between">
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
          style={{ background: c.bg }}
        >
          <Icon size={18} style={{ color: c.icon }} />
        </div>
        {trend && (
          <span className={cn(
            "text-[11px] font-semibold px-2 py-0.5 rounded-full",
            trend.value >= 0 ? "bg-[var(--success-bg)] text-[var(--success-text)]" : "bg-[var(--danger-bg)] text-[var(--danger-text)]"
          )}>
            {trend.value >= 0 ? "+" : ""}{trend.value}% {trend.label}
          </span>
        )}
      </div>
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--text-muted)] mb-0.5">{label}</p>
        <p className="text-2xl font-extrabold text-[var(--text-strong)] font-mono leading-none">{value}</p>
        {sub && <p className="text-xs text-[var(--text-muted)] mt-1">{sub}</p>}
      </div>
    </div>
  );
}
