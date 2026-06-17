"use client";

import { useState, useEffect } from "react";
import { History, Search, RefreshCw, Loader2 } from "lucide-react";
import { useToast } from "@/components/ui/Toast";

interface LoginRecord {
  id: string;
  username: string;
  status: string;
  ip_address: string;
  browser: string;
  device: string;
  created_at: string;
  profile?: { full_name: string; role: string };
}

export default function LoginHistoryBoard() {
  const { error: toastError } = useToast();
  const [logins, setLogins] = useState<LoginRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  async function loadHistory() {
    setLoading(true);
    try {
      const res = await fetch("/api/school/user-management/login-history");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed");
      setLogins(data.history ?? []);
    } catch {
      toastError("Failed to load sign-in history.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadHistory(); }, []);

  const filtered = logins.filter(log => 
    log.username?.toLowerCase().includes(search.toLowerCase()) ||
    log.profile?.full_name?.toLowerCase().includes(search.toLowerCase()) ||
    log.ip_address?.includes(search)
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-[20px] font-extrabold text-slate-900 leading-tight">Access & Login Sessions History</h1>
        <p className="text-slate-500 text-[12px] font-semibold mt-0.5">Audit latest login activities, failed passwords triggers and browser agents.</p>
      </div>

      {/* Toolbar */}
      <div className="flex gap-3 items-center">
        <div className="relative flex-1">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search log by name, username or IP address..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 h-10 rounded-xl border border-[#e0daf0] text-[13px] font-semibold text-slate-800 outline-none focus:border-[#7c3aed] focus:ring-2 focus:ring-[#7c3aed]/20 transition-all bg-white"
          />
        </div>
        <button onClick={loadHistory} className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-[12px] font-bold border border-[#e0daf0] text-slate-600 hover:bg-slate-50 transition-all bg-white">
          <RefreshCw size={13} className={loading ? "animate-spin" : ""} />
        </button>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-[#e8e4f3] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-[#faf9ff] border-b border-[#f0edf8]">
                {["User Details", "Authentication Status", "IP Address", "Device / Browser User-Agent", "Timestamp"].map((h) => (
                  <th key={h} className="px-6 py-4 text-[11px] font-bold text-slate-400 uppercase tracking-widest whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#f5f3fc]">
              {loading ? (
                <tr>
                  <td colSpan={5} className="py-20 text-center">
                    <Loader2 size={24} className="animate-spin text-violet-600 mx-auto" />
                    <p className="text-slate-400 text-[12px] font-semibold mt-2">Loading logs...</p>
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-16 text-center text-slate-400 font-semibold text-[13px]">
                    No sign-in records logged.
                  </td>
                </tr>
              ) : (
                filtered.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4">
                      <p className="font-bold text-slate-900 text-[13.5px]">{log.profile?.full_name || log.username}</p>
                      <p className="text-slate-400 font-semibold text-[11px] capitalize">{log.profile?.role?.replace("_", " ") || "Visitor"}</p>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded-full border ${
                        log.status === "success" ? "bg-emerald-50 text-emerald-700 border-emerald-100" : "bg-rose-50 text-rose-700 border-rose-100"
                      }`}>
                        {log.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-slate-700 font-mono text-[13px] font-semibold">{log.ip_address}</td>
                    <td className="px-6 py-4 text-slate-500 font-semibold text-[12px]">{log.device || "Desktop"} / {log.browser || "Chrome"}</td>
                    <td className="px-6 py-4 text-slate-400 font-medium text-[12px]">{new Date(log.created_at).toLocaleString()}</td>
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
