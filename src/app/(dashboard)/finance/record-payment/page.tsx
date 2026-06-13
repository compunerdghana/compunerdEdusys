"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { queueOperation } from "@/lib/offline/db";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Card } from "@/components/ui/Card";
import { ArrowLeft, CreditCard, Banknote, Smartphone, Building } from "lucide-react";
import Link from "next/link";
import { formatCurrency } from "@/lib/utils";
import { loadStripe } from "@stripe/stripe-js";
import {
  Elements,
  PaymentElement,
  useStripe,
  useElements,
} from "@stripe/react-stripe-js";

const stripePromise = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
  ? loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY)
  : null;

interface Student { id: string; first_name: string; last_name: string; admission_number: string }
interface FeeType { id: string; name: string; amount: number }

function StripePaymentForm({ clientSecret, amount, onSuccess }: { clientSecret: string; amount: number; onSuccess: () => void }) {
  const stripe = useStripe();
  const elements = useElements();
  const [processing, setProcessing] = useState(false);
  const [errMsg, setErrMsg] = useState<string | null>(null);

  async function handleStripeSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!stripe || !elements) return;
    setProcessing(true);
    setErrMsg(null);
    const { error } = await stripe.confirmPayment({
      elements,
      redirect: "if_required",
    });
    if (error) {
      setErrMsg(error.message ?? "Payment failed.");
      setProcessing(false);
    } else {
      onSuccess();
    }
  }

  return (
    <form onSubmit={handleStripeSubmit} className="space-y-4">
      <div className="bg-[var(--neutral-50)] rounded-[10px] p-4">
        <p className="text-sm text-[var(--text-muted)] mb-3">Total to charge: <span className="font-bold text-[var(--text-strong)]">{formatCurrency(amount)}</span></p>
        <PaymentElement />
      </div>
      {errMsg && <p className="text-sm text-[var(--danger)]">{errMsg}</p>}
      <Button type="submit" size="lg" loading={processing} className="w-full">Pay with Stripe</Button>
    </form>
  );
}

