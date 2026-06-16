"use client";

import { useState, useEffect, useCallback } from "react";
import { GitBranch, Plus, Edit2, Trash2, ChevronDown, ChevronRight, Zap } from "lucide-react";
import { useToast } from "@/components/ui/Toast";
import { SlidePanel } from "@/components/ui/SlidePanel";

interface Category {
  id: string;
  name: string;
  color: string;
}

interface FeatureInGroup {
  id: string;
  name: string;
  code: string;
  status: string;
}

interface Group {
  id: string;
  name: string;
  description: string;
  category_id: string;
  category_name: string;
  category_color: string;
  feature_count: number;
  features: FeatureInGroup[];
}

const MOCK_CATS: Category[] = [
  { id: "1", name: "Academics", color: "#4f46e5" },
  { id: "2", name: "Finance", color: "#7c3aed" },
  { id: "3", name: "Communication", color: "#0284c7" },
];

const MOCK_GROUPS: Group[] = [
  {
    id: "1", name: "Core Academics", description: "Essential academic management features", category_id: "1", category_name: "Academics", category_color: "#4f46e5", feature_count: 4,
    features: [
      { id: "f1", name: "Timetable Builder", code: "timetable", status: "active" },
      { id: "f2", name: "Subject Manager", code: "subjects", status: "active" },
      { id: "f3", name: "Class Groups", code: "classes", status: "active" },
      { id: "f4", name: "Curriculum Planner", code: "curriculum", status: "draft" },
    ],
  },
  {
    id: "2", name: "Finance Tools", description: "Fee collection and financial tracking", category_id: "2", category_name: "Finance", category_color: "#7c3aed", feature_count: 3,
    features: [
      { id: "f5", name: "Fee Collection", code: "fee_collection", status: "active" },
      { id: "f6", name: "Invoicing", code: "invoicing", status: "active" },
      { id: "f7", name: "Financial Reports", code: "fin_reports", status: "active" },
    ],
  },
  {
    id: "3", name: "Messaging", description: "Parent and staff communication tools", category_id: "3", category_name: "Communication", category_color: "#0284c7", feature_count: 2,
    features: [
      { id: "f8", name: "SMS Notifications", code: "sms_notify", status: "active" },
      { id: "f9", name: "Email Alerts", code: "email_alerts", status: "inactive" },
    ],
  },
];

const EMPTY_FORM = { name: "", description: "", category_id: "" };

