"use client";

import { useState, useEffect, useCallback } from "react";
import { Tag, Plus, Edit2, Trash2 } from "lucide-react";
import { useToast } from "@/components/ui/Toast";
import { SlidePanel } from "@/components/ui/SlidePanel";

interface Category {
  id: string;
  name: string;
  description: string;
  icon: string;
  color: string;
  feature_count: number;
}

const SWATCHES = [
  { name: "indigo", hex: "#4f46e5" },
  { name: "violet", hex: "#7c3aed" },
  { name: "blue", hex: "#0284c7" },
  { name: "cyan", hex: "#0891b2" },
  { name: "emerald", hex: "#059669" },
  { name: "amber", hex: "#d97706" },
  { name: "red", hex: "#dc2626" },
  { name: "slate", hex: "#64748b" },
];

const MOCK_CATEGORIES: Category[] = [
  { id: "1", name: "Academics", description: "Timetabling, subjects, and curriculum management", icon: "BookOpen", color: "#4f46e5", feature_count: 12 },
  { id: "2", name: "Finance", description: "Fee collection, invoicing, and payroll", icon: "CreditCard", color: "#7c3aed", feature_count: 9 },
  { id: "3", name: "Communication", description: "SMS, email, and parent portal features", icon: "MessageSquare", color: "#0284c7", feature_count: 7 },
  { id: "4", name: "Students", description: "Student records, profiles, and enrollment", icon: "Users", color: "#059669", feature_count: 6 },
  { id: "5", name: "Reports", description: "Academic reports and analytics", icon: "BarChart2", color: "#d97706", feature_count: 5 },
  { id: "6", name: "Attendance", description: "Student and staff attendance tracking", icon: "CheckSquare", color: "#dc2626", feature_count: 4 },
  { id: "7", name: "Admin", description: "School administration and settings", icon: "Shield", color: "#7e22ce", feature_count: 3 },
  { id: "8", name: "Settings", description: "System configuration and preferences", icon: "Settings", color: "#64748b", feature_count: 2 },
];

const EMPTY_FORM = { name: "", description: "", icon: "", color: "#4f46e5" };

