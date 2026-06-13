"use client";

import { type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { TrendingUp, TrendingDown } from "lucide-react";

interface StatCardProps {
  label: string;
  value: string | number;
  sub?: string;
  icon: LucideIcon;
  color?: "brand" | "success" | "warning" | "danger" | "info" | "accent";
  trend?: { value: number; label: string };
}

const colors = {
  brand:   { from: "#262262", to: "#3d1f6e", bg: "#eeedf8" },
  success: { from: "#1BD084", to: "#0ea96a", bg: "#e8faf3" },
  warning: { from: "#F4901F", to: "#e07b0a", bg: "#fef3e6" },
  danger:  { from: "#FF394B", to: "#e01f31", bg: "#ffebee" },
  info:    { from: "#1BD0B4", to: "#0ea99a", bg: "#e8faf8" },
  accent:  { from: "#92278F", to: "#6d1a6b", bg: "#f5e8f5" },
};

export function StatCard({ label, value, sub, icon: Icon, color = "brand", trend }: StatCardProps) {
  const c = colors[color];
  return (
    <div className="bg-white rounded-2xl shadow-[0_2px_12px_rgba(0,0,0,0.07)] border border-[var(--border)] overflow-hidden hover:shadow-[0_4px_20px_rgba(0,0,0,0.10)] transition-shadow">
      <div className="flex items-stretch">
        {/* Left — text */}
        <div className="flex-1 p-4 flex flex-col justify-between min-w-0">
          <p className="text-[13px] font-semibold text-[var(--text-muted)] leading-tight">{label}</p>
          <div className="mt-2">
            <p className="text-[28px] font-extrabold text-[var(--text-strong)] leading-none tracking-tight">{value}</p>
            {sub && <p className="text-[12px] text-[var(--text-muted)] mt-1">{sub}</p>}
            {trend && (
              <div className={cn(
                "flex items-center gap-1 mt-1.5 text-[12px] font-semibold",
                trend.value >= 0 ? "text-[var(--success)]" : "text-[var(--danger)]",
              )}>
                {trend.value >= 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                {trend.value >= 0 ? "+" : ""}{trend.value}% {trend.label}
              </div>
            )}
          </div>
        </div>
        {/* Right — colored icon area */}
        <div className="w-16 flex items-center justify-center shrink-0 rounded-r-2xl"
          style={{ background: `linear-gradient(135deg, ${c.from}, ${c.to})` }}>
          <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center">
            <Icon size={18} className="text-white" />
          </div>
        </div>
      </div>
    </div>
  );
}
