"use client";

import { useState, useEffect } from "react";
import { ScrollText, Search, RefreshCw, Loader2, Check } from "lucide-react";
import { ShieldQuestion } from "lucide-react";
import { useToast } from "@/components/ui/Toast";

interface Permission {
  id: string;
  name: string;
  display_name: string;
  description: string;
  feature_code: string;
}

export default function PermissionsMatrix() {
  const { error: toastError } = useToast();
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const roleTemplates = [
    { name: "school_admin", label: "Admin" },
    { name: "headmaster", label: "Head" },
    { name: "accountant", label: "Acct" },
    { name: "teacher", label: "Teach" },
    { name: "librarian", label: "Lib" },
    { name: "parent", label: "Parent" },
    { name: "student", label: "Student" }
  ];

  // Hardcoded mapping of default templates for visualization layout
  const permissionDefaults: Record<string, string[]> = {
    "school_admin": [
      "dashboard.view", "school.settings.manage", "students.view", "students.create", "students.edit", "students.delete",
      "staff.view", "staff.create", "staff.edit", "staff.delete", "staff.attendance.record", "staff.leave.manage", "staff.training.manage", "staff.performance.manage",
      "academics.manage", "attendance.record", "attendance.approve", "timetable.manage", "exams.enter", "exams.approve",
      "reports.generate", "finance.view", "finance.manage", "finance.expenses.manage", "finance.payroll.manage", "finance.record_payment",
      "communication.send", "communication.whatsapp.manage", "communication.sms.manage", "communication.settings.manage",
      "users.manage", "roles.manage", "audit.view"
    ],
    "headmaster": [
      "dashboard.view", "students.view", "students.create", "students.edit",
      "staff.view", "staff.create", "staff.edit", "staff.attendance.record", "staff.leave.manage", "staff.training.manage", "staff.performance.manage",
      "academics.manage", "attendance.record", "attendance.approve", "timetable.manage", "exams.enter", "exams.approve",
      "reports.generate", "communication.send", "audit.view"
    ],
    "accountant": [
      "dashboard.view", "students.view", "staff.view", "reports.generate",
      "finance.view", "finance.manage", "finance.expenses.manage", "finance.payroll.manage", "finance.record_payment"
    ],
    "teacher": [
      "dashboard.view", "students.view", "attendance.record", "timetable.manage", "exams.enter", "communication.send"
    ],
    "librarian": [
      "dashboard.view", "students.view"
    ],
    "parent": [
      "dashboard.view", "students.view"
    ],
    "student": [
      "dashboard.view", "students.view"
    ]
  };

  async function loadPermissions() {
    setLoading(true);
    try {
      // Query role templates permissions from config
      const res = await fetch("/api/school/user-management/roles");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed");
      
      // Load standard permissions list (or fetch from matrix endpoint)
      // Since there's no direct lookup, we query the first role's permissions which contains all of them!
      const firstRole = (data.roles || []).find((r: any) => r.name === "school_admin");
      if (firstRole) {
        const permsRes = await fetch(`/api/school/user-management/roles/${firstRole.id}/permissions`);
        const permsData = await permsRes.json();
        setPermissions(permsData.permissions || []);
      }
    } catch {
      toastError("Failed to load permissions grid.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadPermissions(); }, []);

  const filtered = permissions.filter(p =>
    p.display_name?.toLowerCase().includes(search.toLowerCase()) ||
    p.name?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-[24px] font-extrabold text-slate-900 leading-tight tracking-tight">System Permissions Grid</h1>
        <p className="text-slate-500 text-[13px] font-medium mt-1">Lookup system access permission keys and default role matrices.</p>
      </div>

      {/* Toolbar */}
      <div className="flex gap-4 items-center">
        <div className="relative flex-1">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search permission by name, key or description..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 h-11 rounded-xl border border-[#e0daf0] text-[13px] font-semibold text-slate-800 outline-none focus:border-[#7c3aed] focus:ring-2 focus:ring-[#7c3aed]/20 transition-all bg-white"
          />
        </div>
        <button onClick={loadPermissions} className="flex items-center gap-2 px-4 h-11 rounded-xl text-[12px] font-bold border border-[#e0daf0] text-slate-600 hover:bg-slate-50 transition-all bg-white">
          <RefreshCw size={13} className={loading ? "animate-spin" : ""} />
        </button>
      </div>

      {/* Matrix Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-[#e8e4f3] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-[#faf9ff] border-b border-[#f0edf8]">
                <th className="px-6 py-3.5 text-[11px] font-bold text-slate-400 uppercase tracking-widest">Permission & Description</th>
                {roleTemplates.map(t => (
                  <th key={t.name} className="px-4 py-3.5 text-center text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">{t.label}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#f5f3fc]">
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-20 text-center">
                    <Loader2 size={24} className="animate-spin text-violet-600 mx-auto" />
                    <p className="text-slate-400 text-[12px] font-semibold mt-2">Loading permissions matrix...</p>
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-20 text-center">
                    <div className="w-16 h-16 rounded-2xl bg-slate-50 flex items-center justify-center mx-auto mb-3">
                      <ShieldQuestion size={28} className="text-slate-300" />
                    </div>
                    <p className="text-slate-700 font-bold text-[14px]">No permissions found</p>
                    <p className="text-slate-400 text-[12px] font-medium mt-1">Try a different search term.</p>
                  </td>
                </tr>
              ) : (
                filtered.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-3.5">
                      <p className="font-bold text-slate-900 text-[13px]">{p.display_name}</p>
                      <p className="text-slate-400 font-medium text-[11px] mt-0.5">{p.description || "No description provided."}</p>
                      <span className="text-[9px] font-mono font-bold text-slate-500 bg-slate-100 rounded px-1.5 py-0.5 mt-1 inline-block">{p.name}</span>
                    </td>
                    {roleTemplates.map(t => {
                      const hasAccess = (permissionDefaults[t.name] ?? []).includes(p.name);
                      return (
                        <td key={t.name} className="px-4 py-3.5 text-center">
                          {hasAccess ? (
                            <div className="w-5 h-5 rounded-full bg-violet-100 text-violet-700 flex items-center justify-center mx-auto border border-violet-200">
                              <Check size={11} className="stroke-[3]" />
                            </div>
                          ) : (
                            <span className="text-slate-300 text-[12px] font-bold">—</span>
                          )}
                        </td>
                      );
                    })}
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