export default function GroupsPage() {
  const { success, error: toastError } = useToast();
  const [groups, setGroups] = useState<Group[]>([]);
  const [categories, setCategories] = useState<Category[]>(MOCK_CATS);
  const [loading, setLoading] = useState(true);
  const [panelOpen, setPanelOpen] = useState(false);
  const [editGroup, setEditGroup] = useState<Group | null>(null);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [saving, setSaving] = useState(false);
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/platform/features/groups");
      if (res.ok) {
        const d = await res.json();
        setGroups(d.groups ?? d.data ?? []);
      } else {
        setGroups(MOCK_GROUPS);
      }
    } catch {
      setGroups(MOCK_GROUPS);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  function toggleRow(id: string) {
    setExpandedRows(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function openCreate() {
    setEditGroup(null);
    setForm({ ...EMPTY_FORM });
    setPanelOpen(true);
  }

  function openEdit(g: Group) {
    setEditGroup(g);
    setForm({ name: g.name, description: g.description, category_id: g.category_id });
    setPanelOpen(true);
  }

  async function handleSave() {
    if (!form.name.trim()) { toastError("Group name is required"); return; }
    setSaving(true);
    try {
      const url = editGroup ? `/api/platform/features/groups?id=${editGroup.id}` : "/api/platform/features/groups";
      const method = editGroup ? "PATCH" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error();
      success(editGroup ? "Group updated" : "Group created");
      setPanelOpen(false);
      load();
    } catch {
      const cat = categories.find(c => c.id === form.category_id);
      if (editGroup) {
        setGroups(prev => prev.map(g => g.id === editGroup.id ? { ...g, ...form, category_name: cat?.name ?? "", category_color: cat?.color ?? "#4f46e5" } : g));
      } else {
        setGroups(prev => [...prev, {
          id: String(Date.now()), ...form,
          category_name: cat?.name ?? "", category_color: cat?.color ?? "#4f46e5",
          feature_count: 0, features: [],
        }]);
      }
      success(editGroup ? "Group updated" : "Group created");
      setPanelOpen(false);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    try {
      await fetch(`/api/platform/features/groups?id=${id}`, { method: "DELETE" });
    } catch { /* optimistic */ }
    setGroups(prev => prev.filter(g => g.id !== id));
    setConfirmDelete(null);
    success("Group deleted");
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-[22px] font-extrabold text-slate-900 leading-tight">Feature Groups</h1>
          <p className="text-slate-500 text-[13px] font-semibold mt-1">Group related features for easier management</p>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 px-4 h-10 rounded-xl text-[13px] font-bold text-white transition-all hover:opacity-90"
          style={{ background: "linear-gradient(135deg, #4f46e5, #7c3aed)" }}
        >
          <Plus size={15} />
          Create Group
        </button>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-[#e8e4f3] overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="bg-[#faf9ff]">
              <th className="text-left px-6 py-3 text-slate-400 uppercase tracking-widest text-[11px] font-bold w-8" />
              <th className="text-left px-4 py-3 text-slate-400 uppercase tracking-widest text-[11px] font-bold">Group Name</th>
              <th className="text-left px-4 py-3 text-slate-400 uppercase tracking-widest text-[11px] font-bold">Category</th>
              <th className="text-left px-4 py-3 text-slate-400 uppercase tracking-widest text-[11px] font-bold">Features</th>
              <th className="text-right px-6 py-3 text-slate-400 uppercase tracking-widest text-[11px] font-bold">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#f5f3fc]">
            {loading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <tr key={i}>
                  {Array.from({ length: 5 }).map((__, j) => (
                    <td key={j} className="px-6 py-4">
                      <div className="h-3 bg-slate-100 rounded animate-pulse" />
                    </td>
                  ))}
                </tr>
              ))
            ) : groups.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-16 text-center">
                  <div className="flex flex-col items-center gap-3">
                    <GitBranch size={28} className="text-slate-300" />
                    <p className="text-slate-400 font-semibold text-[13px]">No groups yet. Create one to organise your features.</p>
                  </div>
                </td>
              </tr>
            ) : (
              groups.map((g) => (
                <>
                  <tr key={g.id} className="hover:bg-[#faf9ff] transition-colors">
                    <td className="px-4 py-3.5">
                      <button
                        onClick={() => toggleRow(g.id)}
                        className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-all"
                      >
                        {expandedRows.has(g.id) ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                      </button>
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: g.category_color + "20" }}>
                          <GitBranch size={15} style={{ color: g.category_color }} />
                        </div>
                        <div>
                          <p className="text-[13px] font-bold text-slate-900">{g.name}</p>
                          {g.description && <p className="text-[11px] font-semibold text-slate-400 mt-0.5">{g.description}</p>}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3.5">
                      <span
                        className="inline-flex items-center gap-1 rounded-full text-[11px] font-bold px-2.5 py-0.5 border"
                        style={{ background: g.category_color + "15", color: g.category_color, borderColor: g.category_color + "40" }}
                      >
                        <span className="w-1.5 h-1.5 rounded-full" style={{ background: g.category_color }} />
                        {g.category_name}
                      </span>
                    </td>
                    <td className="px-4 py-3.5">
                      <span className="text-[13px] font-bold text-slate-700">{g.feature_count}</span>
                      <span className="text-[11px] font-semibold text-slate-400 ml-1">feature{g.feature_count !== 1 ? "s" : ""}</span>
                    </td>
                    <td className="px-6 py-3.5">
                      <div className="flex items-center justify-end gap-1.5">
                        <button onClick={() => openEdit(g)} className="w-8 h-8 rounded-lg border border-[#e0daf0] flex items-center justify-center text-slate-400 hover:text-violet-600 hover:border-violet-300 transition-all">
                          <Edit2 size={13} />
                        </button>
                        <button onClick={() => setConfirmDelete(g.id)} className="w-8 h-8 rounded-lg border border-[#e0daf0] flex items-center justify-center text-slate-400 hover:text-red-600 hover:border-red-200 transition-all">
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                  {expandedRows.has(g.id) && (
                    <tr key={`${g.id}-expanded`} className="bg-[#faf9ff]">
                      <td />
                      <td colSpan={4} className="px-4 py-3">
                        {g.features.length === 0 ? (
                          <p className="text-[12px] font-semibold text-slate-400 py-2 px-3">No features in this group yet.</p>
                        ) : (
                          <div className="flex flex-wrap gap-2 py-1">
                            {g.features.map(f => (
                              <div
                                key={f.id}
                                className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-[#e8e4f3] bg-white text-[12px] font-semibold text-slate-700"
                              >
                                <Zap size={11} className="text-violet-400" />
                                {f.name}
                                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${f.status === "active" ? "bg-emerald-50 text-emerald-600" : "bg-slate-50 text-slate-400"}`}>
                                  {f.status}
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
                      </td>
                    </tr>
                  )}
                </>
              ))
            )}
          </tbody>
        </table>
      </div>

      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => setConfirmDelete(null)} />
          <div className="relative bg-white rounded-2xl shadow-2xl p-6 w-full max-w-sm">
            <h3 className="text-[16px] font-extrabold text-slate-900 mb-2">Delete Group?</h3>
            <p className="text-slate-500 text-[13px] font-semibold mb-5">Features in this group will not be deleted but will lose their group assignment.</p>
            <div className="flex gap-3">
              <button onClick={() => setConfirmDelete(null)} className="flex-1 h-10 rounded-xl border border-[#e0daf0] text-[13px] font-bold text-slate-700 hover:bg-slate-50 transition-all">Cancel</button>
              <button onClick={() => handleDelete(confirmDelete)} className="flex-1 h-10 rounded-xl bg-red-600 text-[13px] font-bold text-white hover:bg-red-700 transition-all">Delete</button>
            </div>
          </div>
        </div>
      )}

      <SlidePanel open={panelOpen} onClose={() => setPanelOpen(false)} title={editGroup ? "Edit Group" : "Create Group"} subtitle="Feature groups help organise related features">
        <div className="space-y-5">
          <div>
            <label className="block text-[13px] font-bold text-slate-700 mb-1.5">Name <span className="text-red-500">*</span></label>
            <input
              type="text"
              value={form.name}
              onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
              className="w-full px-4 h-10 rounded-xl border border-[#e0daf0] text-[13px] font-semibold text-slate-800 outline-none focus:border-[#7c3aed] focus:ring-2 focus:ring-[#7c3aed]/20 transition-all bg-white"
              placeholder="e.g. Core Academics"
            />
          </div>
          <div>
            <label className="block text-[13px] font-bold text-slate-700 mb-1.5">Description</label>
            <textarea
              value={form.description}
              onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
              rows={3}
              className="w-full px-4 py-2.5 rounded-xl border border-[#e0daf0] text-[13px] font-semibold text-slate-800 outline-none focus:border-[#7c3aed] focus:ring-2 focus:ring-[#7c3aed]/20 transition-all bg-white resize-none"
              placeholder="Brief description..."
            />
          </div>
          <div>
            <label className="block text-[13px] font-bold text-slate-700 mb-1.5">Category</label>
            <select
              value={form.category_id}
              onChange={e => setForm(p => ({ ...p, category_id: e.target.value }))}
              className="w-full px-4 h-10 rounded-xl border border-[#e0daf0] text-[13px] font-semibold text-slate-800 outline-none focus:border-[#7c3aed] focus:ring-2 focus:ring-[#7c3aed]/20 transition-all bg-white"
            >
              <option value="">Select category</option>
              {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div className="flex gap-3 pt-3 border-t border-[#f0edf8]">
            <button onClick={() => setPanelOpen(false)} className="flex-1 h-10 rounded-xl border border-[#e0daf0] text-[13px] font-bold text-slate-700 hover:bg-slate-50 transition-all">Cancel</button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex-1 h-10 rounded-xl text-[13px] font-bold text-white disabled:opacity-70 hover:opacity-90 transition-all"
              style={{ background: "linear-gradient(135deg, #4f46e5, #7c3aed)" }}
            >
              {saving ? "Saving..." : editGroup ? "Update Group" : "Create Group"}
            </button>
          </div>
        </div>
      </SlidePanel>
    </div>
  );
}
