"use client";

import { useState, useEffect } from "react";
import { UserCog, Search, RefreshCw, Loader2 } from "lucide-react";
import { useToast } from "@/components/ui/Toast";

interface TeacherProfile {
  id: string;
  full_name: string;
  email: string;
  phone: string;
  is_active: boolean;
  teachers: Array<{
    id: string;
    teacher_id: string;
    employment_date: string;
    department: string;
    qualification: string;
    specialization: string;
    subjects_assigned: string[];
    classes_assigned: string[];
  }>;
}

export default function TeachersDirectory() {
  const { error: toastError } = useToast();
  const [teachers, setTeachers] = useState<TeacherProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  async function loadTeachers() {
    setLoading(true);
    try {
      const res = await fetch("/api/school/user-management/users?role=teacher");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed");
      setTeachers(data.users ?? []);
    } catch {
      toastError("Failed to load teachers directory.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadTeachers();
  }, []);

  const filtered = teachers.filter(t => 
    t.full_name?.toLowerCase().includes(search.toLowerCase()) ||
    t.teachers?.[0]?.teacher_id?.toLowerCase().includes(search.toLowerCase()) ||
    t.teachers?.[0]?.department?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-[20px] font-extrabold text-slate-900 leading-tight">Teachers Directory</h1>
        <p className="text-slate-500 text-[12px] font-semibold mt-0.5">Manage teaching staff qualifications, departments, and class-subject loads.</p>
      </div>

      {/* Toolbar */}
      <div className="flex gap-3 items-center">
        <div className="relative flex-1">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search teacher name, ID, or department..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 h-10 rounded-xl border border-[#e0daf0] text-[13px] font-semibold text-slate-800 outline-none focus:border-[#7c3aed] focus:ring-2 focus:ring-[#7c3aed]/20 transition-all bg-white"
          />
        </div>
        <button onClick={loadTeachers} className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-[12px] font-bold border border-[#e0daf0] text-slate-600 hover:bg-slate-50 transition-all bg-white">
          <RefreshCw size={13} className={loading ? "animate-spin" : ""} />
        </button>
      </div>

      {/* Grid */}
      <div className="bg-white rounded-2xl shadow-sm border border-[#e8e4f3] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-[#faf9ff] border-b border-[#f0edf8]">
                {["Teacher Details", "Teacher ID", "Department / Specialization", "Qualification", "Assigned Load", "Status"].map((h) => (
                  <th key={h} className="px-6 py-4 text-[11px] font-bold text-slate-400 uppercase tracking-widest whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#f5f3fc]">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-20 text-center">
                    <Loader2 size={24} className="animate-spin text-violet-600 mx-auto" />
                    <p className="text-slate-400 text-[12px] font-semibold mt-2">Loading teachers directory...</p>
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-16 text-center text-slate-400 font-semibold text-[13px]">
                    No teachers found.
                  </td>
                </tr>
              ) : (
                filtered.map((t) => {
                  const tInfo = t.teachers?.[0];
                  const initials = t.full_name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);
                  const subjectsCount = tInfo?.subjects_assigned?.length || 0;
                  const classesCount = tInfo?.classes_assigned?.length || 0;
                  return (
                    <tr key={t.id} className="hover:bg-[#faf9ff]/50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl flex items-center justify-center text-white bg-amber-600 text-[11px] font-extrabold shadow-sm shrink-0">
                            {initials}
                          </div>
                          <div>
                            <p className="font-bold text-slate-900 text-[13px]">{t.full_name}</p>
                            <p className="text-slate-400 font-semibold text-[11px]">{t.phone || t.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-[13px] font-bold text-slate-700 font-mono">{tInfo?.teacher_id || "—"}</td>
                      <td className="px-6 py-4">
                        {tInfo?.department ? (
                          <>
                            <p className="text-slate-800 font-bold text-[13px]">{tInfo.department}</p>
                            {tInfo.specialization && <p className="text-slate-400 font-medium text-[11px]">{tInfo.specialization}</p>}
                          </>
                        ) : "—"}
                      </td>
                      <td className="px-6 py-4 text-slate-600 font-semibold text-[13px]">{tInfo?.qualification || "—"}</td>
                      <td className="px-6 py-4 text-slate-700 font-semibold text-[12px]">
                        {classesCount > 0 || subjectsCount > 0 ? (
                          <span className="text-[11px] font-bold text-violet-700 bg-violet-50 px-2 py-0.5 rounded-full border border-violet-100">
                            {classesCount} classes • {subjectsCount} subjects
                          </span>
                        ) : (
                          <span className="text-[11px] text-slate-400 font-semibold italic">Unassigned</span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded-full border ${
                          t.is_active ? "bg-emerald-50 text-emerald-700 border-emerald-100" : "bg-rose-50 text-rose-700 border-rose-100"
                        }`}>
                          {t.is_active ? "Active" : "Suspended"}
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
