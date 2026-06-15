import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { formatCurrency, formatDate } from "@/lib/utils";
import { Badge } from "@/components/ui/Badge";
import { Wallet, TrendingUp, TrendingDown, CreditCard, ArrowUpCircle, ArrowDownCircle } from "lucide-react";

const BRAND = "#262262";
const GRADIENT = "linear-gradient(135deg, #262262, #92278F)";

interface WalletData {
  current_balance: number;
  opening_balance: number;
  total_income: number;
  total_expenses: number;
  total_collections: number;
  tableNotReady?: boolean;
}

interface WalletTransaction {
  id: string;
  description: string;
  category: string;
  transaction_type: "credit" | "debit";
  amount: number;
  balance_after: number;
  created_at: string;
}

interface TransactionsData {
  data: WalletTransaction[];
  tableNotReady?: boolean;
}

async function fetchWallet(schoolId: string): Promise<WalletData | null> {
  try {
    const res = await fetch(`${process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"}/api/admin/finance/wallet?schoolId=${schoolId}`, { cache: "no-store" });
    if (!res.ok) return null;
    return res.json();
  } catch { return null; }
}

async function fetchTransactions(schoolId: string): Promise<TransactionsData | null> {
  try {
    const res = await fetch(`${process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"}/api/admin/finance/wallet/transactions?schoolId=${schoolId}&limit=20`, { cache: "no-store" });
    if (!res.ok) return null;
    return res.json();
  } catch { return null; }
}

