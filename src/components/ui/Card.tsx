import { cn } from "@/lib/utils";

interface CardProps {
  children: React.ReactNode;
  className?: string;
  padding?: "sm" | "md" | "lg" | "none";
}

export function Card({ children, className, padding = "md" }: CardProps) {
  return (
    <div
      className={cn(
        "bg-white rounded-[14px] border border-[var(--border)] shadow-[var(--shadow-sm)]",
        {
          "p-3": padding === "sm",
          "p-5": padding === "md",
          "p-6": padding === "lg",
          "p-0": padding === "none",
        },
        className,
      )}
    >
      {children}
    </div>
  );
}

interface StatCardProps {
  label: string;
  value: string | number;
  icon?: React.ReactNode;
  trend?: { value: string; positive: boolean };
  accent?: boolean;
}

export function StatCard({ label, value, icon, trend, accent }: StatCardProps) {
  return (
    <Card className={cn(accent && "border-[var(--border-brand)] bg-[var(--brand-subtle)]")}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[var(--text-muted)] mb-1">{label}</p>
          <p className={cn("text-2xl font-bold font-mono tracking-tight", accent ? "text-[var(--brand-ink)]" : "text-[var(--text-strong)]")}>
            {value}
          </p>
          {trend && (
            <p className={cn("text-xs mt-1 font-medium", trend.positive ? "text-[var(--success)]" : "text-[var(--danger)]")}>
              {trend.positive ? "↑" : "↓"} {trend.value}
            </p>
          )}
        </div>
        {icon && (
          <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center shrink-0", accent ? "bg-white/60" : "bg-[var(--brand-subtle)]")}>
            <span className="text-[var(--brand)]">{icon}</span>
          </div>
        )}
      </div>
    </Card>
  );
}
