"use client";

import { useState, useMemo } from "react";
import {
  Users, Plus, AlertTriangle, ChevronDown, CheckCircle,
  Clock, XCircle, ArrowLeft, Printer, BadgeDollarSign,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { SlidePanel } from "@/components/ui/SlidePanel";

const GRADIENT = "linear-gradient(135deg, #262262, #92278F)";
const BRAND = "#262262";

const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];

interface Run {
  id: string;
  month: number;
  year: number;
  pay_date?: string;
  status: string;
  total_gross: number;
  total_net: number;
  total_deductions: number;
  notes?: string;
}

interface StaffMember {
  id: string;
  full_name: string;
  role: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  staff_details?: any;
}

interface PayrollRecord {
  id: string;
  payroll_run_id?: string;
  profile_id: string;
  basic_salary: number;
  allowances: number;
  gross_salary: number;
  ssnit_employee: number;
  ssnit_employer: number;
  income_tax: number;
  other_deductions: number;
  total_deductions: number;
  net_salary: number;
  payment_method: string;
  account_number?: string;
  bank_name?: string;
  status: string;
  paid_at?: string;
  notes?: string;
  profiles?: { full_name: string; role: string; staff_details?: { department?: string; designation?: string }[] };
}

interface Props {
  schoolId: string;
  userId: string;
  userRole: string;
  tableNotReady: boolean;
  initialRuns: Run[];
  staffList: StaffMember[];
}

const STATUS_BADGE: Record<string, string> = {
  draft:      "bg-gray-100 text-gray-600",
  processing: "bg-blue-50 text-blue-700",
  paid:       "bg-green-50 text-green-700",
  cancelled:  "bg-red-50 text-red-600",
};
const RECORD_STATUS: Record<string, string> = {
  pending: "bg-amber-50 text-amber-700",
  paid:    "bg-green-50 text-green-700",
  held:    "bg-red-50 text-red-600",
};

function fmt(n: number) { return `GHS ${Number(n ?? 0).toLocaleString("en-GH", { minimumFractionDigits: 2 })}`; }

