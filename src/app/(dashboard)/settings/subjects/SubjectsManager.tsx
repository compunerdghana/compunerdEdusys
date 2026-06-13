"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Plus, Trash2, BookOpen, Pencil } from "lucide-react";
import { Modal } from "@/components/ui/Modal";

const LEVELS = [
  { value: "daycare", label: "Day Care" },
  { value: "nursery", label: "Nursery" },
  { value: "kg", label: "KG" },
  { value: "primary", label: "Primary" },
  { value: "jhs", label: "JHS" },
];

const GH_SUBJECTS = [
  "English Language", "Mathematics", "Integrated Science", "Social Studies",
  "Religious and Moral Education (RME)", "Creative Arts", "Ghanaian Language",
  "French", "ICT", "Physical Education", "History",
];

interface Subject {
  id: string;
  name: string;
  code: string | null;
  level: string[];
}

interface Props {
  schoolId: string;
  subjects: Subject[];
}

export function SubjectsManager({ schoolId, subjects: initial }: Props) {
  const router = useRouter();
  const supabase = createClient();
  const [subjects, setSubjects] = useState(initial);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: "", code: "", level: [] as string[] });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [editingSubject, setEditingSubject] = useState<Subject | null>(null);
  const [editForm, setEditForm] = useState({ name: "", code: "", level: [] as string[] });
  const [savingEdit, setSavingEdit] = useState(false);

  function toggleLevel(v: string) {
    setForm((f) => ({
      ...f,
      level: f.level.includes(v) ? f.level.filter((l) => l !== v) : [...f.level, v],
    }));
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setSaving(true);
    const { data, error } = await supabase
      .from("subjects")
      .insert({ school_id: schoolId, name: form.name.trim(), code: form.code.trim() || null, level: form.level })
      .select()
      .single();
    setSaving(false);
    if (error) { setErr(error.message); return; }
    setSubjects((s) => [...s, data].sort((a, b) => a.name.localeCompare(b.name)));
    setShowForm(false);
    setForm({ name: "", code: "", level: [] });
    router.refresh();
  }

  async function deleteSubject(id: string) {
    setDeleting(id);
    await supabase.from("subjects").delete().eq("id", id);
    setSubjects((s) => s.filter((x) => x.id !== id));
    setDeleting(null);
  }

  function quickAdd(name: string) {
    setForm((f) => ({ ...f, name }));
    setShowForm(true);
  }

  async function selectAllGES() {
    const missing = GH_SUBJECTS.filter((s) => !subjects.find((x) => x.name === s));
    if (!missing.length) return;
    const rows = missing.map((name) => ({ school_id: schoolId, name, code: null, level: [] as string[] }));
    const { data, error } = await supabase.from("subjects").insert(rows).select();
    if (error) return;
    setSubjects((s) => [...s, ...(data ?? [])].sort((a, b) => a.name.localeCompare(b.name)));
    router.refresh();
  }

  function openEdit(s: Subject) {
    setEditingSubject(s);
    setEditForm({ name: s.name, code: s.code ?? "", level: s.level ?? [] });
  }

  async function saveEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editingSubject) return;
    setSavingEdit(true);
    const { data, error } = await supabase.from("subjects").update({
      name: editForm.name.trim(), code: editForm.code.trim() || null, level: editForm.level,
    }).eq("id", editingSubject.id).select().single();
    setSavingEdit(false);
    if (error) return;
    setSubjects((s) => s.map((x) => x.id === editingSubject.id ? data : x).sort((a, b) => a.name.localeCompare(b.name)));
    setEditingSubject(null);
    router.refresh();
  }

  return (
    <div className="space-y-5 max-w-2xl">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-bold text-[var(--text-strong)]">Subjects</h3>
          <p className="text-sm text-[var(--text-muted)]">Define subjects and which levels they apply to.</p>
        </div>
        <Button size="sm" onClick={() => setShowForm((v) => !v)}>
          <Plus size={14} /> Add subject
        </Button>
      </div>

      {/* Quick add from GH curriculum */}
      <Card>
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[var(--text-muted)]">Common GES subjects — click to pre-fill</p>
          {GH_SUBJECTS.filter((s) => !subjects.find((x) => x.name === s)).length > 0 && (
            <button onClick={selectAllGES}
              className="text-xs font-semibold px-2.5 py-1 rounded-lg border border-[var(--brand)] text-[var(--brand)] hover:bg-[var(--brand-subtle)] transition-all">
              Select All
            </button>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          {GH_SUBJECTS.filter((s) => !subjects.find((x) => x.name === s)).map((s) => (
            <button
              key={s}
              onClick={() => quickAdd(s)}
              className="px-2.5 py-1 rounded-[6px] text-xs font-medium border border-[var(--border)] text-[var(--text-muted)] hover:border-[var(--ring)] hover:text-[var(--brand)] hover:bg-[var(--brand-subtle)] transition-all"
            >
              + {s}
            </button>
          ))}
          {GH_SUBJECTS.filter((s) => !subjects.find((x) => x.name === s)).length === 0 && (
            <p className="text-xs text-[var(--text-muted)]">All common subjects added.</p>
          )}
        </div>
      </Card>

      {showForm && (
        <Card>
          <p className="text-sm font-semibold text-[var(--text-strong)] mb-4">New subject</p>
          <form onSubmit={save} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <Input label="Subject name" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} required placeholder="e.g. Mathematics" />
              <Input label="Code (optional)" value={form.code} onChange={(e) => setForm((f) => ({ ...f, code: e.target.value }))} placeholder="e.g. MTH" />
            </div>
            <div>
              <p className="text-sm font-semibold text-[var(--text-strong)] mb-2">Applies to levels</p>
              <div className="flex flex-wrap gap-2">
                {LEVELS.map((l) => (
                  <button
                    key={l.value}
                    type="button"
                    onClick={() => toggleLevel(l.value)}
                    className={`px-3 py-1.5 rounded-[8px] text-sm font-medium border transition-all ${
                      form.level.includes(l.value)
                        ? "bg-[var(--brand)] text-white border-[var(--brand)]"
                        : "bg-white text-[var(--text-muted)] border-[var(--border)] hover:border-[var(--ring)]"
                    }`}
                  >
                    {l.label}
                  </button>
                ))}
              </div>
            </div>
            {err && <p className="text-sm text-[var(--danger)]">{err}</p>}
            <div className="flex gap-2">
              <Button type="submit" size="sm" loading={saving}>Save subject</Button>
              <Button type="button" size="sm" variant="secondary" onClick={() => setShowForm(false)}>Cancel</Button>
            </div>
          </form>
        </Card>
      )}

      {subjects.length === 0 && !showForm && (
        <Card><p className="text-sm text-[var(--text-muted)] text-center py-4">No subjects yet. Add from common subjects above or create a custom one.</p></Card>
      )}

      {/* Edit subject modal */}
      <Modal open={!!editingSubject} onClose={() => setEditingSubject(null)} title="Edit subject">
        {editingSubject && (
          <form onSubmit={saveEdit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <Input label="Subject name" value={editForm.name} onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))} required />
              <Input label="Code (optional)" value={editForm.code} onChange={(e) => setEditForm((f) => ({ ...f, code: e.target.value }))} placeholder="e.g. MTH" />
            </div>
            <div>
              <p className="text-sm font-semibold text-[var(--text-strong)] mb-2">Applies to levels</p>
              <div className="flex flex-wrap gap-2">
                {LEVELS.map((l) => (
                  <button key={l.value} type="button"
                    onClick={() => setEditForm((f) => ({ ...f, level: f.level.includes(l.value) ? f.level.filter((x) => x !== l.value) : [...f.level, l.value] }))}
                    className={`px-3 py-1.5 rounded-[8px] text-sm font-medium border transition-all ${editForm.level.includes(l.value) ? "bg-[var(--brand)] text-white border-[var(--brand)]" : "bg-white text-[var(--text-muted)] border-[var(--border)] hover:border-[var(--ring)]"}`}>
                    {l.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex gap-2 justify-end pt-1">
              <Button type="button" variant="secondary" onClick={() => setEditingSubject(null)}>Cancel</Button>
              <Button type="submit" loading={savingEdit}>Save changes</Button>
            </div>
          </form>
        )}
      </Modal>

      {subjects.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {subjects.map((s) => (
            <div key={s.id} className="bg-white border border-[var(--border)] rounded-[12px] p-4 flex items-start gap-3 shadow-[var(--shadow-sm)]">
              <div className="w-9 h-9 rounded-xl bg-[var(--brand-subtle)] flex items-center justify-center shrink-0">
                <BookOpen size={16} className="text-[var(--brand)]" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-[var(--text-strong)]">{s.name}</p>
                <p className="text-xs text-[var(--text-muted)]">
                  {s.code ? `${s.code} · ` : ""}
                  {s.level?.length ? s.level.map((l) => LEVELS.find((x) => x.value === l)?.label ?? l).join(", ") : "All levels"}
                </p>
              </div>
              <div className="flex gap-2">
                <button onClick={() => openEdit(s)} className="text-[var(--text-subtle)] hover:text-[var(--brand)] transition-colors"><Pencil size={14} /></button>
                <button onClick={() => deleteSubject(s.id)} disabled={deleting === s.id} className="text-[var(--text-subtle)] hover:text-[var(--danger)] transition-colors"><Trash2 size={14} /></button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
