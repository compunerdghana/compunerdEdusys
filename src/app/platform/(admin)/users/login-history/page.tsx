"use client";

import { useState, useEffect, useMemo } from "react";
import { Search, History } from "lucide-react";

interface LoginRecord {
  id: string;
  user_name?: string;
  user_email?: string;
  status: string;
  ip_address?: string;
  device?: string;
  browser?: string;
  location?: string;
  created_at: string;
}

const statusBadge: Record<string, string> = {
  success: "bg-emerald-50 text-emerald-700 border-emerald-200",
  failed: "bg-red-50 text-red-700 border-red-200",
  locked: "bg-amber-50 text-amber-700 border-amber-200",
};

export default function LoginHistoryPage() {
  const [records, setRecords] = useState<LoginRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  useEffect(() => {
    fetch("/api/platform/login-history")
      .then((r) => r.json())
      .then((d) => setRecords(Array.isArray(d) ? d : (d.data ?? [])))
      .catch(() => setRecords([]))
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    return records.filter((r) => {
      const q = search.toLowerCase();
      if (q) {
        const hay = `${r.user_name} ${r.user_email} ${r.ip_address} ${r.device} ${r.browser} ${r.location}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      if (statusFilter && r.status !== statusFilter) return false;
      if (dateFrom && new Date(r.created_at) < new Date(dateFrom)) return false;
      if (dateTo && new Date(r.created_at) > new Date(dateTo + "T23:59:59")) return false;
      return true;
    });
  }, [records, search, statusFilter, dateFrom, dateTo]);

  const inputClass =
    "h-10 px-3 rounded-xl border border-[#e0daf0] text-[13px] font-semibold text-slate-700 outline-none focus:border-[#7c3aed] focus:ring-2 focus:ring-[#7c3aed]/20 bg-white transition-all";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-[26px] font-extrabold text-slate-900 leading-tight">Login History</h1>
        <p className="text-slate-500 text-[14px] font-semibold mt-1">
          Complete record of all login attempts
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search user, IP, device…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className={`${inputClass} pl-9 w-full`}
          />
        </div>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className={inputClass}>
          <option value="">All Statuses</option>
          <option value="success">Success</option>
          <option value="failed">Failed</option>
          <option value="locked">Locked</option>
        </select>
        <input
          type="date"
          value={dateFrom}
          onChange={(e) => setDateFrom(e.target.value)}
          className={inputClass}
        />
        <input
          type="date"
          value={dateTo}
          onChange={(e) => setDateTo(e.target.value)}
          className={inputClass}
        />
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-[#e8e4f3] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-[#faf9ff] border-b border-[#f0edf8]">
                {["User", "Email", "Status", "IP Address", "Device", "Browser", "Location", "Date / Time"].map((h) => (
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
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-16 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <div className="w-12 h-12 rounded-2xl bg-violet-50 flex items-center justify-center">
                        <History size={22} className="text-violet-400" />
                      </div>
                      <p className="text-slate-400 font-semibold text-[13px]">No login records found.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filtered.map((r) => (
                  <tr key={r.id} className="hover:bg-[#faf9ff] transition-colors">
                    <td className="px-4 py-3.5 font-bold text-slate-900 text-[13px]">
                      {r.user_name ?? "Unknown"}
                    </td>
                    <td className="px-4 py-3.5 text-slate-500 font-semibold text-[13px]">
                      {r.user_email ?? "—"}
                    </td>
                    <td className="px-4 py-3.5">
                      <span
                        className={`rounded-full text-[11px] font-bold px-2.5 py-0.5 border ${statusBadge[r.status] ?? "bg-slate-50 text-slate-500 border-slate-200"}`}
                      >
                        {r.status}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-slate-400 font-semibold text-[12px]">
                      {r.ip_address ?? "—"}
                    </td>
                    <td className="px-4 py-3.5 text-slate-400 font-semibold text-[12px]">
                      {r.device ?? "—"}
                    </td>
                    <td className="px-4 py-3.5 text-slate-400 font-semibold text-[12px]">
                      {r.browser ?? "—"}
                    </td>
                    <td className="px-4 py-3.5 text-slate-400 font-semibold text-[12px]">
                      {r.location ?? "—"}
                    </td>
                    <td className="px-4 py-3.5 text-slate-400 font-semibold text-[12px] whitespace-nowrap">
                      {new Date(r.created_at).toLocaleString()}
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
