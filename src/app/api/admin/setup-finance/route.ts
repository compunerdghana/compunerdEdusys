/**
 * GET  /api/admin/setup-finance  → returns migration SQL
 * POST /api/admin/setup-finance  → runs migration (optional direct run)
 */
import { createClient } from "@supabase/supabase-js";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

function getAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
}

export const FINANCE_MIGRATION_SQL = `
-- ════════════════════════════════════════════════════════════════
-- SCHOOL FINANCE MODULE MIGRATION
-- Run once in Supabase SQL Editor
-- ════════════════════════════════════════════════════════════════

-- 1. SCHOOL WALLET (central financial ledger)
CREATE TABLE IF NOT EXISTS school_wallets (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id         UUID UNIQUE NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  opening_balance   DECIMAL(15,2) DEFAULT 0,
  current_balance   DECIMAL(15,2) DEFAULT 0,
  total_income      DECIMAL(15,2) DEFAULT 0,
  total_expenses    DECIMAL(15,2) DEFAULT 0,
  total_collections DECIMAL(15,2) DEFAULT 0,
  total_waivers     DECIMAL(15,2) DEFAULT 0,
  total_discounts   DECIMAL(15,2) DEFAULT 0,
  last_updated      TIMESTAMPTZ DEFAULT NOW(),
  created_at        TIMESTAMPTZ DEFAULT NOW()
);

-- 2. SCHOOL WALLET LEDGER
CREATE TABLE IF NOT EXISTS school_wallet_transactions (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id      UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  wallet_id      UUID NOT NULL REFERENCES school_wallets(id),
  type           TEXT NOT NULL CHECK (type IN ('credit','debit')),
  category       TEXT NOT NULL,
  reference_type TEXT,
  reference_id   UUID,
  amount         DECIMAL(15,2) NOT NULL,
  balance_before DECIMAL(15,2) NOT NULL DEFAULT 0,
  balance_after  DECIMAL(15,2) NOT NULL DEFAULT 0,
  description    TEXT,
  created_by     UUID REFERENCES auth.users(id),
  created_at     TIMESTAMPTZ DEFAULT NOW()
);

-- 3. EXPENSE CATEGORIES
CREATE TABLE IF NOT EXISTS expense_categories (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id  UUID REFERENCES schools(id) ON DELETE CASCADE,
  name       TEXT NOT NULL,
  is_system  BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Preload system categories
INSERT INTO expense_categories (name, is_system) VALUES
  ('Utilities',         true), ('Electricity',        true), ('Water',            true),
  ('Internet',          true), ('Fuel',               true), ('Printing',         true),
  ('Stationery',        true), ('Teaching Materials', true), ('Maintenance',      true),
  ('Repairs',           true), ('Furniture',          true), ('Equipment',        true),
  ('Security',          true), ('Cleaning',           true), ('Events',           true),
  ('Sports',            true), ('Payroll',            true), ('Rent',             true),
  ('Transport',         true), ('Staff Welfare',      true), ('Other',            true)
ON CONFLICT DO NOTHING;

-- 4. EXPENSES
CREATE TABLE IF NOT EXISTS expenses (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id             UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  expense_date          DATE NOT NULL,
  category_id           UUID REFERENCES expense_categories(id),
  title                 TEXT NOT NULL,
  description           TEXT,
  amount                DECIMAL(15,2) NOT NULL,
  supplier              TEXT,
  payment_method        TEXT,
  reference_number      TEXT,
  department            TEXT,
  branch                TEXT,
  status                TEXT DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected','changes_requested','voided')),
  attachment_urls       TEXT[] DEFAULT '{}',
  rejection_reason      TEXT,
  wallet_transaction_id UUID REFERENCES school_wallet_transactions(id),
  created_by            UUID REFERENCES auth.users(id),
  approved_by           UUID REFERENCES auth.users(id),
  approved_at           TIMESTAMPTZ,
  created_at            TIMESTAMPTZ DEFAULT NOW(),
  updated_at            TIMESTAMPTZ DEFAULT NOW()
);

-- 5. INCOME (non-fee)
CREATE TABLE IF NOT EXISTS income_records (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id             UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  income_date           DATE NOT NULL,
  type                  TEXT NOT NULL,
  title                 TEXT NOT NULL,
  description           TEXT,
  amount                DECIMAL(15,2) NOT NULL,
  source                TEXT,
  payment_method        TEXT,
  reference_number      TEXT,
  attachment_urls       TEXT[] DEFAULT '{}',
  wallet_transaction_id UUID REFERENCES school_wallet_transactions(id),
  created_by            UUID REFERENCES auth.users(id),
  created_at            TIMESTAMPTZ DEFAULT NOW()
);

-- 6. BUDGETS
CREATE TABLE IF NOT EXISTS budgets (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id        UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  name             TEXT NOT NULL,
  category_id      UUID REFERENCES expense_categories(id),
  period_start     DATE NOT NULL,
  period_end       DATE NOT NULL,
  allocated_amount DECIMAL(15,2) NOT NULL,
  used_amount      DECIMAL(15,2) DEFAULT 0,
  created_by       UUID REFERENCES auth.users(id),
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

-- 7. PETTY CASH
CREATE TABLE IF NOT EXISTS petty_cash_accounts (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id       UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,
  opening_amount  DECIMAL(15,2) DEFAULT 0,
  current_balance DECIMAL(15,2) DEFAULT 0,
  allocated_to    TEXT,
  allocation_date DATE,
  created_by      UUID REFERENCES auth.users(id),
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- 8. BANK ACCOUNTS
CREATE TABLE IF NOT EXISTS school_bank_accounts (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id      UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  account_name   TEXT NOT NULL,
  account_number TEXT,
  bank           TEXT NOT NULL,
  branch         TEXT,
  balance        DECIMAL(15,2) DEFAULT 0,
  account_type   TEXT DEFAULT 'savings',
  is_active      BOOLEAN DEFAULT TRUE,
  created_at     TIMESTAMPTZ DEFAULT NOW()
);

-- 9. FINANCE TRANSFERS
CREATE TABLE IF NOT EXISTS finance_transfers (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id   UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  from_type   TEXT NOT NULL,
  from_id     UUID,
  to_type     TEXT NOT NULL,
  to_id       UUID,
  amount      DECIMAL(15,2) NOT NULL,
  description TEXT,
  created_by  UUID REFERENCES auth.users(id),
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- 10. FINANCE AUDIT LOG
CREATE TABLE IF NOT EXISTS finance_audit_log (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id      UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  user_id        UUID REFERENCES auth.users(id),
  action         TEXT NOT NULL,
  entity_type    TEXT NOT NULL,
  entity_id      UUID,
  amount         DECIMAL(15,2),
  balance_before DECIMAL(15,2),
  balance_after  DECIMAL(15,2),
  metadata       JSONB,
  created_at     TIMESTAMPTZ DEFAULT NOW()
);

-- ── RLS ───────────────────────────────────────────────────────────
ALTER TABLE school_wallets             ENABLE ROW LEVEL SECURITY;
ALTER TABLE school_wallet_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE expense_categories         ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses                   ENABLE ROW LEVEL SECURITY;
ALTER TABLE income_records             ENABLE ROW LEVEL SECURITY;
ALTER TABLE budgets                    ENABLE ROW LEVEL SECURITY;
ALTER TABLE petty_cash_accounts        ENABLE ROW LEVEL SECURITY;
ALTER TABLE school_bank_accounts       ENABLE ROW LEVEL SECURITY;
ALTER TABLE finance_transfers          ENABLE ROW LEVEL SECURITY;
ALTER TABLE finance_audit_log          ENABLE ROW LEVEL SECURITY;

-- Allow school members to read their own data
CREATE POLICY IF NOT EXISTS "school_read_wallet" ON school_wallets FOR SELECT
  USING (school_id IN (SELECT school_id FROM profiles WHERE id = auth.uid()));
CREATE POLICY IF NOT EXISTS "school_read_wallet_tx" ON school_wallet_transactions FOR SELECT
  USING (school_id IN (SELECT school_id FROM profiles WHERE id = auth.uid()));
CREATE POLICY IF NOT EXISTS "school_read_expense_cats" ON expense_categories FOR SELECT
  USING (school_id IS NULL OR school_id IN (SELECT school_id FROM profiles WHERE id = auth.uid()));
CREATE POLICY IF NOT EXISTS "school_read_expenses" ON expenses FOR SELECT
  USING (school_id IN (SELECT school_id FROM profiles WHERE id = auth.uid()));
CREATE POLICY IF NOT EXISTS "school_read_income" ON income_records FOR SELECT
  USING (school_id IN (SELECT school_id FROM profiles WHERE id = auth.uid()));
CREATE POLICY IF NOT EXISTS "school_read_budgets" ON budgets FOR SELECT
  USING (school_id IN (SELECT school_id FROM profiles WHERE id = auth.uid()));
CREATE POLICY IF NOT EXISTS "school_read_petty_cash" ON petty_cash_accounts FOR SELECT
  USING (school_id IN (SELECT school_id FROM profiles WHERE id = auth.uid()));
CREATE POLICY IF NOT EXISTS "school_read_bank" ON school_bank_accounts FOR SELECT
  USING (school_id IN (SELECT school_id FROM profiles WHERE id = auth.uid()));
CREATE POLICY IF NOT EXISTS "school_read_transfers" ON finance_transfers FOR SELECT
  USING (school_id IN (SELECT school_id FROM profiles WHERE id = auth.uid()));
CREATE POLICY IF NOT EXISTS "school_read_audit" ON finance_audit_log FOR SELECT
  USING (school_id IN (SELECT school_id FROM profiles WHERE id = auth.uid()));
`;

export async function GET() {
  // Check which tables already exist
  const checks = await Promise.all([
    getAdmin().from("school_wallets").select("id").limit(1),
    getAdmin().from("expenses").select("id").limit(1),
    getAdmin().from("income_records").select("id").limit(1),
  ]);

  const walletReady  = !checks[0].error;
  const expenseReady = !checks[1].error;
  const incomeReady  = !checks[2].error;
  const allReady = walletReady && expenseReady && incomeReady;

  return NextResponse.json({ allReady, walletReady, expenseReady, incomeReady, sql: FINANCE_MIGRATION_SQL });
}
