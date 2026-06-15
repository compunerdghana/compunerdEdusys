"use client";

import { createContext, useCallback, useContext, useState, useRef } from "react";
import { CheckCircle2, XCircle, AlertTriangle, Info, X } from "lucide-react";
import { cn } from "@/lib/utils";

type ToastType = "success" | "error" | "warning" | "info";

interface ToastItem {
  id: string;
  type: ToastType;
  message: string;
}

interface ToastContextValue {
  toast: (message: string, type?: ToastType) => void;
  success: (message: string) => void;
  error: (message: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

const icons = {
  success: CheckCircle2,
  error: XCircle,
  warning: AlertTriangle,
  info: Info,
};
const colors = {
  success: { bg: "bg-emerald-50 border-emerald-200", icon: "text-emerald-600", text: "text-emerald-900" },
  error: { bg: "bg-red-50 border-red-200", icon: "text-red-600", text: "text-red-900" },
  warning: { bg: "bg-amber-50 border-amber-200", icon: "text-amber-600", text: "text-amber-900" },
  info: { bg: "bg-blue-50 border-blue-200", icon: "text-blue-600", text: "text-blue-900" },
};

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const counter = useRef(0);

  const dismiss = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const toast = useCallback((message: string, type: ToastType = "info") => {
    const id = String(++counter.current);
    setToasts(prev => [...prev, { id, type, message }]);
    setTimeout(() => dismiss(id), 4000);
  }, [dismiss]);

  const success = useCallback((message: string) => toast(message, "success"), [toast]);
  const error = useCallback((message: string) => toast(message, "error"), [toast]);

  return (
    <ToastContext.Provider value={{ toast, success, error }}>
      {children}
      <div className="fixed bottom-5 right-5 z-[100] flex flex-col gap-2 pointer-events-none">
        {toasts.map(t => {
          const Icon = icons[t.type];
          const c = colors[t.type];
          return (
            <div key={t.id}
              className={cn(
                "flex items-start gap-3 px-4 py-3 rounded-xl border shadow-lg max-w-sm pointer-events-auto",
                "animate-in slide-in-from-right-full fade-in duration-200",
                c.bg,
              )}>
              <Icon size={18} className={cn("shrink-0 mt-0.5", c.icon)} />
              <p className={cn("text-[13px] font-semibold flex-1", c.text)}>{t.message}</p>
              <button onClick={() => dismiss(t.id)} className={cn("shrink-0 opacity-60 hover:opacity-100 transition-opacity", c.icon)}>
                <X size={14} />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used inside ToastProvider");
  return ctx;
}
