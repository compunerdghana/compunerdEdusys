"use client";

import { useState, useEffect, useCallback } from "react";
import { Zap, Search, Plus, Edit2, ToggleLeft, ToggleRight, Trash2, X } from "lucide-react";
import { useToast } from "@/components/ui/Toast";
import { SlidePanel } from "@/components/ui/SlidePanel";

interface Category {
  id: string;
  name: string;
  color: string;
}

interface FeatureGroup {
  id: string;
  name: string;
  category_id: string;
}

interface Feature {
  id: string;
  name: string;
  code: string;
  description: string;
  category_id: string;
  category_name: string;
  category_color: string;
  group_id: string;
  group_name: string;
  version: string;
  icon: string;
  route_path: string;
  display_order: number;
  access_level: string;
  is_core: boolean;
  status: string;
}

const ACCESS_LEVEL_STYLES: Record<string, string> = {
  public: "bg-slate-50 text-slate-600 border-slate-200",
  subscription: "bg-blue-50 text-blue-700 border-blue-200",
  premium: "bg-amber-50 text-amber-700 border-amber-200",
  enterprise: "bg-violet-50 text-violet-700 border-violet-200",
  beta: "bg-purple-50 text-purple-700 border-purple-200",
};
const STATUS_STYLES: Record<string, string> = {
  active: "bg-emerald-50 text-emerald-700 border-emerald-200",
  inactive: "bg-slate-50 text-slate-500 border-slate-200",
  draft: "bg-blue-50 text-blue-700 border-blue-200",
  archived: "bg-stone-50 text-stone-600 border-stone-200",
  beta: "bg-violet-50 text-violet-700 border-violet-200",
};

const MOCK_CATEGORIES: Category[] = [
  { id: "1", name: "Academics", color: "#4f46e5" },
  { id: "2", name: "Finance", color: "#7c3aed" },
  { id: "3", name: "Communication", color: "#0284c7" },
  { id: "4", name: "Students", color: "#059669" },
  { id: "5", name: "Reports", color: "#d97706" },
  { id: "6", name: "Attendance", color: "#dc2626" },
  { id: "7", name: "Admin", color: "#7e22ce" },
];

const MOCK_GROUPS: FeatureGroup[] = [
  { id: "1", name: "Core Academics", category_id: "1" },
  { id: "2", name: "Finance Tools", category_id: "2" },
  { id: "3", name: "Messaging", category_id: "3" },
];

const MOCK_FEATURES: Feature[] = [
  { id: "1", name: "Student Management", code: "student_mgmt", description: "Full student records and profiles", category_id: "4", category_name: "Students", category_color: "#059669", group_id: "", group_name: "", version: "1.0.0", icon: "Users", route_path: "/school/students", display_order: 1, access_level: "subscription", is_core: true, status: "active" },
  { id: "2", name: "Fee Collection", code: "fee_collection", description: "Fee management and invoicing", category_id: "2", category_name: "Finance", category_color: "#7c3aed", group_id: "2", group_name: "Finance Tools", version: "1.2.0", icon: "CreditCard", route_path: "/school/finance", display_order: 2, access_level: "premium", is_core: false, status: "active" },
  { id: "3", name: "SMS Notifications", code: "sms_notify", description: "SMS alerts to parents and staff", category_id: "3", category_name: "Communication", category_color: "#0284c7", group_id: "3", group_name: "Messaging", version: "1.0.0", icon: "MessageSquare", route_path: "/school/comms/sms", display_order: 3, access_level: "enterprise", is_core: false, status: "active" },
  { id: "4", name: "AI Report Generator", code: "ai_reports", description: "AI-powered progress reports", category_id: "5", category_name: "Reports", category_color: "#d97706", group_id: "", group_name: "", version: "0.9.0", icon: "Sparkles", route_path: "/school/reports/ai", display_order: 4, access_level: "beta", is_core: false, status: "beta" },
  { id: "5", name: "Timetable Builder", code: "timetable", description: "Drag-and-drop timetable scheduling", category_id: "1", category_name: "Academics", category_color: "#4f46e5", group_id: "1", group_name: "Core Academics", version: "2.0.0", icon: "Calendar", route_path: "/school/academics/timetable", display_order: 5, access_level: "subscription", is_core: true, status: "active" },
  { id: "6", name: "Payroll Processing", code: "payroll", description: "Staff salary and payslips", category_id: "2", category_name: "Finance", category_color: "#7c3aed", group_id: "2", group_name: "Finance Tools", version: "1.1.0", icon: "Wallet", route_path: "/school/payroll", display_order: 6, access_level: "enterprise", is_core: false, status: "active" },
];