export default function RecordPaymentPage() {
  const router = useRouter();
  const [students, setStudents] = useState<Student[]>([]);
  const [feeTypes, setFeeTypes] = useState<FeeType[]>([]);
  const [schoolId, setSchoolId] = useState<string | null>(null);
  const [termId, setTermId] = useState<string | null>(null);
  const [form, setForm] = useState({
    student_id: "", fee_type_id: "", amount_paid: "",
    payment_method: "cash", notes: "",
  });
  const [selectedFee, setSelectedFee] = useState<FeeType | null>(null);
  const [loading, setLoading] = useState(false);
  const [stripeClientSecret, setStripeClientSecret] = useState<string | null>(null);
  const [stripeLoading, setStripeLoading] = useState(false);

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: profile } = await supabase.from("profiles").select("school_id").eq("id", user.id).single();
      if (!profile?.school_id) return;
      setSchoolId(profile.school_id);
      const [studRes, feeRes, termRes] = await Promise.all([
        supabase.from("students").select("id, first_name, last_name, admission_number").eq("school_id", profile.school_id).eq("status", "active").order("last_name"),
        supabase.from("fee_types").select("id, name, amount").eq("school_id", profile.school_id),
        supabase.from("terms").select("id").eq("school_id", profile.school_id).eq("is_current", true).single(),
      ]);
      setStudents(studRes.data ?? []);
      setFeeTypes(feeRes.data ?? []);
      setTermId(termRes.data?.id ?? null);
    }
    load();
  }, []);

  function update(field: string, value: string) {
    setForm((f) => ({ ...f, [field]: value }));
    if (field === "fee_type_id") {
      setSelectedFee(feeTypes.find((f) => f.id === value) ?? null);
    }
    if (field === "payment_method") {
      setStripeClientSecret(null);
    }
  }

  async function handleStripeInit() {
    const amount = parseFloat(form.amount_paid) || selectedFee?.amount || 0;
    if (!amount) return;
    setStripeLoading(true);
    const res = await fetch("/api/stripe/payment-intent", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ amount, currency: "usd", metadata: { student_id: form.student_id, fee_type_id: form.fee_type_id } }),
    });
    const data = await res.json();
    setStripeClientSecret(data.clientSecret ?? null);
    setStripeLoading(false);
  }

  async function savePaymentRecord(overrideMethod?: string) {
    const supabase = createClient();
    const amountPaid = parseFloat(form.amount_paid);
    const amountDue = selectedFee?.amount ?? amountPaid;
    const balance = Math.max(0, amountDue - amountPaid);
    const paymentStatus = balance === 0 ? "paid" : amountPaid > 0 ? "partial" : "unpaid";
    const receiptNumber = `RCT/${new Date().getFullYear()}/${Date.now().toString().slice(-6)}`;

    const payload = {
      id: crypto.randomUUID(),
      school_id: schoolId,
      student_id: form.student_id,
      fee_type_id: form.fee_type_id,
      term_id: termId,
      amount_due: amountDue,
      amount_paid: amountPaid,
      balance,
      payment_status: paymentStatus,
      paid_at: new Date().toISOString(),
      receipt_number: receiptNumber,
      payment_method: overrideMethod ?? form.payment_method,
      notes: form.notes || null,
    };

    if (navigator.onLine) {
      const { error } = await supabase.from("fee_payments").insert(payload);
      if (error) { alert("Could not save payment: " + error.message); return false; }
    } else {
      await queueOperation("fee_payments", "insert", payload);
    }
    return true;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (form.payment_method === "stripe") {
      await handleStripeInit();
      return;
    }
    setLoading(true);
    const ok = await savePaymentRecord();
    setLoading(false);
    if (ok) router.push("/finance");
  }

  async function handleStripeSuccess() {
    await savePaymentRecord("stripe");
    router.push("/finance");
  }

  const paymentMethods = [
    { value: "cash", label: "Cash", icon: Banknote },
    { value: "momo", label: "Mobile Money (MoMo)", icon: Smartphone },
    { value: "bank", label: "Bank Transfer", icon: Building },
    { value: "stripe", label: "Card (Stripe)", icon: CreditCard },
  ];

  return (
    <div className="max-w-xl space-y-5">
      <div className="flex items-center gap-3">
        <Link href="/finance"><Button variant="ghost" size="sm"><ArrowLeft size={14} /> Back</Button></Link>
        <div>
          <h2 className="text-xl font-bold text-[var(--text-strong)]">Record payment</h2>
          <p className="text-sm text-[var(--text-muted)]">Enter fee payment details</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        <Card>
          <div className="space-y-4">
            <Select
              label="Student"
              required
              value={form.student_id}
              onChange={(e) => update("student_id", e.target.value)}
              placeholder="Select student"
              options={students.map((s) => ({ value: s.id, label: `${s.first_name} ${s.last_name} (${s.admission_number})` }))}
            />
            <Select
              label="Fee type"
              required
              value={form.fee_type_id}
              onChange={(e) => update("fee_type_id", e.target.value)}
              placeholder="Select fee type"
              options={feeTypes.map((f) => ({ value: f.id, label: `${f.name} — ${formatCurrency(f.amount)}` }))}
            />
            {selectedFee && (
              <div className="bg-[var(--brand-subtle)] rounded-[10px] px-4 py-3 text-sm">
                <span className="text-[var(--text-muted)]">Fee amount: </span>
                <span className="font-bold font-mono text-[var(--brand-ink)]">{formatCurrency(selectedFee.amount)}</span>
              </div>
            )}
            <Input
              label="Amount paid (GH₵)"
              type="number"
              min="0"
              step="0.01"
              required
              placeholder="0.00"
              value={form.amount_paid}
              onChange={(e) => update("amount_paid", e.target.value)}
            />

            {/* Payment method pills */}
            <div>
              <label className="text-sm font-semibold text-[var(--text-strong)] block mb-2">Payment method</label>
              <div className="grid grid-cols-2 gap-2">
                {paymentMethods.map(({ value, label, icon: Icon }) => (
                  <button key={value} type="button" onClick={() => update("payment_method", value)}
                    className={`flex items-center gap-2 px-3 py-2.5 rounded-[10px] border text-sm font-medium transition-all ${
                      form.payment_method === value
                        ? "border-[var(--brand)] bg-[var(--brand-subtle)] text-[var(--brand-ink)]"
                        : "border-[var(--border)] bg-white text-[var(--text-muted)] hover:border-[var(--ring)]"
                    }`}>
                    <Icon size={14} />
                    {label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-sm font-semibold text-[var(--text-strong)] block mb-1.5">Notes (optional)</label>
              <textarea
                className="w-full rounded-[10px] border border-[var(--border)] p-3 text-sm outline-none focus:border-[var(--ring)] resize-none"
                rows={2}
                value={form.notes}
                onChange={(e) => update("notes", e.target.value)}
              />
            </div>
          </div>
        </Card>

        {/* Stripe payment UI */}
        {form.payment_method === "stripe" && stripeClientSecret && stripePromise ? (
          <Card>
            <p className="text-sm font-semibold text-[var(--text-strong)] mb-4">Card payment</p>
            <Elements stripe={stripePromise} options={{ clientSecret: stripeClientSecret }}>
              <StripePaymentForm
                clientSecret={stripeClientSecret}
                amount={parseFloat(form.amount_paid) || selectedFee?.amount || 0}
                onSuccess={handleStripeSuccess}
              />
            </Elements>
          </Card>
        ) : (
          <div className="flex gap-3">
            <Button type="submit" size="lg" loading={loading || stripeLoading}>
              {form.payment_method === "stripe" ? "Proceed to card payment" : "Save payment"}
            </Button>
            <Link href="/finance"><Button type="button" variant="secondary" size="lg">Cancel</Button></Link>
          </div>
        )}
      </form>
    </div>
  );
}
