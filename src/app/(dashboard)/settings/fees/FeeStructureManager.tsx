"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Plus, Trash2, CheckCircle2, Circle, Layers, ChevronDown, ChevronRight, Play, AlertCircle, Pencil } from "lucide-react";
import { formatCurrency } from "@/lib/utils";

const LEVELS = [
  { value: "daycare", label: "Day Care" },
  { value: "nursery", label: "Nursery" },
  { value: "kg", label: "KG" },
  { value: "primary", label: "Primary" },
  { value: "jhs", label: "JHS" },
];

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
  feeTypes?: unknown;
  terms: Term[];
  classes: ClassRow[];
  structures: FeeStructure[];
}

export function FeeStructureManager({ schoolId, terms, classes, structures: initialStructures }: Props) {
  const router = useRouter();
  const supabase = createClient();

  const [autoBilling, setAutoBilling] = useState(() => {
    if (typeof window !== "undefined") return localStorage.getItem(`auto_billing_${schoolId}`) !== "false";
    return true;
  });
  const [togglingBilling, setTogglingBilling] = useState(false);

  const [structures, setStructures] = useState(initialStructures);
  const [showStructForm, setShowStructForm] = useState(false);
  const [expandedStruct, setExpandedStruct] = useState<string | null>(null);
  const [structForm, setStructForm] = useState({
    name: "", class_id: "", level: "", term_id: "", is_active: true,
    items: [{ name: "School Fees", amount: "0", is_mandatory: true }] as { name: string; amount: string; is_mandatory: boolean }[],
  });
  const [savingStruct, setSavingStruct] = useState(false);
  const [structErr, setStructErr] = useState<string | null>(null);
  const [runningBilling, setRunningBilling] = useState(false);
  const [billingMsg, setBillingMsg] = useState<string | null>(null);

  // Edit state
  const [editingStructId, setEditingStructId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<{
    name: string; class_id: string; level: string; term_id: string; is_active: boolean;
    items: { id?: string; name: string; amount: string; is_mandatory: boolean }[];
  } | null>(null);
  const [savingEdit, setSavingEdit] = useState(false);
  const [editErr, setEditErr] = useState<string | null>(null);

  function handleAutoBillingToggle() {
    const next = !autoBilling;
    setTogglingBilling(true);
    setAutoBilling(next);
    localStorage.setItem(`auto_billing_${schoolId}`, String(next));
    setTimeout(() => setTogglingBilling(false), 400);
  }

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
    const itemRows = structForm.items.filter(i => i.name.trim()).map((item, idx) => ({
      fee_structure_id: struct.id, school_id: schoolId,
      name: item.name.trim(), amount: parseFloat(item.amount) || 0,
      is_mandatory: item.is_mandatory, sort_order: idx,
    }));
    const { data: savedItems } = await supabase.from("fee_structure_items").insert(itemRows).select();
    setStructures(s => [{ ...struct, items: savedItems ?? [] }, ...s]);
    setShowStructForm(false);
    setStructForm({ name: "", class_id: "", level: "", term_id: "", is_active: true, items: [{ name: "School Fees", amount: "0", is_mandatory: true }] });
    setSavingStruct(false);
    router.refresh();
  }

  async function runTermBilling() {
    setRunningBilling(true); setBillingMsg(null);
    const res = await fetch("/api/billing/term-billing", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ school_id: schoolId }),
    });
    const data = await res.json();
    setRunningBilling(false);
    setBillingMsg(`Done: ${data.processed} invoices generated, ${data.skipped} already billed.`);
  }

  function openEdit(s: FeeStructure) {
    setEditingStructId(s.id);
    setEditForm({
      name: s.name,
      class_id: s.class_id ?? "",
      level: s.level ?? "",
      term_id: s.term_id ?? "",
      is_active: s.is_active,
      items: s.items.map(i => ({ id: i.id, name: i.name, amount: String(i.amount), is_mandatory: i.is_mandatory })),
    });
    setEditErr(null);
  }

  async function saveEditStructure(e: React.FormEvent) {
    e.preventDefault();
    if (!editForm || !editingStructId) return;
    setSavingEdit(true); setEditErr(null);

    const { error: structErr2 } = await supabase.from("fee_structures").update({
      name: editForm.name.trim(),
      class_id: editForm.class_id || null,
      level: editForm.level || null,
      term_id: editForm.term_id || null,
      is_active: editForm.is_active,
    }).eq("id", editingStructId);

    if (structErr2) { setSavingEdit(false); setEditErr(structErr2.message); return; }

    // Delete existing items and re-insert
    await supabase.from("fee_structure_items").delete().eq("fee_structure_id", editingStructId);
    const itemRows = editForm.items.filter(i => i.name.trim()).map((item, idx) => ({
      fee_structure_id: editingStructId, school_id: schoolId,
      name: item.name.trim(), amount: parseFloat(item.amount) || 0,
      is_mandatory: item.is_mandatory, sort_order: idx,
    }));
    const { data: savedItems } = await supabase.from("fee_structure_items").insert(itemRows).select();

    setStructures(prev => prev.map(s => s.id === editingStructId
      ? { ...s, name: editForm.name.trim(), class_id: editForm.class_id || null, level: editForm.level || null,
          term_id: editForm.term_id || null, is_active: editForm.is_active, items: savedItems ?? [] }
      : s
    ));
    setEditingStructId(null); setEditForm(null);
    setSavingEdit(false);
    router.refresh();
  }

  async function deleteStructure(id: string) {
    await supabase.from("fee_structure_items").delete().eq("fee_structure_id", id);
    await supabase.from("fee_structures").delete().eq("id", id);
    setStructures(prev => prev.filter(s => s.id !== id));
  }

  return (
    <div className="space-y-5 max-w-2xl">

      {/* Auto-billing toggle */}
      <div className="flex items-center justify-between p-4 rounded-2xl border border-[var(--border)] bg-[var(--neutral-50)]">
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

      {/* Fee Structures header */}
      <div className="flex items-center justify-between">
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
        <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm">
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
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                  <div key={i} className="grid grid-cols-[1fr_auto_auto_auto] sm:grid-cols-[1fr_120px_auto_auto] gap-2 items-center">
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

      <div className="space-y-3">
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
                    {!s.is_active && <span className="text-orange-500"> · Inactive</span>}
                  </p>
                </div>
                <span className="text-sm font-extrabold font-mono text-[var(--success)]">{formatCurrency(structTotal)}</span>
                <div onClick={e => {
                  e.stopPropagation();
                  supabase.from("fee_structures").update({ is_active: !s.is_active }).eq("id", s.id).then(() => {
                    setStructures(prev => prev.map(x => x.id === s.id ? { ...x, is_active: !x.is_active } : x));
                  });
                }}
                  className={`w-8 h-4 rounded-full transition-colors cursor-pointer ${s.is_active ? "bg-[var(--success)]" : "bg-gray-200"}`}>
                  <div className={`w-3 h-3 bg-white rounded-full shadow transition-transform mt-0.5 ${s.is_active ? "translate-x-4 ml-0.5" : "ml-0.5"}`} />
                </div>
              </button>
              {isOpen && editingStructId === s.id && editForm ? (
                <div className="border-t border-[var(--border)] px-4 py-4">
                  <p className="text-sm font-semibold text-[var(--text-strong)] mb-3">Edit Fee Structure</p>
                  <form onSubmit={saveEditStructure} className="space-y-3">
                    <Input label="Structure Name *" value={editForm.name}
                      onChange={e => setEditForm(f => f ? { ...f, name: e.target.value } : f)} required />
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-xs font-semibold text-[var(--text-strong)] block mb-1">Class</label>
                        <select value={editForm.class_id}
                          onChange={e => setEditForm(f => f ? { ...f, class_id: e.target.value } : f)}
                          className="h-9 w-full rounded-[8px] border border-[var(--border)] bg-white px-3 text-sm outline-none focus:border-[var(--ring)]">
                          <option value="">All classes in level</option>
                          {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="text-xs font-semibold text-[var(--text-strong)] block mb-1">Level</label>
                        <select value={editForm.level}
                          onChange={e => setEditForm(f => f ? { ...f, level: e.target.value } : f)}
                          className="h-9 w-full rounded-[8px] border border-[var(--border)] bg-white px-3 text-sm outline-none focus:border-[var(--ring)]">
                          <option value="">Select level</option>
                          {LEVELS.map(l => <option key={l.value} value={l.value}>{l.label}</option>)}
                        </select>
                      </div>
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-[var(--text-strong)] block mb-1">Term</label>
                      <select value={editForm.term_id}
                        onChange={e => setEditForm(f => f ? { ...f, term_id: e.target.value } : f)}
                        className="h-9 w-full rounded-[8px] border border-[var(--border)] bg-white px-3 text-sm outline-none focus:border-[var(--ring)]">
                        <option value="">All terms</option>
                        {terms.map(t => <option key={t.id} value={t.id}>{Array.isArray(t.academic_years) ? t.academic_years[0]?.name : t.academic_years?.name} — {t.name}</option>)}
                      </select>
                    </div>
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-xs font-semibold text-[var(--text-strong)]">Fee Items</p>
                        <button type="button" onClick={() => setEditForm(f => f ? { ...f, items: [...f.items, { name: "", amount: "0", is_mandatory: true }] } : f)}
                          className="text-xs text-[var(--brand)] font-semibold hover:underline flex items-center gap-1">
                          <Plus size={11} /> Add item
                        </button>
                      </div>
                      <div className="space-y-2">
                        {editForm.items.map((item, i) => (
                          <div key={i} className="grid grid-cols-[1fr_100px_auto_auto] gap-2 items-center">
                            <input value={item.name} onChange={e => setEditForm(f => f ? { ...f, items: f.items.map((x, idx) => idx === i ? { ...x, name: e.target.value } : x) } : f)}
                              placeholder="Fee name" className="h-8 rounded-[8px] border border-[var(--border)] px-2 text-sm outline-none focus:border-[var(--ring)]" />
                            <input value={item.amount} onChange={e => setEditForm(f => f ? { ...f, items: f.items.map((x, idx) => idx === i ? { ...x, amount: e.target.value } : x) } : f)}
                              type="number" min="0" step="0.01" className="h-8 rounded-[8px] border border-[var(--border)] px-2 text-sm font-mono outline-none focus:border-[var(--ring)]" />
                            <button type="button" onClick={() => setEditForm(f => f ? { ...f, items: f.items.map((x, idx) => idx === i ? { ...x, is_mandatory: !x.is_mandatory } : x) } : f)}>
                              {item.is_mandatory ? <CheckCircle2 size={15} className="text-[var(--success)]" /> : <Circle size={15} className="text-[var(--text-muted)]" />}
                            </button>
                            <button type="button" onClick={() => setEditForm(f => f ? { ...f, items: f.items.filter((_, idx) => idx !== i) } : f)}>
                              <Trash2 size={13} className="text-[var(--text-subtle)] hover:text-[var(--danger)]" />
                            </button>
                          </div>
                        ))}
                      </div>
                      <p className="text-right text-xs font-bold text-[var(--success)] mt-1">
                        Total: {formatCurrency(editForm.items.reduce((s, i) => s + (parseFloat(i.amount) || 0), 0))}
                      </p>
                    </div>
                    {editErr && <div className="flex items-center gap-2 p-2 bg-red-50 border border-red-200 rounded-lg text-red-700 text-xs"><AlertCircle size={12} />{editErr}</div>}
                    <div className="flex gap-2">
                      <Button type="submit" size="sm" loading={savingEdit}>Save Changes</Button>
                      <Button type="button" size="sm" variant="secondary" onClick={() => { setEditingStructId(null); setEditForm(null); }}>Cancel</Button>
                      <button type="button" onClick={() => { if (confirm("Delete this fee structure?")) deleteStructure(s.id); }}
                        className="ml-auto text-xs text-red-400 hover:text-red-600 font-semibold flex items-center gap-1">
                        <Trash2 size={12} /> Delete
                      </button>
                    </div>
                  </form>
                </div>
              ) : isOpen && (
                <div className="border-t border-[var(--border)] px-4 py-3">
                  <div className="flex justify-end mb-2">
                    <button onClick={() => openEdit(s)}
                      className="flex items-center gap-1 text-xs text-[var(--brand)] font-semibold hover:underline">
                      <Pencil size={11} /> Edit structure
                    </button>
                  </div>
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
  );
}
