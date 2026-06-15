"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Plus, Trash2, DollarSign, CheckCircle2, Circle, Pencil, Layers, ChevronDown, ChevronRight, Play, AlertCircle } from "lucide-react";
import { ConfirmModal } from "@/components/ui/ConfirmModal";
import { Modal } from "@/components/ui/Modal";
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

interface FeeStructureItem {
  id: string; name: string; amount: number; is_mandatory: boolean; sort_order: number;
}
interface FeeStructure {
  id: string; name: string; level: string | null; class_id: string | null;
  term_id: string | null; is_active: boolean; items: FeeStructureItem[];
}
interface ClassRow { id: string; name: string; level: string; }

interface Props {
  schoolId: string;
  feeTypes: FeeType[];
  terms: Term[];
  classes: ClassRow[];
  structures: FeeStructure[];
}

export function FeeStructureManager({ schoolId, feeTypes: initial, terms, classes, structures: initialStructures }: Props) {
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
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [editingFee, setEditingFee] = useState<FeeType | null>(null);
  const [editForm, setEditForm] = useState({ name: "", amount: "", term_id: "", level: [] as string[], is_mandatory: true });
  const [savingEdit, setSavingEdit] = useState(false);
  const [autoBilling, setAutoBilling] = useState(() => {
    if (typeof window !== "undefined") return localStorage.getItem(`auto_billing_${schoolId}`) !== "false";
    return true;
  });
  const [togglingBilling, setTogglingBilling] = useState(false);

  function handleAutoBillingToggle() {
    const next = !autoBilling;
    setTogglingBilling(true);
    setAutoBilling(next);
    localStorage.setItem(`auto_billing_${schoolId}`, String(next));
    setTimeout(() => setTogglingBilling(false), 400);
  }

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
    setConfirmDelete(null);
  }

  function openEdit(fee: FeeType) {
    setEditingFee(fee);
    setEditForm({ name: fee.name, amount: fee.amount.toString(), term_id: fee.term_id ?? "", level: fee.level ?? [], is_mandatory: fee.is_mandatory });
  }

  function toggleEditLevel(v: string) {
    setEditForm((f) => ({ ...f, level: f.level.includes(v) ? f.level.filter((l) => l !== v) : [...f.level, v] }));
  }

  async function saveEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editingFee) return;
    setSavingEdit(true);
    const { data, error } = await supabase.from("fee_types").update({
      name: editForm.name.trim(), amount: parseFloat(editForm.amount),
      term_id: editForm.term_id || null, level: editForm.level.length ? editForm.level : null,
      is_mandatory: editForm.is_mandatory,
    }).eq("id", editingFee.id).select("*, term:terms(name)").single();
    setSavingEdit(false);
    if (error) return;
    setFees((f) => f.map((x) => x.id === editingFee.id ? data : x));
    setEditingFee(null);
    router.refresh();
  }

  const total = fees.reduce((s, f) => s + f.amount, 0);

  // ── ERP Fee Structures ───────────────────────────────────────────
  const [structures, setStructures]     = useState(initialStructures);
  const [showStructForm, setShowStructForm] = useState(false);
  const [expandedStruct, setExpandedStruct] = useState<string | null>(null);
  const [structForm, setStructForm]     = useState({
    name: "", class_id: "", level: "", term_id: "", is_active: true,
    items: [{ name: "School Fees", amount: "0", is_mandatory: true }] as { name:string; amount:string; is_mandatory:boolean }[],
  });
  const [savingStruct, setSavingStruct] = useState(false);
  const [structErr, setStructErr]       = useState<string | null>(null);
  const [runningBilling, setRunningBilling] = useState(false);
  const [billingMsg, setBillingMsg]     = useState<string | null>(null);

  function addItem() {
    setStructForm(f => ({ ...f, items: [...f.items, { name: "", amount: "0", is_mandatory: true }] }));
  }
  function removeItem(i: number) {
    setStructForm(f => ({ ...f, items: f.items.filter((_, idx) => idx !== i) }));
  }
  function updateItem(i: number, key: string, val: string | boolean) {
    setStructForm(f => ({ ...f, items: f.items.map((item, idx) => idx === i ? { ...item, [key]: val } : item) }));
  }

  async function saveStructure(e: React.FormEvent) {
    e.preventDefault();
    setSavingStruct(true); setStructErr(null);
    const { data: struct, error } = await supabase.from("fee_structures").insert({
      school_id: schoolId,
      name: structForm.name.trim(),
      class_id: structForm.class_id || null,
      level: structForm.level || null,
      term_id: structForm.term_id || null,
      is_active: structForm.is_active,
    }).select("*").single();
    if (error) { setSavingStruct(false); setStructErr(error.message); return; }
    // Insert items
    const itemRows = structForm.items.filter(i => i.name.trim()).map((item, idx) => ({
      fee_structure_id: struct.id,
      school_id: schoolId,
      name: item.name.trim(),
      amount: parseFloat(item.amount) || 0,
      is_mandatory: item.is_mandatory,
      sort_order: idx,
    }));
    const { data: savedItems } = await supabase.from("fee_structure_items").insert(itemRows).select();
    setStructures(s => [{ ...struct, items: savedItems ?? [] }, ...s]);
    setShowStructForm(false);
    setStructForm({ name:"", class_id:"", level:"", term_id:"", is_active:true, items:[{ name:"School Fees", amount:"0", is_mandatory:true }] });
    setSavingStruct(false);
    router.refresh();
  }

  async function runTermBilling() {
    setRunningBilling(true); setBillingMsg(null);
    const res = await fetch("/api/billing/term-billing", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ school_id: schoolId }),
    });
    const data = await res.json();
    setRunningBilling(false);
    setBillingMsg(`Done: ${data.processed} invoices generated, ${data.skipped} already billed.`);
  }

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
              <button onClick={() => openEdit(fee)} className="text-[var(--text-subtle)] hover:text-[var(--brand)] transition-colors ml-1"><Pencil size={14} /></button>
              <button onClick={() => setConfirmDelete(fee.id)} className="text-[var(--text-subtle)] hover:text-[var(--danger)] transition-colors ml-1"><Trash2 size={14} /></button>
            </div>
          ))}
        </div>
      )}

      {/* Edit fee modal */}
      <Modal open={!!editingFee} onClose={() => setEditingFee(null)} title="Edit fee type">
        {editingFee && (
          <form onSubmit={saveEdit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <Input label="Fee name" value={editForm.name} onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))} required />
              <Input label="Amount (GH₵)" type="number" min="0" step="0.01" value={editForm.amount} onChange={(e) => setEditForm((f) => ({ ...f, amount: e.target.value }))} required />
            </div>
            <div>
              <p className="text-sm font-semibold text-[var(--text-strong)] mb-2">Term</p>
              <select value={editForm.term_id} onChange={(e) => setEditForm((f) => ({ ...f, term_id: e.target.value }))}
                className="h-10 w-full rounded-[10px] border border-[var(--border)] bg-white px-3 text-sm text-[var(--text-strong)] outline-none focus:border-[var(--ring)]">
                <option value="">All terms</option>
                {terms.map((t) => (
                  <option key={t.id} value={t.id}>
                    {Array.isArray(t.academic_years) ? t.academic_years[0]?.name : t.academic_years?.name} — {t.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <p className="text-sm font-semibold text-[var(--text-strong)] mb-2">Applies to levels</p>
              <div className="flex flex-wrap gap-2">
                {LEVELS.map((l) => (
                  <button key={l.value} type="button" onClick={() => toggleEditLevel(l.value)}
                    className={`px-3 py-1.5 rounded-[8px] text-sm font-medium border transition-all ${editForm.level.includes(l.value) ? "bg-[var(--brand)] text-white border-[var(--brand)]" : "bg-white text-[var(--text-muted)] border-[var(--border)] hover:border-[var(--ring)]"}`}>
                    {l.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button type="button" onClick={() => setEditForm((f) => ({ ...f, is_mandatory: !f.is_mandatory }))}
                className="flex items-center gap-2 text-sm font-medium text-[var(--text-body)]">
                {editForm.is_mandatory ? <CheckCircle2 size={18} className="text-[var(--success)]" /> : <Circle size={18} className="text-[var(--neutral-300)]" />}
                Mandatory fee
              </button>
            </div>
            <div className="flex gap-2 justify-end pt-1">
              <Button type="button" variant="secondary" onClick={() => setEditingFee(null)}>Cancel</Button>
              <Button type="submit" loading={savingEdit}>Save changes</Button>
            </div>
          </form>
        )}
      </Modal>

      <ConfirmModal
        open={!!confirmDelete}
        title="Delete fee type?"
        message="This fee type will be permanently removed. Existing payment records will not be affected."
        confirmLabel="Delete"
        danger
        loading={!!deleting}
        onConfirm={() => confirmDelete && deleteFee(confirmDelete)}
        onCancel={() => setConfirmDelete(null)}
      />

      {/* ── ERP Fee Structures ──────────────────────────────────── */}
      <div className="border-t border-[var(--border)] pt-6 mt-6">
        {/* Auto-billing toggle */}
        <div className="flex items-center justify-between p-4 rounded-2xl border border-[var(--border)] bg-[var(--neutral-50)] mb-5">
          <div>
            <p className="text-[14px] font-bold text-[var(--text-strong)]">Auto-Billing</p>
            <p className="text-[12px] text-[var(--text-muted)] mt-0.5">
              Automatically generate invoices when a student is enrolled or a new term begins
            </p>
          </div>
          <button
            type="button"
            onClick={handleAutoBillingToggle}
            disabled={togglingBilling}
            className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors shrink-0 ml-4 ${autoBilling ? "bg-[#262262]" : "bg-[var(--border)]"}`}
          >
            <span className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-md transition-transform ${autoBilling ? "translate-x-6" : "translate-x-1"}`} />
          </button>
        </div>

        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-base font-bold text-[var(--text-strong)] flex items-center gap-2">
              <Layers size={16} /> Fee Structures
            </h3>
            <p className="text-sm text-[var(--text-muted)]">Define fee packages per class. Students are billed on admission.</p>
          </div>
          <div className="flex gap-2">
            <Button size="sm" variant="secondary" loading={runningBilling} onClick={runTermBilling}>
              <Play size={13} /> Run Term Billing
            </Button>
            <Button size="sm" onClick={() => setShowStructForm(v => !v)}>
              <Plus size={14} /> New Structure
            </Button>
          </div>
        </div>

        {billingMsg && (
          <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm mb-4">
            <CheckCircle2 size={14} /> {billingMsg}
          </div>
        )}

        {showStructForm && (
          <Card>
            <p className="text-sm font-semibold text-[var(--text-strong)] mb-4">New Fee Structure</p>
            <form onSubmit={saveStructure} className="space-y-4">
              <Input label="Structure Name *" value={structForm.name}
                onChange={e => setStructForm(f => ({ ...f, name: e.target.value }))}
                placeholder="e.g. Basic 1 — Term 1 2025/26" required />
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-semibold text-[var(--text-strong)] block mb-1.5">Class (specific)</label>
                  <select value={structForm.class_id}
                    onChange={e => setStructForm(f => ({ ...f, class_id: e.target.value }))}
                    className="h-10 w-full rounded-[10px] border border-[var(--border)] bg-white px-3 text-sm text-[var(--text-strong)] outline-none focus:border-[var(--ring)]">
                    <option value="">All classes in level</option>
                    {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-sm font-semibold text-[var(--text-strong)] block mb-1.5">Level (fallback)</label>
                  <select value={structForm.level}
                    onChange={e => setStructForm(f => ({ ...f, level: e.target.value }))}
                    className="h-10 w-full rounded-[10px] border border-[var(--border)] bg-white px-3 text-sm text-[var(--text-strong)] outline-none focus:border-[var(--ring)]">
                    <option value="">Select level</option>
                    {LEVELS.map(l => <option key={l.value} value={l.value}>{l.label}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="text-sm font-semibold text-[var(--text-strong)] block mb-1.5">Term</label>
                <select value={structForm.term_id}
                  onChange={e => setStructForm(f => ({ ...f, term_id: e.target.value }))}
                  className="h-10 w-full rounded-[10px] border border-[var(--border)] bg-white px-3 text-sm text-[var(--text-strong)] outline-none focus:border-[var(--ring)]">
                  <option value="">All terms</option>
                  {terms.map(t => <option key={t.id} value={t.id}>{Array.isArray(t.academic_years) ? t.academic_years[0]?.name : t.academic_years?.name} — {t.name}</option>)}
                </select>
              </div>

              {/* Line items */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-semibold text-[var(--text-strong)]">Fee Items</p>
                  <button type="button" onClick={addItem}
                    className="text-xs text-[var(--brand)] font-semibold hover:underline flex items-center gap-1">
                    <Plus size={12} /> Add item
                  </button>
                </div>
                <div className="space-y-2">
                  {structForm.items.map((item, i) => (
                    <div key={i} className="grid grid-cols-[1fr_120px_auto_auto] gap-2 items-center">
                      <input value={item.name} onChange={e => updateItem(i, "name", e.target.value)}
                        placeholder="Fee name" required
                        className="h-9 rounded-[8px] border border-[var(--border)] px-3 text-sm text-[var(--text-strong)] outline-none focus:border-[var(--ring)]" />
                      <input value={item.amount} onChange={e => updateItem(i, "amount", e.target.value)}
                        placeholder="0.00" type="number" min="0" step="0.01"
                        className="h-9 rounded-[8px] border border-[var(--border)] px-3 text-sm font-mono outline-none focus:border-[var(--ring)]" />
                      <button type="button" onClick={() => updateItem(i, "is_mandatory", !item.is_mandatory)}
                        title={item.is_mandatory ? "Mandatory" : "Optional"}
                        className="text-[var(--text-muted)] hover:text-[var(--brand)] transition-colors">
                        {item.is_mandatory ? <CheckCircle2 size={16} className="text-[var(--success)]" /> : <Circle size={16} />}
                      </button>
                      <button type="button" onClick={() => removeItem(i)} className="text-[var(--text-subtle)] hover:text-[var(--danger)] transition-colors">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
                </div>
                <div className="flex justify-between mt-2 text-xs text-[var(--text-muted)]">
                  <span>{structForm.items.length} items</span>
                  <span className="font-bold text-[var(--success)]">
                    Total: {formatCurrency(structForm.items.reduce((s, i) => s + (parseFloat(i.amount) || 0), 0))}
                  </span>
                </div>
              </div>

              {structErr && (
                <div className="flex items-center gap-2 p-2 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                  <AlertCircle size={13} /> {structErr}
                </div>
              )}
              <div className="flex gap-2">
                <Button type="submit" size="sm" loading={savingStruct}>Save Structure</Button>
                <Button type="button" size="sm" variant="secondary" onClick={() => setShowStructForm(false)}>Cancel</Button>
              </div>
            </form>
          </Card>
        )}

        {structures.length === 0 && !showStructForm && (
          <div className="border-2 border-dashed border-[var(--border)] rounded-xl p-8 text-center">
            <Layers size={28} className="text-[var(--text-subtle)] mx-auto mb-2" />
            <p className="text-sm text-[var(--text-muted)]">No fee structures yet. Create one to enable auto-billing on admission.</p>
          </div>
        )}

        <div className="space-y-3 mt-4">
          {structures.map(s => {
            const isOpen = expandedStruct === s.id;
            const structTotal = s.items.reduce((sum, i) => sum + Number(i.amount), 0);
            const cls = classes.find(c => c.id === s.class_id);
            return (
              <div key={s.id} className="bg-white border border-[var(--border)] rounded-[12px] shadow-[var(--shadow-sm)] overflow-hidden">
                <button type="button" onClick={() => setExpandedStruct(isOpen ? null : s.id)}
                  className="w-full flex items-center gap-3 px-4 py-3 hover:bg-[var(--neutral-50)] transition-colors text-left">
                  {isOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-[var(--text-strong)]">{s.name}</p>
                    <p className="text-xs text-[var(--text-muted)]">
                      {cls ? cls.name : s.level ? LEVELS.find(l => l.value === s.level)?.label : "All classes"}
                      {" · "}{s.items.length} items
                      {!s.is_active && " · "}
                      {!s.is_active && <span className="text-orange-500">Inactive</span>}
                    </p>
                  </div>
                  <span className="text-sm font-extrabold font-mono text-[var(--success)]">{formatCurrency(structTotal)}</span>
                  <div onClick={e => { e.stopPropagation(); supabase.from("fee_structures").update({ is_active: !s.is_active }).eq("id", s.id).then(() => { setStructures(prev => prev.map(x => x.id === s.id ? { ...x, is_active: !x.is_active } : x)); }); }}
                    className={`w-8 h-4 rounded-full transition-colors cursor-pointer ${s.is_active ? "bg-[var(--success)]" : "bg-gray-200"}`}>
                    <div className={`w-3 h-3 bg-white rounded-full shadow transition-transform mt-0.5 ${s.is_active ? "translate-x-4 ml-0.5" : "ml-0.5"}`} />
                  </div>
                </button>
                {isOpen && (
                  <div className="border-t border-[var(--border)] px-4 py-3">
                    <table className="w-full text-sm">
                      <thead><tr>
                        <th className="text-left text-[11px] font-semibold uppercase tracking-wide text-[var(--text-muted)] pb-2">Item</th>
                        <th className="text-right text-[11px] font-semibold uppercase tracking-wide text-[var(--text-muted)] pb-2">Amount</th>
                        <th className="text-center text-[11px] font-semibold uppercase tracking-wide text-[var(--text-muted)] pb-2">Mandatory</th>
                      </tr></thead>
                      <tbody className="divide-y divide-[var(--border)]">
                        {s.items.map(item => (
                          <tr key={item.id}>
                            <td className="py-2 text-[var(--text-strong)]">{item.name}</td>
                            <td className="py-2 font-mono text-right text-[var(--success)] font-semibold">{formatCurrency(Number(item.amount))}</td>
                            <td className="py-2 text-center">{item.is_mandatory ? <CheckCircle2 size={14} className="text-[var(--success)] mx-auto" /> : <Circle size={14} className="text-[var(--neutral-300)] mx-auto" />}</td>
                          </tr>
                        ))}
                        <tr className="border-t-2 border-[var(--border)]">
                          <td className="py-2 font-bold text-[var(--text-strong)]">Total</td>
                          <td className="py-2 font-mono text-right font-extrabold text-[var(--success)]">{formatCurrency(structTotal)}</td>
                          <td />
                        </tr>
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
