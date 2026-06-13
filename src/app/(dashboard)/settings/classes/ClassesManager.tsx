"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Plus, Trash2, Users, Pencil } from "lucide-react";
import { ConfirmModal } from "@/components/ui/ConfirmModal";
import { Modal } from "@/components/ui/Modal";

const LEVELS = [
  { value: "daycare", label: "Day Care" },
  { value: "nursery", label: "Nursery" },
  { value: "kg", label: "KG" },
  { value: "primary", label: "Primary" },
  { value: "jhs", label: "JHS" },
];

const LEVEL_COLORS: Record<string, string> = {
  daycare: "var(--teal-600)", nursery: "var(--green-600)", kg: "var(--amber-500)",
  primary: "var(--brand)", jhs: "var(--accent)",
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

  const byLevel = LEVELS.map((l) => ({
    ...l,
    items: classes.filter((c) => c.level === l.value),
  })).filter((l) => l.items.length > 0 || showForm);

  return (
    <div className="space-y-5 max-w-2xl">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-bold text-[var(--text-strong)]">Classes</h3>
          <p className="text-sm text-[var(--text-muted)]">Create classes and assign class teachers.</p>
        </div>
        <Button size="sm" onClick={() => setShowForm((v) => !v)}>
          <Plus size={14} /> Add class
        </Button>
      </div>

      {showForm && (
        <Card>
          <p className="text-sm font-semibold text-[var(--text-strong)] mb-4">New class</p>
          <form onSubmit={save} className="space-y-4">
            {/* Level selector */}
            <div>
              <p className="text-sm font-semibold text-[var(--text-strong)] mb-2">Level</p>
              <div className="flex flex-wrap gap-2">
                {LEVELS.map((l) => (
                  <button
                    key={l.value}
                    type="button"
                    onClick={() => setField("level", l.value)}
                    className={`px-3 py-1.5 rounded-[8px] text-sm font-medium border transition-all ${
                      form.level === l.value
                        ? "text-white border-transparent"
                        : "bg-white text-[var(--text-muted)] border-[var(--border)] hover:border-[var(--ring)]"
                    }`}
                    style={form.level === l.value ? { background: LEVEL_COLORS[l.value] } : {}}
                  >
                    {l.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Input label="Class name" placeholder="e.g. Primary 4, JHS 2" value={form.name} onChange={(e) => setField("name", e.target.value)} required />
              <Input label="Arm / stream (optional)" placeholder="e.g. A, Gold" value={form.arm} onChange={(e) => setField("arm", e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-semibold text-[var(--text-strong)]">Class teacher</label>
                <select
                  value={form.class_teacher_id}
                  onChange={(e) => setField("class_teacher_id", e.target.value)}
                  className="h-10 rounded-[10px] border border-[var(--border)] bg-white px-3 text-sm text-[var(--text-strong)] outline-none focus:border-[var(--ring)] focus:shadow-[var(--shadow-focus)]"
                >
                  <option value="">— None —</option>
                  {teachers.map((t) => <option key={t.id} value={t.id}>{t.full_name}</option>)}
                </select>
              </div>
              <Input label="Capacity" type="number" min="1" placeholder="e.g. 40" value={form.capacity} onChange={(e) => setField("capacity", e.target.value)} />
            </div>
            {err && <p className="text-sm text-[var(--danger)]">{err}</p>}
            <div className="flex gap-2">
              <Button type="submit" size="sm" loading={saving}>Save class</Button>
              <Button type="button" size="sm" variant="secondary" onClick={() => setShowForm(false)}>Cancel</Button>
            </div>
          </form>
        </Card>
      )}

      {classes.length === 0 && !showForm && (
        <Card>
          <p className="text-sm text-[var(--text-muted)] text-center py-4">No classes yet. Add your first class above.</p>
        </Card>
      )}

      {LEVELS.map((l) => {
        const items = classes.filter((c) => c.level === l.value).sort((a, b) => a.name.localeCompare(b.name));
        if (!items.length) return null;
        return (
          <div key={l.value}>
            <p className="text-xs font-semibold uppercase tracking-[0.08em] mb-2" style={{ color: LEVEL_COLORS[l.value] }}>{l.label}</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {items.map((cls) => {
                const teacher = teachers.find((t) => t.id === cls.class_teacher_id);
                return (
                  <div key={cls.id} className="bg-white border border-[var(--border)] rounded-[12px] p-4 flex items-start gap-3 shadow-[var(--shadow-sm)]">
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ background: `color-mix(in srgb, ${LEVEL_COLORS[cls.level]} 12%, white)` }}>
                      <Users size={16} style={{ color: LEVEL_COLORS[cls.level] }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-[var(--text-strong)]">{cls.name}{cls.arm ? ` (${cls.arm})` : ""}</p>
                      <p className="text-xs text-[var(--text-muted)]">
                        {teacher ? teacher.full_name : "No teacher assigned"}
                        {cls.capacity ? ` · Capacity: ${cls.capacity}` : ""}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => openEdit(cls)} className="text-[var(--text-subtle)] hover:text-[var(--brand)] transition-colors"><Pencil size={14} /></button>
                      <button onClick={() => setConfirmDelete(cls.id)} className="text-[var(--text-subtle)] hover:text-[var(--danger)] transition-colors"><Trash2 size={14} /></button>
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
              <p className="text-sm font-semibold text-[var(--text-strong)] mb-2">Level</p>
              <div className="flex flex-wrap gap-2">
                {LEVELS.map((l) => (
                  <button key={l.value} type="button"
                    onClick={() => setEditForm((f) => ({ ...f, level: l.value }))}
                    className={`px-3 py-1.5 rounded-[8px] text-sm font-medium border transition-all ${
                      editForm.level === l.value ? "text-white border-transparent" : "bg-white text-[var(--text-muted)] border-[var(--border)] hover:border-[var(--ring)]"
                    }`}
                    style={editForm.level === l.value ? { background: LEVEL_COLORS[l.value] } : {}}
                  >{l.label}</button>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Input label="Class name" value={editForm.name} onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))} required />
              <Input label="Arm / stream" placeholder="e.g. A, Gold" value={editForm.arm} onChange={(e) => setEditForm((f) => ({ ...f, arm: e.target.value }))} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-semibold text-[var(--text-strong)]">Class teacher</label>
                <select value={editForm.class_teacher_id} onChange={(e) => setEditForm((f) => ({ ...f, class_teacher_id: e.target.value }))}
                  className="h-10 rounded-[10px] border border-[var(--border)] bg-white px-3 text-sm text-[var(--text-strong)] outline-none focus:border-[var(--ring)] focus:shadow-[var(--shadow-focus)]">
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
