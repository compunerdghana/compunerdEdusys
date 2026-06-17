"use client";

import { useState, useEffect } from "react";
import { UserCheck, Search, RefreshCw, Loader2 } from "lucide-react";
import { useToast } from "@/components/ui/Toast";

interface StaffProfile {
  id: string;
  full_name: string;
  email: string;
  phone: string;
  is_active: boolean;
  role: string;
  staff: Array<{
    id: string;
    staff_id: string;
    department: string;
    position: string;
    employment_type: string;
    employment_date: string;
    supervisor_id: string;
  }>;
}

export default function StaffDirectory() {
  const { error: toastError } = useToast();
  const [staffList, setStaffList] = useState<StaffProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  async function loadStaff() {
    setLoading(true);
    try {
      const res = await fetch("/api/school/user-management/users?role=staff_all");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed");
      setStaffList(data.users ?? []);
    } catch {
      toastError("Failed to load staff list.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadStaff();
  }, []);

  const filtered = staffList.filter(s => 
    s.full_name?.toLowerCase().includes(search.toLowerCase()) ||
    s.staff?.[0]?.staff_id?.toLowerCase().includes(search.toLowerCase()) ||
    s.staff?.[0]?.position?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-[20px] font-extrabold text-slate-900 leading-tight">Administrative & Support Staff Directory</h1>
        <p className="text-slate-500 text-[12px] font-semibold mt-0.5">Manage administrative logins, registrars, nurses, security, and coordinators.</p>
      </div>

      {/* Toolbar */}
      <div className="flex gap-3 items-center">
        <div className="relative flex-1">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search staff name, ID, or position..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 h-10 rounded-xl border border-[#e0daf0] text-[13px] font-semibold text-slate-800 outline-none focus:border-[#7c3aed] focus:ring-2 focus:ring-[#7c3aed]/20 transition-all bg-white"
          />
        </div>
        <button onClick={loadStaff} className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-[12px] font-bold border border-[#e0daf0] text-slate-600 hover:bg-slate-50 transition-all bg-white">
          <RefreshCw size={13} className={loading ? "animate-spin" : ""} />
        </button>
      </div>

      {/* Grid */}
      <div className="bg-white rounded-2xl shadow-sm border border-[#e8e4f3] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-[#faf9ff] border-b border-[#f0edf8]">
                {["Staff Details", "Staff ID", "Position", "Department", "Employment Type", "Status"].map((h) => (
                  <th key={h} className="px-6 py-4 text-[11px] font-bold text-slate-400 uppercase tracking-widest whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#f5f3fc]">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-20 text-center">
                    <Loader2 size={24} className="animate-spin text-violet-600 mx-auto" />
                    <p className="text-slate-400 text-[12px] font-semibold mt-2">Loading staff directory...</p>
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-16 text-center text-slate-400 font-semibold text-[13px]">
                    No staff records found.
                  </td>
                </tr>
              ) : (
                filtered.map((s) => {
                  const sInfo = s.staff?.[0];
                  const initials = s.full_name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);
                  return (
                    <tr key={s.id} className="hover:bg-[#faf9ff]/50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl flex items-center justify-center text-white bg-slate-600 text-[11px] font-extrabold shadow-sm shrink-0">
                            {initials}
                          </div>
                          <div>
                            <p className="font-bold text-slate-900 text-[13px]">{s.full_name}</p>
                            <p className="text-slate-400 font-semibold text-[11px] capitalize">{s.role.replace("_", " ")}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-[13px] font-bold text-slate-700 font-mono">{sInfo?.staff_id || "—"}</td>
                      <td className="px-6 py-4 text-slate-700 font-semibold text-[13px]">{sInfo?.position || s.role.replace("_", " ")}</td>
                      <td className="px-6 py-4 text-slate-600 font-semibold text-[13px]">{sInfo?.department || "—"}</td>
                      <td className="px-6 py-4">
                        <span className="text-[11px] font-bold text-violet-700 bg-violet-50 px-2 py-0.5 rounded-full border border-violet-100 capitalize">
                          {sInfo?.employment_type || "full-time"}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded-full border ${
                          s.is_active ? "bg-emerald-50 text-emerald-700 border-emerald-100" : "bg-rose-50 text-rose-700 border-rose-100"
                        }`}>
                          {s.is_active ? "Active" : "Suspended"}
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
