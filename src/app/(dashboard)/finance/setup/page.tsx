import { createClient } from "@/lib/supabase/server";
import { createClient as createAdmin } from "@supabase/supabase-js";
import { redirect } from "next/navigation";
import { CheckCircle2, XCircle, Database } from "lucide-react";
import { SetupCopyButton } from "./SetupCopyButton";

const BRAND = "#262262";

interface SetupStatus {
  school_wallet: boolean;
  finance_expenses: boolean;
  finance_income: boolean;
  finance_budgets: boolean;
  petty_cash_accounts: boolean;
  bank_accounts: boolean;
  allReady: boolean;
}

const MIGRATION_SQL = `-- CompunerdEduSys Finance Module Migration
-- Run this in your Supabase SQL Editor

-- School Wallet
CREATE TABLE IF NOT EXISTS school_wallet (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  current_balance numeric(14,2) NOT NULL DEFAULT 0,
  opening_balance numeric(14,2) NOT NULL DEFAULT 0,
  total_income numeric(14,2) NOT NULL DEFAULT 0,
  total_expenses numeric(14,2) NOT NULL DEFAULT 0,
  total_collections numeric(14,2) NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(school_id)
);

-- Wallet Transactions
CREATE TABLE IF NOT EXISTS wallet_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  description text NOT NULL,
  category text NOT NULL DEFAULT 'General',
  transaction_type text NOT NULL CHECK (transaction_type IN ('credit','debit')),
  amount numeric(14,2) NOT NULL,
  balance_after numeric(14,2) NOT NULL,
  reference_type text,
  reference_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Finance Income
CREATE TABLE IF NOT EXISTS finance_income (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  income_date date NOT NULL,
  title text NOT NULL,
  type text NOT NULL,
  description text,
  amount numeric(14,2) NOT NULL,
  source text,
  payment_method text,
  reference text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Finance Budgets
CREATE TABLE IF NOT EXISTS finance_budgets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  budget_name text NOT NULL,
  category text NOT NULL,
  period_start date NOT NULL,
  period_end date NOT NULL,
  allocated_amount numeric(14,2) NOT NULL,
  used_amount numeric(14,2) NOT NULL DEFAULT 0,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Finance Expenses
CREATE TABLE IF NOT EXISTS finance_expenses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  expense_date date NOT NULL,
  title text NOT NULL,
  category text NOT NULL,
  description text,
  amount numeric(14,2) NOT NULL,
  payment_method text,
  reference text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
  approved_by uuid REFERENCES profiles(id),
  approved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Petty Cash Accounts
CREATE TABLE IF NOT EXISTS petty_cash_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  account_name text NOT NULL,
  allocated_to text NOT NULL,
  opening_amount numeric(14,2) NOT NULL,
  current_balance numeric(14,2) NOT NULL,
  allocation_date date NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Bank Accounts
CREATE TABLE IF NOT EXISTS bank_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  bank_name text NOT NULL,
  account_name text NOT NULL,
  account_number text NOT NULL,
  account_type text NOT NULL DEFAULT 'Savings',
  opening_balance numeric(14,2) NOT NULL DEFAULT 0,
  current_balance numeric(14,2) NOT NULL DEFAULT 0,
  branch text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- RLS Policies (adjust as needed)
ALTER TABLE school_wallet ENABLE ROW LEVEL SECURITY;
ALTER TABLE wallet_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE finance_income ENABLE ROW LEVEL SECURITY;
ALTER TABLE finance_budgets ENABLE ROW LEVEL SECURITY;
ALTER TABLE finance_expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE petty_cash_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE bank_accounts ENABLE ROW LEVEL SECURITY;`;

const TABLE_CHECKLIST = [
  { key: "school_wallet", label: "School Wallet" },
  { key: "finance_expenses", label: "Expenses" },
  { key: "finance_income", label: "Income Records" },
  { key: "finance_budgets", label: "Budgets" },
  { key: "petty_cash_accounts", label: "Petty Cash Accounts" },
  { key: "bank_accounts", label: "Bank Accounts" },
] as const;

