"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { ArrowLeft, Banknote, Smartphone, Building, Globe, CheckCircle2, Search, ChevronRight } from "lucide-react";
import Link from "next/link";
import { formatCurrency, getInitials } from "@/lib/utils";
import { Suspense } from "react";
import { PaymentReceiptModal, type ReceiptData } from "@/components/finance/PaymentReceiptModal";

interface Student {
  id: string; first_name: string; last_name: string; admission_number: string;
  class_id: string | null; classrooms: { name: string } | null;
}
interface Invoice {
  id: string; invoice_number: string; total_amount: number; balance: number; status: string;
}
interface ClassRoom { id: string; name: string }
interface School { name: string; address?: string | null; phone?: string | null; logo_url?: string | null; ges_code?: string | null }

const METHODS = [
  { value: "cash",   label: "Cash",           icon: Banknote,   color: "#065f46", bg: "#d1fae5" },
  { value: "momo",   label: "Mobile Money",   icon: Smartphone, color: "#92278F", bg: "#f5e6f5" },
  { value: "bank",   label: "Bank Transfer",  icon: Building,   color: "#1e40af", bg: "#dbeafe" },
  { value: "hubtel", label: "Hubtel Pay",     icon: Globe,      color: "#92400e", bg: "#fef3c7" },
];

