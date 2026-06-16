"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Plus, Trash2, Users, Pencil, GraduationCap } from "lucide-react";
import { ConfirmModal } from "@/components/ui/ConfirmModal";
import { Modal } from "@/components/ui/Modal";

const LEVELS = [
  { value: "daycare", label: "Day Care" },
  { value: "nursery", label: "Nursery" },
  { value: "kg", label: "KG" },
  { value: "primary", label: "Primary" },
  { value: "jhs", label: "JHS" },
];

const LEVEL_COLORS: Record<string, { bg: string; text: string; accent: string }> = {
  daycare:  { bg: "#f0fdfa", text: "#0d9488", accent: "#0d9488" },
  nursery:  { bg: "#f0fdf4", text: "#16a34a", accent: "#16a34a" },
  kg:       { bg: "#fffbeb", text: "#d97706", accent: "#d97706" },
  primary:  { bg: "#eef2ff", text: "#262262", accent: "#262262" },
  jhs:      { bg: "#fdf4ff", text: "#92278F", accent: "#92278F" },
};

interface Classroom {
  id: string;
  name: string;
  level: string;
  arm: string | null;
  class_teacher_id: string | null;
  capacity: number | null;
}

interface Teacher { id: string; full_name: string; }

interface Props {
  schoolId: string;
  classes: Classroom[];
  teachers: Teacher[];
}

