"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Card } from "@/components/ui/Card";
import { ArrowLeft, Banknote, Smartphone, Building, Globe, CheckCircle2 } from "lucide-react";
import Link from "next/link";
import { formatCurrency, getInitials } from "@/lib/utils";
import { Suspense } from "react";

interface Student {
  id: string; first_name: string; last_name: string; admission_number: string;
  class_id: string | null; classrooms: { name: string } | null;
}
interface Invoice {
  id: string; invoice_number: string; total_amount: number; balance: number; status: string;
}
interface ClassRoom { id: string; name: string }

const PAYMENT_METHODS = [
  { value: "cash",   label: "Cash",           icon: Banknote   },
  { value: "momo",   label: "Mobile Money",   icon: Smartphone },
  { value: "bank",   label: "Bank Transfer",  icon: Building   },
  { value: "hubtel", label: "Pay via Hubtel", icon: Globe      },
];

function RecordPaymentInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const prefillStudentId = searchParams.get("student_id") ?? "";

  const [classes, setClasses]   = useState<ClassRoom[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [schoolId, setSchoolId] = useState<string | null>(null);
  const [userId, setUserId]     = useState<string | null>(null);

  const [classFilter, setClassFilter] = useState("");
  const [search, setSearch]     = useState("");
  const [studentId, setStudentId]   = useState(prefillStudentId);
  const [invoiceId, setInvoiceId]   = useState("");
  const [amount, setAmount]     = useState("");
  const [method, setMethod]     = useState("cash");
  const [payDate, setPayDate]   = useState(new Date().toISOString().slice(0, 10));
  const [reference, setReference] = useState("");
  const [notes, setNotes]       = useState("");

  const [loading, setLoading]   = useState(false);
  const [hubtelLoading, setHubtelLoading] = useState(false);
  const [hubtelError, setHubtelError] = useState<string | null>(null);
  const [success, setSuccess]   = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      setUserId(user.id);
      const { data: profile } = await supabase.from("profiles").select("school_id").eq("id", user.id).single();
      if (!profile?.school_id) return;
      setSchoolId(profile.school_id);

      const [studRes, clsRes] = await Promise.all([
        supabase.from("students").select("id, first_name, last_name, admission_number, class_id, classrooms(name)")
          .eq("school_id", profile.school_id).eq("status", "active").order("last_name"),
        supabase.from("classrooms").select("id, name").eq("school_id", profile.school_id).order("name"),
      ]);
      setStudents((studRes.data ?? []) as unknown as Student[]);
      setClasses(clsRes.data ?? []);
    }
    load();
  }, []);

  // Load invoices when student selected
  useEffect(() => {
    if (!studentId || !schoolId) { setInvoices([]); setInvoiceId(""); return; }
    const supabase = createClient();
    supabase.from("student_invoices")
      .select("id, invoice_number, total_amount, balance, status")
      .eq("student_id", studentId)
      .in("status", ["unpaid", "partial"])
      .order("created_at", { ascending: false })
      .then(({ data }) => {
        setInvoices(data ?? []);
        if (data && data.length > 0) {
          setInvoiceId(data[0].id);
          setAmount(String(data[0].balance > 0 ? data[0].balance : ""));
        }
      });
  }, [studentId, schoolId]);

  const displayStudents = students.filter(s => {
    const matchClass = !classFilter || s.class_id === classFilter;
    const q = search.toLowerCase();
    const matchSearch = !search || s.first_name.toLowerCase().includes(q) || s.last_name.toLowerCase().includes(q) || s.admission_number.toLowerCase().includes(q);
    return matchClass && matchSearch;
  });

  const selectedStudent = students.find(s => s.id === studentId) ?? null;
  const selectedInvoice = invoices.find(i => i.id === invoiceId) ?? null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrorMsg(null);

    if (!studentId || !amount || !schoolId) { setErrorMsg("Please select a student and enter an amount."); return; }

    if (method === "hubtel") {
      setHubtelLoading(true);
      setHubtelError(null);
      const res = await fetch("/api/hubtel/initiate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: parseFloat(amount),
          description: `School fee — ${selectedStudent?.first_name} ${selectedStudent?.last_name}`,
          clientReference: `${studentId}-${Date.now()}`,
          returnUrl: `${window.location.origin}/finance?payment=success`,
          cancelUrl: `${window.location.origin}/finance/record-payment?payment=cancelled`,
        }),
      });
      const data = await res.json();
      setHubtelLoading(false);
      if (!res.ok || !data.checkoutUrl) { setHubtelError(data.error ?? "Could not initiate Hubtel."); return; }
      window.location.href = data.checkoutUrl;
      return;
    }

    setLoading(true);
    const res = await fetch("/api/billing/record-payment", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        student_id: studentId,
        invoice_id: invoiceId || undefined,
        amount: parseFloat(amount),
        payment_method: method,
        payment_date: payDate,
        reference: reference || undefined,
        notes: notes || undefined,
        recorded_by: userId,
        school_id: schoolId,
      }),
    });
    const data = await res.json();
    setLoading(false);

    if (!res.ok) {
      setErrorMsg(data.error ?? "Failed to save payment.");
      return;
    }

    setSuccess(true);
    setTimeout(() => router.push("/finance"), 2000);
  }

  if (success) {
    return (
      <div className="max-w-xl flex flex-col items-center justify-center py-20 gap-4 text-center">
        <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center">
          <CheckCircle2 size={32} className="text-green-600" />
        </div>
        <h3 className="text-[18px] font-extrabold text-[var(--text-strong)]">Payment Saved!</h3>
        <p className="text-[13px] text-[var(--text-muted)]">Redirecting to finance…</p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl space-y-5">
      <div className="flex items-center gap-3">
        <Link href="/finance"><Button variant="ghost" size="sm"><ArrowLeft size={14} /> Back</Button></Link>
        <div>
          <h2 className="text-[20px] font-extrabold text-[var(--text-strong)]">Record Payment</h2>
          <p className="text-[13px] text-[var(--text-muted)]">Apply a fee payment to a student&apos;s invoice</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">

        {/* Step 1: Find student */}
        <Card>
          <h3 className="text-[14px] font-bold text-[var(--text-strong)] mb-3">1. Select Student</h3>
          <div className="flex gap-3 mb-3">
            <select value={classFilter} onChange={e => setClassFilter(e.target.value)}
              className="h-9 rounded-xl border border-[var(--border)] bg-white px-3 text-[13px] outline-none focus:border-[var(--ring)] min-w-0 w-40">
              <option value="">All classes</option>
              {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search name or ID…"
              className="h-9 flex-1 rounded-xl border border-[var(--border)] bg-white px-3 text-[13px] outline-none focus:border-[var(--ring)]" />
          </div>

          {/* Student picker */}
          <div className="max-h-48 overflow-y-auto divide-y divide-[var(--border)] border border-[var(--border)] rounded-xl">
            {displayStudents.length === 0 && (
              <div className="px-4 py-6 text-center text-[13px] text-[var(--text-muted)]">No students found</div>
            )}
            {displayStudents.map(s => (
              <button key={s.id} type="button" onClick={() => setStudentId(s.id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 text-left transition-colors ${studentId === s.id ? "bg-[#EEF2FF]" : "hover:bg-[var(--neutral-50)]"}`}>
                <div className="w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-bold text-white shrink-0"
                  style={{ background: "linear-gradient(135deg,#262262,#92278F)" }}>
                  {getInitials(`${s.first_name} ${s.last_name}`)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-semibold text-[var(--text-strong)] truncate">{s.first_name} {s.last_name}</p>
                  <p className="text-[11px] text-[var(--text-muted)] truncate">{s.admission_number} · {s.classrooms?.name ?? "—"}</p>
                </div>
                {studentId === s.id && <CheckCircle2 size={16} className="text-[#262262] shrink-0" />}
              </button>
            ))}
          </div>
        </Card>

        {/* Step 2: Invoice */}
        {studentId && (
          <Card>
            <h3 className="text-[14px] font-bold text-[var(--text-strong)] mb-3">2. Invoice</h3>
            {invoices.length === 0 ? (
              <p className="text-[13px] text-[var(--text-muted)] py-2">No open invoices for this student.</p>
            ) : (
              <div className="space-y-2">
                {invoices.map(inv => (
                  <button key={inv.id} type="button" onClick={() => { setInvoiceId(inv.id); setAmount(String(inv.balance)); }}
                    className={`w-full flex items-center justify-between px-4 py-3 rounded-xl border text-left transition-colors ${invoiceId === inv.id ? "border-[#262262] bg-[#EEF2FF]" : "border-[var(--border)] hover:bg-[var(--neutral-50)]"}`}>
                    <div>
                      <p className="text-[13px] font-semibold text-[var(--text-strong)]">{inv.invoice_number}</p>
                      <p className="text-[11px] text-[var(--text-muted)]">Total: {formatCurrency(inv.total_amount)} · Status: <span className="capitalize font-medium">{inv.status}</span></p>
                    </div>
                    <div className="text-right">
                      <p className="text-[15px] font-extrabold text-red-600">{formatCurrency(inv.balance)}</p>
                      <p className="text-[10px] text-[var(--text-muted)]">outstanding</p>
                    </div>
                  </button>
                ))}
                <p className="text-[11px] text-[var(--text-muted)] pt-1">Payment will apply to the selected invoice above.</p>
              </div>
            )}
          </Card>
        )}

        {/* Step 3: Payment details */}
        {studentId && (
          <Card>
            <h3 className="text-[14px] font-bold text-[var(--text-strong)] mb-3">3. Payment Details</h3>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <Input label="Amount (GH₵)" type="number" min="0.01" step="0.01" required
                  value={amount} onChange={e => setAmount(e.target.value)} placeholder="0.00" />
                <Input label="Payment Date" type="date" required
                  value={payDate} onChange={e => setPayDate(e.target.value)} />
              </div>

              {selectedInvoice && amount && (
                <div className="px-4 py-3 rounded-xl bg-[#EEF2FF] text-[13px] flex items-center justify-between">
                  <span className="text-[var(--text-muted)]">Remaining after payment:</span>
                  <span className="font-extrabold" style={{ color: Math.max(0, selectedInvoice.balance - parseFloat(amount||"0")) > 0 ? "#dc2626" : "#16a34a" }}>
                    {formatCurrency(Math.max(0, selectedInvoice.balance - parseFloat(amount || "0")))}
                  </span>
                </div>
              )}

              {/* Payment method */}
              <div>
                <label className="text-[13px] font-semibold text-[var(--text-strong)] block mb-2">Payment Method</label>
                <div className="grid grid-cols-2 gap-2">
                  {PAYMENT_METHODS.map(({ value, label, icon: Icon }) => (
                    <button key={value} type="button" onClick={() => setMethod(value)}
                      className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border text-[13px] font-medium transition-all ${
                        method === value ? "border-[#262262] bg-[#EEF2FF] text-[#262262]" : "border-[var(--border)] bg-white text-[var(--text-muted)] hover:border-[var(--ring)]"
                      }`}>
                      <Icon size={14} />{label}
                    </button>
                  ))}
                </div>
                {method === "hubtel" && (
                  <div className="mt-3 rounded-xl px-4 py-3 text-[13px] bg-[#ede9fe] border border-[#262262]/20">
                    <p className="font-semibold text-[#262262] mb-0.5">Pay via Hubtel Checkout</p>
                    <p className="text-[var(--text-muted)] text-[11px]">Supports MTN MoMo, Vodafone Cash, AirtelTigo, card. You will be redirected to Hubtel.</p>
                  </div>
                )}
              </div>

              <Input label="Reference / Receipt No (optional)"
                value={reference} onChange={e => setReference(e.target.value)} placeholder="e.g. MoMo ref 12345" />
              <div>
                <label className="text-[13px] font-semibold text-[var(--text-strong)] block mb-1.5">Notes (optional)</label>
                <textarea rows={2} value={notes} onChange={e => setNotes(e.target.value)}
                  className="w-full rounded-xl border border-[var(--border)] p-3 text-[13px] outline-none focus:border-[var(--ring)] resize-none" />
              </div>
            </div>
          </Card>
        )}

        {errorMsg && (
          <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-[13px] text-red-700">{errorMsg}</div>
        )}
        {hubtelError && (
          <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-[13px] text-red-700">{hubtelError}</div>
        )}

        {studentId && (
          <div className="flex gap-3">
            <Button type="submit" size="lg" loading={loading || hubtelLoading} disabled={!amount}>
              {method === "hubtel" ? "Continue to Hubtel →" : "Save Payment"}
            </Button>
            <Link href="/finance"><Button type="button" variant="secondary" size="lg">Cancel</Button></Link>
          </div>
        )}
      </form>
    </div>
  );
}

export default function RecordPaymentPage() {
  return (
    <Suspense>
      <RecordPaymentInner />
    </Suspense>
  );
}