const EMPTY_FORM = {
  name: "", code: "", description: "", category_id: "", group_id: "",
  version: "1.0.0", icon: "", route_path: "", display_order: 0,
  access_level: "subscription", is_core: false, status: "active",
};

function slugify(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");
}

export default function AllFeaturesPage() {
  const { success, error: toastError } = useToast();
  const [features, setFeatures] = useState<Feature[]>([]);
  const [categories, setCategories] = useState<Category[]>(MOCK_CATEGORIES);
  const [groups, setGroups] = useState<FeatureGroup[]>(MOCK_GROUPS);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterCategory, setFilterCategory] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [filterAccess, setFilterAccess] = useState("");
  const [panelOpen, setPanelOpen] = useState(false);
  const [editFeature, setEditFeature] = useState<Feature | null>(null);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [fRes, cRes] = await Promise.all([
        fetch("/api/platform/features"),
        fetch("/api/platform/features/categories"),
      ]);
      if (fRes.ok) {
        const d = await fRes.json();
        setFeatures(d.features ?? d.data ?? []);
      } else {
        setFeatures(MOCK_FEATURES);
      }
      if (cRes.ok) {
        const d = await cRes.json();
        setCategories(d.categories ?? d.data ?? MOCK_CATEGORIES);
      }
    } catch {
      setFeatures(MOCK_FEATURES);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  function openCreate() {
    setEditFeature(null);
    setForm({ ...EMPTY_FORM });
    setPanelOpen(true);
  }

  function openEdit(f: Feature) {
    setEditFeature(f);
    setForm({
      name: f.name, code: f.code, description: f.description,
      category_id: f.category_id, group_id: f.group_id,
      version: f.version, icon: f.icon, route_path: f.route_path,
      display_order: f.display_order, access_level: f.access_level,
      is_core: f.is_core, status: f.status,
    });
    setPanelOpen(true);
  }

  async function handleSave() {
    if (!form.name.trim()) { toastError("Feature name is required"); return; }
    setSaving(true);
    try {
      const url = editFeature ? `/api/platform/features?id=${editFeature.id}` : "/api/platform/features";
      const method = editFeature ? "PATCH" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error();
      success(editFeature ? "Feature updated" : "Feature created");
      setPanelOpen(false);
      load();
    } catch {
      // Use mock update for demo
      if (editFeature) {
        setFeatures(prev => prev.map(f => f.id === editFeature.id ? { ...f, ...form } : f));
      } else {
        const cat = categories.find(c => c.id === form.category_id);
        const grp = groups.find(g => g.id === form.group_id);
        setFeatures(prev => [...prev, {
          id: String(Date.now()), ...form,
          category_name: cat?.name ?? "", category_color: cat?.color ?? "#4f46e5",
          group_name: grp?.name ?? "",
        }]);
      }
      success(editFeature ? "Feature updated" : "Feature created");
      setPanelOpen(false);
    } finally {
      setSaving(false);
    }
  }

  async function handleToggle(id: string, status: string) {
    const newStatus = status === "active" ? "inactive" : "active";
    try {
      await fetch(`/api/platform/features?id=${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
    } catch { /* optimistic */ }
    setFeatures(prev => prev.map(f => f.id === id ? { ...f, status: newStatus } : f));
    success(`Feature ${newStatus === "active" ? "activated" : "deactivated"}`);
  }

  async function handleDelete(id: string) {
    try {
      await fetch(`/api/platform/features?id=${id}`, { method: "DELETE" });
    } catch { /* optimistic */ }
    setFeatures(prev => prev.filter(f => f.id !== id));
    setConfirmDelete(null);
    success("Feature deleted");
  }

  const filteredGroups = groups.filter(g => !form.category_id || g.category_id === form.category_id);

  const filtered = features.filter(f => {
    const q = search.toLowerCase();
    if (q && !f.name.toLowerCase().includes(q) && !f.code.toLowerCase().includes(q)) return false;
    if (filterCategory && f.category_id !== filterCategory) return false;
    if (filterStatus && f.status !== filterStatus) return false;
    if (filterAccess && f.access_level !== filterAccess) return false;
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-[22px] font-extrabold text-slate-900 leading-tight">All Features</h1>
          <p className="text-slate-500 text-[13px] font-semibold mt-1">
            {features.length} total features across all categories
          </p>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 px-4 h-10 rounded-xl text-[13px] font-bold text-white transition-all hover:opacity-90"
          style={{ background: "linear-gradient(135deg, #4f46e5, #7c3aed)" }}
        >
          <Plus size={15} />
          Create Feature
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search features..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-8 pr-4 h-10 rounded-xl border border-[#e0daf0] text-[13px] font-semibold text-slate-800 outline-none focus:border-[#7c3aed] focus:ring-2 focus:ring-[#7c3aed]/20 transition-all bg-white"
          />
        </div>
        <select
          value={filterCategory}
          onChange={e => setFilterCategory(e.target.value)}
          className="px-4 h-10 rounded-xl border border-[#e0daf0] text-[13px] font-semibold text-slate-800 outline-none focus:border-[#7c3aed] focus:ring-2 focus:ring-[#7c3aed]/20 transition-all bg-white"
        >
          <option value="">All Categories</option>
          {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <select
          value={filterStatus}
          onChange={e => setFilterStatus(e.target.value)}
          className="px-4 h-10 rounded-xl border border-[#e0daf0] text-[13px] font-semibold text-slate-800 outline-none focus:border-[#7c3aed] focus:ring-2 focus:ring-[#7c3aed]/20 transition-all bg-white"
        >
          <option value="">All Statuses</option>
          {["active", "inactive", "draft", "archived", "beta"].map(s => (
            <option key={s} value={s} className="capitalize">{s}</option>
          ))}
        </select>
        <select
          value={filterAccess}
          onChange={e => setFilterAccess(e.target.value)}
          className="px-4 h-10 rounded-xl border border-[#e0daf0] text-[13px] font-semibold text-slate-800 outline-none focus:border-[#7c3aed] focus:ring-2 focus:ring-[#7c3aed]/20 transition-all bg-white"
        >
          <option value="">All Access Levels</option>
          {["public", "subscription", "premium", "enterprise", "beta"].map(a => (
            <option key={a} value={a} className="capitalize">{a}</option>
          ))}
        </select>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-[#e8e4f3] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-[#faf9ff]">
                <th className="text-left px-6 py-3 text-slate-400 uppercase tracking-widest text-[11px] font-bold">Feature</th>
                <th className="text-left px-4 py-3 text-slate-400 uppercase tracking-widest text-[11px] font-bold">Category</th>
                <th className="text-left px-4 py-3 text-slate-400 uppercase tracking-widest text-[11px] font-bold">Route Path</th>
                <th className="text-left px-4 py-3 text-slate-400 uppercase tracking-widest text-[11px] font-bold">Version</th>
                <th className="text-left px-4 py-3 text-slate-400 uppercase tracking-widest text-[11px] font-bold">Access</th>
                <th className="text-left px-4 py-3 text-slate-400 uppercase tracking-widest text-[11px] font-bold">Status</th>
                <th className="text-right px-6 py-3 text-slate-400 uppercase tracking-widest text-[11px] font-bold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#f5f3fc]">
              {loading ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <tr key={i}>
                    {Array.from({ length: 7 }).map((__, j) => (
                      <td key={j} className="px-6 py-4">
                        <div className="h-3 bg-slate-100 rounded animate-pulse" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-16 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <div className="w-14 h-14 rounded-2xl bg-violet-50 flex items-center justify-center">
                        <Zap size={24} className="text-violet-400" />
                      </div>
                      <div>
                        <p className="font-bold text-slate-700 text-[15px]">No features found</p>
                        <p className="text-slate-400 text-[13px] font-semibold mt-1">
                          {search || filterCategory || filterStatus || filterAccess
                            ? "Try adjusting your filters"
                            : "Create your first feature to get started"}
                        </p>
                      </div>
                      {!search && !filterCategory && !filterStatus && !filterAccess && (
                        <button
                          onClick={openCreate}
                          className="mt-2 flex items-center gap-2 px-4 h-9 rounded-xl text-[13px] font-bold text-white"
                          style={{ background: "linear-gradient(135deg, #4f46e5, #7c3aed)" }}
                        >
                          <Plus size={13} /> Create Feature
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                filtered.map((f) => (
                  <tr key={f.id} className="hover:bg-[#faf9ff] transition-colors">
                    <td className="px-6 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ background: f.category_color + "20" }}>
                          <Zap size={15} style={{ color: f.category_color }} />
                        </div>
                        <div>
                          <div className="flex items-center gap-1.5">
                            <p className="text-[13px] font-bold text-slate-900">{f.name}</p>
                            {f.is_core && (
                              <span className="text-[9px] font-extrabold bg-indigo-50 text-indigo-600 border border-indigo-100 px-1.5 py-0.5 rounded-full uppercase">Core</span>
                            )}
                          </div>
                          <p className="text-[11px] font-mono text-slate-400">{f.code}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3.5">
                      <span
                        className="inline-flex items-center gap-1 rounded-full text-[11px] font-bold px-2.5 py-0.5 border"
                        style={{ background: f.category_color + "15", color: f.category_color, borderColor: f.category_color + "40" }}
                      >
                        <span className="w-1.5 h-1.5 rounded-full" style={{ background: f.category_color }} />
                        {f.category_name}
                      </span>
                    </td>
                    <td className="px-4 py-3.5">
                      <code className="text-[11px] font-mono text-slate-500 bg-slate-50 px-2 py-0.5 rounded">{f.route_path || "—"}</code>
                    </td>
                    <td className="px-4 py-3.5">
                      <span className="text-[12px] font-bold text-slate-500">v{f.version}</span>
                    </td>
                    <td className="px-4 py-3.5">
                      <span className={`rounded-full text-[11px] font-bold px-2.5 py-0.5 border capitalize ${ACCESS_LEVEL_STYLES[f.access_level] ?? "bg-slate-50 text-slate-600 border-slate-200"}`}>
                        {f.access_level}
                      </span>
                    </td>
                    <td className="px-4 py-3.5">
                      <span className={`rounded-full text-[11px] font-bold px-2.5 py-0.5 border capitalize ${STATUS_STYLES[f.status] ?? "bg-slate-50 text-slate-600 border-slate-200"}`}>
                        {f.status}
                      </span>
                    </td>
                    <td className="px-6 py-3.5">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => openEdit(f)}
                          className="w-8 h-8 rounded-lg border border-[#e0daf0] flex items-center justify-center text-slate-400 hover:text-violet-600 hover:border-violet-300 transition-all"
                          title="Edit"
                        >
                          <Edit2 size={13} />
                        </button>
                        <button
                          onClick={() => handleToggle(f.id, f.status)}
                          className={`w-8 h-8 rounded-lg border flex items-center justify-center transition-all ${
                            f.status === "active"
                              ? "border-emerald-200 text-emerald-600 hover:bg-emerald-50"
                              : "border-[#e0daf0] text-slate-400 hover:text-slate-600"
                          }`}
                          title={f.status === "active" ? "Deactivate" : "Activate"}
                        >
                          {f.status === "active" ? <ToggleRight size={14} /> : <ToggleLeft size={14} />}
                        </button>
                        <button
                          onClick={() => setConfirmDelete(f.id)}
                          className="w-8 h-8 rounded-lg border border-[#e0daf0] flex items-center justify-center text-slate-400 hover:text-red-600 hover:border-red-200 transition-all"
                          title="Delete"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Delete Confirm */}
      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => setConfirmDelete(null)} />
          <div className="relative bg-white rounded-2xl shadow-2xl p-6 w-full max-w-sm">
            <h3 className="text-[16px] font-extrabold text-slate-900 mb-2">Delete Feature?</h3>
            <p className="text-slate-500 text-[13px] font-semibold mb-5">This action cannot be undone. The feature will be permanently removed.</p>
            <div className="flex gap-3">
              <button
                onClick={() => setConfirmDelete(null)}
                className="flex-1 h-10 rounded-xl border border-[#e0daf0] text-[13px] font-bold text-slate-700 hover:bg-slate-50 transition-all"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(confirmDelete)}
                className="flex-1 h-10 rounded-xl bg-red-600 text-[13px] font-bold text-white hover:bg-red-700 transition-all"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create/Edit SlidePanel */}
      <SlidePanel
        open={panelOpen}
        onClose={() => setPanelOpen(false)}
        title={editFeature ? "Edit Feature" : "Create Feature"}
        subtitle={editFeature ? `Editing: ${editFeature.name}` : "Add a new platform feature"}
        width="xl"
      >
        <div className="space-y-7">
          {/* Section 1: Basic Info */}
          <div>
            <h4 className="text-[13px] font-extrabold text-slate-900 uppercase tracking-widest mb-4 flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-indigo-600 text-white text-[10px] flex items-center justify-center font-extrabold">1</span>
              Basic Info
            </h4>
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className="block text-[13px] font-bold text-slate-700 mb-1.5">Name <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  value={form.name}
                  onChange={e => setForm(p => ({ ...p, name: e.target.value, code: editFeature ? p.code : slugify(e.target.value) }))}
                  className="w-full px-4 h-10 rounded-xl border border-[#e0daf0] text-[13px] font-semibold text-slate-800 outline-none focus:border-[#7c3aed] focus:ring-2 focus:ring-[#7c3aed]/20 transition-all bg-white"
                  placeholder="e.g. Student Management"
                />
              </div>
              <div>
                <label className="block text-[13px] font-bold text-slate-700 mb-1.5">Code</label>
                <input
                  type="text"
                  value={form.code}
                  onChange={e => setForm(p => ({ ...p, code: e.target.value }))}
                  className="w-full px-4 h-10 rounded-xl border border-[#e0daf0] text-[13px] font-semibold text-slate-800 outline-none focus:border-[#7c3aed] focus:ring-2 focus:ring-[#7c3aed]/20 transition-all bg-white font-mono"
                  placeholder="student_mgmt"
                />
              </div>
              <div>
                <label className="block text-[13px] font-bold text-slate-700 mb-1.5">Category</label>
                <select
                  value={form.category_id}
                  onChange={e => setForm(p => ({ ...p, category_id: e.target.value, group_id: "" }))}
                  className="w-full px-4 h-10 rounded-xl border border-[#e0daf0] text-[13px] font-semibold text-slate-800 outline-none focus:border-[#7c3aed] focus:ring-2 focus:ring-[#7c3aed]/20 transition-all bg-white"
                >
                  <option value="">Select category</option>
                  {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-[13px] font-bold text-slate-700 mb-1.5">Group</label>
                <select
                  value={form.group_id}
                  onChange={e => setForm(p => ({ ...p, group_id: e.target.value }))}
                  className="w-full px-4 h-10 rounded-xl border border-[#e0daf0] text-[13px] font-semibold text-slate-800 outline-none focus:border-[#7c3aed] focus:ring-2 focus:ring-[#7c3aed]/20 transition-all bg-white"
                  disabled={!form.category_id}
                >
                  <option value="">No group</option>
                  {filteredGroups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
                </select>
              </div>
              <div className="col-span-2">
                <label className="block text-[13px] font-bold text-slate-700 mb-1.5">Description</label>
                <textarea
                  value={form.description}
                  onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
                  rows={3}
                  className="w-full px-4 py-2.5 rounded-xl border border-[#e0daf0] text-[13px] font-semibold text-slate-800 outline-none focus:border-[#7c3aed] focus:ring-2 focus:ring-[#7c3aed]/20 transition-all bg-white resize-none"
                  placeholder="Brief description of this feature..."
                />
              </div>
            </div>
          </div>

          {/* Section 2: Settings */}
          <div>
            <h4 className="text-[13px] font-extrabold text-slate-900 uppercase tracking-widest mb-4 flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-indigo-600 text-white text-[10px] flex items-center justify-center font-extrabold">2</span>
              Settings
            </h4>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[13px] font-bold text-slate-700 mb-1.5">Version</label>
                <input
                  type="text"
                  value={form.version}
                  onChange={e => setForm(p => ({ ...p, version: e.target.value }))}
                  className="w-full px-4 h-10 rounded-xl border border-[#e0daf0] text-[13px] font-semibold text-slate-800 outline-none focus:border-[#7c3aed] focus:ring-2 focus:ring-[#7c3aed]/20 transition-all bg-white"
                  placeholder="1.0.0"
                />
              </div>
              <div>
                <label className="block text-[13px] font-bold text-slate-700 mb-1.5">Icon Name</label>
                <input
                  type="text"
                  value={form.icon}
                  onChange={e => setForm(p => ({ ...p, icon: e.target.value }))}
                  className="w-full px-4 h-10 rounded-xl border border-[#e0daf0] text-[13px] font-semibold text-slate-800 outline-none focus:border-[#7c3aed] focus:ring-2 focus:ring-[#7c3aed]/20 transition-all bg-white"
                  placeholder="Zap, Users, CreditCard..."
                />
              </div>
              <div>
                <label className="block text-[13px] font-bold text-slate-700 mb-1.5">Route Path</label>
                <input
                  type="text"
                  value={form.route_path}
                  onChange={e => setForm(p => ({ ...p, route_path: e.target.value }))}
                  className="w-full px-4 h-10 rounded-xl border border-[#e0daf0] text-[13px] font-semibold text-slate-800 outline-none focus:border-[#7c3aed] focus:ring-2 focus:ring-[#7c3aed]/20 transition-all bg-white font-mono text-[12px]"
                  placeholder="/school/feature-name"
                />
              </div>
              <div>
                <label className="block text-[13px] font-bold text-slate-700 mb-1.5">Display Order</label>
                <input
                  type="number"
                  value={form.display_order}
                  onChange={e => setForm(p => ({ ...p, display_order: Number(e.target.value) }))}
                  className="w-full px-4 h-10 rounded-xl border border-[#e0daf0] text-[13px] font-semibold text-slate-800 outline-none focus:border-[#7c3aed] focus:ring-2 focus:ring-[#7c3aed]/20 transition-all bg-white"
                  min={0}
                />
              </div>
            </div>
          </div>

          {/* Section 3: Access Control */}
          <div>
            <h4 className="text-[13px] font-extrabold text-slate-900 uppercase tracking-widest mb-4 flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-indigo-600 text-white text-[10px] flex items-center justify-center font-extrabold">3</span>
              Access Control
            </h4>
            <div className="space-y-4">
              <div>
                <label className="block text-[13px] font-bold text-slate-700 mb-2">Access Level</label>
                <div className="grid grid-cols-5 gap-2">
                  {["public", "subscription", "premium", "enterprise", "beta"].map(level => (
                    <button
                      key={level}
                      type="button"
                      onClick={() => setForm(p => ({ ...p, access_level: level }))}
                      className={`py-2 px-3 rounded-xl border text-[11px] font-bold capitalize transition-all ${
                        form.access_level === level
                          ? "border-violet-400 bg-violet-50 text-violet-700"
                          : "border-[#e0daf0] text-slate-500 hover:border-violet-200"
                      }`}
                    >
                      {level}
                    </button>
                  ))}
                </div>
              </div>
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.is_core}
                  onChange={e => setForm(p => ({ ...p, is_core: e.target.checked }))}
                  className="w-4 h-4 rounded accent-violet-600"
                />
                <div>
                  <p className="text-[13px] font-bold text-slate-700">Is Core Feature</p>
                  <p className="text-[11px] font-semibold text-slate-400">Core features cannot be disabled by schools</p>
                </div>
              </label>
            </div>
          </div>

          {/* Section 4: Status */}
          <div>
            <h4 className="text-[13px] font-extrabold text-slate-900 uppercase tracking-widest mb-4 flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-indigo-600 text-white text-[10px] flex items-center justify-center font-extrabold">4</span>
              Status
            </h4>
            <div>
              <label className="block text-[13px] font-bold text-slate-700 mb-1.5">Status</label>
              <select
                value={form.status}
                onChange={e => setForm(p => ({ ...p, status: e.target.value }))}
                className="w-full px-4 h-10 rounded-xl border border-[#e0daf0] text-[13px] font-semibold text-slate-800 outline-none focus:border-[#7c3aed] focus:ring-2 focus:ring-[#7c3aed]/20 transition-all bg-white"
              >
                {["active", "inactive", "draft", "beta", "archived"].map(s => (
                  <option key={s} value={s} className="capitalize">{s}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-2 border-t border-[#f0edf8]">
            <button
              onClick={() => setPanelOpen(false)}
              className="flex-1 h-10 rounded-xl border border-[#e0daf0] text-[13px] font-bold text-slate-700 hover:bg-slate-50 transition-all"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex-1 h-10 rounded-xl text-[13px] font-bold text-white disabled:opacity-70 transition-all hover:opacity-90"
              style={{ background: "linear-gradient(135deg, #4f46e5, #7c3aed)" }}
            >
              {saving ? "Saving..." : editFeature ? "Update Feature" : "Create Feature"}
            </button>
          </div>
        </div>
      </SlidePanel>
    </div>
  );
}