export function ClassesManager({ schoolId, classes: initial, teachers }: Props) {
  const router = useRouter();
  const supabase = createClient();
  const [classes, setClasses] = useState(initial);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: "", level: "primary", arm: "", class_teacher_id: "", capacity: "" });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [editingClass, setEditingClass] = useState<Classroom | null>(null);
  const [editForm, setEditForm] = useState({ name: "", level: "primary", arm: "", class_teacher_id: "", capacity: "" });
  const [savingEdit, setSavingEdit] = useState(false);

  function setField(k: string, v: string) { setForm((f) => ({ ...f, [k]: v })); }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setSaving(true);
    const { data, error } = await supabase
      .from("classrooms")
      .insert({
        school_id: schoolId,
        name: form.name.trim(),
        level: form.level,
        arm: form.arm.trim() || null,
        class_teacher_id: form.class_teacher_id || null,
        capacity: form.capacity ? parseInt(form.capacity) : null,
      })
      .select()
      .single();
    setSaving(false);
    if (error) { setErr(error.message); return; }
    setClasses((c) => [...c, data]);
    setShowForm(false);
    setForm({ name: "", level: "primary", arm: "", class_teacher_id: "", capacity: "" });
    router.refresh();
  }

  async function deleteClass(id: string) {
    setDeleting(id);
    await supabase.from("classrooms").delete().eq("id", id);
    setClasses((c) => c.filter((cl) => cl.id !== id));
    setDeleting(null);
    setConfirmDelete(null);
  }

  function openEdit(cls: Classroom) {
    setEditingClass(cls);
    setEditForm({
      name: cls.name, level: cls.level, arm: cls.arm ?? "",
      class_teacher_id: cls.class_teacher_id ?? "", capacity: cls.capacity?.toString() ?? "",
    });
  }

  async function saveEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editingClass) return;
    setSavingEdit(true);
    const { data, error } = await supabase.from("classrooms").update({
      name: editForm.name.trim(), level: editForm.level,
      arm: editForm.arm.trim() || null,
      class_teacher_id: editForm.class_teacher_id || null,
      capacity: editForm.capacity ? parseInt(editForm.capacity) : null,
    }).eq("id", editingClass.id).select().single();
    setSavingEdit(false);
    if (error) return;
    setClasses((c) => c.map((x) => x.id === editingClass.id ? data : x));
    setEditingClass(null);
    router.refresh();
  }

  return (
    <div className="space-y-6 max-w-2xl">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[22px] font-extrabold text-slate-800 leading-tight">Classes</h1>
          <p className="text-[13px] text-slate-400 mt-0.5">Create classes and assign class teachers.</p>
        </div>
        <button
          onClick={() => setShowForm((v) => !v)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-[13px] font-bold text-white shadow-sm hover:opacity-90 transition-opacity"
          style={{ background: "linear-gradient(135deg, #262262, #92278F)" }}
        >
          <Plus size={15} /> Add Class
        </button>
      </div>

      {/* New class form */}
      {showForm && (
        <div className="bg-white rounded-2xl shadow-sm border border-[#e8e4f3] p-6">
          <p className="text-[14px] font-bold text-slate-700 mb-5">New Class</p>
          <form onSubmit={save} className="space-y-4">
            {/* Level selector */}
            <div>
              <p className="text-[13px] font-semibold text-slate-600 mb-2">Level</p>
              <div className="flex flex-wrap gap-2">
                {LEVELS.map((l) => {
                  const colors = LEVEL_COLORS[l.value];
                  const active = form.level === l.value;
                  return (
                    <button
                      key={l.value}
                      type="button"
                      onClick={() => setField("level", l.value)}
                      className="px-3 py-1.5 rounded-xl text-[13px] font-semibold border transition-all"
                      style={active
                        ? { background: colors.accent, color: "#fff", borderColor: colors.accent }
                        : { background: "#fff", color: "#64748b", borderColor: "#e0daf0" }
                      }
                    >
                      {l.label}
                    </button>
                  );
                })}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Input label="Class name" placeholder="e.g. Primary 4, JHS 2" value={form.name} onChange={(e) => setField("name", e.target.value)} required />
              <Input label="Arm / stream (optional)" placeholder="e.g. A, Gold" value={form.arm} onChange={(e) => setField("arm", e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-[13px] font-semibold text-slate-600">Class teacher</label>
                <select
                  value={form.class_teacher_id}
                  onChange={(e) => setField("class_teacher_id", e.target.value)}
                  className="h-10 rounded-xl border border-[#e0daf0] bg-white px-3 text-[14px] text-slate-700 outline-none focus:border-[#6b1f8a] focus:ring-2 focus:ring-[#6b1f8a]/20 transition-all"
                >
                  <option value="">— None —</option>
                  {teachers.map((t) => <option key={t.id} value={t.id}>{t.full_name}</option>)}
                </select>
              </div>
              <Input label="Capacity" type="number" min="1" placeholder="e.g. 40" value={form.capacity} onChange={(e) => setField("capacity", e.target.value)} />
            </div>
            {err && <p className="text-[13px] text-red-600 bg-red-50 px-3 py-2 rounded-xl border border-red-100">{err}</p>}
            <div className="flex gap-2 pt-1">
              <Button type="submit" size="sm" loading={saving}>Save class</Button>
              <Button type="button" size="sm" variant="secondary" onClick={() => setShowForm(false)}>Cancel</Button>
            </div>
          </form>
        </div>
      )}

      {/* Empty state */}
      {classes.length === 0 && !showForm && (
        <div className="bg-white rounded-2xl shadow-sm border border-[#e8e4f3] p-12 text-center">
          <div className="w-14 h-14 rounded-2xl bg-[#eef2ff] flex items-center justify-center mx-auto mb-4">
            <GraduationCap size={24} className="text-[#262262]" />
          </div>
          <p className="text-[15px] font-bold text-slate-700 mb-1">No classes yet</p>
          <p className="text-[13px] text-slate-400">Add your first class to get started.</p>
          <button
            onClick={() => setShowForm(true)}
            className="mt-5 flex items-center gap-2 px-4 py-2.5 rounded-xl text-[13px] font-bold text-white mx-auto hover:opacity-90 transition-opacity"
            style={{ background: "linear-gradient(135deg, #262262, #92278F)" }}
          >
            <Plus size={14} /> Add Class
          </button>
        </div>
      )}

      {/* Classes by level */}
      {LEVELS.map((l) => {
        const items = classes.filter((c) => c.level === l.value).sort((a, b) => a.name.localeCompare(b.name));
        if (!items.length) return null;
        const colors = LEVEL_COLORS[l.value];
        return (
          <div key={l.value}>
            <p className="text-[11px] font-extrabold uppercase tracking-[0.12em] mb-3 px-0.5" style={{ color: colors.accent }}>
              {l.label}
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {items.map((cls) => {
                const teacher = teachers.find((t) => t.id === cls.class_teacher_id);
                return (
                  <div key={cls.id}
                    className="bg-white border border-[#e8e4f3] rounded-2xl p-4 flex items-start gap-3 shadow-sm hover:shadow-md hover:border-[#c4b5e8] transition-all">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                      style={{ background: colors.bg }}>
                      <Users size={17} style={{ color: colors.accent }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[14px] font-bold text-slate-800">{cls.name}{cls.arm ? ` (${cls.arm})` : ""}</p>
                      <p className="text-[12px] text-slate-400">
                        {teacher ? teacher.full_name : "No teacher assigned"}
                        {cls.capacity ? ` · Cap: ${cls.capacity}` : ""}
                      </p>
                    </div>
                    <div className="flex gap-1 shrink-0">
                      <button onClick={() => openEdit(cls)}
                        className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-400 hover:text-[#6b1f8a] hover:bg-[#f0eeff] transition-all">
                        <Pencil size={13} />
                      </button>
                      <button onClick={() => setConfirmDelete(cls.id)}
                        className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 transition-all">
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}

      {/* Edit class modal */}
      <Modal open={!!editingClass} onClose={() => setEditingClass(null)} title="Edit class">
        {editingClass && (
          <form onSubmit={saveEdit} className="space-y-4">
            <div>
              <p className="text-[13px] font-semibold text-slate-600 mb-2">Level</p>
              <div className="flex flex-wrap gap-2">
                {LEVELS.map((l) => {
                  const colors = LEVEL_COLORS[l.value];
                  const active = editForm.level === l.value;
                  return (
                    <button key={l.value} type="button"
                      onClick={() => setEditForm((f) => ({ ...f, level: l.value }))}
                      className="px-3 py-1.5 rounded-xl text-[13px] font-semibold border transition-all"
                      style={active
                        ? { background: colors.accent, color: "#fff", borderColor: colors.accent }
                        : { background: "#fff", color: "#64748b", borderColor: "#e0daf0" }
                      }
                    >{l.label}</button>
                  );
                })}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Input label="Class name" value={editForm.name} onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))} required />
              <Input label="Arm / stream" placeholder="e.g. A, Gold" value={editForm.arm} onChange={(e) => setEditForm((f) => ({ ...f, arm: e.target.value }))} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-[13px] font-semibold text-slate-600">Class teacher</label>
                <select value={editForm.class_teacher_id} onChange={(e) => setEditForm((f) => ({ ...f, class_teacher_id: e.target.value }))}
                  className="h-10 rounded-xl border border-[#e0daf0] bg-white px-3 text-[14px] text-slate-700 outline-none focus:border-[#6b1f8a] focus:ring-2 focus:ring-[#6b1f8a]/20 transition-all">
                  <option value="">— None —</option>
                  {teachers.map((t) => <option key={t.id} value={t.id}>{t.full_name}</option>)}
                </select>
              </div>
              <Input label="Capacity" type="number" min="1" placeholder="e.g. 40" value={editForm.capacity} onChange={(e) => setEditForm((f) => ({ ...f, capacity: e.target.value }))} />
            </div>
            <div className="flex gap-2 justify-end pt-1">
              <Button type="button" variant="secondary" onClick={() => setEditingClass(null)}>Cancel</Button>
              <Button type="submit" loading={savingEdit}>Save changes</Button>
            </div>
          </form>
        )}
      </Modal>

      {/* Confirm delete */}
      <ConfirmModal
        open={!!confirmDelete}
        title="Delete class?"
        message="This will permanently delete the class. Students enrolled in it will not be deleted."
        confirmLabel="Delete"
        danger
        loading={!!deleting}
        onConfirm={() => confirmDelete && deleteClass(confirmDelete)}
        onCancel={() => setConfirmDelete(null)}
      />
    </div>
  );
}
