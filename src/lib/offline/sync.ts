"use client";

import { createClient } from "@/lib/supabase/client";
import { getDB, getPendingCount } from "./db";

export type SyncState = "online" | "pending" | "offline";

type SyncListener = (state: SyncState, pendingCount: number) => void;

class SyncEngine {
  private listeners = new Set<SyncListener>();
  private state: SyncState = "offline";
  private pendingCount = 0;
  private syncTimer: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    if (typeof window === "undefined") return;
    window.addEventListener("online", () => this.onConnectivityChange(true));
    window.addEventListener("offline", () => this.onConnectivityChange(false));
    this.onConnectivityChange(navigator.onLine);
  }

  private onConnectivityChange(isOnline: boolean) {
    if (!isOnline) {
      this.setState("offline", this.pendingCount);
      return;
    }
    this.syncNow();
  }

  private setState(state: SyncState, pendingCount: number) {
    this.state = state;
    this.pendingCount = pendingCount;
    this.listeners.forEach((l) => l(state, pendingCount));
  }

  subscribe(listener: SyncListener) {
    this.listeners.add(listener);
    listener(this.state, this.pendingCount);
    return () => this.listeners.delete(listener);
  }

  async syncNow() {
    if (!navigator.onLine) return;

    const pending = await getPendingCount();
    if (pending === 0) {
      this.setState("online", 0);
      return;
    }

    this.setState("pending", pending);

    try {
      const db = await getDB();
      const supabase = createClient();
      const allItems = await db.getAll("sync_queue");

      for (const item of allItems) {
        try {
          if (item.operation === "insert") {
            await supabase.from(item.table as never).insert(item.payload as never);
          } else if (item.operation === "update") {
            const { id, ...data } = item.payload;
            await supabase.from(item.table as never).update(data as never).eq("id", id as string);
          } else if (item.operation === "delete") {
            await supabase.from(item.table as never).delete().eq("id", item.payload.id as string);
          }
          await db.delete("sync_queue", item.id);
        } catch {
          await db.put("sync_queue", { ...item, retries: item.retries + 1 });
        }
      }

      const remaining = await getPendingCount();
      this.setState(remaining === 0 ? "online" : "pending", remaining);
    } catch {
      this.setState("pending", pending);
    }

    // Retry in 30s if still pending
    if (this.state === "pending") {
      if (this.syncTimer) clearTimeout(this.syncTimer);
      this.syncTimer = setTimeout(() => this.syncNow(), 30_000);
    }
  }

  getState() {
    return { state: this.state, pendingCount: this.pendingCount };
  }
}

export const syncEngine = typeof window !== "undefined" ? new SyncEngine() : null;
