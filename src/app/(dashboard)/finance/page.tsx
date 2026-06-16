import { createClient } from "@/lib/supabase/server";
import { createClient as createAdmin } from "@supabase/supabase-js";
import Link from "next/link";
import { Badge } from "@/components/ui/Badge";
import { formatCurrency, formatDate, getInitials } from "@/lib/utils";
import {
  PlusCircle, CreditCard, TrendingUp, TrendingDown, Wallet,
  ReceiptText, ArrowUpRight, Users, Printer, Activity,
  AlertCircle,
} from "lucide-react";
import { FinanceOwingSection } from "./FinanceOwingSection";
import { ReceiptPrintButton } from "./ReceiptPrintButton";

const BRAND  = "#262262";
const ACCENT = "#92278F";
const GRADIENT = "linear-gradient(135deg, #262262, #92278F)";

interface DashboardData {
  wallet?: {
    current_balance: number;
    total_income: number;
    total_expenses: number;
  };
  monthly_income?: number;
  monthly_expenses?: number;
  net_position?: number;
  health_score?: number;
  pending_approvals?: number;
  tableNotReady?: boolean;
}

export default async function FinancePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: profile } = await supabase.from("profiles").select("school_id, role").eq("id", user!.id).single();
  const schoolId = profile?.school_id as string;
  const isFinance = ["headmaster","owner","accountant","admin"].includes(profile?.role ?? "");

  // Direct admin queries — no self-fetch
  const admin = createAdmin(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );

  const isTableMissing = (e: { code?: string; message?: string } | null) =>
    e?.code === "42P01" || e?.message?.includes("does not exist");

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);

  const [schoolWalletRes, pendingRes, monthIncomeRes, monthExpRes] = await Promise.all([
    admin.from("school_wallets").select("current_balance, total_income, total_expenses").eq("school_id", schoolId).single(),
    admin.from("expenses").select("id", { count: "exact", head: true }).eq("school_id", schoolId).eq("status", "pending"),
    admin.from("income_records").select("amount").eq("school_id", schoolId).gte("income_date", monthStart),
    admin.from("expenses").select("amount").eq("school_id", schoolId).eq("status", "approved").gte("expense_date", monthStart),
  ]);

  let dashboardData: DashboardData | null = null;
  if (!isTableMissing(schoolWalletRes.error)) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const monthly_income = ((monthIncomeRes.data ?? []) as any[]).reduce((s: number, r: { amount: number }) => s + Number(r.amount), 0);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const monthly_expenses = ((monthExpRes.data ?? []) as any[]).reduce((s: number, r: { amount: number }) => s + Number(r.amount), 0);
    const net_position = monthly_income - monthly_expenses;
    const balance = Number(schoolWalletRes.data?.current_balance ?? 0);
    const health_score = Math.min(100, Math.round(
      (balance > 0 ? 50 : 0) + (net_position >= 0 ? 30 : 0) + Math.min(20, (balance / 10000) * 20)
    ));
    dashboardData = {
      wallet: schoolWalletRes.data ?? undefined,
      monthly_income,
      monthly_expenses,
      net_position,
      health_score,
      pending_approvals: pendingRes.count ?? 0,
    };
  } else if (isTableMissing(schoolWalletRes.error)) {
    dashboardData = { tableNotReady: true };
  }

  const [schoolRes, walletRes, invoiceRes, paymentsRes, recentInvoicesRes, owingRes, classesRes] = await Promise.all([
    supabase.from("schools").select("id, name, address, phone, email, logo_url, headmaster_signature_url, motto").eq("id", schoolId!).single(),
    supabase.from("student_wallets").select("total_billed, total_paid, total_waived").eq("school_id", schoolId),
    supabase.from("student_invoices").select("status").eq("school_id", schoolId),
    supabase.from("payment_receipts")
      .select("*, student_id, students(id, first_name, last_name, admission_number, classrooms(name))")
      .eq("school_id", schoolId)
      .order("created_at", { ascending: false })
      .limit(20),
    supabase.from("student_invoices")
      .select("*, students(first_name, last_name, admission_number, classrooms(name))")
      .eq("school_id", schoolId)
      .order("created_at", { ascending: false })
      .limit(20),
    // Students with outstanding balance
    supabase.from("student_wallets")
      .select("student_id, total_billed, total_paid, total_waived, total_discounts, students(id, first_name, last_name, admission_number, class_id, classrooms(id, name))")
      .eq("school_id", schoolId)
      .gt("total_billed", 0),
    supabase.from("classrooms").select("id, name").eq("school_id", schoolId).order("name"),
  ]);

  // Wallet aggregates
  const wallets = walletRes.data ?? [];
  const totalBilled      = wallets.reduce((s, w) => s + Number(w.total_billed ?? 0), 0);
  const totalPaid        = wallets.reduce((s, w) => s + Number(w.total_paid ?? 0), 0);
  const totalWaived      = wallets.reduce((s, w) => s + Number(w.total_waived ?? 0), 0);
  const totalOutstanding = Math.max(0, totalBilled - totalPaid - totalWaived);
  const collectionRate   = totalBilled > 0 ? Math.round((totalPaid / totalBilled) * 100) : 0;

  // Invoice counts
  const invoices = invoiceRes.data ?? [];
  const paidCount    = invoices.filter(i => i.status === "paid").length;
  const partialCount = invoices.filter(i => i.status === "partial").length;
  const unpaidCount  = invoices.filter(i => i.status === "unpaid").length;

  const school = schoolRes.data;
  const receipts       = paymentsRes.data ?? [];
  const recentInvoices = recentInvoicesRes.data ?? [];

  // Build owing list
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const owingStudents = (owingRes.data ?? []).map((w: Record<string, any>) => {
    const outstanding = Math.max(0,
      Number(w.total_billed ?? 0) - Number(w.total_paid ?? 0) -
      Number(w.total_waived ?? 0) - Number(w.total_discounts ?? 0)
    );
    return {
      student_id: w.student_id,
      outstanding,
      total_billed: Number(w.total_billed ?? 0),
      total_paid: Number(w.total_paid ?? 0),
      student: w.students,
    };
  }).filter((w: { outstanding: number }) => w.outstanding > 0)
    .sort((a: { outstanding: number }, b: { outstanding: number }) => b.outstanding - a.outstanding);

  const statusVariant: Record<string, "success" | "warning" | "danger"> = {
    paid: "success", partial: "warning", unpaid: "danger",
  };

  return (
    <div className="space-y-6 pb-8">

      {/* School Wallet Card */}
      {dashboardData?.tableNotReady ? (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5">
          <p className="font-semibold text-amber-800 text-[14px]">Finance Module Setup Required</p>
          <p className="text-[13px] text-amber-700 mt-1">Run the SQL migration first to enable wallet and expense tracking.</p>
          <a href="/finance/setup" className="text-[12px] font-semibold text-amber-800 underline mt-2 inline-block">View setup instructions →</a>
        </div>
      ) : dashboardData ? (
        <div className="rounded-2xl border border-[var(--border)] shadow-[0_1px_6px_rgba(0,0,0,0.05)] overflow-hidden bg-white">
          <div className="px-5 py-4 border-b border-[var(--border)] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Wallet size={16} style={{ color: BRAND }} />
              <h3 className="text-[14px] font-bold text-[var(--text-strong)]">School Wallet</h3>
            </div>
            <Link href="/finance/wallet" className="text-[12px] font-semibold hover:underline" style={{ color: BRAND }}>
              View all transactions →
            </Link>
          </div>
          <div className="p-5">
            <div className="flex flex-wrap gap-6 items-center">
              {/* Balance */}
              <div className="min-w-[160px]">
                <p className="text-[11px] font-semibold text-[var(--text-muted)] uppercase tracking-wide">Current Balance</p>
                <p className="text-[30px] font-extrabold leading-tight mt-0.5" style={{ color: BRAND }}>
                  {formatCurrency(Number(dashboardData.wallet?.current_balance ?? 0))}
                </p>
              </div>
              {/* Divider */}
              <div className="hidden sm:block w-px h-12 bg-[var(--border)]" />
              {/* Stats */}
              <div className="flex flex-wrap gap-5 flex-1">
                {[
                  { label: "Monthly Income", value: formatCurrency(Number(dashboardData.monthly_income ?? 0)), color: "#16A34A" },
                  { label: "Monthly Expenses", value: formatCurrency(Number(dashboardData.monthly_expenses ?? 0)), color: "#DC2626" },
                  { label: "Net Position", value: formatCurrency(Number(dashboardData.net_position ?? 0)), color: Number(dashboardData.net_position ?? 0) >= 0 ? "#16A34A" : "#DC2626" },
                ].map(s => (
                  <div key={s.label}>
                    <p className="text-[11px] font-semibold text-[var(--text-muted)] uppercase tracking-wide">{s.label}</p>
                    <p className="text-[18px] font-extrabold mt-0.5" style={{ color: s.color }}>{s.value}</p>
                  </div>
                ))}
              </div>
              {/* Health Score */}
              <div className="flex items-center gap-3">
                {(dashboardData.pending_approvals ?? 0) > 0 && (
                  <Link href="/finance/expenses?status=pending"
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[12px] font-semibold bg-amber-50 border border-amber-200 text-amber-700 hover:bg-amber-100 transition-colors">
                    <AlertCircle size={13} />
                    {dashboardData.pending_approvals} Pending
                  </Link>
                )}
                <div className="relative w-14 h-14 shrink-0">
                  <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
                    <circle cx="18" cy="18" r="15.9" fill="none" stroke="#F3F4F6" strokeWidth="3" />
                    <circle cx="18" cy="18" r="15.9" fill="none"
                      stroke={
                        (dashboardData.health_score ?? 0) > 70 ? "#16A34A"
                        : (dashboardData.health_score ?? 0) > 40 ? "#D97706"
                        : "#DC2626"
                      }
                      strokeWidth="3"
                      strokeDasharray={`${(dashboardData.health_score ?? 0)}, 100`}
                      strokeLinecap="round" />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <Activity size={10} className="text-[var(--text-muted)]" />
                    <span className="text-[10px] font-bold text-[var(--text-strong)]">{dashboardData.health_score ?? 0}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-[20px] font-extrabold text-[var(--text-strong)]">Finance</h2>
          <p className="text-[13px] text-[var(--text-muted)] mt-0.5">Fee collection, invoices &amp; wallet balances</p>
        </div>
        {isFinance && (
          <Link href="/finance/record-payment"
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-[13px] font-bold text-white shadow-sm hover:opacity-90 transition-opacity"
            style={{ background: BRAND }}>
            <PlusCircle size={15} /> Record Payment
          </Link>
        )}
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          {
            label: "Total Billed",
            value: formatCurrency(totalBilled),
            sub: `${invoices.length} invoices`,
            icon: ReceiptText,
            iconBg: "#EEF2FF",
            iconColor: BRAND,
          },
          {
            label: "Collected",
            value: formatCurrency(totalPaid),
            sub: `${collectionRate}% collection rate`,
            icon: TrendingUp,
            iconBg: "#F0FDF4",
            iconColor: "#16A34A",
          },
          {
            label: "Outstanding",
            value: formatCurrency(totalOutstanding),
            sub: `${owingStudents.length} students owing`,
            icon: TrendingDown,
            iconBg: "#FFF7ED",
            iconColor: "#D97706",
          },
          {
            label: "Waived / Scholarship",
            value: formatCurrency(totalWaived),
            sub: `${paidCount} fully paid`,
            icon: Wallet,
            iconBg: "#FDF4FF",
            iconColor: ACCENT,
          },
        ].map((card) => (
          <div key={card.label} className="bg-white rounded-2xl border border-[#e8e4f3] p-5 shadow-sm flex items-start gap-4 border-l-4"
            style={{ borderLeftColor: card.iconColor }}>
            <div className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0" style={{ background: card.iconBg }}>
              <card.icon size={20} style={{ color: card.iconColor }} />
            </div>
            <div className="min-w-0">
              <p className="text-[11px] font-semibold text-[var(--text-muted)] uppercase tracking-wide">{card.label}</p>
              <p className="text-[22px] font-extrabold text-[var(--text-strong)] leading-tight mt-0.5">{card.value}</p>
              <p className="text-[11px] text-[var(--text-muted)] mt-0.5">{card.sub}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Collection rate bar */}
      <div className="bg-white rounded-2xl border border-[var(--border)] p-5 shadow-[0_1px_6px_rgba(0,0,0,0.05)]">
        <div className="flex items-center justify-between mb-3">
          <p className="text-[14px] font-bold text-[var(--text-strong)]">Collection Progress</p>
          <span className="text-[13px] font-extrabold" style={{ color: collectionRate >= 70 ? "#16A34A" : "#D97706" }}>
            {collectionRate}%
          </span>
        </div>
        <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
          <div className="h-full rounded-full transition-all duration-700"
            style={{ width: `${collectionRate}%`, background: collectionRate >= 70 ? "#16A34A" : "#D97706" }} />
        </div>
        <div className="flex justify-between mt-3 flex-wrap gap-2">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-green-500" />
              <span className="text-[11px] text-[var(--text-muted)]">Paid: <strong className="text-green-600">{paidCount}</strong></span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
              <span className="text-[11px] text-[var(--text-muted)]">Partial: <strong className="text-amber-600">{partialCount}</strong></span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-red-400" />
              <span className="text-[11px] text-[var(--text-muted)]">Unpaid: <strong className="text-red-600">{unpaidCount}</strong></span>
            </div>
          </div>
          <div className="text-[11px] text-[var(--text-muted)]">
            {invoices.length} total invoices · {wallets.length} student wallets
          </div>
        </div>
      </div>

      {/* Students Owing — interactive client component */}
      <FinanceOwingSection
        owingStudents={owingStudents}
        classes={classesRes.data ?? []}
        isFinance={isFinance}
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

        {/* Recent payments */}
        <div className="bg-white rounded-2xl border border-[var(--border)] shadow-[0_1px_6px_rgba(0,0,0,0.05)] overflow-hidden">
          <div className="px-5 py-4 border-b border-[var(--border)] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CreditCard size={16} style={{ color: BRAND }} />
              <h3 className="text-[14px] font-bold text-[var(--text-strong)]">Recent Payments</h3>
            </div>
            <span className="text-[11px] text-[var(--text-muted)]">{receipts.length} receipts</span>
          </div>
          <div className="divide-y divide-[var(--border)]">
            {receipts.length === 0 ? (
              <div className="px-5 py-10 text-center">
                <CreditCard size={28} className="text-[var(--text-muted)] opacity-30 mx-auto mb-2" />
                <p className="text-[13px] text-[var(--text-muted)]">No payments recorded yet.</p>
                {isFinance && (
                  <Link href="/finance/record-payment" className="text-[13px] font-semibold mt-1 inline-block" style={{ color: BRAND }}>
                    Record first payment →
                  </Link>
                )}
              </div>
            ) : receipts.map((r: {
              id: string; receipt_number: string; amount: number; payment_method: string;
              payment_date: string; created_at: string; student_id: string | null;
              reference?: string | null; notes?: string | null;
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              students: Record<string, any> | null;
            }) => (
              <div key={r.id} className="flex items-center gap-3 px-5 py-3 hover:bg-[var(--neutral-50)] transition-colors group">
                <div className="w-9 h-9 rounded-full flex items-center justify-center text-[10px] font-bold text-white shrink-0"
                  style={{ background: "linear-gradient(135deg,#262262,#92278F)" }}>
                  {r.students ? getInitials(`${r.students.first_name} ${r.students.last_name}`) : "?"}
                </div>
                <div className="flex-1 min-w-0">
                  {r.students?.id ? (
                    <Link href={`/students/${r.students.id}`} className="text-[13px] font-semibold text-[var(--text-strong)] truncate hover:text-[#262262] hover:underline block">
                      {r.students.first_name} {r.students.last_name}
                    </Link>
                  ) : (
                    <p className="text-[13px] font-semibold text-[var(--text-strong)] truncate">—</p>
                  )}
                  <p className="text-[11px] text-[var(--text-muted)] truncate">
                    {r.receipt_number} · {r.payment_method} · {r.students?.classrooms?.name ?? "—"}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <div className="text-right">
                    <p className="text-[14px] font-extrabold text-green-600">{formatCurrency(r.amount)}</p>
                    <p className="text-[10px] text-[var(--text-muted)]">{formatDate(r.payment_date ?? r.created_at)}</p>
                  </div>
                  <ReceiptPrintButton receipt={r} school={school} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Recent invoices */}
        <div className="bg-white rounded-2xl border border-[var(--border)] shadow-[0_1px_6px_rgba(0,0,0,0.05)] overflow-hidden">
          <div className="px-5 py-4 border-b border-[var(--border)] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Users size={16} style={{ color: ACCENT }} />
              <h3 className="text-[14px] font-bold text-[var(--text-strong)]">Recent Invoices</h3>
            </div>
            <span className="text-[11px] text-[var(--text-muted)]">{recentInvoices.length} shown</span>
          </div>
          <div className="divide-y divide-[var(--border)]">
            {recentInvoices.length === 0 ? (
              <div className="px-5 py-10 text-center">
                <ReceiptText size={28} className="text-[var(--text-muted)] opacity-30 mx-auto mb-2" />
                <p className="text-[13px] text-[var(--text-muted)]">No invoices yet. Admit a student to auto-generate invoices.</p>
              </div>
            ) : recentInvoices.map((inv: {
              id: string; invoice_number: string; total_amount: number; balance: number;
              status: string; created_at: string;
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              students: Record<string, any> | null;
            }) => (
              <div key={inv.id} className="flex items-center gap-3 px-5 py-3 hover:bg-[var(--neutral-50)] transition-colors">
                <div className="w-9 h-9 rounded-full flex items-center justify-center text-[10px] font-bold text-white shrink-0"
                  style={{ background: "linear-gradient(135deg,#92278F,#262262)" }}>
                  {inv.students ? getInitials(`${inv.students.first_name} ${inv.students.last_name}`) : "?"}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-semibold text-[var(--text-strong)] truncate">
                    {inv.students ? `${inv.students.first_name} ${inv.students.last_name}` : "—"}
                  </p>
                  <p className="text-[11px] text-[var(--text-muted)] truncate">
                    {inv.invoice_number} · {inv.students?.classrooms?.name ?? "—"}
                  </p>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <Badge variant={statusVariant[inv.status] ?? "default"}>{inv.status}</Badge>
                  <div className="text-right">
                    <p className="text-[13px] font-bold" style={{ color: inv.balance > 0 ? "#DC2626" : "#16A34A" }}>
                      {formatCurrency(inv.balance)}
                    </p>
                    <p className="text-[10px] text-[var(--text-muted)]">of {formatCurrency(inv.total_amount)}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
          {isFinance && (
            <div className="px-5 py-3 border-t border-[var(--border)] bg-[var(--neutral-50)]">
              <Link href="/finance/record-payment"
                className="flex items-center gap-1.5 text-[12px] font-semibold w-fit"
                style={{ color: BRAND }}>
                <ArrowUpRight size={13} /> Record a payment
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
