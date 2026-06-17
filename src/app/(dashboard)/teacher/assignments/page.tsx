"use client";

import { useState } from "react";
import { Inbox, Plus, Calendar, Save, Trash2, Loader2, ArrowUpRight } from "lucide-react";
import { useToast } from "@/components/ui/Toast";

interface Assignment {
  id: string;
  title: string;
  subject: string;
  classroom: string;
  dueDate: string;
  submissionsCount: number;
}

export default function AssignmentManagementView() {
  const { success } = useToast();
  const [assignments, setAssignments] = useState<Assignment[]>([
    { id: "1", title: "Algebra Linear equations homework", subject: "Mathematics", classroom: "JHS 1", dueDate: "2026-06-25", submissionsCount: 15 },
    { id: "2", title: "Photosynthesis project writeup", subject: "Integrated Science", classroom: "Primary 6", dueDate: "2026-06-22", submissionsCount: 20 },
  ]);
  const [showCreate, setShowCreate] = useState(false);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    title: "",
    subject: "Mathematics",
    classroom: "JHS 1",
    dueDate: ""
  });

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setTimeout(() => {
      const newAssign: Assignment = {
        id: String(Date.now()),
        title: form.title,
        subject: form.subject,
        classroom: form.classroom,
        dueDate: form.dueDate || new Date().toISOString().split("T")[0],
        submissionsCount: 0
      };
      setAssignments(prev => [newAssign, ...prev]);
      setForm({ title: "", subject: "Mathematics", classroom: "JHS 1", dueDate: "" });
      setShowCreate(false);
      setSaving(false);
      success("Assignment created and student notifications triggered!");
    }, 800);
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[20px] font-extrabold text-slate-900 leading-tight">Assignment Management</h1>
          <p className="text-slate-500 text-[12px] font-semibold mt-0.5">Assign homework, manage projects, set due dates and grade submissions.</p>
        </div>
        <button
          onClick={() => setShowCreate(!showCreate)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-white text-[12px] font-bold transition-all shadow-sm shrink-0"
          style={{ background: "linear-gradient(135deg, #4f46e5, #7c3aed)" }}
        >
          <Plus size={15} />
          {showCreate ? "View Assignments" : "New Assignment"}
        </button>
      </div>

      {showCreate ? (
        <form onSubmit={handleCreate} className="bg-white rounded-2xl border border-[#e8e4f3] p-5 shadow-sm space-y-4 max-w-xl">
          <h3 className="font-extrabold text-slate-900 text-[14px]">Create New Assignment</h3>

          <div className="space-y-1">
            <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">Assignment Title</label>
            <input
              type="text"
              required
              value={form.title}
              onChange={(e) => setForm(f => ({ ...f, title: e.target.value }))}
              placeholder="e.g. Solve linear equations set 3"
              className="w-full px-4 h-10 rounded-xl border border-[#e0daf0] text-[13px] font-semibold text-slate-800 outline-none focus:border-[#7c3aed] bg-white"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">Classroom</label>
              <select
                value={form.classroom}
                onChange={(e) => setForm(f => ({ ...f, classroom: e.target.value }))}
                className="w-full h-10 px-3 rounded-xl border border-[#e0daf0] text-[13px] font-semibold text-slate-700 outline-none focus:border-[#7c3aed] bg-white"
              >
                <option value="JHS 1">JHS 1</option>
                <option value="JHS 2">JHS 2</option>
                <option value="Primary 6">Primary 6</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">Subject</label>
              <select
                value={form.subject}
                onChange={(e) => setForm(f => ({ ...f, subject: e.target.value }))}
                className="w-full h-10 px-3 rounded-xl border border-[#e0daf0] text-[13px] font-semibold text-slate-700 outline-none focus:border-[#7c3aed] bg-white"
              >
                <option value="Mathematics">Mathematics</option>
                <option value="Integrated Science">Integrated Science</option>
                <option value="English Language">English Language</option>
              </select>
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">Due Date</label>
            <input
              type="date"
              required
              value={form.dueDate}
              onChange={(e) => setForm(f => ({ ...f, dueDate: e.target.value }))}
              className="w-full px-4 h-10 rounded-xl border border-[#e0daf0] text-[13px] font-semibold text-slate-800 outline-none focus:border-[#7c3aed] bg-white"
            />
          </div>

          <button
            type="submit"
            disabled={saving}
            className="w-full h-11 flex items-center justify-center gap-1.5 rounded-xl text-white font-bold text-[13px]"
            style={{ background: "linear-gradient(135deg, #4f46e5, #7c3aed)" }}
          >
            {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
            Publish Assignment
          </button>
        </form>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {assignments.length === 0 ? (
            <div className="col-span-full bg-white rounded-2xl border border-[#e8e4f3] p-16 text-center text-slate-400 font-semibold text-[13px] shadow-sm">
              No assignments published yet.
            </div>
          ) : (
            assignments.map((item) => (
              <div key={item.id} className="bg-white rounded-2xl border border-[#e8e4f3] p-5 shadow-sm flex flex-col justify-between gap-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-extrabold uppercase tracking-wide text-violet-600 bg-violet-50 px-2 py-0.5 rounded border border-violet-100/50">
                      {item.subject} · {item.classroom}
                    </span>
                    <span className="text-[11px] font-medium text-slate-400 flex items-center gap-1">
                      <Calendar size={12} />
                      Due: {item.dueDate}
                    </span>
                  </div>
                  <h4 className="font-extrabold text-slate-900 text-[14px] leading-snug">{item.title}</h4>
                </div>

                <div className="border-t border-[#f5f3fc] pt-3 flex items-center justify-between text-[11.5px] font-semibold text-slate-500">
                  <span>Submissions: {item.submissionsCount} Wards</span>
                  <button className="text-violet-600 hover:text-violet-800 font-bold flex items-center gap-0.5">
                    Grading Board
                    <ArrowUpRight size={13} />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
