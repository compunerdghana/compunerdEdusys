"use client";

import { useState, useEffect } from "react";
import { MonitorSmartphone, LogOut, AlertTriangle } from "lucide-react";
import { useToast } from "@/components/ui/Toast";

interface Session {
  id: string;
  user_name?: string;
  user_email?: string;
  device?: string;
  browser?: string;
  ip_address?: string;
  location?: string;
  login_time?: string;
  last_activity?: string;
}

function initials(name?: string) {
  if (!name) return "?";
  return name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
}

export default function ActiveSessionsPage() {
  const { success, error: toastError } = useToast();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [terminating, setTerminating] = useState<string | null>(null);
  const [terminatingAll, setTerminatingAll] = useState(false);
  const [confirmAll, setConfirmAll] = useState(false);

  useEffect(() => {
    fetch("/api/platform/sessions")
      .then((r) => r.json())
      .then((d) => setSessions(Array.isArray(d) ? d : (d.data ?? [])))
      .catch(() => setSessions([]))
      .finally(() => setLoading(false));
  }, []);

  async function handleTerminate(id: string) {
    setTerminating(id);
    try {
      const res = await fetch(`/api/platform/sessions?id=${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to terminate session");
      setSessions((prev) => prev.filter((s) => s.id !== id));
      success("Session terminated.");
    } catch (err: unknown) {
      toastError(err instanceof Error ? err.message : "Failed to terminate session");
    } finally {
      setTerminating(null);
    }
  }

  async function handleTerminateAll() {
    setTerminatingAll(true);
    try {
      const res = await fetch("/api/platform/sessions", { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to terminate all sessions");
      setSessions([]);
      success("All sessions terminated.");
    } catch (err: unknown) {
      toastError(err instanceof Error ? err.message : "Failed to terminate all sessions");
    } finally {
      setTerminatingAll(false);
      setConfirmAll(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-[26px] font-extrabold text-slate-900 leading-tight">Active Sessions</h1>
            <span className="rounded-full text-[12px] font-bold px-3 py-0.5 border bg-emerald-50 text-emerald-700 border-emerald-200">
              {sessions.length} active
            </span>
          </div>
          <p className="text-slate-500 text-[14px] font-semibold mt-1">
            Currently logged-in platform users
          </p>
        </div>
        {sessions.length > 0 && (
          confirmAll ? (
            <div className="flex items-center gap-2">
              <span className="text-[13px] font-semibold text-slate-600">Terminate all sessions?</span>
              <button
                onClick={handleTerminateAll}
                disabled={terminatingAll}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-white font-bold text-[12px] bg-red-600 hover:bg-red-700 transition-colors disabled:opacity-60"
              >
                {terminatingAll ? "Terminating…" : "Confirm"}
              </button>
              <button
                onClick={() => setConfirmAll(false)}
                className="px-3 py-2 rounded-xl text-slate-600 font-bold text-[12px] bg-slate-100 hover:bg-slate-200 transition-colors"
              >
                Cancel
              </button>
            </div>
          ) : (
            <button
              onClick={() => setConfirmAll(true)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-white text-[13px] font-bold transition-all shadow-sm bg-red-600 hover:bg-red-700"
            >
              <AlertTriangle size={14} />
              Terminate All
            </button>
          )
        )}
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-[#e8e4f3] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-[#faf9ff] border-b border-[#f0edf8]">
                {["User", "Device", "Browser", "IP", "Location", "Login Time", "Last Activity", "Action"].map((h) => (
                  <th
                    key={h}
                    className="px-4 py-3 text-left text-[11px] font-bold text-slate-400 uppercase tracking-widest whitespace-nowrap"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#f5f3fc]">
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-16 text-center text-slate-400 font-semibold text-[13px]">
                    Loading…
                  </td>
                </tr>
              ) : sessions.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-16 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <div className="w-12 h-12 rounded-2xl bg-violet-50 flex items-center justify-center">
                        <MonitorSmartphone size={22} className="text-violet-400" />
                      </div>
                      <p className="text-slate-400 font-semibold text-[13px]">No active sessions.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                sessions.map((s) => (
                  <tr key={s.id} className="hover:bg-[#faf9ff] transition-colors">
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-3">
                        <div
                          className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-[10px] font-extrabold shrink-0"
                          style={{ background: "linear-gradient(135deg, #4f46e5, #7c3aed)" }}
                        >
                          {initials(s.user_name)}
                        </div>
                        <div>
                          <p className="font-bold text-slate-900 text-[13px]">{s.user_name ?? "Unknown"}</p>
                          {s.user_email && (
                            <p className="text-slate-400 font-semibold text-[11px]">{s.user_email}</p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3.5 text-slate-500 font-semibold text-[13px]">{s.device ?? "—"}</td>
                    <td className="px-4 py-3.5 text-slate-500 font-semibold text-[13px]">{s.browser ?? "—"}</td>
                    <td className="px-4 py-3.5 text-slate-400 font-semibold text-[12px]">{s.ip_address ?? "—"}</td>
                    <td className="px-4 py-3.5 text-slate-400 font-semibold text-[12px]">{s.location ?? "—"}</td>
                    <td className="px-4 py-3.5 text-slate-400 font-semibold text-[12px] whitespace-nowrap">
                      {s.login_time ? new Date(s.login_time).toLocaleString() : "—"}
                    </td>
                    <td className="px-4 py-3.5 text-slate-400 font-semibold text-[12px] whitespace-nowrap">
                      {s.last_activity ? new Date(s.last_activity).toLocaleString() : "—"}
                    </td>
                    <td className="px-4 py-3.5">
                      <button
                        onClick={() => handleTerminate(s.id)}
                        disabled={terminating === s.id}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-red-600 font-bold text-[11px] bg-red-50 hover:bg-red-100 transition-colors disabled:opacity-60"
                      >
                        <LogOut size={11} />
                        {terminating === s.id ? "…" : "Terminate"}
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
