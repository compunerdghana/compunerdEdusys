"use client";

import { useEffect, useState } from "react";
import {
  ListTodo, AlertTriangle, Plus, Loader2, Calendar, User,
  X, Filter,
} from "lucide-react";
import { SlidePanel } from "@/components/ui/SlidePanel";
import { useToast } from "@/components/ui/Toast";

interface Task {
  id: string;
  title: string;
  school_name: string;
  category: string;
  assigned_to: string;
  priority: "urgent" | "high" | "medium" | "low";
  due_date: string | null;
  status: "pending" | "in_progress" | "completed" | "delayed" | "cancelled";
}

const PRIORITY_BADGE: Record<string, string> = {
  urgent: "bg-red-100 text-red-700 border-red-200",
  high: "bg-orange-100 text-orange-700 border-orange-200",
  medium: "bg-amber-100 text-amber-700 border-amber-200",
  low: "bg-slate-100 text-slate-700 border-slate-200",
};

const STATUS_BADGE: Record<string, string> = {
  pending: "bg-slate-100 text-slate-700 border-slate-200",
  in_progress: "bg-blue-100 text-blue-700 border-blue-200",
  completed: "bg-emerald-100 text-emerald-700 border-emerald-200",
  delayed: "bg-red-100 text-red-700 border-red-200",
  cancelled: "bg-stone-100 text-stone-600 border-stone-200",
};

const CATEGORIES = [
  "Setup", "Training", "Verification", "Data Migration", "User Accounts",
  "Portal Config", "Branding", "Testing", "Documentation", "Go-Live",
];

const PRIORITIES = ["urgent", "high", "medium", "low"];
const STATUSES = ["pending", "in_progress", "completed", "delayed", "cancelled"];

