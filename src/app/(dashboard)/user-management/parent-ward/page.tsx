"use client";

import { useState, useEffect } from "react";
import { ArrowRightLeft, Search, RefreshCw, Loader2, Link, Trash2, Plus } from "lucide-react";
import { useToast } from "@/components/ui/Toast";
import { SlidePanel } from "@/components/ui/SlidePanel";

interface Parent {
  id: string;
  parent_id: string;
  full_name: string;
  phone: string;
}

interface Student {
  id: string;
  student_id: string;
  first_name: string;
  last_name: string;
  admission_number: string;
}

interface ParentWardLink {
  id: string;
  relationship: string;
  is_primary: boolean;
  parent: Parent;
  student: Student;
  created_at?: string;
}


export default function ParentWardLinkingBoard() {
  const { success, error: toastError } = useToast();
  const [links, setLinks] = useState<ParentWardLink[]>([]);
  const [parents, setParents] = useState<Parent[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [showCreate, setShowCreate] = useState(false);

  const [form, setForm] = useState({
    parent_id: "",
    student_id: "",
    relationship: "Father",
    is_primary: true
  });

  async function loadData() {
    setLoading(true);
    try {
      const [linksRes, usersRes] = await Promise.all([
        fetch("/api/school/user-management/parent-ward").then(r => r.json()),
        fetch("/api/school/user-management/users").then(r => r.json())
      ]);

      setLinks(linksRes.links || []);

      // Extract parents and students lists
      const usersList = usersRes.users || [];
      const parentsList = usersList
        .filter((u: any) => u.role === "parent")
        .map((u: any) => ({
          id: u.parents?.[0]?.id,
          parent_id: u.parents?.[0]?.parent_id,
          full_name: u.full_name,
          phone: u.phone
        }))
        .filter((p: any) => p.id !== undefined);

      const studentsList = usersList
        .filter((u: any) => u.role === "student")
        .map((u: any) => ({
          id: u.students?.[0]?.id,
          student_id: u.students?.[0]?.student_id,
          first_name: u.students?.[0]?.first_name || u.full_name.split(" ")[0],
          last_name: u.students?.[0]?.last_name || u.full_name.split(" ").slice(1).join(" "),
          admission_number: u.students?.[0]?.admission_number
        }))
        .filter((s: any) => s.id !== undefined);

      setParents(parentsList);
      setStudents(studentsList);
    } catch {
      toastError("Failed to load parent-ward links.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadData(); }, []);

  async function handleCreateLink() {
    if (!form.parent_id || !form.student_id) {
      toastError("Parent and Student selections are required.");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/school/user-management/parent-ward", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed");
      success("Wards link registered successfully.");
      setShowCreate(false);
      setForm({ parent_id: "", student_id: "", relationship: "Father", is_primary: true });
      loadData();
    } catch (err: any) {
      toastError(err.message || "Failed to link accounts.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteLink(id: string) {
    if (!confirm("Are you sure you want to remove this parent-ward association?")) return;
    try {
      const res = await fetch(`/api/school/user-management/parent-ward?id=${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      success("Association link removed successfully.");
      loadData();
    } catch {
      toastError("Failed to delete link.");
    }
  }

  const filtered = links.filter(lnk => 
    lnk.parent?.full_name?.toLowerCase().includes(search.toLowerCase()) ||
    lnk.student?.first_name?.toLowerCase().includes(search.toLowerCase()) ||
    lnk.student?.last_name?.toLowerCase().includes(search.toLowerCase())
  );

  const inputClass = "w-full px-4 h-10 rounded-xl border border-[#e0daf0] text-[13px] font-semibold text-slate-800 outline-none focus:border-[#7c3aed] focus:ring-2 focus:ring-[#7c3aed]/20 transition-all bg-white";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[20px] font-extrabold text-slate-900 leading-tight">Parent-Ward Links Matrix</h1>
          <p className="text-slate-500 text-[12px] font-semibold mt-0.5">Map relationships between parents and their linked children inside the portal.</p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-white text-[13px] font-bold transition-all shadow-sm shadow-[#7c3aed]/20"
          style={{ background: "linear-gradient(135deg, #4f46e5, #7c3aed)" }}
        >
          <Plus size={15} />
          Create New Link
        </button>
      </div>

      {/* Toolbar */}
      <div className="flex gap-3 items-center">
        <div className="relative flex-1">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search parent name or child name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 h-10 rounded-xl border border-[#e0daf0] text-[13px] font-semibold text-slate-800 outline-none focus:border-[#7c3aed] focus:ring-2 focus:ring-[#7c3aed]/20 transition-all bg-white"
          />
        </div>
        <button onClick={loadData} className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-[12px] font-bold border border-[#e0daf0] text-slate-600 hover:bg-slate-50 transition-all bg-white">
          <RefreshCw size={13} className={loading ? "animate-spin" : ""} />
        </button>
      </div>

      {/* Grid Links List */}
      <div className="bg-white rounded-2xl shadow-sm border border-[#e8e4f3] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-[#faf9ff] border-b border-[#f0edf8]">
                {["Parent Name (ID)", "Ward Name (ID)", "Admission No.", "Relationship", "Linked At", "Actions"].map((h) => (
                  <th key={h} className="px-6 py-3.5 text-[11px] font-bold text-slate-400 uppercase tracking-widest whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#f5f3fc]">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-20 text-center">
                    <Loader2 size={24} className="animate-spin text-violet-600 mx-auto" />
                    <p className="text-slate-400 text-[12px] font-semibold mt-2">Loading links list...</p>
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-20 text-center">
                    <div className="w-16 h-16 rounded-2xl bg-slate-50 flex items-center justify-center mx-auto mb-3">
                      <ArrowRightLeft size={28} className="text-slate-300" />
                    </div>
                    <p className="text-slate-700 font-bold text-[14px]">No links found</p>
                    <p className="text-slate-400 text-[12px] font-medium mt-1">Click Create New Link above to get started.</p>
                  </td>
                </tr>
              ) : (
                filtered.map((lnk) => (
                  <tr key={lnk.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-5">
                      <p className="font-bold text-slate-900 text-[13.5px]">{lnk.parent?.full_name}</p>
                      <p className="text-slate-400 font-mono text-[11px]">{lnk.parent?.parent_id || "—"}</p>
                    </td>
                    <td className="px-6 py-5">
                      <p className="font-bold text-slate-900 text-[13.5px]">{lnk.student?.first_name} {lnk.student?.last_name}</p>
                      <p className="text-slate-400 font-mono text-[11px]">{lnk.student?.student_id || "—"}</p>
                    </td>
                    <td className="px-6 py-5 text-[13.5px] font-semibold text-slate-600 font-mono">{lnk.student?.admission_number}</td>
                    <td className="px-6 py-5">
                      <span className="text-[11px] font-bold text-indigo-700 bg-indigo-50 border border-indigo-100 rounded-full px-2.5 py-0.5">
                        {lnk.relationship}
                      </span>
                    </td>
                    <td className="px-6 py-5 text-slate-400 font-medium text-[11.5px]">{new Date(lnk.created_at || "").toLocaleDateString()}</td>
                    <td className="px-6 py-5">
                      <button
                        onClick={() => handleDeleteLink(lnk.id)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-all"
                        title="Remove Link"
                      >
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Linking SlidePanel */}
      <SlidePanel
        open={showCreate}
        onClose={() => setShowCreate(false)}
        title="Associate Parent to Ward"
        subtitle="Establish link between a parent account and a student"
      >
        <div className="space-y-4 pt-2">
          <div>
            <label className="block text-[12px] font-bold text-slate-700 mb-1.5">Select Parent</label>
            <select
              value={form.parent_id}
              onChange={(e) => setForm(f => ({ ...f, parent_id: e.target.value }))}
              className={inputClass}
            >
              <option value="">Choose Parent...</option>
              {parents.map(p => (
                <option key={p.id} value={p.id}>
                  {p.full_name} ({p.parent_id || p.phone})
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-[12px] font-bold text-slate-700 mb-1.5">Select Ward (Student)</label>
            <select
              value={form.student_id}
              onChange={(e) => setForm(f => ({ ...f, student_id: e.target.value }))}
              className={inputClass}
            >
              <option value="">Choose Ward...</option>
              {students.map(s => (
                <option key={s.id} value={s.id}>
                  {s.first_name} {s.last_name} ({s.student_id || s.admission_number})
                </option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[12px] font-bold text-slate-700 mb-1.5">Relationship</label>
              <select
                value={form.relationship}
                onChange={(e) => setForm(f => ({ ...f, relationship: e.target.value }))}
                className={inputClass}
              >
                <option value="Father">Father</option>
                <option value="Mother">Mother</option>
                <option value="Guardian">Guardian</option>
                <option value="Sponsor">Sponsor</option>
                <option value="Relative">Relative</option>
              </select>
            </div>
            <div>
              <label className="block text-[12px] font-bold text-slate-700 mb-1.5">Primary Contact</label>
              <select
                value={String(form.is_primary)}
                onChange={(e) => setForm(f => ({ ...f, is_primary: e.target.value === "true" }))}
                className={inputClass}
              >
                <option value="true">Yes</option>
                <option value="false">No</option>
              </select>
            </div>
          </div>
          
          <button
            onClick={handleCreateLink}
            disabled={saving || !form.parent_id || !form.student_id}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-white font-bold text-[13px] transition-all disabled:opacity-60"
            style={{ background: "linear-gradient(135deg, #4f46e5, #7c3aed)" }}
          >
            {saving ? <Loader2 size={13} className="animate-spin" /> : <ArrowRightLeft size={13} />}
            Bind Accounts
          </button>
        </div>
      </SlidePanel>
    </div>
  );
}