export default async function FinanceSetupPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: profile } = await supabase.from("profiles").select("school_id, role").eq("id", user!.id).single();

  if (!["owner", "headmaster", "accountant"].includes(profile?.role ?? "")) {
    redirect("/dashboard");
  }

  const admin = createAdmin(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
  const ok = (e: { code?: string; message?: string } | null) =>
    !(e?.code === "42P01" || e?.message?.includes("does not exist"));

  const checks = await Promise.all([
    admin.from("school_wallets").select("id").limit(1),
    admin.from("expenses").select("id").limit(1),
    admin.from("income_records").select("id").limit(1),
    admin.from("budgets").select("id").limit(1),
    admin.from("petty_cash_accounts").select("id").limit(1),
    admin.from("school_bank_accounts").select("id").limit(1),
  ]);

  const status: SetupStatus = {
    school_wallet: ok(checks[0].error),
    finance_expenses: ok(checks[1].error),
    finance_income: ok(checks[2].error),
    finance_budgets: ok(checks[3].error),
    petty_cash_accounts: ok(checks[4].error),
    bank_accounts: ok(checks[5].error),
    allReady: checks.every(c => ok(c.error)),
  };

  return (
    <div className="space-y-6 pb-8 max-w-3xl">
      {/* Header */}
      <div>
        <h2 className="text-[20px] font-extrabold text-[var(--text-strong)]">Finance Module Setup</h2>
        <p className="text-[13px] text-[var(--text-muted)] mt-0.5">Run the migration to activate all finance features</p>
      </div>

      {/* Status Card */}
      <div className={`rounded-2xl border p-6 shadow-[0_1px_6px_rgba(0,0,0,0.05)] ${status?.allReady ? "bg-green-50 border-green-200" : "bg-amber-50 border-amber-200"}`}>
        <div className="flex items-center gap-3 mb-4">
          {status?.allReady ? (
            <CheckCircle2 size={24} className="text-green-600 shrink-0" />
          ) : (
            <Database size={24} className="text-amber-600 shrink-0" />
          )}
          <div>
            <p className={`text-[15px] font-bold ${status?.allReady ? "text-green-800" : "text-amber-800"}`}>
              {status?.allReady ? "Finance Module is Active" : "Finance Module Setup Required"}
            </p>
            <p className={`text-[13px] mt-0.5 ${status?.allReady ? "text-green-700" : "text-amber-700"}`}>
              {status?.allReady
                ? "All database tables are ready. You can use all finance features."
                : "Some required database tables are missing. Run the SQL migration in Supabase."}
            </p>
          </div>
        </div>

        {/* Checklist */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {TABLE_CHECKLIST.map(item => {
            const ready = status ? status[item.key] : false;
            return (
              <div key={item.key} className={`flex items-center gap-2 px-3 py-2 rounded-xl text-[12px] font-semibold ${ready ? "bg-green-100 text-green-800" : "bg-amber-100 text-amber-800"}`}>
                {ready ? <CheckCircle2 size={13} /> : <XCircle size={13} />}
                {item.label}
              </div>
            );
          })}
        </div>
      </div>

      {/* Instructions */}
      {!status?.allReady && (
        <>
          <div className="bg-white rounded-2xl border border-[var(--border)] shadow-[0_1px_6px_rgba(0,0,0,0.05)] p-5">
            <h3 className="text-[14px] font-bold text-[var(--text-strong)] mb-3">How to apply the migration</h3>
            <ol className="space-y-2">
              {[
                "Go to your Supabase project dashboard",
                'Open the "SQL Editor" from the left sidebar',
                "Click \"New query\"",
                "Copy the SQL below and paste it into the editor",
                'Click "Run" (or press Ctrl+Enter)',
                "Come back here and refresh — all checkmarks should turn green",
              ].map((step, i) => (
                <li key={i} className="flex items-start gap-2 text-[13px] text-[var(--text-muted)]">
                  <span className="w-5 h-5 rounded-full text-[11px] font-bold text-white flex items-center justify-center shrink-0 mt-0.5" style={{ background: BRAND }}>
                    {i + 1}
                  </span>
                  {step}
                </li>
              ))}
            </ol>
          </div>

          <div className="bg-white rounded-2xl border border-[var(--border)] shadow-[0_1px_6px_rgba(0,0,0,0.05)] overflow-hidden">
            <div className="px-5 py-3 border-b border-[var(--border)] flex items-center justify-between">
              <h3 className="text-[14px] font-bold text-[var(--text-strong)]">SQL Migration</h3>
              <SetupCopyButton sql={MIGRATION_SQL} />
            </div>
            <pre className="px-5 py-4 text-[11px] text-[var(--text-muted)] overflow-x-auto leading-relaxed font-mono bg-[var(--neutral-50)]">
              {MIGRATION_SQL}
            </pre>
          </div>
        </>
      )}
    </div>
  );
}
