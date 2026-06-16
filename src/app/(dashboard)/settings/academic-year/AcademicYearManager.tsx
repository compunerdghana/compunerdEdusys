"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Plus, ChevronDown, ChevronUp, CheckCircle2, Circle, Pencil, CalendarDays } from "lucide-react";
import { cn } from "@/lib/utils";
import { Modal } from "@/components/ui/Modal";

interface AcademicYear {
  id: string;
  name: string;
  start_date: string;
  end_date: string;
  is_current: boolean;
}

interface Term {
  id: string;
  academic_year_id: string;
  term: string;
  name: string;
  start_date: string;
  end_date: string;
  reopening_date: string | null;
  is_current: boolean;
}

interface Props {
  schoolId: string;
  years: AcademicYear[];
  terms: Term[];
}

const TERM_OPTIONS = [
  { value: "term1", label: "Term 1" },
  { value: "term2", label: "Term 2" },
  { value: "term3", label: "Term 3" },
];

export function AcademicYearManager({ schoolId, years: initial, terms: initialTerms }: Props) {
  const router = useRouter();
  const supabase = createClient();

  const [years, setYears] = useState(initial);
  const [terms, setTerms] = useState(initialTerms);
  const [expandedYear, setExpandedYear] = useState<string | null>(initial.find((y) => y.is_current)?.id ?? null);

  // New year form
  const [showYearForm, setShowYearForm] = useState(false);
  const [yearForm, setYearForm] = useState({ name: "", start_date: "", end_date: "" });
  const [savingYear, setSavingYear] = useState(false);
  const [yearErr, setYearErr] = useState<string | null>(null);

  // New term form
  const [showTermForm, setShowTermForm] = useState<string | null>(null);
  const [termForm, setTermForm] = useState({ term: "term1", name: "Term 1", start_date: "", end_date: "", reopening_date: "" });
  const [savingTerm, setSavingTerm] = useState(false);
  const [termErr, setTermErr] = useState<string | null>(null);

  // Edit term
  const [editingTerm, setEditingTerm] = useState<Term | null>(null);
  const [editTermForm, setEditTermForm] = useState({ name: "", start_date: "", end_date: "", reopening_date: "" });
  const [savingEditTerm, setSavingEditTerm] = useState(false);

  async function saveYear(e: React.FormEvent) {
    e.preventDefault();
    setYearErr(null);
    setSavingYear(true);
    const { data, error } = await supabase
      .from("academic_years")
      .insert({ school_id: schoolId, ...yearForm, is_current: years.length === 0 })
      .select()
      .single();
    setSavingYear(false);
    if (error) { setYearErr(error.message); return; }
    setYears((y) => [data, ...y]);
    setExpandedYear(data.id);
    setShowYearForm(false);
    setYearForm({ name: "", start_date: "", end_date: "" });
    router.refresh();
  }

  async function setCurrentYear(id: string) {
    await supabase.from("academic_years").update({ is_current: false }).eq("school_id", schoolId);
    await supabase.from("academic_years").update({ is_current: true }).eq("id", id);
    setYears((y) => y.map((yr) => ({ ...yr, is_current: yr.id === id })));
    router.refresh();
  }

  async function saveTerm(e: React.FormEvent, yearId: string) {
    e.preventDefault();
    setTermErr(null);
    setSavingTerm(true);
    const { data, error } = await supabase
      .from("terms")
      .insert({
        school_id: schoolId,
        academic_year_id: yearId,
        term: termForm.term,
        name: termForm.name,
        start_date: termForm.start_date,
        end_date: termForm.end_date,
        reopening_date: termForm.reopening_date || null,
        is_current: terms.filter((t) => t.academic_year_id === yearId).length === 0,
      })
      .select()
      .single();
    setSavingTerm(false);
    if (error) { setTermErr(error.message); return; }
    setTerms((t) => [...t, data]);
    setShowTermForm(null);
    setTermForm({ term: "term1", name: "Term 1", start_date: "", end_date: "", reopening_date: "" });
    router.refresh();
  }

  function openEditTerm(t: Term) {
    setEditingTerm(t);
    setEditTermForm({ name: t.name, start_date: t.start_date, end_date: t.end_date, reopening_date: t.reopening_date ?? "" });
  }

  async function saveEditTerm(e: React.FormEvent) {
    e.preventDefault();
    if (!editingTerm) return;
    setSavingEditTerm(true);
    const { data, error } = await supabase.from("terms").update({
      name: editTermForm.name,
      start_date: editTermForm.start_date,
      end_date: editTermForm.end_date,
      reopening_date: editTermForm.reopening_date || null,
    }).eq("id", editingTerm.id).select().single();
    setSavingEditTerm(false);
    if (error) return;
    setTerms((t) => t.map((x) => x.id === editingTerm.id ? data : x));
    setEditingTerm(null);
    router.refresh();
  }

  async function setCurrentTerm(id: string, yearId: string) {
    await supabase.from("terms").update({ is_current: false }).eq("academic_year_id", yearId);
    await supabase.from("terms").update({ is_current: true }).eq("id", id);
    setTerms((t) => t.map((tm) => ({ ...tm, is_current: tm.academic_year_id === yearId ? tm.id === id : tm.is_current })));
    router.refresh();
  }

  return (
    <div className="space-y-6 max-w-2xl">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[22px] font-extrabold text-slate-800 leading-tight">Academic Years &amp; Terms</h1>
          <p className="text-[13px] text-slate-400 mt-0.5">Create academic years and configure their three terms.</p>
        </div>
        <button
          onClick={() => setShowYearForm((v) => !v)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-[13px] font-bold text-white shadow-sm hover:opacity-90 transition-opacity"
          style={{ background: "linear-gradient(135deg, #262262, #92278F)" }}
        >
          <Plus size={15} /> New Year
        </button>
      </div>

      {/* New year form */}
      {showYearForm && (
        <div className="bg-white rounded-2xl shadow-sm border border-[#e8e4f3] p-6">
          <p className="text-[14px] font-bold text-slate-700 mb-5">New Academic Year</p>
          <form onSubmit={saveYear} className="space-y-4">
            <Input label="Year name" placeholder="e.g. 2024/2025" value={yearForm.name} onChange={(e) => setYearForm((f) => ({ ...f, name: e.target.value }))} required />
            <div className="grid grid-cols-2 gap-4">
              <Input label="Start date" type="date" value={yearForm.start_date} onChange={(e) => setYearForm((f) => ({ ...f, start_date: e.target.value }))} required />
              <Input label="End date" type="date" value={yearForm.end_date} onChange={(e) => setYearForm((f) => ({ ...f, end_date: e.target.value }))} required />
            </div>
            {yearErr && <p className="text-[13px] text-red-600 bg-red-50 px-3 py-2 rounded-xl border border-red-100">{yearErr}</p>}
            <div className="flex gap-2 pt-1">
              <Button type="submit" size="sm" loading={savingYear}>Save year</Button>
              <Button type="button" size="sm" variant="secondary" onClick={() => setShowYearForm(false)}>Cancel</Button>
            </div>
          </form>
        </div>
      )}

      {/* Empty state */}
      {years.length === 0 && !showYearForm && (
        <div className="bg-white rounded-2xl shadow-sm border border-[#e8e4f3] p-12 text-center">
          <div className="w-14 h-14 rounded-2xl bg-[#f0eeff] flex items-center justify-center mx-auto mb-4">
            <CalendarDays size={24} className="text-[#6b1f8a]" />
          </div>
          <p className="text-[15px] font-bold text-slate-700 mb-1">No academic years yet</p>
          <p className="text-[13px] text-slate-400">Create your first academic year to get started.</p>
          <button
            onClick={() => setShowYearForm(true)}
            className="mt-5 flex items-center gap-2 px-4 py-2.5 rounded-xl text-[13px] font-bold text-white mx-auto hover:opacity-90 transition-opacity"
            style={{ background: "linear-gradient(135deg, #262262, #92278F)" }}
          >
            <Plus size={14} /> Create Year
          </button>
        </div>
      )}

      {/* Edit term modal */}
      <Modal open={!!editingTerm} onClose={() => setEditingTerm(null)} title="Edit term">
        {editingTerm && (
          <form onSubmit={saveEditTerm} className="space-y-4">
            <Input label="Term name" value={editTermForm.name} onChange={(e) => setEditTermForm((f) => ({ ...f, name: e.target.value }))} required />
            <div className="grid grid-cols-2 gap-3">
              <Input label="Start date" type="date" value={editTermForm.start_date} onChange={(e) => setEditTermForm((f) => ({ ...f, start_date: e.target.value }))} required />
              <Input label="End date" type="date" value={editTermForm.end_date} onChange={(e) => setEditTermForm((f) => ({ ...f, end_date: e.target.value }))} required />
            </div>
            <Input label="Reopening date (optional)" type="date" value={editTermForm.reopening_date} onChange={(e) => setEditTermForm((f) => ({ ...f, reopening_date: e.target.value }))} />
            <div className="flex gap-2 justify-end pt-1">
              <Button type="button" variant="secondary" onClick={() => setEditingTerm(null)}>Cancel</Button>
              <Button type="submit" loading={savingEditTerm}>Save changes</Button>
            </div>
          </form>
        )}
      </Modal>

      {/* Years list */}
      <div className="space-y-3">
        {years.map((year) => {
          const yearTerms = terms.filter((t) => t.academic_year_id === year.id);
          const isExpanded = expandedYear === year.id;

          return (
            <div key={year.id}
              className={cn(
                "bg-white rounded-2xl shadow-sm border overflow-hidden",
                year.is_current ? "border-[#6b1f8a]/40 border-l-4 border-l-[#6b1f8a]" : "border-[#e8e4f3]",
              )}>
              {/* Year header */}
              <div className="flex items-center gap-3 px-5 py-4">
                <button onClick={() => setExpandedYear(isExpanded ? null : year.id)} className="flex-1 flex items-center gap-3 text-left">
                  {year.is_current
                    ? <CheckCircle2 size={17} className="text-emerald-500 shrink-0" />
                    : <Circle size={17} className="text-slate-300 shrink-0" />
                  }
                  <div className="flex-1 min-w-0">
                    <p className="text-[15px] font-bold text-slate-800 leading-tight">{year.name}</p>
                    <p className="text-[12px] text-slate-400 mt-0.5">{year.start_date} → {year.end_date} · {yearTerms.length}/3 terms</p>
                  </div>
                  {year.is_current && (
                    <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-200 shrink-0">
                      Current
                    </span>
                  )}
                  {isExpanded ? <ChevronUp size={15} className="text-slate-400 shrink-0" /> : <ChevronDown size={15} className="text-slate-400 shrink-0" />}
                </button>
                {!year.is_current && (
                  <Button size="sm" variant="secondary" onClick={() => setCurrentYear(year.id)}>Set current</Button>
                )}
              </div>

              {/* Terms section */}
              {isExpanded && (
                <div className="border-t border-[#e8e4f3] px-5 py-4 space-y-2.5 bg-[#faf9ff]">
                  {yearTerms.map((t) => (
                    <div key={t.id}
                      className={cn(
                        "flex items-center gap-3 px-4 py-3 rounded-xl border",
                        t.is_current ? "bg-white border-[#6b1f8a]/30" : "bg-white border-[#e8e4f3]",
                      )}>
                      {t.is_current
                        ? <CheckCircle2 size={14} className="text-emerald-500 shrink-0" />
                        : <Circle size={14} className="text-slate-300 shrink-0" />
                      }
                      <div className="flex-1 min-w-0">
                        <p className="text-[13px] font-semibold text-slate-700">{t.name}</p>
                        <p className="text-[11px] text-slate-400">
                          {t.start_date} → {t.end_date}{t.reopening_date ? ` · Reopens ${t.reopening_date}` : ""}
                        </p>
                      </div>
                      {t.is_current && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-200 shrink-0">
                          Current
                        </span>
                      )}
                      <button onClick={() => openEditTerm(t)}
                        className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-400 hover:text-[#6b1f8a] hover:bg-[#f0eeff] transition-all">
                        <Pencil size={12} />
                      </button>
                      {!t.is_current && (
                        <Button size="sm" variant="secondary" onClick={() => setCurrentTerm(t.id, year.id)}>Set current</Button>
                      )}
                    </div>
                  ))}

                  {yearTerms.length < 3 && showTermForm !== year.id && (
                    <button
                      onClick={() => setShowTermForm(year.id)}
                      className="flex items-center gap-2 px-4 py-2.5 text-[13px] font-semibold text-[#6b1f8a] hover:bg-[#f0eeff] rounded-xl transition-colors w-full border border-dashed border-[#c4b5e8]"
                    >
                      <Plus size={14} /> Add term
                    </button>
                  )}

                  {showTermForm === year.id && (
                    <form onSubmit={(e) => saveTerm(e, year.id)} className="space-y-3 mt-2 bg-white rounded-xl border border-[#e8e4f3] p-4">
                      <p className="text-[13px] font-bold text-slate-700">New Term</p>
                      <div className="grid grid-cols-3 gap-2">
                        {TERM_OPTIONS.filter((o) => !yearTerms.find((t) => t.term === o.value)).map((o) => (
                          <button
                            key={o.value}
                            type="button"
                            onClick={() => setTermForm((f) => ({ ...f, term: o.value, name: o.label }))}
                            className={cn(
                              "px-3 py-2 rounded-xl text-[13px] font-semibold border transition-all",
                              termForm.term === o.value
                                ? "text-white border-transparent"
                                : "bg-white text-slate-500 border-[#e0daf0] hover:border-[#6b1f8a]",
                            )}
                            style={termForm.term === o.value ? { background: "linear-gradient(135deg, #262262, #92278F)" } : {}}
                          >
                            {o.label}
                          </button>
                        ))}
                      </div>
                      <Input label="Term name" value={termForm.name} onChange={(e) => setTermForm((f) => ({ ...f, name: e.target.value }))} required placeholder="e.g. First Term" />
                      <div className="grid grid-cols-2 gap-3">
                        <Input label="Start date" type="date" value={termForm.start_date} onChange={(e) => setTermForm((f) => ({ ...f, start_date: e.target.value }))} required />
                        <Input label="End date" type="date" value={termForm.end_date} onChange={(e) => setTermForm((f) => ({ ...f, end_date: e.target.value }))} required />
                      </div>
                      <Input label="Reopening date (optional)" type="date" value={termForm.reopening_date} onChange={(e) => setTermForm((f) => ({ ...f, reopening_date: e.target.value }))} />
                      {termErr && <p className="text-[13px] text-red-600 bg-red-50 px-3 py-2 rounded-xl border border-red-100">{termErr}</p>}
                      <div className="flex gap-2">
                        <Button type="submit" size="sm" loading={savingTerm}>Save term</Button>
                        <Button type="button" size="sm" variant="secondary" onClick={() => setShowTermForm(null)}>Cancel</Button>
                      </div>
                    </form>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
