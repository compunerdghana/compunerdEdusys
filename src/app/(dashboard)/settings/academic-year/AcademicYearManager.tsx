"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Plus, ChevronDown, ChevronUp, CheckCircle2, Circle } from "lucide-react";
import { cn } from "@/lib/utils";

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

  async function setCurrentTerm(id: string, yearId: string) {
    await supabase.from("terms").update({ is_current: false }).eq("academic_year_id", yearId);
    await supabase.from("terms").update({ is_current: true }).eq("id", id);
    setTerms((t) => t.map((tm) => ({ ...tm, is_current: tm.academic_year_id === yearId ? tm.id === id : tm.is_current })));
    router.refresh();
  }

  return (
    <div className="space-y-5 max-w-2xl">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-bold text-[var(--text-strong)]">Academic years & terms</h3>
          <p className="text-sm text-[var(--text-muted)]">Create academic years and set their three terms.</p>
        </div>
        <Button size="sm" onClick={() => setShowYearForm((v) => !v)}>
          <Plus size={14} /> New year
        </Button>
      </div>

      {/* New year form */}
      {showYearForm && (
        <Card>
          <p className="text-sm font-semibold text-[var(--text-strong)] mb-4">New academic year</p>
          <form onSubmit={saveYear} className="space-y-4">
            <Input label="Year name" placeholder="e.g. 2024/2025" value={yearForm.name} onChange={(e) => setYearForm((f) => ({ ...f, name: e.target.value }))} required />
            <div className="grid grid-cols-2 gap-4">
              <Input label="Start date" type="date" value={yearForm.start_date} onChange={(e) => setYearForm((f) => ({ ...f, start_date: e.target.value }))} required />
              <Input label="End date" type="date" value={yearForm.end_date} onChange={(e) => setYearForm((f) => ({ ...f, end_date: e.target.value }))} required />
            </div>
            {yearErr && <p className="text-sm text-[var(--danger)]">{yearErr}</p>}
            <div className="flex gap-2">
              <Button type="submit" size="sm" loading={savingYear}>Save year</Button>
              <Button type="button" size="sm" variant="secondary" onClick={() => setShowYearForm(false)}>Cancel</Button>
            </div>
          </form>
        </Card>
      )}

      {years.length === 0 && !showYearForm && (
        <Card>
          <p className="text-sm text-[var(--text-muted)] text-center py-4">No academic years yet. Create your first one above.</p>
        </Card>
      )}

      {/* Years list */}
      <div className="space-y-3">
        {years.map((year) => {
          const yearTerms = terms.filter((t) => t.academic_year_id === year.id);
          const isExpanded = expandedYear === year.id;

          return (
            <Card key={year.id} className={cn(year.is_current && "border-[var(--border-brand)]")}>
              {/* Year header */}
              <div className="flex items-center gap-3">
                <button onClick={() => setExpandedYear(isExpanded ? null : year.id)} className="flex-1 flex items-center gap-3 text-left">
                  {year.is_current
                    ? <CheckCircle2 size={16} className="text-[var(--success)] shrink-0" />
                    : <Circle size={16} className="text-[var(--neutral-300)] shrink-0" />
                  }
                  <div className="flex-1">
                    <p className="text-sm font-bold text-[var(--text-strong)]">{year.name}</p>
                    <p className="text-xs text-[var(--text-muted)]">{year.start_date} → {year.end_date} · {yearTerms.length}/3 terms</p>
                  </div>
                  {year.is_current && <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[var(--success-bg)] text-[var(--success)]">Current</span>}
                  {isExpanded ? <ChevronUp size={15} className="text-[var(--text-muted)]" /> : <ChevronDown size={15} className="text-[var(--text-muted)]" />}
                </button>
                {!year.is_current && (
                  <Button size="sm" variant="secondary" onClick={() => setCurrentYear(year.id)}>Set current</Button>
                )}
              </div>

              {/* Terms */}
              {isExpanded && (
                <div className="mt-4 pt-4 border-t border-[var(--border)] space-y-3">
                  {yearTerms.map((t) => (
                    <div key={t.id} className="flex items-center gap-3 px-3 py-2.5 rounded-[10px] bg-[var(--neutral-50)]">
                      {t.is_current
                        ? <CheckCircle2 size={14} className="text-[var(--success)] shrink-0" />
                        : <Circle size={14} className="text-[var(--neutral-300)] shrink-0" />
                      }
                      <div className="flex-1">
                        <p className="text-sm font-semibold text-[var(--text-strong)]">{t.name}</p>
                        <p className="text-xs text-[var(--text-muted)]">{t.start_date} → {t.end_date}{t.reopening_date ? ` · Reopens ${t.reopening_date}` : ""}</p>
                      </div>
                      {t.is_current && <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[var(--success-bg)] text-[var(--success)]">Current</span>}
                      {!t.is_current && (
                        <Button size="sm" variant="secondary" onClick={() => setCurrentTerm(t.id, year.id)}>Set current</Button>
                      )}
                    </div>
                  ))}

                  {yearTerms.length < 3 && showTermForm !== year.id && (
                    <Button size="sm" variant="secondary" onClick={() => setShowTermForm(year.id)}>
                      <Plus size={13} /> Add term
                    </Button>
                  )}

                  {showTermForm === year.id && (
                    <form onSubmit={(e) => saveTerm(e, year.id)} className="space-y-3 mt-2">
                      <div className="grid grid-cols-3 gap-3">
                        {TERM_OPTIONS.filter((o) => !yearTerms.find((t) => t.term === o.value)).map((o) => (
                          <button
                            key={o.value}
                            type="button"
                            onClick={() => setTermForm((f) => ({ ...f, term: o.value, name: o.label }))}
                            className={cn(
                              "px-3 py-2 rounded-[8px] text-sm font-medium border transition-all",
                              termForm.term === o.value
                                ? "bg-[var(--brand)] text-white border-[var(--brand)]"
                                : "bg-white text-[var(--text-muted)] border-[var(--border)] hover:border-[var(--ring)]",
                            )}
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
                      {termErr && <p className="text-sm text-[var(--danger)]">{termErr}</p>}
                      <div className="flex gap-2">
                        <Button type="submit" size="sm" loading={savingTerm}>Save term</Button>
                        <Button type="button" size="sm" variant="secondary" onClick={() => setShowTermForm(null)}>Cancel</Button>
                      </div>
                    </form>
                  )}
                </div>
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
}
