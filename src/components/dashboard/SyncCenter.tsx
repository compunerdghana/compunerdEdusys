"use client";

import { useEffect, useState } from "react";
import { syncEngine, type SyncState } from "@/lib/offline/sync";
import { getPendingCount } from "@/lib/offline/db";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { RefreshCw, Wifi, WifiOff, Clock } from "lucide-react";
import { cn } from "@/lib/utils";

export function SyncCenter() {
  const [state, setState] = useState<SyncState>("offline");
  const [pending, setPending] = useState(0);
  const [lastSync, setLastSync] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    if (!syncEngine) return;
    const { state: s, pendingCount: p } = syncEngine.getState();
    setState(s);
    setPending(p);
    const stored = localStorage.getItem("edusys_last_sync");
    if (stored) setLastSync(stored);

    const unsub = syncEngine.subscribe((s, p) => {
      setState(s);
      setPending(p);
      if (s === "online") {
        const now = new Date().toLocaleTimeString("en-GH", { hour: "2-digit", minute: "2-digit" });
        localStorage.setItem("edusys_last_sync", now);
        setLastSync(now);
      }
    });
    return () => { unsub(); };
  }, []);

  async function handleManualSync() {
    setSyncing(true);
    await syncEngine?.syncNow();
    setSyncing(false);
  }

  const isOnline = state === "online";
  const isOffline = state === "offline";

  return (
    <Card className={cn(
      "border-2 transition-colors",
      isOnline && "border-[var(--success-border)]",
      state === "pending" && "border-[var(--amber-100)]",
      isOffline && "border-[var(--border)]",
    )}>
      <div className="flex items-start justify-between gap-3 mb-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[var(--text-muted)] mb-1">Sync status</p>
          <div className="flex items-center gap-2">
            {isOffline
              ? <WifiOff size={16} className="text-[var(--sync-offline)]" />
              : <Wifi size={16} className={isOnline ? "text-[var(--success)]" : "text-[var(--amber-500)]"} />
            }
            <span className={cn(
              "text-sm font-bold",
              isOnline && "text-[var(--success)]",
              state === "pending" && "text-[var(--amber-600)]",
              isOffline && "text-[var(--text-muted)]",
            )}>
              {isOnline ? "Online — synced" : state === "pending" ? "Syncing..." : "Offline mode"}
            </span>
          </div>
        </div>
        <Button size="sm" variant="secondary" onClick={handleManualSync} loading={syncing}>
          <RefreshCw size={13} />
          Sync now
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="bg-[var(--neutral-50)] rounded-[10px] p-3">
          <p className="text-[11px] text-[var(--text-muted)] uppercase tracking-[0.08em] mb-1">Pending records</p>
          <p className={cn("text-xl font-bold font-mono", pending > 0 ? "text-[var(--amber-600)]" : "text-[var(--success)]")}>
            {pending}
          </p>
        </div>
        <div className="bg-[var(--neutral-50)] rounded-[10px] p-3">
          <p className="text-[11px] text-[var(--text-muted)] uppercase tracking-[0.08em] mb-1">Last sync</p>
          <p className="text-sm font-semibold text-[var(--text-strong)] flex items-center gap-1">
            <Clock size={13} className="text-[var(--text-muted)]" />
            {lastSync ?? "—"}
          </p>
        </div>
      </div>

      {/* Sync progress bar */}
      <div className="h-1.5 bg-[var(--neutral-100)] rounded-full overflow-hidden">
        <div
          className={cn(
            "h-full rounded-full transition-all duration-500",
            isOnline && "bg-[var(--success)] w-full",
            state === "pending" && "bg-[var(--amber-500)] w-3/4 animate-pulse",
            isOffline && "bg-[var(--neutral-300)] w-full",
          )}
        />
      </div>
      <p className="text-xs text-[var(--text-muted)] mt-2">
        {isOffline
          ? "Working offline — changes will sync when you reconnect."
          : pending > 0
          ? `${pending} record${pending > 1 ? "s" : ""} waiting to upload.`
          : "All records are up to date."}
      </p>
    </Card>
  );
}
