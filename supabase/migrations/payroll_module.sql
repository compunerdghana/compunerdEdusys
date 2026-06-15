-- ============================================================
-- COMPUNERDEDUSYS — Payroll Module
-- Run in Supabase SQL Editor
-- ============================================================

-- ─── 1. PAYROLL RUNS ────────────────────────────────────────
-- A "run" is one pay cycle (e.g. March 2025 salaries)
CREATE TABLE IF NOT EXISTS payroll_runs (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id    UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  month        INTEGER NOT NULL CHECK (month BETWEEN 1 AND 12),
  year         INTEGER NOT NULL,
  pay_date     DATE,
  status       TEXT NOT NULL DEFAULT 'draft'
               CHECK (status IN ('draft','processing','paid','cancelled')),
  total_gross  NUMERIC(12,2) NOT NULL DEFAULT 0,
  total_net    NUMERIC(12,2) NOT NULL DEFAULT 0,
  total_deductions NUMERIC(12,2) NOT NULL DEFAULT 0,
  notes        TEXT,
  created_by   UUID REFERENCES profiles(id),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (school_id, month, year)
);

-- ─── 2. PAYROLL RECORDS ────────────────────────────────────
-- One row per staff per payroll run
CREATE TABLE IF NOT EXISTS payroll_records (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payroll_run_id  UUID NOT NULL REFERENCES payroll_runs(id) ON DELETE CASCADE,
  school_id       UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  profile_id      UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  basic_salary    NUMERIC(12,2) NOT NULL DEFAULT 0,
  allowances      NUMERIC(12,2) NOT NULL DEFAULT 0,
  gross_salary    NUMERIC(12,2) GENERATED ALWAYS AS (basic_salary + allowances) STORED,
  ssnit_employee  NUMERIC(12,2) NOT NULL DEFAULT 0,  -- 5.5%
  ssnit_employer  NUMERIC(12,2) NOT NULL DEFAULT 0,  -- 13%
  income_tax      NUMERIC(12,2) NOT NULL DEFAULT 0,
  other_deductions NUMERIC(12,2) NOT NULL DEFAULT 0,
  total_deductions NUMERIC(12,2) GENERATED ALWAYS AS (ssnit_employee + income_tax + other_deductions) STORED,
  net_salary      NUMERIC(12,2) GENERATED ALWAYS AS (basic_salary + allowances - ssnit_employee - income_tax - other_deductions) STORED,
  payment_method  TEXT DEFAULT 'bank_transfer',
  account_number  TEXT,
  bank_name       TEXT,
  status          TEXT NOT NULL DEFAULT 'pending'
                  CHECK (status IN ('pending','paid','held')),
  paid_at         TIMESTAMPTZ,
  notes           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (payroll_run_id, profile_id)
);

-- ─── 3. PETTY CASH TRANSACTIONS (add recipient column) ──────
ALTER TABLE petty_cash_transactions ADD COLUMN IF NOT EXISTS recipient TEXT;
ALTER TABLE petty_cash_transactions ADD COLUMN IF NOT EXISTS category  TEXT;

-- ─── INDEXES ────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_payroll_runs_school   ON payroll_runs(school_id, year, month);
CREATE INDEX IF NOT EXISTS idx_payroll_records_run   ON payroll_records(payroll_run_id);
CREATE INDEX IF NOT EXISTS idx_payroll_records_staff ON payroll_records(profile_id);

-- ─── RLS ────────────────────────────────────────────────────
ALTER TABLE payroll_runs    ENABLE ROW LEVEL SECURITY;
ALTER TABLE payroll_records ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='payroll_runs' AND policyname='payroll_runs_school') THEN
    CREATE POLICY payroll_runs_school ON payroll_runs
      USING (school_id IN (SELECT school_id FROM profiles WHERE id = auth.uid()));
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='payroll_records' AND policyname='payroll_records_school') THEN
    CREATE POLICY payroll_records_school ON payroll_records
      USING (school_id IN (SELECT school_id FROM profiles WHERE id = auth.uid()));
  END IF;
END $$;
