"use client";

import { AlertTriangle, Info, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Card } from "@/components/ui/Card";
import { useState } from "react";

interface Alert {
  id: string;
  level: "red" | "yellow" | "info";
  title: string;
  message: string;
}

interface AlertsPanelProps {
  alerts: Alert[];
}

export function AlertsPanel({ alerts: initial }: AlertsPanelProps) {
  const [alerts, setAlerts] = useState(initial);

  function dismiss(id: string) {
    setAlerts((a) => a.filter((x) => x.id !== id));
  }

  if (!alerts.length) return null;

  return (
    <Card className="p-0 overflow-hidden">
      <div className="px-4 py-3 border-b border-[var(--border)]">
        <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[var(--text-muted)]">Alerts</p>
      </div>
      <div className="divide-y divide-[var(--border)]">
        {alerts.map((a) => (
          <div key={a.id} className={cn(
            "flex items-start gap-3 px-4 py-3",
            a.level === "red" && "bg-[var(--danger-bg)]",
            a.level === "yellow" && "bg-[var(--warning-bg)]",
          )}>
            {a.level === "info"
              ? <Info size={15} className="text-[var(--info)] mt-0.5 shrink-0" />
              : <AlertTriangle size={15} className={cn("mt-0.5 shrink-0", a.level === "red" ? "text-[var(--danger)]" : "text-[var(--warning)]")} />
            }
            <div className="flex-1 min-w-0">
              <p className={cn("text-sm font-semibold", a.level === "red" ? "text-[var(--danger)]" : a.level === "yellow" ? "text-[var(--warning)]" : "text-[var(--info)]")}>
                {a.title}
              </p>
              <p className="text-xs text-[var(--text-muted)] mt-0.5">{a.message}</p>
            </div>
            <button onClick={() => dismiss(a.id)} className="text-[var(--text-subtle)] hover:text-[var(--text-muted)] transition-colors shrink-0 mt-0.5">
              <X size={13} />
            </button>
          </div>
        ))}
      </div>
    </Card>
  );
}
