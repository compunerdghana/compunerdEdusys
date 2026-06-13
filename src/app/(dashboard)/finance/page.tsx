import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { Card, StatCard } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { formatCurrency, formatDate, getInitials } from "@/lib/utils";
import { PlusCircle, CreditCard } from "lucide-react";

export default async function FinancePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: profile } = await supabase.from("profiles").select("school_id").eq("id", user!.id).single();
  const schoolId = profile?.school_id;

  const [paymentsRes, summaryRes] = await Promise.all([
    supabase.from("fee_payments")
      .select("*, students(first_name, last_name, admission_number), fee_types(name)")
      .eq("school_id", schoolId)
      .order("created_at", { ascending: false })
      .limit(50),
    supabase.from("fee_payments")
      .select("amount_paid, balance, payment_status")
      .eq("school_id", schoolId),
  ]);

  const payments = paymentsRes.data ?? [];
  const summary = summaryRes.data ?? [];
  const totalCollected = summary.reduce((s: number, p: { amount_paid: number }) => s + (p.amount_paid ?? 0), 0);
  const totalOutstanding = summary.reduce((s: number, p: { balance: number }) => s + (p.balance ?? 0), 0);
  const paidCount = summary.filter((p: { payment_status: string }) => p.payment_status === "paid").length;

  const statusVariant: Record<string, "success" | "warning" | "danger"> = {
    paid: "success", partial: "warning", unpaid: "danger",
  };

  return (
    <div className="space-y-5 max-w-6xl">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-[var(--text-strong)]">Finance</h2>
          <p className="text-sm text-[var(--text-muted)]">Fee payments and outstanding balances</p>
        </div>
        <Link href="/finance/record-payment">
          <Button><PlusCircle size={15} /> Record payment</Button>
        </Link>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard label="Total collected" value={formatCurrency(totalCollected)} icon={<CreditCard size={18} />} accent />
        <StatCard label="Outstanding" value={formatCurrency(totalOutstanding)} icon={<CreditCard size={18} />} />
        <StatCard label="Fully paid" value={`${paidCount} students`} icon={<CreditCard size={18} />} />
      </div>

      <Card padding="none">
        <div className="px-5 py-3 border-b border-[var(--border)]">
          <h3 className="text-sm font-semibold text-[var(--text-strong)]">Recent payments</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--border)]">
                {["Student", "Fee type", "Amount paid", "Balance", "Date", "Status"].map((h) => (
                  <th key={h} className="text-left px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--text-muted)]">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)]">
              {payments.map((p: {
                id: string; amount_paid: number; balance: number; payment_status: string;
                created_at: string; receipt_number: string | null;
                students: { first_name: string; last_name: string; admission_number: string } | null;
                fee_types: { name: string } | null;
              }) => (
                <tr key={p.id} className="hover:bg-[var(--neutral-50)]">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold text-white shrink-0" style={{ background: "var(--gradient-brand)" }}>
                        {p.students ? getInitials(`${p.students.first_name} ${p.students.last_name}`) : "?"}
                      </div>
                      <span className="font-medium text-[var(--text-strong)]">
                        {p.students ? `${p.students.first_name} ${p.students.last_name}` : "—"}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-[var(--text-body)]">{p.fee_types?.name ?? "—"}</td>
                  <td className="px-4 py-3 font-mono text-[var(--text-strong)]">{formatCurrency(p.amount_paid)}</td>
                  <td className="px-4 py-3 font-mono text-[var(--text-muted)]">{formatCurrency(p.balance)}</td>
                  <td className="px-4 py-3 text-[var(--text-muted)]">{formatDate(p.created_at)}</td>
                  <td className="px-4 py-3">
                    <Badge variant={statusVariant[p.payment_status] ?? "default"}>{p.payment_status}</Badge>
                  </td>
                </tr>
              ))}
              {payments.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-sm text-[var(--text-muted)]">
                    No payments recorded yet.{" "}
                    <Link href="/finance/record-payment" className="text-[var(--brand)] font-semibold">Record the first payment</Link>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