function Step({ n, label, active, done }: { n: number; label: string; active: boolean; done: boolean }) {
  return (
    <div className="flex items-center gap-2">
      <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[12px] font-bold shrink-0 transition-all ${done ? "bg-green-500 text-white" : active ? "text-white" : "bg-gray-100 text-gray-400"}`}
        style={active && !done ? { background: "linear-gradient(135deg,#262262,#92278F)" } : {}}>
        {done ? <CheckCircle2 className="w-4 h-4" /> : n}
      </div>
      <span className={`text-[13px] font-semibold ${active ? "text-[#262262]" : done ? "text-green-600" : "text-gray-400"}`}>{label}</span>
    </div>
  );
}

function RecordPaymentInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const prefillStudentId = searchParams.get("student_id") ?? "";

  const [classes, setClasses]     = useState<ClassRoom[]>([]);
  const [students, setStudents]   = useState<Student[]>([]);
  const [invoices, setInvoices]   = useState<Invoice[]>([]);
  const [schoolId, setSchoolId]   = useState<string | null>(null);
  const [userId, setUserId]       = useState<string | null>(null);
  const [school, setSchool]       = useState<School | null>(null);

  const [classFilter, setClassFilter] = useState("");
  const [search, setSearch]       = useState("");
  const [studentId, setStudentId] = useState(prefillStudentId);
  const [invoiceId, setInvoiceId] = useState("");
  const [amount, setAmount]       = useState("");
  const [method, setMethod]       = useState("cash");
  const [payDate, setPayDate]     = useState(new Date().toISOString().slice(0, 10));
  const [reference, setReference] = useState("");
  const [momoName, setMomoName]   = useState("");
  const [momoNumber, setMomoNumber] = useState("");
  const [notes, setNotes]         = useState("");

  const [loading, setLoading]     = useState(false);
  const [hubtelLoading, setHubtelLoading] = useState(false);
  const [hubtelError, setHubtelError] = useState<string | null>(null);
  const [errorMsg, setErrorMsg]   = useState<string | null>(null);

  // Receipt state
  const [receiptData, setReceiptData] = useState<ReceiptData | null>(null);
  const [templateId, setTemplateId]   = useState(1);

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      setUserId(user.id);
      const { data: profile } = await supabase.from("profiles").select("school_id").eq("id", user.id).single();
      if (!profile?.school_id) return;
      const sid = profile.school_id;
      setSchoolId(sid);

      // Load template preference from localStorage
      const savedTemplate = Number(localStorage.getItem(`receipt_template_${sid}`) ?? "1");
      if (savedTemplate >= 1 && savedTemplate <= 5) setTemplateId(savedTemplate);

      const [studRes, clsRes, schoolRes] = await Promise.all([
        supabase.from("students").select("id, first_name, last_name, admission_number, class_id, classrooms(name)")
          .eq("school_id", sid).eq("status", "active").order("last_name"),
        supabase.from("classrooms").select("id, name").eq("school_id", sid).order("name"),
        supabase.from("schools").select("name, address, phone, logo_url, ges_code").eq("id", sid).single(),
      ]);
      setStudents((studRes.data ?? []) as unknown as Student[]);
      setClasses(clsRes.data ?? []);
      if (schoolRes.data) setSchool(schoolRes.data);
    }
    load();
  }, []);

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
    const matchSearch = !search || s.first_name.toLowerCase().includes(q)
      || s.last_name.toLowerCase().includes(q) || s.admission_number.toLowerCase().includes(q);
    return matchClass && matchSearch;
  });

  const selectedStudent = students.find(s => s.id === studentId) ?? null;
  const selectedInvoice = invoices.find(i => i.id === invoiceId) ?? null;
  const step = !studentId ? 1 : !amount ? 2 : 3;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrorMsg(null);
    if (!studentId || !amount || !schoolId) { setErrorMsg("Please select a student and enter an amount."); return; }

    if (method === "hubtel") {
      setHubtelLoading(true); setHubtelError(null);
      const res = await fetch("/api/hubtel/initiate", {
        method: "POST", headers: { "Content-Type": "application/json" },
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
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        student_id: studentId,
        invoice_id: invoiceId || undefined,
        amount: parseFloat(amount),
        payment_method: method,
        payment_date: payDate,
        reference: reference || undefined,
        notes: method === "momo"
          ? [momoName && `Sender: ${momoName}`, momoNumber && `MoMo: ${momoNumber}`, notes].filter(Boolean).join(" | ")
          : notes || undefined,
        recorded_by: userId,
        school_id: schoolId,
      }),
    });
    const data = await res.json();
    setLoading(false);

    if (!res.ok) { setErrorMsg(data.error ?? "Failed to save payment."); return; }

    // Build receipt data and show modal
    setReceiptData({
      receiptNumber: data.receipt_number,
      date: payDate,
      student: {
        name: `${selectedStudent?.first_name} ${selectedStudent?.last_name}`,
        admissionNumber: selectedStudent?.admission_number ?? "",
        className: selectedStudent?.classrooms?.name ?? "—",
      },
      school: {
        name: school?.name ?? "School",
        address: school?.address ?? undefined,
        phone: school?.phone ?? undefined,
        logo_url: school?.logo_url ?? undefined,
        ges_code: school?.ges_code ?? undefined,
      },
      amount: parseFloat(amount),
      method,
      invoiceNumber: selectedInvoice?.invoice_number,
      reference: method === "momo" ? reference : reference || undefined,
      momoSenderName: method === "momo" ? momoName : undefined,
      momoNumber: method === "momo" ? momoNumber : undefined,
      notes,
    });
  }

  // ── Render ──────────────────────────────────────────────────────
  return (
    <>
      {receiptData && (
        <PaymentReceiptModal
          data={receiptData}
          templateId={templateId}
          onClose={() => router.push("/finance")}
        />
      )}

      <div className="max-w-2xl space-y-0">
        {/* Top bar */}
        <div className="flex items-center gap-3 mb-5">
          <Link href="/finance" className="p-2 rounded-xl border border-gray-200 hover:bg-gray-50 transition-colors text-gray-500">
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <h2 className="text-[20px] font-extrabold text-gray-900">Record Payment</h2>
            <p className="text-[13px] text-gray-500 mt-0.5">Apply a fee payment to a student&apos;s wallet</p>
          </div>
        </div>

        {/* Progress steps */}
        <div className="flex items-center gap-3 mb-6 px-1">
          <Step n={1} label="Select Student" active={step === 1} done={step > 1} />
          <ChevronRight className="w-4 h-4 text-gray-300 shrink-0" />
          <Step n={2} label="Invoice & Amount" active={step === 2} done={step > 2} />
          <ChevronRight className="w-4 h-4 text-gray-300 shrink-0" />
          <Step n={3} label="Payment Method" active={step === 3} done={false} />
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* ── STEP 1: Student ────────────────────────────────────── */}
          <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
              <p className="text-[14px] font-bold text-gray-900">1. Select Student</p>
              {selectedStudent && (
                <div className="flex items-center gap-2 text-[12px] text-[#262262] font-semibold">
                  <CheckCircle2 className="w-4 h-4 text-green-500" />
                  {selectedStudent.first_name} {selectedStudent.last_name}
                </div>
              )}
            </div>
            <div className="p-4 space-y-3">
              <div className="flex gap-2">
                <select value={classFilter} onChange={e => setClassFilter(e.target.value)}
                  className="h-9 rounded-xl border border-gray-200 bg-white px-3 text-[13px] outline-none focus:border-[#262262] w-36 shrink-0">
                  <option value="">All classes</option>
                  {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                  <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search name or admission no…"
                    className="h-9 w-full pl-9 pr-3 rounded-xl border border-gray-200 bg-white text-[13px] outline-none focus:border-[#262262]" />
                </div>
              </div>

              <div className="max-h-52 overflow-y-auto rounded-xl border border-gray-200 divide-y divide-gray-100">
                {displayStudents.length === 0 ? (
                  <div className="px-4 py-8 text-center text-[13px] text-gray-400">No students found</div>
                ) : displayStudents.map(s => (
                  <button key={s.id} type="button" onClick={() => { setStudentId(s.id); setSearch(""); }}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 text-left transition-colors ${studentId === s.id ? "bg-indigo-50" : "hover:bg-gray-50"}`}>
                    <div className="w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-bold text-white shrink-0"
                      style={{ background: "linear-gradient(135deg,#262262,#92278F)" }}>
                      {getInitials(`${s.first_name} ${s.last_name}`)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-semibold text-gray-900 truncate">{s.first_name} {s.last_name}</p>
                      <p className="text-[11px] text-gray-500">{s.admission_number} · {s.classrooms?.name ?? "—"}</p>
                    </div>
                    {studentId === s.id && <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0" />}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* ── STEP 2: Invoice & Amount ───────────────────────────── */}
          {studentId && (
            <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-100">
                <p className="text-[14px] font-bold text-gray-900">2. Invoice & Amount</p>
              </div>
              <div className="p-4 space-y-4">
                {/* Invoices */}
                {invoices.length === 0 ? (
                  <div className="rounded-xl bg-amber-50 border border-amber-200 px-4 py-3 text-[13px] text-amber-700">
                    No open invoices for this student. Payment will apply to wallet directly.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {invoices.map(inv => (
                      <button key={inv.id} type="button"
                        onClick={() => { setInvoiceId(inv.id); setAmount(String(inv.balance)); }}
                        className={`w-full flex items-center justify-between px-4 py-3 rounded-xl border text-left transition-all ${invoiceId === inv.id ? "border-[#262262] bg-indigo-50 shadow-sm" : "border-gray-200 hover:bg-gray-50"}`}>
                        <div>
                          <p className="text-[13px] font-semibold text-gray-900">{inv.invoice_number}</p>
                          <p className="text-[11px] text-gray-500">Total: {formatCurrency(inv.total_amount)} · <span className="capitalize">{inv.status}</span></p>
                        </div>
                        <div className="text-right">
                          <p className="text-[16px] font-extrabold text-red-600">{formatCurrency(inv.balance)}</p>
                          <p className="text-[10px] text-gray-400">outstanding</p>
                        </div>
                      </button>
                    ))}
                  </div>
                )}

                {/* Amount + Date */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[12px] font-semibold text-gray-600 block mb-1.5">Amount (GH₵) *</label>
                    <input type="number" min="0.01" step="0.01" required value={amount} onChange={e => setAmount(e.target.value)}
                      placeholder="0.00"
                      className="h-11 w-full rounded-xl border border-gray-200 px-3 text-[14px] font-bold outline-none focus:border-[#262262] transition-colors" />
                  </div>
                  <div>
                    <label className="text-[12px] font-semibold text-gray-600 block mb-1.5">Payment Date *</label>
                    <input type="date" required value={payDate} onChange={e => setPayDate(e.target.value)}
                      className="h-11 w-full rounded-xl border border-gray-200 px-3 text-[13px] outline-none focus:border-[#262262]" />
                  </div>
                </div>

                {/* Remaining balance preview */}
                {selectedInvoice && amount && (
                  <div className="rounded-xl px-4 py-2.5 text-[13px] flex items-center justify-between"
                    style={{ background: Math.max(0, selectedInvoice.balance - parseFloat(amount||"0")) > 0 ? "#fff7ed" : "#f0fdf4", border: `1px solid ${Math.max(0, selectedInvoice.balance - parseFloat(amount||"0")) > 0 ? "#fed7aa" : "#bbf7d0"}` }}>
                    <span className="text-gray-600">Remaining after payment</span>
                    <span className="font-extrabold text-[15px]" style={{ color: Math.max(0, selectedInvoice.balance - parseFloat(amount||"0")) > 0 ? "#dc2626" : "#16a34a" }}>
                      {formatCurrency(Math.max(0, selectedInvoice.balance - parseFloat(amount||"0")))}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── STEP 3: Payment Method + Details ──────────────────── */}
          {studentId && amount && (
            <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-100">
                <p className="text-[14px] font-bold text-gray-900">3. Payment Method & Details</p>
              </div>
              <div className="p-4 space-y-4">
                {/* Method picker */}
                <div className="grid grid-cols-2 gap-2">
                  {METHODS.map(({ value, label, icon: Icon, color, bg }) => (
                    <button key={value} type="button" onClick={() => { setMethod(value); setReference(""); setMomoName(""); setMomoNumber(""); }}
                      className="flex items-center gap-2.5 px-4 py-3 rounded-xl border text-[13px] font-semibold transition-all"
                      style={method === value
                        ? { border: `2px solid ${color}`, background: bg, color }
                        : { border: "1px solid #e5e7eb", background: "#fff", color: "#6b7280" }}>
                      <Icon className="w-4 h-4 shrink-0" />
                      {label}
                    </button>
                  ))}
                </div>

                {/* Hubtel notice */}
                {method === "hubtel" && (
                  <div className="rounded-xl px-4 py-3 text-[13px] bg-amber-50 border border-amber-200">
                    <p className="font-semibold text-amber-800">You will be redirected to Hubtel Checkout</p>
                    <p className="text-amber-600 text-[11px] mt-0.5">Supports MTN MoMo, Vodafone Cash, AirtelTigo Money, Visa/Mastercard.</p>
                  </div>
                )}

                {/* MoMo-specific fields */}
                {method === "momo" && (
                  <div className="rounded-xl border border-purple-200 bg-purple-50 p-4 space-y-3">
                    <p className="text-[12px] font-bold text-purple-800 flex items-center gap-1.5">
                      <Smartphone className="w-3.5 h-3.5" /> Mobile Money Details
                    </p>
                    <div>
                      <label className="text-[12px] font-semibold text-gray-600 block mb-1.5">Transaction ID *</label>
                      <input value={reference} onChange={e => setReference(e.target.value)} required={method === "momo"}
                        placeholder="e.g. GHA-240615-12345"
                        className="h-10 w-full rounded-xl border border-purple-200 bg-white px-3 text-[13px] outline-none focus:border-purple-500" />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-[12px] font-semibold text-gray-600 block mb-1.5">Sender&apos;s Name *</label>
                        <input value={momoName} onChange={e => setMomoName(e.target.value)} required={method === "momo"}
                          placeholder="Name on MoMo account"
                          className="h-10 w-full rounded-xl border border-purple-200 bg-white px-3 text-[13px] outline-none focus:border-purple-500" />
                      </div>
                      <div>
                        <label className="text-[12px] font-semibold text-gray-600 block mb-1.5">MoMo Number *</label>
                        <input value={momoNumber} onChange={e => setMomoNumber(e.target.value)} required={method === "momo"}
                          placeholder="+233 XX XXX XXXX"
                          className="h-10 w-full rounded-xl border border-purple-200 bg-white px-3 text-[13px] outline-none focus:border-purple-500" />
                      </div>
                    </div>
                  </div>
                )}

                {/* Reference (non-MoMo) */}
                {method !== "momo" && method !== "hubtel" && (
                  <div>
                    <label className="text-[12px] font-semibold text-gray-600 block mb-1.5">Reference / Receipt No. <span className="font-normal text-gray-400">(optional)</span></label>
                    <input value={reference} onChange={e => setReference(e.target.value)}
                      placeholder={method === "bank" ? "e.g. Bank reference number" : "e.g. Receipt no."}
                      className="h-10 w-full rounded-xl border border-gray-200 bg-white px-3 text-[13px] outline-none focus:border-[#262262]" />
                  </div>
                )}

                {/* Notes */}
                <div>
                  <label className="text-[12px] font-semibold text-gray-600 block mb-1.5">Notes <span className="font-normal text-gray-400">(optional)</span></label>
                  <textarea rows={2} value={notes} onChange={e => setNotes(e.target.value)}
                    className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-[13px] outline-none focus:border-[#262262] resize-none" />
                </div>
              </div>
            </div>
          )}

          {/* Errors */}
          {(errorMsg || hubtelError) && (
            <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-[13px] text-red-700">
              {errorMsg || hubtelError}
            </div>
          )}

          {/* Submit */}
          {studentId && amount && (
            <div className="flex gap-3 pt-1">
              <button type="submit" disabled={loading || hubtelLoading || (method === "momo" && (!reference || !momoName || !momoNumber))}
                className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-8 py-3 rounded-2xl text-[14px] font-bold text-white disabled:opacity-50 transition-all shadow-lg shadow-indigo-200/50"
                style={{ background: "linear-gradient(135deg,#262262,#92278F)" }}>
                {loading || hubtelLoading
                  ? <><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Processing…</>
                  : method === "hubtel" ? "Continue to Hubtel →"
                  : `Save & Print Receipt — ${formatCurrency(parseFloat(amount || "0"))}`
                }
              </button>
              <Link href="/finance"
                className="px-5 py-3 rounded-2xl border border-gray-200 text-[14px] font-semibold text-gray-600 hover:bg-gray-50 transition-colors">
                Cancel
              </Link>
            </div>
          )}
        </form>
      </div>
    </>
  );
}

export default function RecordPaymentPage() {
  return (
    <Suspense>
      <RecordPaymentInner />
    </Suspense>
  );
}
