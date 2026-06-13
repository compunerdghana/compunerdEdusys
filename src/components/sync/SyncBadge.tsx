"use client";

import { useEffect, useState } from "react";
import { syncEngine, type SyncState } from "@/lib/offline/sync";
import { cn } from "@/lib/utils";

export function SyncBadge() {
  const [state, setState] = useState<SyncState>("offline");
  const [pending, setPending] = useState(0);

  useEffect(() => {
    if (!syncEngine) return;
    const { state: s, pendingCount: p } = syncEngine.getState();
    setState(s);
    setPending(p);
    const unsub = syncEngine.subscribe((s, p) => {
      setState(s);
      setPending(p);
    });
    return () => { unsub(); };
  }, []);

  const label =
    state === "online" ? "Synced" :
    state === "pending" ? `${pending} pending` :
    "Offline";

  return (
    <div
      className={cn(
        "inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full transition-all",
        state === "online" && "bg-[var(--success-bg)] text-[var(--success-text)]",
        state === "pending" && "bg-[var(--warning-bg)] text-[var(--amber-600)]",
        state === "offline" && "bg-[var(--neutral-100)] text-[var(--text-muted)]",
      )}
    >
      <span
        className={cn(
          "w-1.5 h-1.5 rounded-full",
          state === "online" && "bg-[var(--success)]",
          state === "pending" && "bg-[var(--amber-500)] animate-pulse",
          state === "offline" && "bg-[var(--sync-offline)]",
        )}
      />
      {label}
    </div>
  );
}
