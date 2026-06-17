"use client";

import { useState, useEffect } from "react";
import { Users, Search, RefreshCw, Loader2, Link as LinkIcon } from "lucide-react";
import { useToast } from "@/components/ui/Toast";

interface ParentProfile {
  id: string;
  full_name: string;
  email: string;
  phone: string;
  is_active: boolean;
  parents: Array<{
    id: string;
    parent_id: string;
    occupation: string;
    employer: string;
    address: string;
    parent_student_links?: Array<{
      relationship: string;
      student?: { id: string; first_name: string; last_name: string; admission_number: string };
    }>;
  }>;
}

export default function ParentsDirectory() {
  const { error: toastError } = useToast();
  const [parents, setParents] = useState<ParentProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  async function loadParents() {
    setLoading(true);
    try {
      const res = await fetch("/api/school/user-management/users?role=parent");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed");
      setParents(data.users ?? []);
    } catch {
      toastError("Failed to load parents list.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadParents();
  }, []);

  const filtered = parents.filter(p => 
    p.full_name?.toLowerCase().includes(search.toLowerCase()) ||
    p.phone?.includes(search) ||
    p.parents?.[0]?.parent_id?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-[20px] font-extrabold text-slate-900 leading-tight">Parents Directory</h1>
        <p className="text-slate-500 text-[12px] font-semibold mt-0.5">Manage parents information and verify multi-ward links.</p>
      </div>

      {/* Toolbar */}
      <div className="flex gap-3 items-center">
        <div className="relative flex-1">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search parent name, ID, or phone number..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 h-10 rounded-xl border border-[#e0daf0] text-[13px] font-semibold text-slate-800 outline-none focus:border-[#7c3aed] focus:ring-2 focus:ring-[#7c3aed]/20 transition-all bg-white"
          />
        </div>
        <button onClick={loadParents} className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-[12px] font-bold border border-[#e0daf0] text-slate-600 hover:bg-slate-50 transition-all bg-white">
          <RefreshCw size={13} className={loading ? "animate-spin" : ""} />
        </button>
      </div>

      {/* Grid */}
      <div className="bg-white rounded-2xl shadow-sm border border-[#e8e4f3] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-[#faf9ff] border-b border-[#f0edf8]">
                {["Parent Details", "Parent ID", "Occupation / Employer", "Contact", "Linked Wards (Children)", "Status"].map((h) => (
                  <th key={h} className="px-6 py-4 text-[11px] font-bold text-slate-400 uppercase tracking-widest whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#f5f3fc]">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-20 text-center">
                    <Loader2 size={24} className="animate-spin text-violet-600 mx-auto" />
                    <p className="text-slate-400 text-[12px] font-semibold mt-2">Loading parents directory...</p>
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-16 text-center text-slate-400 font-semibold text-[13px]">
                    No parents found.
                  </td>
                </tr>
              ) : (
                filtered.map((p) => {
                  const pInfo = p.parents?.[0];
                  const links = pInfo?.parent_student_links || [];
                  const initials = p.full_name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);
                  return (
                    <tr key={p.id} className="hover:bg-[#faf9ff]/50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl flex items-center justify-center text-white bg-indigo-600 text-[11px] font-extrabold shadow-sm shrink-0">
                            {initials}
                          </div>
                          <div>
                            <p className="font-bold text-slate-900 text-[13px]">{p.full_name}</p>
                            <p className="text-slate-400 font-semibold text-[11px]">{p.email || "No email"}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-[13px] font-bold text-slate-700 font-mono">{pInfo?.parent_id || "—"}</td>
                      <td className="px-6 py-4 text-[13px] font-semibold text-slate-600">
                        {pInfo?.occupation ? (
                          <>
                            <p className="text-slate-800 font-bold">{pInfo.occupation}</p>
                            {pInfo.employer && <p className="text-slate-400 font-medium text-[11px]">{pInfo.employer}</p>}
                          </>
                        ) : "—"}
                      </td>
                      <td className="px-6 py-4 text-slate-700 font-semibold text-[13px]">{p.phone || "—"}</td>
                      <td className="px-6 py-4">
                        {links.length > 0 ? (
                          <div className="flex flex-wrap gap-1.5 max-w-xs">
                            {links.map((lnk: any, idx) => {
                              const s = lnk.student;
                              if (!s) return null;
                              return (
                                <span key={idx} className="inline-flex items-center gap-1 text-[11px] font-bold text-indigo-700 bg-indigo-50 border border-indigo-100 rounded-full px-2 py-0.5">
                                  {s.first_name} {s.last_name} ({lnk.relationship})
                                </span>
                              );
                            })}
                          </div>
                        ) : (
                          <span className="text-[11px] text-slate-400 font-semibold italic">No wards linked</span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded-full border ${
                          p.is_active ? "bg-emerald-50 text-emerald-700 border-emerald-100" : "bg-rose-50 text-rose-700 border-rose-100"
                        }`}>
                          {p.is_active ? "Active" : "Suspended"}
                        </span>
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