export default function TasksPage() {
  const { success, error: toastError } = useToast();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [panelOpen, setPanelOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [filterStatus, setFilterStatus] = useState("");
  const [filterPriority, setFilterPriority] = useState("");
  const [filterSchool, setFilterSchool] = useState("");
  const [filterCategory, setFilterCategory] = useState("");
  const [form, setForm] = useState({
    title: "", school_name: "", category: "", assigned_to: "",
    priority: "medium", due_date: "", notes: "",
  });

  useEffect(() => {
    fetch("/api/platform/onboarding/tasks")
      .then(r => r.ok ? r.json() : Promise.reject())
      .then(d => setTasks(d.tasks ?? d.data ?? []))
      .catch(() => {
        // tasks endpoint may not exist, show empty
        setTasks([]);
      })
      .finally(() => setLoading(false));
  }, []);

  const now = new Date();
  const overdue = tasks.filter(t =>
    t.status !== "completed" && t.status !== "cancelled" &&
    t.due_date && new Date(t.due_date) < now
  );

  const filtered = tasks.filter(t => {
    const matchStatus = !filterStatus || t.status === filterStatus;
    const matchPriority = !filterPriority || t.priority === filterPriority;
    const matchSchool = !filterSchool || t.school_name?.toLowerCase().includes(filterSchool.toLowerCase());
    const matchCat = !filterCategory || t.category === filterCategory;
    return matchStatus && matchPriority && matchSchool && matchCat;
  });

  async function createTask() {
    if (!form.title) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/platform/onboarding/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error("Failed to create task");
      const data = await res.json();
      success("Task created!");
      setTasks(prev => [data.task ?? data, ...prev]);
      setPanelOpen(false);
      setForm({ title: "", school_name: "", category: "", assigned_to: "", priority: "medium", due_date: "", notes: "" });
    } catch (e: unknown) {
      toastError(e instanceof Error ? e.message : "Failed to create task");
    } finally {
      setSubmitting(false);
    }
  }

  const inputClass = "w-full px-4 h-10 rounded-xl border border-[#e0daf0] text-[13px] font-semibold text-slate-800 outline-none focus:border-[#7c3aed] focus:ring-2 focus:ring-[#7c3aed]/20 transition-all bg-white";

  return (
    <div className="min-h-screen bg-[#f8f7ff]">
      <div className="max-w-screen-xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-[26px] font-extrabold text-slate-900">Onboarding Tasks</h1>
            <p className="text-[13px] text-slate-500 mt-0.5">{tasks.length} total tasks</p>
          </div>
          <button onClick={() => setPanelOpen(true)}
            className="inline-flex items-center gap-2 px-5 h-10 rounded-xl text-[13px] font-bold text-white hover:opacity-90 transition-opacity"
            style={{ background: "linear-gradient(135deg,#4f46e5,#7c3aed)" }}>
            <Plus size={15} /> Create Task
          </button>
        </div>

        {/* Overdue Banner */}
        {overdue.length > 0 && (
          <div className="bg-red-50 border border-red-200 rounded-2xl p-4 mb-6">
            <div className="flex items-center gap-2 mb-3">
              <AlertTriangle size={16} className="text-red-600" />
              <span className="text-[13px] font-extrabold text-red-700">
                {overdue.length} Overdue Task{overdue.length > 1 ? "s" : ""}
              </span>
            </div>
            <div className="space-y-1.5">
              {overdue.slice(0, 5).map(t => (
                <div key={t.id} className="flex items-center gap-3 bg-white rounded-xl px-4 py-2.5 border border-red-100">
                  <span className={`rounded-full text-[10px] font-bold px-2 py-0.5 border ${PRIORITY_BADGE[t.priority]}`}>{t.priority}</span>
                  <span className="text-[12px] font-bold text-slate-800 flex-1 truncate">{t.title}</span>
                  <span className="text-[11px] text-slate-400 font-semibold">{t.school_name}</span>
                  <span className="text-[11px] font-bold text-red-500">
                    {t.due_date ? new Date(t.due_date).toLocaleDateString("en-GB", { day: "2-digit", month: "short" }) : ""}
                  </span>
                </div>
              ))}
              {overdue.length > 5 && (
                <p className="text-[11px] font-bold text-red-500 pl-2">+{overdue.length - 5} more overdue</p>
              )}
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="flex items-center gap-3 mb-6 flex-wrap">
          <div className="flex items-center gap-1.5 text-[12px] font-bold text-slate-400">
            <Filter size={13} /> Filters:
          </div>
          <select className="px-3 h-9 rounded-xl border border-[#e0daf0] text-[12px] font-semibold text-slate-700 bg-white outline-none focus:border-[#7c3aed] transition-all"
            value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
            <option value="">All Statuses</option>
            {STATUSES.map(s => <option key={s} value={s}>{s.replace("_", " ")}</option>)}
          </select>
          <select className="px-3 h-9 rounded-xl border border-[#e0daf0] text-[12px] font-semibold text-slate-700 bg-white outline-none focus:border-[#7c3aed] transition-all"
            value={filterPriority} onChange={e => setFilterPriority(e.target.value)}>
            <option value="">All Priorities</option>
            {PRIORITIES.map(p => <option key={p}>{p}</option>)}
          </select>
          <select className="px-3 h-9 rounded-xl border border-[#e0daf0] text-[12px] font-semibold text-slate-700 bg-white outline-none focus:border-[#7c3aed] transition-all"
            value={filterCategory} onChange={e => setFilterCategory(e.target.value)}>
            <option value="">All Categories</option>
            {CATEGORIES.map(c => <option key={c}>{c}</option>)}
          </select>
          <input
            className="px-3 h-9 rounded-xl border border-[#e0daf0] text-[12px] font-semibold text-slate-700 bg-white outline-none focus:border-[#7c3aed] transition-all"
            placeholder="Filter by school..."
            value={filterSchool} onChange={e => setFilterSchool(e.target.value)} />
          {(filterStatus || filterPriority || filterCategory || filterSchool) && (
            <button onClick={() => { setFilterStatus(""); setFilterPriority(""); setFilterCategory(""); setFilterSchool(""); }}
              className="h-9 w-9 rounded-xl border border-[#e0daf0] flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-white transition-all">
              <X size={13} />
            </button>
          )}
        </div>

        {/* Table */}
        <div className="bg-white rounded-2xl shadow-sm border border-[#e8e4f3]">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-[#faf9ff]">
                  {["Task", "School", "Category", "Assigned To", "Priority", "Due Date", "Status", "Actions"].map(h => (
                    <th key={h} className="px-5 py-3 text-left text-slate-400 uppercase tracking-widest text-[11px] font-bold">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#f0edf8]">
                {loading ? (
                  [1, 2, 3].map(i => (
                    <tr key={i}>
                      {[1, 2, 3, 4, 5, 6, 7, 8].map(j => (
                        <td key={j} className="px-5 py-3.5"><div className="h-4 bg-slate-100 rounded animate-pulse" /></td>
                      ))}
                    </tr>
                  ))
                ) : filtered.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-5 py-14 text-center">
                      <ListTodo size={36} className="text-slate-200 mx-auto mb-3" />
                      <p className="text-[13px] font-semibold text-slate-400">No tasks found</p>
                      <p className="text-[12px] text-slate-300 mt-1">Create a task or adjust your filters</p>
                    </td>
                  </tr>
                ) : (
                  filtered.map(task => {
                    const isOverdue = task.status !== "completed" && task.status !== "cancelled" && task.due_date && new Date(task.due_date) < now;
                    return (
                      <tr key={task.id} className={`hover:bg-[#faf9ff] transition-colors ${isOverdue ? "bg-red-50/30" : ""}`}>
                        <td className="px-5 py-3.5">
                          <p className="text-[13px] font-bold text-slate-800">{task.title}</p>
                          {isOverdue && <span className="text-[10px] font-bold text-red-500">OVERDUE</span>}
                        </td>
                        <td className="px-5 py-3.5 text-[12px] font-semibold text-slate-600">{task.school_name ?? "—"}</td>
                        <td className="px-5 py-3.5">
                          <span className="rounded-full text-[11px] font-bold px-2.5 py-0.5 border bg-indigo-100 text-indigo-700 border-indigo-200">
                            {task.category ?? "—"}
                          </span>
                        </td>
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-1.5">
                            <User size={11} className="text-slate-300" />
                            <span className="text-[12px] font-semibold text-slate-600">{task.assigned_to ?? "Unassigned"}</span>
                          </div>
                        </td>
                        <td className="px-5 py-3.5">
                          <span className={`rounded-full text-[11px] font-bold px-2.5 py-0.5 border ${PRIORITY_BADGE[task.priority] ?? "bg-slate-100 text-slate-700 border-slate-200"}`}>
                            {task.priority}
                          </span>
                        </td>
                        <td className="px-5 py-3.5">
                          {task.due_date ? (
                            <div className={`flex items-center gap-1.5 ${isOverdue ? "text-red-500" : "text-slate-600"}`}>
                              <Calendar size={11} />
                              <span className="text-[12px] font-semibold">
                                {new Date(task.due_date).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}
                              </span>
                            </div>
                          ) : <span className="text-[12px] text-slate-300">No date</span>}
                        </td>
                        <td className="px-5 py-3.5">
                          <span className={`rounded-full text-[11px] font-bold px-2.5 py-0.5 border ${STATUS_BADGE[task.status] ?? "bg-slate-100 text-slate-700 border-slate-200"}`}>
                            {task.status.replace("_", " ")}
                          </span>
                        </td>
                        <td className="px-5 py-3.5">
                          <button className="inline-flex items-center gap-1.5 px-3 h-7 rounded-lg text-[11px] font-bold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 border border-indigo-100 transition-colors">
                            Edit
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

      {/* Create Task Panel */}
      <SlidePanel open={panelOpen} onClose={() => setPanelOpen(false)} title="Create Task" subtitle="Add a new onboarding task" width="md">
        <div className="space-y-5">
          <div>
            <label className="block text-[13px] font-bold text-slate-700 mb-1.5">Task Title <span className="text-red-500">*</span></label>
            <input className={inputClass} placeholder="Describe the task" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} />
          </div>
          <div>
            <label className="block text-[13px] font-bold text-slate-700 mb-1.5">School</label>
            <input className={inputClass} placeholder="School name" value={form.school_name} onChange={e => setForm(f => ({ ...f, school_name: e.target.value }))} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[13px] font-bold text-slate-700 mb-1.5">Category</label>
              <select className={inputClass} value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}>
                <option value="">Select</option>
                {CATEGORIES.map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-[13px] font-bold text-slate-700 mb-1.5">Priority</label>
              <select className={inputClass} value={form.priority} onChange={e => setForm(f => ({ ...f, priority: e.target.value }))}>
                {PRIORITIES.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[13px] font-bold text-slate-700 mb-1.5">Assigned To</label>
              <input className={inputClass} placeholder="Officer name" value={form.assigned_to} onChange={e => setForm(f => ({ ...f, assigned_to: e.target.value }))} />
            </div>
            <div>
              <label className="block text-[13px] font-bold text-slate-700 mb-1.5">Due Date</label>
              <input type="date" className={inputClass} value={form.due_date} onChange={e => setForm(f => ({ ...f, due_date: e.target.value }))} />
            </div>
          </div>
          <div>
            <label className="block text-[13px] font-bold text-slate-700 mb-1.5">Notes</label>
            <textarea className="w-full px-4 py-2.5 h-20 rounded-xl border border-[#e0daf0] text-[13px] font-semibold text-slate-800 outline-none focus:border-[#7c3aed] focus:ring-2 focus:ring-[#7c3aed]/20 transition-all bg-white resize-none"
              placeholder="Additional notes..." value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
          </div>
          <button onClick={createTask} disabled={!form.title || submitting}
            className="w-full h-10 rounded-xl text-[13px] font-bold text-white disabled:opacity-40 hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
            style={{ background: "linear-gradient(135deg,#4f46e5,#7c3aed)" }}>
            {submitting ? <><Loader2 size={14} className="animate-spin" /> Creating…</> : <><ListTodo size={14} /> Create Task</>}
          </button>
        </div>
      </SlidePanel>
    </div>
  );
}