export function PayrollClient({ schoolId, userId, userRole, tableNotReady, initialRuns, staffList }: Props) {
  const [runs, setRuns] = useState<Run[]>(initialRuns);
  const [selectedRun, setSelectedRun] = useState<Run | null>(null);
  const [records, setRecords] = useState<PayrollRecord[]>([]);
  const [loadingRecords, setLoadingRecords] = useState(false);
  const [panelOpen, setPanelOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [editRecord, setEditRecord] = useState<PayrollRecord | null>(null);
  const [editPanel, setEditPanel] = useState(false);
  const [saving, setSaving] = useState(false);

  const now = new Date();
  const [form, setForm] = useState({
    month: now.getMonth() + 1,
    year: now.getFullYear(),
    pay_date: "",
    notes: "",
  });

  const [editForm, setEditForm] = useState({
    basic_salary: "", allowances: "", ssnit_employee: "", income_tax: "",
    other_deductions: "", payment_method: "bank_transfer", account_number: "", bank_name: "", notes: "",
  });

  const canManage = ["owner", "headmaster", "accountant"].includes(userRole);

  async function openRun(run: Run) {
    setSelectedRun(run);
    setLoadingRecords(true);
    const res = await fetch(`/api/admin/finance/payroll?schoolId=${schoolId}&runId=${run.id}`);
    const json = await res.json();
    setRecords(json.data ?? []);
    setLoadingRecords(false);
  }

  async function createRun() {
    setCreating(true);
    const res = await fetch("/api/admin/finance/payroll", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ school_id: schoolId, ...form, created_by: userId }),
    });
    const json = await res.json();
    if (json.data) {
      setRuns((prev) => [json.data, ...prev]);
      setPanelOpen(false);
      openRun(json.data);
    }
    setCreating(false);
  }

  async function updateRunStatus(runId: string, status: string) {
    const res = await fetch("/api/admin/finance/payroll", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ run_id: runId, status }),
    });
    const json = await res.json();
    if (json.data) {
      setRuns((prev) => prev.map((r) => r.id === runId ? { ...r, ...json.data } : r));
      setSelectedRun((prev) => prev?.id === runId ? { ...prev, ...json.data } : prev);
      if (status === "paid") {
        setRecords((prev) => prev.map((r) => r.status === "pending" ? { ...r, status: "paid" } : r));
      }
    }
  }

  function openEditRecord(r: PayrollRecord) {
    setEditRecord(r);
    setEditForm({
      basic_salary: String(r.basic_salary),
      allowances: String(r.allowances),
      ssnit_employee: String(r.ssnit_employee),
      income_tax: String(r.income_tax),
      other_deductions: String(r.other_deductions),
      payment_method: r.payment_method || "bank_transfer",
      account_number: r.account_number || "",
      bank_name: r.bank_name || "",
      notes: r.notes || "",
    });
    setEditPanel(true);
  }

  async function saveRecord() {
    if (!editRecord) return;
    setSaving(true);
    const res = await fetch("/api/admin/finance/payroll", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        record_id: editRecord.id,
        payroll_run_id: editRecord.payroll_run_id ?? selectedRun?.id,
        basic_salary: parseFloat(editForm.basic_salary) || 0,
        allowances: parseFloat(editForm.allowances) || 0,
        ssnit_employee: parseFloat(editForm.ssnit_employee) || 0,
        income_tax: parseFloat(editForm.income_tax) || 0,
        other_deductions: parseFloat(editForm.other_deductions) || 0,
        payment_method: editForm.payment_method,
        account_number: editForm.account_number || null,
        bank_name: editForm.bank_name || null,
        notes: editForm.notes || null,
      }),
    });
    const json = await res.json();
    if (json.data) {
      setRecords((prev) => prev.map((r) => r.id === editRecord.id ? { ...r, ...json.data } : r));
      setEditPanel(false);
    }
    setSaving(false);
  }

  async function markRecordPaid(id: string) {
    await fetch("/api/admin/finance/payroll", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ record_id: id, status: "paid", payroll_run_id: selectedRun?.id }),
    });
    setRecords((prev) => prev.map((r) => r.id === id ? { ...r, status: "paid" } : r));
  }

  const totalStaffSalary = useMemo(() =>
    staffList.reduce((s, st) => s + Number(st.staff_details?.basic_salary ?? 0) + Number(st.staff_details?.allowances ?? 0), 0),
    [staffList]);

  // ── If viewing a specific run ──────────────────────────────
  if (selectedRun) {
    const run = runs.find((r) => r.id === selectedRun.id) ?? selectedRun;
    const paid = records.filter((r) => r.status === "paid").length;

    return (
      <div className="flex flex-col gap-6 p-6 max-w-[1100px] mx-auto">
        <div className="flex items-center gap-3">
          <button onClick={() => setSelectedRun(null)}
            className="w-9 h-9 rounded-xl flex items-center justify-center border border-[var(--border)] text-[var(--text-muted)] hover:text-[var(--text-strong)] hover:bg-[var(--neutral-50)] transition-colors">
            <ArrowLeft size={16} />
          </button>
          <div>
            <h1 className="text-[22px] font-extrabold text-[var(--text-strong)]">
              {MONTHS[run.month - 1]} {run.year} Payroll
            </h1>
            <p className="text-[14px] text-[var(--text-muted)] mt-0.5">{records.length} staff · {paid} paid</p>
          </div>
          <span className={cn("ml-2 px-3 py-1 rounded-full text-[12px] font-bold capitalize", STATUS_BADGE[run.status])}>
            {run.status}
          </span>
          <div className="flex-1" />
          {canManage && run.status === "draft" && (
            <button onClick={() => updateRunStatus(run.id, "processing")}
              className="h-9 px-4 rounded-xl text-[13px] font-bold border border-[#262262] text-[#262262] hover:bg-[#262262]/5 transition-colors">
              Start Processing
            </button>
          )}
          {canManage && run.status === "processing" && (
            <button onClick={() => updateRunStatus(run.id, "paid")}
              className="h-9 px-4 rounded-xl text-[13px] font-bold text-white"
              style={{ background: GRADIENT }}>
              Mark All Paid
            </button>
          )}
          <button onClick={() => window.print()}
            className="h-9 px-4 rounded-xl text-[13px] font-bold border border-[var(--border)] flex items-center gap-1.5 text-[var(--text-muted)] hover:text-[var(--text-strong)] transition-colors">
            <Printer size={14} /> Print
          </button>
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: "Total Gross", value: fmt(run.total_gross), color: BRAND },
            { label: "Total Deductions", value: fmt(run.total_deductions), color: "#dc2626" },
            { label: "Total Net Pay", value: fmt(run.total_net), color: "#16a34a" },
          ].map(({ label, value, color }) => (
            <div key={label} className="bg-white rounded-2xl border border-[var(--border)] p-5 shadow-sm">
              <p className="text-[12px] font-semibold text-[var(--text-muted)] uppercase tracking-wide mb-1">{label}</p>
              <p className="text-[24px] font-extrabold" style={{ color }}>{value}</p>
            </div>
          ))}
        </div>

        {/* Records table */}
        <div className="bg-white rounded-2xl border border-[var(--border)] shadow-sm overflow-hidden">
          {loadingRecords ? (
            <div className="py-16 text-center text-[14px] text-[var(--text-muted)]">Loading records…</div>
          ) : records.length === 0 ? (
            <div className="py-16 text-center text-[14px] text-[var(--text-muted)]">No staff records found</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-[var(--border)] bg-[var(--neutral-50)]">
                    {["Staff", "Basic", "Allowances", "Gross", "SSNIT (5.5%)", "Tax", "Deductions", "Net Pay", "Status", ""].map((h) => (
                      <th key={h} className="text-left px-4 py-3 text-[11px] font-extrabold uppercase tracking-wide text-[var(--text-muted)] whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {records.map((r, idx) => {
                    const name = r.profiles?.full_name ?? staffList.find((s) => s.id === r.profile_id)?.full_name ?? "Unknown";
                    return (
                      <tr key={r.id} className={cn("border-b border-[var(--border)] hover:bg-[var(--neutral-50)] transition-colors", idx === records.length - 1 && "border-0")}>
                        <td className="px-4 py-3">
                          <p className="text-[13px] font-bold text-[var(--text-strong)]">{name}</p>
                          <p className="text-[11px] text-[var(--text-muted)] capitalize">{r.profiles?.role ?? ""}</p>
                        </td>
                        <td className="px-4 py-3 text-[13px] text-[var(--text-strong)]">{fmt(r.basic_salary)}</td>
                        <td className="px-4 py-3 text-[13px] text-[var(--text-strong)]">{fmt(r.allowances)}</td>
                        <td className="px-4 py-3 text-[13px] font-bold text-[var(--text-strong)]">{fmt(r.gross_salary)}</td>
                        <td className="px-4 py-3 text-[13px] text-red-600">{fmt(r.ssnit_employee)}</td>
                        <td className="px-4 py-3 text-[13px] text-red-600">{fmt(r.income_tax)}</td>
                        <td className="px-4 py-3 text-[13px] text-red-600">{fmt(r.total_deductions)}</td>
                        <td className="px-4 py-3 text-[14px] font-extrabold text-green-700">{fmt(r.net_salary)}</td>
                        <td className="px-4 py-3">
                          <span className={cn("px-2 py-0.5 rounded-full text-[10px] font-bold capitalize", RECORD_STATUS[r.status] ?? RECORD_STATUS.pending)}>
                            {r.status}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          {canManage && (
                            <div className="flex items-center gap-1">
                              <button onClick={() => openEditRecord(r)}
                                className="text-[11px] font-semibold text-[#262262] hover:underline">Edit</button>
                              {r.status !== "paid" && (
                                <button onClick={() => markRecordPaid(r.id)}
                                  className="ml-2 text-[11px] font-semibold text-green-700 hover:underline">Mark Paid</button>
                              )}
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr className="bg-[var(--neutral-50)] border-t-2 border-[var(--border)]">
                    <td className="px-4 py-3 text-[12px] font-extrabold text-[var(--text-strong)] uppercase">TOTALS</td>
                    <td className="px-4 py-3 text-[13px] font-bold">{fmt(records.reduce((s, r) => s + Number(r.basic_salary), 0))}</td>
                    <td className="px-4 py-3 text-[13px] font-bold">{fmt(records.reduce((s, r) => s + Number(r.allowances), 0))}</td>
                    <td className="px-4 py-3 text-[13px] font-extrabold">{fmt(run.total_gross)}</td>
                    <td className="px-4 py-3 text-[13px] font-bold text-red-600">{fmt(records.reduce((s, r) => s + Number(r.ssnit_employee), 0))}</td>
                    <td className="px-4 py-3 text-[13px] font-bold text-red-600">{fmt(records.reduce((s, r) => s + Number(r.income_tax), 0))}</td>
                    <td className="px-4 py-3 text-[13px] font-bold text-red-600">{fmt(run.total_deductions)}</td>
                    <td className="px-4 py-3 text-[14px] font-extrabold text-green-700">{fmt(run.total_net)}</td>
                    <td colSpan={2} />
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </div>

        {/* Edit record panel */}
        <SlidePanel open={editPanel} onClose={() => setEditPanel(false)}
          title="Edit Payroll Record" subtitle={editRecord ? (records.find((r) => r.id === editRecord.id)?.profiles?.full_name ?? "") : ""}>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              {[
                { key: "basic_salary", label: "Basic Salary (GHS)" },
                { key: "allowances", label: "Allowances (GHS)" },
                { key: "ssnit_employee", label: "SSNIT Employee (GHS)" },
                { key: "income_tax", label: "Income Tax (GHS)" },
                { key: "other_deductions", label: "Other Deductions (GHS)" },
              ].map(({ key, label }) => (
                <div key={key}>
                  <label className="block text-[12px] font-bold text-[var(--text-muted)] mb-1.5 uppercase tracking-wide">{label}</label>
                  <input type="number" min="0" step="0.01"
                    value={editForm[key as keyof typeof editForm]}
                    onChange={(e) => setEditForm((f) => ({ ...f, [key]: e.target.value }))}
                    className="w-full h-11 px-3 border border-[var(--border)] rounded-xl text-[14px] focus:outline-none focus:ring-2 focus:ring-[#262262]/20" />
                </div>
              ))}
            </div>
            <div>
              <label className="block text-[12px] font-bold text-[var(--text-muted)] mb-1.5 uppercase tracking-wide">Payment Method</label>
              <div className="relative">
                <select value={editForm.payment_method} onChange={(e) => setEditForm((f) => ({ ...f, payment_method: e.target.value }))}
                  className="w-full h-11 px-3 pr-8 border border-[var(--border)] rounded-xl text-[14px] bg-white focus:outline-none appearance-none">
                  <option value="bank_transfer">Bank Transfer</option>
                  <option value="mobile_money">Mobile Money</option>
                  <option value="cash">Cash</option>
                  <option value="cheque">Cheque</option>
                </select>
                <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] pointer-events-none" />
              </div>
            </div>
            {["bank_transfer", "cheque"].includes(editForm.payment_method) && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[12px] font-bold text-[var(--text-muted)] mb-1.5 uppercase tracking-wide">Account Number</label>
                  <input value={editForm.account_number} onChange={(e) => setEditForm((f) => ({ ...f, account_number: e.target.value }))}
                    className="w-full h-11 px-3 border border-[var(--border)] rounded-xl text-[14px] focus:outline-none focus:ring-2 focus:ring-[#262262]/20" />
                </div>
                <div>
                  <label className="block text-[12px] font-bold text-[var(--text-muted)] mb-1.5 uppercase tracking-wide">Bank Name</label>
                  <input value={editForm.bank_name} onChange={(e) => setEditForm((f) => ({ ...f, bank_name: e.target.value }))}
                    className="w-full h-11 px-3 border border-[var(--border)] rounded-xl text-[14px] focus:outline-none focus:ring-2 focus:ring-[#262262]/20" />
                </div>
              </div>
            )}
            <div>
              <label className="block text-[12px] font-bold text-[var(--text-muted)] mb-1.5 uppercase tracking-wide">Notes</label>
              <textarea value={editForm.notes} onChange={(e) => setEditForm((f) => ({ ...f, notes: e.target.value }))} rows={2}
                className="w-full px-3 py-2.5 border border-[var(--border)] rounded-xl text-[14px] resize-none focus:outline-none focus:ring-2 focus:ring-[#262262]/20" />
            </div>
            {editForm.basic_salary && (
              <div className="p-3 bg-green-50 rounded-xl border border-green-100 text-[12px]">
                <div className="flex justify-between text-green-800">
                  <span>Gross:</span>
                  <span className="font-bold">{fmt((parseFloat(editForm.basic_salary) || 0) + (parseFloat(editForm.allowances) || 0))}</span>
                </div>
                <div className="flex justify-between text-red-600 mt-1">
                  <span>Total Deductions:</span>
                  <span className="font-bold">{fmt((parseFloat(editForm.ssnit_employee) || 0) + (parseFloat(editForm.income_tax) || 0) + (parseFloat(editForm.other_deductions) || 0))}</span>
                </div>
                <div className="flex justify-between text-green-800 font-extrabold mt-1 border-t border-green-200 pt-1">
                  <span>Net Pay:</span>
                  <span>{fmt((parseFloat(editForm.basic_salary) || 0) + (parseFloat(editForm.allowances) || 0) - (parseFloat(editForm.ssnit_employee) || 0) - (parseFloat(editForm.income_tax) || 0) - (parseFloat(editForm.other_deductions) || 0))}</span>
                </div>
              </div>
            )}
            <button onClick={saveRecord} disabled={saving}
              className="w-full h-11 rounded-xl text-[14px] font-bold text-white disabled:opacity-50"
              style={{ background: GRADIENT }}>
              {saving ? "Saving…" : "Save Changes"}
            </button>
          </div>
        </SlidePanel>
      </div>
    );
  }

  // ── Runs list view ─────────────────────────────────────────
  return (
    <div className="flex flex-col gap-6 p-6 max-w-[1000px] mx-auto">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "#262262" + "18" }}>
            <BadgeDollarSign size={20} style={{ color: BRAND }} />
          </div>
          <div>
            <h1 className="text-[22px] font-extrabold text-[var(--text-strong)]">Payroll</h1>
            <p className="text-[14px] text-[var(--text-muted)] mt-0.5">{staffList.length} active staff · Monthly salary pool: {fmt(totalStaffSalary)}</p>
          </div>
        </div>
        {canManage && (
          <button onClick={() => setPanelOpen(true)} disabled={tableNotReady}
            className="h-10 px-5 rounded-xl text-[13px] font-bold text-white flex items-center gap-2 shadow disabled:opacity-50"
            style={{ background: GRADIENT }}>
            <Plus size={15} /> New Pay Run
          </button>
        )}
      </div>

      {tableNotReady && (
        <div className="flex items-start gap-3 p-4 rounded-xl bg-amber-50 border border-amber-200">
          <AlertTriangle size={16} className="text-amber-600 mt-0.5 shrink-0" />
          <div>
            <p className="text-[13px] font-bold text-amber-800">Payroll tables not set up</p>
            <p className="text-[12px] text-amber-700 mt-0.5">Run <code className="bg-amber-100 px-1 rounded font-mono">supabase/migrations/payroll_module.sql</code> in your Supabase SQL editor.</p>
          </div>
        </div>
      )}

      {/* Staff salary summary */}
      <div className="bg-white rounded-2xl border border-[var(--border)] p-5 shadow-sm">
        <h2 className="text-[15px] font-extrabold text-[var(--text-strong)] mb-4">Staff Salary Overview</h2>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[var(--border)]">
                {["Staff Member", "Role", "Department", "Basic Salary", "Allowances", "Est. Net"].map((h) => (
                  <th key={h} className="text-left pb-2 text-[11px] font-extrabold uppercase tracking-wide text-[var(--text-muted)]">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {staffList.map((s, idx) => {
                const d = s.staff_details ?? {};
                const basic = Number(d.basic_salary ?? 0);
                const allow = Number(d.allowances ?? 0);
                const ssnit = basic * 0.055;
                const net = basic + allow - ssnit - Number(d.income_tax ?? 0);
                return (
                  <tr key={s.id} className={cn("border-b border-[var(--border)] hover:bg-[var(--neutral-50)] transition-colors", idx === staffList.length - 1 && "border-0")}>
                    <td className="py-3 text-[13px] font-bold text-[var(--text-strong)]">{s.full_name}</td>
                    <td className="py-3 text-[12px] text-[var(--text-muted)] capitalize">{s.role}</td>
                    <td className="py-3 text-[12px] text-[var(--text-muted)]">{d.department ?? "—"}</td>
                    <td className="py-3 text-[13px] text-[var(--text-strong)]">{basic > 0 ? fmt(basic) : <span className="text-amber-600 text-[11px]">Not set</span>}</td>
                    <td className="py-3 text-[13px] text-[var(--text-muted)]">{fmt(allow)}</td>
                    <td className="py-3 text-[13px] font-bold text-green-700">{basic > 0 ? fmt(net) : "—"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {staffList.length === 0 && (
            <div className="py-8 text-center text-[13px] text-[var(--text-muted)]">No active staff found</div>
          )}
        </div>
      </div>

      {/* Pay runs list */}
      {runs.length > 0 && (
        <div className="bg-white rounded-2xl border border-[var(--border)] shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-[var(--border)]">
            <h2 className="text-[15px] font-extrabold text-[var(--text-strong)]">Pay Run History</h2>
          </div>
          <div className="divide-y divide-[var(--border)]">
            {runs.map((run) => (
              <button key={run.id} onClick={() => openRun(run)}
                className="w-full flex items-center gap-4 px-5 py-4 hover:bg-[var(--neutral-50)] transition-colors text-left">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: BRAND + "12" }}>
                  <Users size={16} style={{ color: BRAND }} />
                </div>
                <div className="flex-1">
                  <p className="text-[14px] font-bold text-[var(--text-strong)]">{MONTHS[run.month - 1]} {run.year}</p>
                  <p className="text-[12px] text-[var(--text-muted)]">
                    Gross: {fmt(run.total_gross)} · Net: {fmt(run.total_net)}
                    {run.pay_date ? ` · Pay date: ${new Date(run.pay_date).toLocaleDateString("en-GH", { day: "numeric", month: "short", year: "numeric" })}` : ""}
                  </p>
                </div>
                <span className={cn("px-3 py-1 rounded-full text-[11px] font-bold capitalize shrink-0", STATUS_BADGE[run.status])}>
                  {run.status === "paid" ? <span className="flex items-center gap-1"><CheckCircle size={11} /> Paid</span>
                    : run.status === "processing" ? <span className="flex items-center gap-1"><Clock size={11} /> Processing</span>
                    : run.status === "cancelled" ? <span className="flex items-center gap-1"><XCircle size={11} /> Cancelled</span>
                    : "Draft"}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {runs.length === 0 && !tableNotReady && (
        <div className="bg-white rounded-2xl border border-[var(--border)] py-16 text-center shadow-sm">
          <BadgeDollarSign size={36} className="mx-auto mb-3 opacity-20 text-[var(--text-muted)]" />
          <p className="text-[14px] font-bold text-[var(--text-muted)]">No pay runs yet</p>
          <p className="text-[13px] text-[var(--text-muted)] mt-1">Create your first monthly pay run above</p>
        </div>
      )}

      {/* New run slide panel */}
      <SlidePanel open={panelOpen} onClose={() => setPanelOpen(false)}
        title="New Pay Run" subtitle="Generate payroll for all active staff">
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[12px] font-bold text-[var(--text-muted)] mb-1.5 uppercase tracking-wide">Month *</label>
              <div className="relative">
                <select value={form.month} onChange={(e) => setForm((f) => ({ ...f, month: parseInt(e.target.value) }))}
                  className="w-full h-11 px-3 pr-8 border border-[var(--border)] rounded-xl text-[14px] bg-white focus:outline-none appearance-none">
                  {MONTHS.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
                </select>
                <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] pointer-events-none" />
              </div>
            </div>
            <div>
              <label className="block text-[12px] font-bold text-[var(--text-muted)] mb-1.5 uppercase tracking-wide">Year *</label>
              <input type="number" value={form.year} onChange={(e) => setForm((f) => ({ ...f, year: parseInt(e.target.value) }))}
                className="w-full h-11 px-3 border border-[var(--border)] rounded-xl text-[14px] focus:outline-none focus:ring-2 focus:ring-[#262262]/20" />
            </div>
          </div>
          <div>
            <label className="block text-[12px] font-bold text-[var(--text-muted)] mb-1.5 uppercase tracking-wide">Pay Date (optional)</label>
            <input type="date" value={form.pay_date} onChange={(e) => setForm((f) => ({ ...f, pay_date: e.target.value }))}
              className="w-full h-11 px-3 border border-[var(--border)] rounded-xl text-[14px] focus:outline-none focus:ring-2 focus:ring-[#262262]/20" />
          </div>
          <div>
            <label className="block text-[12px] font-bold text-[var(--text-muted)] mb-1.5 uppercase tracking-wide">Notes</label>
            <textarea value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} rows={2}
              className="w-full px-3 py-2.5 border border-[var(--border)] rounded-xl text-[14px] resize-none focus:outline-none focus:ring-2 focus:ring-[#262262]/20"
              placeholder="Optional notes for this pay run" />
          </div>
          <div className="p-3 bg-blue-50 rounded-xl border border-blue-100 text-[12px] text-blue-800">
            This will auto-populate payroll records for all <strong>{staffList.length} active staff</strong> using salaries set in their staff profiles. You can adjust individual amounts after creation.
          </div>
          <button onClick={createRun} disabled={creating}
            className="w-full h-11 rounded-xl text-[14px] font-bold text-white disabled:opacity-50"
            style={{ background: GRADIENT }}>
            {creating ? "Creating…" : `Generate Pay Run for ${MONTHS[form.month - 1]} ${form.year}`}
          </button>
        </div>
      </SlidePanel>
    </div>
  );
}
