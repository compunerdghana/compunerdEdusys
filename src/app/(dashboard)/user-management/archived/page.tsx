"use client";

import { useState, useEffect } from "react";
import { UserMinus, Search, RefreshCw, Loader2, Play } from "lucide-react";
import { useToast } from "@/components/ui/Toast";

interface ArchivedUser {
  id: string;
  full_name: string;
  username: string;
  email: string;
  role: string;
  is_active: boolean;
  phone: string;
}

export default function ArchivedUsersList() {
  const { success, error: toastError } = useToast();
  const [archived, setArchived] = useState<ArchivedUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [restoringId, setRestoringId] = useState("");

  async function loadArchived() {
    setLoading(true);
    try {
      const res = await fetch("/api/school/user-management/users?status=suspended");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed");
      setArchived(data.users ?? []);
    } catch {
      toastError("Failed to load suspended accounts list.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadArchived(); }, []);

  async function handleRestore(userId: string) {
    setRestoringId(userId);
    try {
      const res = await fetch("/api/school/user-management/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: userId, is_active: true })
      });
      if (!res.ok) throw new Error();
      success("User account reactivated successfully.");
      setArchived(prev => prev.filter(u => u.id !== userId));
    } catch {
      toastError("Failed to restore user account.");
    } finally {
      setRestoringId("");
    }
  }

  const filtered = archived.filter(u => 
    u.full_name?.toLowerCase().includes(search.toLowerCase()) ||
    u.username?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-[20px] font-extrabold text-slate-900 leading-tight">Archived / Suspended Accounts</h1>
        <p className="text-slate-500 text-[12px] font-semibold mt-0.5">Review suspended logins and reactivate profile access codes.</p>
      </div>

      {/* Toolbar */}
      <div className="flex gap-3 items-center">
        <div className="relative flex-1">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search suspended accounts by name or username..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 h-10 rounded-xl border border-[#e0daf0] text-[13px] font-semibold text-slate-800 outline-none focus:border-[#7c3aed] focus:ring-2 focus:ring-[#7c3aed]/20 transition-all bg-white"
          />
        </div>
        <button onClick={loadArchived} className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-[12px] font-bold border border-[#e0daf0] text-slate-600 hover:bg-slate-50 transition-all bg-white">
          <RefreshCw size={13} className={loading ? "animate-spin" : ""} />
        </button>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-[#e8e4f3] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-[#faf9ff] border-b border-[#f0edf8]">
                {["User Details", "Username / Email", "Phone", "Role", "Actions"].map((h) => (
                  <th key={h} className="px-6 py-3.5 text-[11px] font-bold text-slate-400 uppercase tracking-widest whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#f5f3fc]">
              {loading ? (
                <tr>
                  <td colSpan={5} className="py-20 text-center">
                    <Loader2 size={24} className="animate-spin text-violet-600 mx-auto" />
                    <p className="text-slate-400 text-[12px] font-semibold mt-2">Loading archived catalog...</p>
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-20 text-center">
                    <div className="w-16 h-16 rounded-2xl bg-slate-50 flex items-center justify-center mx-auto mb-3">
                      <UserMinus size={28} className="text-slate-300" />
                    </div>
                    <p className="text-slate-700 font-bold text-[14px]">No archived accounts found</p>
                    <p className="text-slate-400 text-[12px] font-medium mt-1">Suspended accounts will appear in this recycle bin.</p>
                  </td>
                </tr>
              ) : (
                filtered.map((u) => {
                  const initials = u.full_name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);
                  const isRestoring = restoringId === u.id;
                  return (
                    <tr key={u.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-6 py-5">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white bg-slate-400 text-[11px] font-extrabold shadow ring-2 ring-white shrink-0">
                            {initials}
                          </div>
                          <div>
                            <p className="font-bold text-slate-900 text-[13.5px]">{u.full_name}</p>
                            <p className="text-slate-400 font-semibold text-[11px] capitalize">{u.role.replace("_", " ")}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-5">
                        <p className="text-slate-700 font-semibold text-[13.5px]">{u.username}</p>
                        <p className="text-slate-400 font-medium text-[11.5px]">{u.email}</p>
                      </td>
                      <td className="px-6 py-5 text-slate-500 font-semibold text-[13.5px]">{u.phone || "—"}</td>
                      <td className="px-6 py-5">
                        <span className="text-[11px] font-bold text-slate-600 bg-slate-100 rounded px-2 py-0.5 border border-slate-200 capitalize">
                          {u.role.replace("_", " ")}
                        </span>
                      </td>
                      <td className="px-6 py-5">
                        <button
                          onClick={() => handleRestore(u.id)}
                          disabled={isRestoring}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-emerald-100 bg-emerald-50 text-[11.5px] font-bold text-emerald-700 hover:bg-emerald-100 transition-all disabled:opacity-55"
                        >
                          {isRestoring ? <Loader2 size={12} className="animate-spin" /> : <Play size={11} className="stroke-[3]" />}
                          Restore Account
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
