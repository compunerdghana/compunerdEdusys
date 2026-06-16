"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Plus, Trash2, BookOpen, Pencil, Sparkles } from "lucide-react";
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

  const missingGES = GH_SUBJECTS.filter((s) => !subjects.find((x) => x.name === s));

  return (
    <div className="space-y-6 max-w-2xl">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[22px] font-extrabold text-slate-800 leading-tight">Subjects</h1>
          <p className="text-[13px] text-slate-400 mt-0.5">Define subjects and which levels they apply to.</p>
        </div>
        <button
          onClick={() => setShowForm((v) => !v)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-[13px] font-bold text-white shadow-sm hover:opacity-90 transition-opacity"
          style={{ background: "linear-gradient(135deg, #262262, #92278F)" }}
        >
          <Plus size={15} /> Add Subject
        </button>
      </div>

      {/* Quick add from GH curriculum */}
      {missingGES.length > 0 && (
        <div className="bg-white rounded-2xl shadow-sm border border-[#e8e4f3] p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Sparkles size={14} className="text-[#92278F]" />
              <p className="text-[12px] font-bold uppercase tracking-[0.1em] text-slate-400">Common GES subjects</p>
            </div>
            <button onClick={selectAllGES}
              className="text-[12px] font-bold px-3 py-1.5 rounded-lg border border-[#6b1f8a]/40 text-[#6b1f8a] hover:bg-[#f0eeff] transition-all">
              Add All
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            {missingGES.map((s) => (
              <button
                key={s}
                onClick={() => quickAdd(s)}
                className="px-2.5 py-1 rounded-lg text-[12px] font-medium border border-[#e0daf0] text-slate-500 hover:border-[#6b1f8a] hover:text-[#6b1f8a] hover:bg-[#f0eeff] transition-all"
              >
                + {s}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* New subject form */}
      {showForm && (
        <div className="bg-white rounded-2xl shadow-sm border border-[#e8e4f3] p-6">
          <p className="text-[14px] font-bold text-slate-700 mb-5">New Subject</p>
          <form onSubmit={save} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <Input label="Subject name" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} required placeholder="e.g. Mathematics" />
              <Input label="Code (optional)" value={form.code} onChange={(e) => setForm((f) => ({ ...f, code: e.target.value }))} placeholder="e.g. MTH" />
            </div>
            <div>
              <p className="text-[13px] font-semibold text-slate-600 mb-2">Applies to levels</p>
              <div className="flex flex-wrap gap-2">
                {LEVELS.map((l) => (
                  <button
                    key={l.value}
                    type="button"
                    onClick={() => toggleLevel(l.value)}
                    className="px-3 py-1.5 rounded-xl text-[13px] font-semibold border transition-all"
                    style={form.level.includes(l.value)
                      ? { background: "linear-gradient(135deg, #262262, #92278F)", color: "#fff", borderColor: "transparent" }
                      : { background: "#fff", color: "#64748b", borderColor: "#e0daf0" }
                    }
                  >
                    {l.label}
                  </button>
                ))}
              </div>
            </div>
            {err && <p className="text-[13px] text-red-600 bg-red-50 px-3 py-2 rounded-xl border border-red-100">{err}</p>}
            <div className="flex gap-2 pt-1">
              <Button type="submit" size="sm" loading={saving}>Save subject</Button>
              <Button type="button" size="sm" variant="secondary" onClick={() => setShowForm(false)}>Cancel</Button>
            </div>
          </form>
        </div>
      )}

      {/* Empty state */}
      {subjects.length === 0 && !showForm && (
        <div className="bg-white rounded-2xl shadow-sm border border-[#e8e4f3] p-12 text-center">
          <div className="w-14 h-14 rounded-2xl bg-[#eef2ff] flex items-center justify-center mx-auto mb-4">
            <BookOpen size={24} className="text-[#262262]" />
          </div>
          <p className="text-[15px] font-bold text-slate-700 mb-1">No subjects yet</p>
          <p className="text-[13px] text-slate-400">Add from common subjects above or create a custom one.</p>
        </div>
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
              <p className="text-[13px] font-semibold text-slate-600 mb-2">Applies to levels</p>
              <div className="flex flex-wrap gap-2">
                {LEVELS.map((l) => (
                  <button key={l.value} type="button"
                    onClick={() => setEditForm((f) => ({ ...f, level: f.level.includes(l.value) ? f.level.filter((x) => x !== l.value) : [...f.level, l.value] }))}
                    className="px-3 py-1.5 rounded-xl text-[13px] font-semibold border transition-all"
                    style={editForm.level.includes(l.value)
                      ? { background: "linear-gradient(135deg, #262262, #92278F)", color: "#fff", borderColor: "transparent" }
                      : { background: "#fff", color: "#64748b", borderColor: "#e0daf0" }
                    }
                  >{l.label}</button>
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

      {/* Subjects grid */}
      {subjects.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {subjects.map((s) => (
            <div key={s.id}
              className="bg-white border border-[#e8e4f3] rounded-2xl p-4 flex items-start gap-3 shadow-sm hover:shadow-md hover:border-[#c4b5e8] transition-all">
              <div className="w-10 h-10 rounded-xl bg-[#eef2ff] flex items-center justify-center shrink-0">
                <BookOpen size={17} className="text-[#262262]" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[14px] font-bold text-slate-800">{s.name}</p>
                <p className="text-[12px] text-slate-400">
                  {s.code ? `${s.code} · ` : ""}
                  {s.level?.length ? s.level.map((l) => LEVELS.find((x) => x.value === l)?.label ?? l).join(", ") : "All levels"}
                </p>
              </div>
              <div className="flex gap-1 shrink-0">
                <button onClick={() => openEdit(s)}
                  className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-400 hover:text-[#6b1f8a] hover:bg-[#f0eeff] transition-all">
                  <Pencil size={13} />
                </button>
                <button onClick={() => deleteSubject(s.id)} disabled={deleting === s.id}
                  className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 transition-all disabled:opacity-50">
                  <Trash2 size={13} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
