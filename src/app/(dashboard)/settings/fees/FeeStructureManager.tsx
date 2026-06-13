"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Plus, Trash2, DollarSign, CheckCircle2, Circle } from "lucide-react";
import { formatCurrency } from "@/lib/utils";

const LEVELS = [
  { value: "daycare", label: "Day Care" },
  { value: "nursery", label: "Nursery" },
  { value: "kg", label: "KG" },
  { value: "primary", label: "Primary" },
  { value: "jhs", label: "JHS" },
];

interface FeeType {
  id: string;
  name: string;
  amount: number;
  term_id: string | null;
  level: string[] | null;
  is_mandatory: boolean;
  term?: { name: string } | null;
}

interface Term {
  id: string;
  name: string;
  academic_year_id: string;
  academic_years: { name: string } | { name: string }[] | null;
}

interface Props {
  schoolId: string;
  feeTypes: FeeType[];
  terms: Term[];
}

export function FeeStructureManager({ schoolId, feeTypes: initial, terms }: Props) {
  const router = useRouter();
  const supabase = createClient();
  const [fees, setFees] = useState(initial);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    name: "", amount: "", term_id: "", level: [] as string[], is_mandatory: true,
  });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);

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
      .from("fee_types")
      .insert({
        school_id: schoolId,
        name: form.name.trim(),
        amount: parseFloat(form.amount),
        term_id: form.term_id || null,
        level: form.level.length ? form.level : null,
        is_mandatory: form.is_mandatory,
      })
      .select("*, term:terms(name)")
      .single();
    setSaving(false);
    if (error) { setErr(error.message); return; }
    setFees((f) => [...f, data]);
    setShowForm(false);
    setForm({ name: "", amount: "", term_id: "", level: [], is_mandatory: true });
    router.refresh();
  }

  async function deleteFee(id: string) {
    setDeleting(id);
    await supabase.from("fee_types").delete().eq("id", id);
    setFees((f) => f.filter((x) => x.id !== id));
    setDeleting(null);
  }

  const total = fees.reduce((s, f) => s + f.amount, 0);

  return (
    <div className="space-y-5 max-w-2xl">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-bold text-[var(--text-strong)]">Fee structure</h3>
          <p className="text-sm text-[var(--text-muted)]">Define fee types and amounts per term or year.</p>
        </div>
        <Button size="sm" onClick={() => setShowForm((v) => !v)}>
          <Plus size={14} /> Add fee type
        </Button>
      </div>

      {/* Summary */}
      {fees.length > 0 && (
        <div className="flex gap-4">
          <div className="bg-white border border-[var(--border)] rounded-[12px] px-5 py-3 shadow-[var(--shadow-sm)] flex-1">
            <p className="text-xs text-[var(--text-muted)] uppercase tracking-[0.08em] mb-0.5">Total fee types</p>
            <p className="text-2xl font-extrabold font-mono text-[var(--text-strong)]">{fees.length}</p>
          </div>
          <div className="bg-white border border-[var(--border)] rounded-[12px] px-5 py-3 shadow-[var(--shadow-sm)] flex-1">
            <p className="text-xs text-[var(--text-muted)] uppercase tracking-[0.08em] mb-0.5">Total per student</p>
            <p className="text-2xl font-extrabold font-mono text-[var(--success)]">{formatCurrency(total)}</p>
          </div>
        </div>
      )}

      {showForm && (
        <Card>
          <p className="text-sm font-semibold text-[var(--text-strong)] mb-4">New fee type</p>
          <form onSubmit={save} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <Input label="Fee name" placeholder="e.g. School fees, PTA levy" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} required />
              <Input label={`Amount (GH₵)`} type="number" min="0" step="0.01" placeholder="0.00" value={form.amount} onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))} required />
            </div>

            {/* Term selector */}
            <div>
              <p className="text-sm font-semibold text-[var(--text-strong)] mb-2">Term (leave blank for all terms)</p>
              <select
                value={form.term_id}
                onChange={(e) => setForm((f) => ({ ...f, term_id: e.target.value }))}
                className="h-10 w-full rounded-[10px] border border-[var(--border)] bg-white px-3 text-sm text-[var(--text-strong)] outline-none focus:border-[var(--ring)]"
              >
                <option value="">All terms</option>
                {terms.map((t) => (
                  <option key={t.id} value={t.id}>
                    {Array.isArray(t.academic_years) ? t.academic_years[0]?.name : t.academic_years?.name} — {t.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Level selector */}
            <div>
              <p className="text-sm font-semibold text-[var(--text-strong)] mb-2">Applies to levels (leave empty for all)</p>
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

            {/* Mandatory toggle */}
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setForm((f) => ({ ...f, is_mandatory: !f.is_mandatory }))}
                className="flex items-center gap-2 text-sm font-medium text-[var(--text-body)]"
              >
                {form.is_mandatory
                  ? <CheckCircle2 size={18} className="text-[var(--success)]" />
                  : <Circle size={18} className="text-[var(--neutral-300)]" />
                }
                Mandatory fee
              </button>
              <span className="text-xs text-[var(--text-muted)]">(optional fees can be waived per student)</span>
            </div>

            {err && <p className="text-sm text-[var(--danger)]">{err}</p>}
            <div className="flex gap-2">
              <Button type="submit" size="sm" loading={saving}>Save fee type</Button>
              <Button type="button" size="sm" variant="secondary" onClick={() => setShowForm(false)}>Cancel</Button>
            </div>
          </form>
        </Card>
      )}

      {fees.length === 0 && !showForm && (
        <Card><p className="text-sm text-[var(--text-muted)] text-center py-4">No fee types yet. Add your first one above.</p></Card>
      )}

      {fees.length > 0 && (
        <div className="space-y-2">
          {fees.map((fee) => (
            <div key={fee.id} className="bg-white border border-[var(--border)] rounded-[12px] px-4 py-3 flex items-center gap-3 shadow-[var(--shadow-sm)]">
              <div className="w-9 h-9 rounded-xl bg-[var(--success-bg)] flex items-center justify-center shrink-0">
                <DollarSign size={16} className="text-[var(--success)]" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-bold text-[var(--text-strong)]">{fee.name}</p>
                  {!fee.is_mandatory && (
                    <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-[var(--neutral-100)] text-[var(--text-muted)]">Optional</span>
                  )}
                </div>
                <p className="text-xs text-[var(--text-muted)]">
                  {fee.term?.name ?? "All terms"}
                  {fee.level?.length ? ` · ${fee.level.map((l) => LEVELS.find((x) => x.value === l)?.label ?? l).join(", ")}` : " · All levels"}
                </p>
              </div>
              <p className="text-sm font-extrabold font-mono text-[var(--success)] shrink-0">{formatCurrency(fee.amount)}</p>
              <button onClick={() => deleteFee(fee.id)} disabled={deleting === fee.id} className="text-[var(--text-subtle)] hover:text-[var(--danger)] transition-colors ml-1">
                <Trash2 size={14} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
