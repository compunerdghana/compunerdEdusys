import { cn } from "@/lib/utils";

interface BadgeProps {
  children: React.ReactNode;
  variant?: "default" | "success" | "warning" | "danger" | "info" | "brand";
  className?: string;
}

export function Badge({ children, variant = "default", className }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 text-[11px] font-semibold uppercase tracking-[0.08em] px-2 py-0.5 rounded-full",
        {
          "bg-[var(--neutral-100)] text-[var(--text-muted)]": variant === "default",
          "bg-[var(--success-bg)] text-[var(--success-text)]": variant === "success",
          "bg-[var(--warning-bg)] text-[var(--amber-600)]": variant === "warning",
          "bg-[var(--danger-bg)] text-[var(--danger-text)]": variant === "danger",
          "bg-[var(--info-bg)] text-[var(--info-text)]": variant === "info",
          "bg-[var(--brand-subtle)] text-[var(--brand)]": variant === "brand",
        },
        className,
      )}
    >
      {children}
    </span>
  );
}