export default async function WalletPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: profile } = await supabase.from("profiles").select("school_id, role").eq("id", user!.id).single();

  if (!["owner", "headmaster", "accountant"].includes(profile?.role ?? "")) {
    redirect("/dashboard");
  }

  const schoolId = profile?.school_id;
  const [wallet, txData] = await Promise.all([
    fetchWallet(schoolId!),
    fetchTransactions(schoolId!),
  ]);

  const tableNotReady = wallet?.tableNotReady || txData?.tableNotReady;
  const transactions = txData?.data ?? [];

  const categoryVariant: Record<string, "success" | "info" | "brand" | "warning" | "danger" | "default"> = {
    "Fee Collection": "success",
    "Income": "info",
    "Expense": "danger",
    "Petty Cash": "warning",
    "General": "default",
  };

  return (
    <div className="space-y-6 pb-8">
      {/* Header */}
      <div>
        <h2 className="text-[20px] font-extrabold text-[var(--text-strong)]">School Wallet</h2>
        <p className="text-[13px] text-[var(--text-muted)] mt-0.5">Central school fund — tracks all money in and out</p>
      </div>

      {tableNotReady && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5">
          <p className="font-semibold text-amber-800 text-[14px]">Finance Module Setup Required</p>
          <p className="text-[13px] text-amber-700 mt-1">Run the SQL migration first to enable this feature.</p>
          <a href="/finance/setup" className="text-[12px] font-semibold text-amber-800 underline mt-2 inline-block">View setup instructions →</a>
        </div>
      )}

      {/* Main Balance Card */}
      <div className="rounded-2xl p-6 text-white shadow-[0_4px_20px_rgba(38,34,98,0.25)]" style={{ background: GRADIENT }}>
        <div className="flex items-center gap-2 mb-1">
          <Wallet size={16} className="opacity-80" />
          <span className="text-[12px] font-semibold uppercase tracking-wide opacity-80">Current Balance</span>
        </div>
        <p className="text-[42px] font-extrabold leading-tight">
          {wallet ? formatCurrency(Number(wallet.current_balance)) : "GH₵ —"}
        </p>
        <p className="text-[12px] opacity-70 mt-1">Opening balance: {wallet ? formatCurrency(Number(wallet.opening_balance)) : "—"}</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Total Collections", value: wallet ? formatCurrency(Number(wallet.total_collections)) : "—", sub: "Student fees paid", icon: CreditCard, iconBg: "#F0FDF4", iconColor: "#16A34A" },
          { label: "Other Income", value: wallet ? formatCurrency(Number(wallet.total_income)) : "—", sub: "Donations, grants etc.", icon: TrendingUp, iconBg: "#EEF2FF", iconColor: BRAND },
          { label: "Total Expenses", value: wallet ? formatCurrency(Number(wallet.total_expenses)) : "—", sub: "Approved expenses", icon: TrendingDown, iconBg: "#FEF2F2", iconColor: "#DC2626" },
          {
            label: "Net Position",
            value: wallet ? formatCurrency(Number(wallet.total_collections) + Number(wallet.total_income) - Number(wallet.total_expenses)) : "—",
            sub: "Income minus expenses",
            icon: Wallet,
            iconBg: "#FDF4FF",
            iconColor: "#92278F",
          },
        ].map(card => (
          <div key={card.label} className="bg-white rounded-2xl border border-[var(--border)] p-5 shadow-[0_1px_6px_rgba(0,0,0,0.05)] flex items-start gap-4">
            <div className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0" style={{ background: card.iconBg }}>
              <card.icon size={20} style={{ color: card.iconColor }} />
            </div>
            <div className="min-w-0">
              <p className="text-[11px] font-semibold text-[var(--text-muted)] uppercase tracking-wide">{card.label}</p>
              <p className="text-[18px] font-extrabold text-[var(--text-strong)] leading-tight mt-0.5">{card.value}</p>
              <p className="text-[11px] text-[var(--text-muted)] mt-0.5">{card.sub}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Transactions Table */}
      <div className="bg-white rounded-2xl border border-[var(--border)] shadow-[0_1px_6px_rgba(0,0,0,0.05)] overflow-hidden">
        <div className="px-5 py-4 border-b border-[var(--border)] flex items-center justify-between">
          <h3 className="text-[14px] font-bold text-[var(--text-strong)]">Recent Transactions</h3>
          <span className="text-[11px] text-[var(--text-muted)]">Last {transactions.length}</span>
        </div>

        {transactions.length === 0 ? (
          <div className="px-5 py-12 text-center">
            <Wallet size={28} className="mx-auto mb-2 opacity-20 text-[var(--text-muted)]" />
            <p className="text-[13px] text-[var(--text-muted)]">No transactions yet.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-[13px]">
              <thead>
                <tr className="border-b border-[var(--border)] bg-[var(--neutral-50)]">
                  {["Date", "Description", "Category", "Type", "Amount", "Balance After"].map(h => (
                    <th key={h} className="px-5 py-3 text-left text-[11px] font-semibold text-[var(--text-muted)] uppercase tracking-wide whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                {transactions.map(tx => (
                  <tr key={tx.id} className="hover:bg-[var(--neutral-50)] transition-colors">
                    <td className="px-5 py-3 text-[var(--text-muted)] whitespace-nowrap">{formatDate(tx.created_at)}</td>
                    <td className="px-5 py-3 font-semibold text-[var(--text-strong)] max-w-[200px] truncate">{tx.description}</td>
                    <td className="px-5 py-3">
                      <Badge variant={categoryVariant[tx.category] ?? "default"}>{tx.category}</Badge>
                    </td>
                    <td className="px-5 py-3">
                      <span className={`inline-flex items-center gap-1 text-[11px] font-semibold ${tx.transaction_type === "credit" ? "text-green-600" : "text-red-600"}`}>
                        {tx.transaction_type === "credit"
                          ? <ArrowDownCircle size={12} />
                          : <ArrowUpCircle size={12} />}
                        {tx.transaction_type === "credit" ? "Credit" : "Debit"}
                      </span>
                    </td>
                    <td className={`px-5 py-3 font-bold ${tx.transaction_type === "credit" ? "text-green-600" : "text-red-600"}`}>
                      {tx.transaction_type === "credit" ? "+" : "-"}{formatCurrency(Number(tx.amount))}
                    </td>
                    <td className="px-5 py-3 text-[var(--text-muted)]">{formatCurrency(Number(tx.balance_after))}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
