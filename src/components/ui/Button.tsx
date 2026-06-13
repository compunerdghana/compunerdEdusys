import { cn } from "@/lib/utils";
import { type ButtonHTMLAttributes, forwardRef } from "react";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost" | "danger";
  size?: "sm" | "md" | "lg";
  loading?: boolean;
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", size = "md", loading, disabled, children, ...props }, ref) => {
    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={cn(
          "inline-flex items-center justify-center gap-2 font-semibold rounded-[10px] transition-all duration-120 focus:outline-none",
          "disabled:opacity-50 disabled:pointer-events-none",
          {
            "bg-[var(--brand)] text-white hover:bg-[var(--brand-hover)] active:bg-[var(--brand-active)] active:translate-y-px shadow-sm":
              variant === "primary",
            "bg-white text-[var(--text-body)] border border-[var(--border)] hover:bg-[var(--neutral-100)] active:translate-y-px shadow-sm":
              variant === "secondary",
            "text-[var(--text-body)] hover:bg-[var(--neutral-100)] active:translate-y-px":
              variant === "ghost",
            "bg-[var(--danger)] text-white hover:bg-[var(--red-700)] active:translate-y-px shadow-sm":
              variant === "danger",
            "text-xs px-3 py-1.5 h-8": size === "sm",
            "text-[15px] px-4 py-2 h-10": size === "md",
            "text-base px-6 py-3 h-12": size === "lg",
          },
          className,
        )}
        {...props}
      >
        {loading && (
          <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
          </svg>
        )}
        {children}
      </button>
    );
  },
);
Button.displayName = "Button";
export { Button };
