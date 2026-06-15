"use client";

import { useEffect } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

interface SlidePanelProps {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  width?: "md" | "lg" | "xl";
}

const widths = { md: "max-w-lg", lg: "max-w-2xl", xl: "max-w-3xl" };

export function SlidePanel({ open, onClose, title, subtitle, children, width = "lg" }: SlidePanelProps) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === "Escape") onClose(); }
    if (open) document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-[2px]" onClick={onClose} />

      {/* Panel — centered */}
      <div className={cn(
        "relative w-full bg-white rounded-2xl shadow-2xl flex flex-col max-h-[90vh]",
        widths[width],
        "animate-in fade-in zoom-in-95 duration-200",
      )}>
        {/* Header */}
        <div className="flex items-start justify-between gap-4 px-7 py-5 border-b border-[var(--border)] shrink-0 rounded-t-2xl"
          style={{ background: "linear-gradient(135deg,#262262,#92278F)" }}>
          <div>
            <h3 className="text-[18px] font-extrabold text-white">{title}</h3>
            {subtitle && <p className="text-[13px] text-white/70 mt-0.5">{subtitle}</p>}
          </div>
          <button onClick={onClose}
            className="w-9 h-9 rounded-xl flex items-center justify-center text-white/60 hover:bg-white/15 hover:text-white transition-all shrink-0 mt-0.5">
            <X size={18} />
          </button>
        </div>

        {/* Body — scrollable */}
        <div className="flex-1 overflow-y-auto px-7 py-6">
          {children}
        </div>
      </div>
    </div>
  );
}