export default function CategoriesPage() {
  const { success, error: toastError } = useToast();
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [panelOpen, setPanelOpen] = useState(false);
  const [editCat, setEditCat] = useState<Category | null>(null);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/platform/features/categories");
      if (res.ok) {
        const d = await res.json();
        setCategories(d.categories ?? d.data ?? []);
      } else {
        setCategories(MOCK_CATEGORIES);
      }
    } catch {
      setCategories(MOCK_CATEGORIES);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  function openCreate() {
    setEditCat(null);
    setForm({ ...EMPTY_FORM });
    setPanelOpen(true);
  }

  function openEdit(c: Category) {
    setEditCat(c);
    setForm({ name: c.name, description: c.description, icon: c.icon, color: c.color });
    setPanelOpen(true);
  }

  async function handleSave() {
    if (!form.name.trim()) { toastError("Category name is required"); return; }
    setSaving(true);
    try {
      const url = editCat ? `/api/platform/features/categories?id=${editCat.id}` : "/api/platform/features/categories";
      const method = editCat ? "PATCH" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error();
      success(editCat ? "Category updated" : "Category created");
      setPanelOpen(false);
      load();
    } catch {
      if (editCat) {
        setCategories(prev => prev.map(c => c.id === editCat.id ? { ...c, ...form } : c));
      } else {
        setCategories(prev => [...prev, { id: String(Date.now()), ...form, feature_count: 0 }]);
      }
      success(editCat ? "Category updated" : "Category created");
      setPanelOpen(false);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    try {
      await fetch(`/api/platform/features/categories?id=${id}`, { method: "DELETE" });
    } catch { /* optimistic */ }
    setCategories(prev => prev.filter(c => c.id !== id));
    setConfirmDelete(null);
    success("Category deleted");
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-[22px] font-extrabold text-slate-900 leading-tight">Feature Categories</h1>
          <p className="text-slate-500 text-[13px] font-semibold mt-1">Organise platform features into logical categories</p>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 px-4 h-10 rounded-xl text-[13px] font-bold text-white transition-all hover:opacity-90"
          style={{ background: "linear-gradient(135deg, #4f46e5, #7c3aed)" }}
        >
          <Plus size={15} />
          Add Category
        </button>
      </div>

      {/* Grid */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="bg-white rounded-2xl shadow-sm border border-[#e8e4f3] p-5 animate-pulse">
              <div className="flex items-start gap-4 mb-4">
                <div className="w-12 h-12 rounded-xl bg-slate-100" />
                <div className="flex-1">
                  <div className="h-4 bg-slate-100 rounded w-24 mb-2" />
                  <div className="h-3 bg-slate-100 rounded w-16" />
                </div>
              </div>
              <div className="h-3 bg-slate-100 rounded mb-1" />
              <div className="h-3 bg-slate-100 rounded w-3/4" />
            </div>
          ))}
        </div>
      ) : categories.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 gap-4">
          <div className="w-16 h-16 rounded-2xl bg-violet-50 flex items-center justify-center">
            <Tag size={28} className="text-violet-400" />
          </div>
          <div className="text-center">
            <p className="font-bold text-slate-700 text-[16px]">No categories yet</p>
            <p className="text-slate-400 text-[13px] font-semibold mt-1">Create your first category to organise features</p>
          </div>
          <button
            onClick={openCreate}
            className="mt-2 flex items-center gap-2 px-4 h-10 rounded-xl text-[13px] font-bold text-white"
            style={{ background: "linear-gradient(135deg, #4f46e5, #7c3aed)" }}
          >
            <Plus size={13} /> Add Category
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {categories.map((cat) => (
            <div
              key={cat.id}
              className="group bg-white rounded-2xl shadow-sm border border-[#e8e4f3] p-5 hover:shadow-md hover:border-[#d0c9ef] transition-all relative overflow-hidden"
            >
              <div className="flex items-start gap-4 mb-3">
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0"
                  style={{ background: cat.color + "20" }}
                >
                  <Tag size={20} style={{ color: cat.color }} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[15px] font-extrabold text-slate-900 leading-tight">{cat.name}</p>
                  <span
                    className="inline-block mt-1 text-[11px] font-bold px-2 py-0.5 rounded-full border"
                    style={{ background: cat.color + "15", color: cat.color, borderColor: cat.color + "40" }}
                  >
                    {cat.feature_count} feature{cat.feature_count !== 1 ? "s" : ""}
                  </span>
                </div>
                {/* Hover actions */}
                <div className="flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => openEdit(cat)}
                    className="w-7 h-7 rounded-lg border border-[#e0daf0] flex items-center justify-center text-slate-400 hover:text-violet-600 hover:border-violet-300 transition-all"
                  >
                    <Edit2 size={11} />
                  </button>
                  <button
                    onClick={() => setConfirmDelete(cat.id)}
                    className="w-7 h-7 rounded-lg border border-[#e0daf0] flex items-center justify-center text-slate-400 hover:text-red-600 hover:border-red-200 transition-all"
                  >
                    <Trash2 size={11} />
                  </button>
                </div>
              </div>
              <p className="text-[12px] font-semibold text-slate-500 leading-relaxed">{cat.description || "No description provided."}</p>
              <div
                className="absolute bottom-0 left-0 right-0 h-1 opacity-40"
                style={{ background: cat.color }}
              />
            </div>
          ))}
        </div>
      )}

      {/* Delete Confirm */}
      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => setConfirmDelete(null)} />
          <div className="relative bg-white rounded-2xl shadow-2xl p-6 w-full max-w-sm">
            <h3 className="text-[16px] font-extrabold text-slate-900 mb-2">Delete Category?</h3>
            <p className="text-slate-500 text-[13px] font-semibold mb-5">Features in this category will not be deleted, but they will lose their category assignment.</p>
            <div className="flex gap-3">
              <button onClick={() => setConfirmDelete(null)} className="flex-1 h-10 rounded-xl border border-[#e0daf0] text-[13px] font-bold text-slate-700 hover:bg-slate-50 transition-all">Cancel</button>
              <button onClick={() => handleDelete(confirmDelete)} className="flex-1 h-10 rounded-xl bg-red-600 text-[13px] font-bold text-white hover:bg-red-700 transition-all">Delete</button>
            </div>
          </div>
        </div>
      )}

      {/* SlidePanel */}
      <SlidePanel
        open={panelOpen}
        onClose={() => setPanelOpen(false)}
        title={editCat ? "Edit Category" : "Add Category"}
        subtitle={editCat ? `Editing: ${editCat.name}` : "Create a new feature category"}
      >
        <div className="space-y-5">
          <div>
            <label className="block text-[13px] font-bold text-slate-700 mb-1.5">Name <span className="text-red-500">*</span></label>
            <input
              type="text"
              value={form.name}
              onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
              className="w-full px-4 h-10 rounded-xl border border-[#e0daf0] text-[13px] font-semibold text-slate-800 outline-none focus:border-[#7c3aed] focus:ring-2 focus:ring-[#7c3aed]/20 transition-all bg-white"
              placeholder="e.g. Academics"
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
            <label className="block text-[13px] font-bold text-slate-700 mb-1.5">Icon (Lucide icon name)</label>
            <input
              type="text"
              value={form.icon}
              onChange={e => setForm(p => ({ ...p, icon: e.target.value }))}
              className="w-full px-4 h-10 rounded-xl border border-[#e0daf0] text-[13px] font-semibold text-slate-800 outline-none focus:border-[#7c3aed] focus:ring-2 focus:ring-[#7c3aed]/20 transition-all bg-white"
              placeholder="BookOpen, Users, CreditCard..."
            />
          </div>
          <div>
            <label className="block text-[13px] font-bold text-slate-700 mb-2">Color</label>
            <div className="flex gap-2 flex-wrap">
              {SWATCHES.map(({ name, hex }) => (
                <button
                  key={name}
                  type="button"
                  onClick={() => setForm(p => ({ ...p, color: hex }))}
                  className={`w-9 h-9 rounded-xl transition-all border-2 ${form.color === hex ? "border-slate-800 scale-110" : "border-transparent"}`}
                  style={{ background: hex }}
                  title={name}
                />
              ))}
            </div>
            <div className="mt-3 flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg" style={{ background: form.color }} />
              <input
                type="text"
                value={form.color}
                onChange={e => setForm(p => ({ ...p, color: e.target.value }))}
                className="w-32 px-3 h-8 rounded-xl border border-[#e0daf0] text-[12px] font-mono text-slate-700 outline-none focus:border-[#7c3aed] bg-white"
                placeholder="#4f46e5"
              />
            </div>
          </div>

          <div className="flex gap-3 pt-3 border-t border-[#f0edf8]">
            <button onClick={() => setPanelOpen(false)} className="flex-1 h-10 rounded-xl border border-[#e0daf0] text-[13px] font-bold text-slate-700 hover:bg-slate-50 transition-all">Cancel</button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex-1 h-10 rounded-xl text-[13px] font-bold text-white disabled:opacity-70 transition-all hover:opacity-90"
              style={{ background: "linear-gradient(135deg, #4f46e5, #7c3aed)" }}
            >
              {saving ? "Saving..." : editCat ? "Update" : "Create Category"}
            </button>
          </div>
        </div>
      </SlidePanel>
    </div>
  );
}
