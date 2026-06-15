import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

export async function GET() {
  return new Response(SQL, { headers: { "Content-Type": "text/plain" } });
}

export async function POST() {
  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
  const { error } = await getAdmin().from("student_wallets").select("id").limit(1);
  const missing = error?.message?.includes("relation") || error?.message?.includes("does not exist");
  return NextResponse.json({ ok: !missing, sql: missing ? SQL : null });
}

const SQL = `
-- ══════════════════════════════════════════════════════════════════
--  CompunerdEduSys — Core Business Logic & ERP Schema
--  Run once in Supabase SQL Editor
-- ══════════════════════════════════════════════════════════════════

-- ── activity_feed ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.activity_feed (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id    uuid REFERENCES public.schools(id) ON DELETE CASCADE,
  actor_id     uuid REFERENCES public.profiles(id),
  entity_type  text NOT NULL,
  entity_id    uuid,
  action       text NOT NULL,
  title        text NOT NULL,
  description  text,
  meta         jsonb DEFAULT '{}',
  created_at   timestamptz DEFAULT now()
);
ALTER TABLE public.activity_feed ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "activity_school" ON public.activity_feed;
CREATE POLICY "activity_school" ON public.activity_feed
  USING (school_id IN (SELECT school_id FROM public.profiles WHERE id = auth.uid()));

-- ── audit_logs ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id    uuid REFERENCES public.schools(id) ON DELETE CASCADE,
  actor_id     uuid REFERENCES public.profiles(id),
  action       text NOT NULL,
  table_name   text NOT NULL,
  record_id    uuid,
  before_val   jsonb,
  after_val    jsonb,
  reason       text,
  ip_address   text,
  created_at   timestamptz DEFAULT now()
);
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "audit_school" ON public.audit_logs;
CREATE POLICY "audit_school" ON public.audit_logs
  USING (school_id IN (SELECT school_id FROM public.profiles WHERE id = auth.uid()));

-- ── fee_structures ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.fee_structures (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id       uuid REFERENCES public.schools(id) ON DELETE CASCADE,
  name            text NOT NULL,
  academic_year   text,
  term_id         uuid REFERENCES public.terms(id),
  class_id        uuid REFERENCES public.classrooms(id),
  level           text,
  is_active       boolean DEFAULT true,
  created_by      uuid REFERENCES public.profiles(id),
  created_at      timestamptz DEFAULT now(),
  updated_at      timestamptz DEFAULT now()
);
ALTER TABLE public.fee_structures ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "fee_structures_school" ON public.fee_structures;
CREATE POLICY "fee_structures_school" ON public.fee_structures
  USING (school_id IN (SELECT school_id FROM public.profiles WHERE id = auth.uid()))
  WITH CHECK (school_id IN (SELECT school_id FROM public.profiles WHERE id = auth.uid()));

-- ── fee_structure_items ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.fee_structure_items (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  fee_structure_id    uuid REFERENCES public.fee_structures(id) ON DELETE CASCADE,
  school_id           uuid REFERENCES public.schools(id) ON DELETE CASCADE,
  name                text NOT NULL,
  amount              numeric(12,2) NOT NULL DEFAULT 0,
  is_mandatory        boolean DEFAULT true,
  sort_order          int DEFAULT 0,
  created_at          timestamptz DEFAULT now()
);
ALTER TABLE public.fee_structure_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "fsi_school" ON public.fee_structure_items;
CREATE POLICY "fsi_school" ON public.fee_structure_items
  USING (school_id IN (SELECT school_id FROM public.profiles WHERE id = auth.uid()))
  WITH CHECK (school_id IN (SELECT school_id FROM public.profiles WHERE id = auth.uid()));

-- ── student_wallets ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.student_wallets (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id           uuid REFERENCES public.schools(id) ON DELETE CASCADE,
  student_id          uuid UNIQUE REFERENCES public.students(id) ON DELETE CASCADE,
  wallet_number       text UNIQUE,
  current_balance     numeric(12,2) DEFAULT 0,
  total_billed        numeric(12,2) DEFAULT 0,
  total_paid          numeric(12,2) DEFAULT 0,
  total_waived        numeric(12,2) DEFAULT 0,
  total_discounts     numeric(12,2) DEFAULT 0,
  outstanding_balance numeric(12,2) GENERATED ALWAYS AS (total_billed - total_paid - total_waived - total_discounts) STORED,
  is_active           boolean DEFAULT true,
  created_at          timestamptz DEFAULT now(),
  updated_at          timestamptz DEFAULT now()
);
ALTER TABLE public.student_wallets ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "wallets_school" ON public.student_wallets;
CREATE POLICY "wallets_school" ON public.student_wallets
  USING (school_id IN (SELECT school_id FROM public.profiles WHERE id = auth.uid()))
  WITH CHECK (school_id IN (SELECT school_id FROM public.profiles WHERE id = auth.uid()));

-- ── wallet_transactions ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.wallet_transactions (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_id       uuid REFERENCES public.student_wallets(id) ON DELETE CASCADE,
  school_id       uuid REFERENCES public.schools(id) ON DELETE CASCADE,
  student_id      uuid REFERENCES public.students(id) ON DELETE CASCADE,
  type            text NOT NULL CHECK (type IN ('debit','credit')),
  category        text NOT NULL,
  amount          numeric(12,2) NOT NULL,
  balance_after   numeric(12,2),
  reference       text,
  description     text,
  invoice_id      uuid,
  recorded_by     uuid REFERENCES public.profiles(id),
  created_at      timestamptz DEFAULT now()
);
ALTER TABLE public.wallet_transactions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "wallet_tx_school" ON public.wallet_transactions;
CREATE POLICY "wallet_tx_school" ON public.wallet_transactions
  USING (school_id IN (SELECT school_id FROM public.profiles WHERE id = auth.uid()))
  WITH CHECK (school_id IN (SELECT school_id FROM public.profiles WHERE id = auth.uid()));

-- ── student_invoices ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.student_invoices (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_number      text UNIQUE,
  school_id           uuid REFERENCES public.schools(id) ON DELETE CASCADE,
  student_id          uuid REFERENCES public.students(id) ON DELETE CASCADE,
  term_id             uuid REFERENCES public.terms(id),
  fee_structure_id    uuid REFERENCES public.fee_structures(id),
  total_amount        numeric(12,2) DEFAULT 0,
  amount_paid         numeric(12,2) DEFAULT 0,
  amount_waived       numeric(12,2) DEFAULT 0,
  amount_discounted   numeric(12,2) DEFAULT 0,
  balance             numeric(12,2) DEFAULT 0,
  status              text DEFAULT 'unpaid' CHECK (status IN ('unpaid','partial','paid','waived','cancelled')),
  due_date            date,
  notes               text,
  created_by          uuid REFERENCES public.profiles(id),
  created_at          timestamptz DEFAULT now(),
  updated_at          timestamptz DEFAULT now()
);
ALTER TABLE public.student_invoices ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "invoices_school" ON public.student_invoices;
CREATE POLICY "invoices_school" ON public.student_invoices
  USING (school_id IN (SELECT school_id FROM public.profiles WHERE id = auth.uid()))
  WITH CHECK (school_id IN (SELECT school_id FROM public.profiles WHERE id = auth.uid()));

-- ── student_invoice_lines ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.student_invoice_lines (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id      uuid REFERENCES public.student_invoices(id) ON DELETE CASCADE,
  school_id       uuid REFERENCES public.schools(id) ON DELETE CASCADE,
  item_name       text NOT NULL,
  amount          numeric(12,2) NOT NULL DEFAULT 0,
  amount_paid     numeric(12,2) DEFAULT 0,
  is_mandatory    boolean DEFAULT true,
  sort_order      int DEFAULT 0
);
ALTER TABLE public.student_invoice_lines ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "invoice_lines_school" ON public.student_invoice_lines;
CREATE POLICY "invoice_lines_school" ON public.student_invoice_lines
  USING (school_id IN (SELECT school_id FROM public.profiles WHERE id = auth.uid()))
  WITH CHECK (school_id IN (SELECT school_id FROM public.profiles WHERE id = auth.uid()));

-- ── fee_waivers ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.fee_waivers (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id       uuid REFERENCES public.schools(id) ON DELETE CASCADE,
  student_id      uuid REFERENCES public.students(id) ON DELETE CASCADE,
  invoice_id      uuid REFERENCES public.student_invoices(id),
  waiver_type     text NOT NULL,
  amount          numeric(12,2) NOT NULL DEFAULT 0,
  percentage      numeric(5,2),
  reason          text NOT NULL,
  approved_by     uuid REFERENCES public.profiles(id),
  created_by      uuid REFERENCES public.profiles(id),
  status          text DEFAULT 'approved',
  created_at      timestamptz DEFAULT now()
);
ALTER TABLE public.fee_waivers ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "waivers_school" ON public.fee_waivers;
CREATE POLICY "waivers_school" ON public.fee_waivers
  USING (school_id IN (SELECT school_id FROM public.profiles WHERE id = auth.uid()))
  WITH CHECK (school_id IN (SELECT school_id FROM public.profiles WHERE id = auth.uid()));

-- ── fee_discounts ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.fee_discounts (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id       uuid REFERENCES public.schools(id) ON DELETE CASCADE,
  student_id      uuid REFERENCES public.students(id) ON DELETE CASCADE,
  invoice_id      uuid REFERENCES public.student_invoices(id),
  discount_type   text NOT NULL,
  amount          numeric(12,2) DEFAULT 0,
  percentage      numeric(5,2),
  reason          text,
  created_by      uuid REFERENCES public.profiles(id),
  created_at      timestamptz DEFAULT now()
);
ALTER TABLE public.fee_discounts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "discounts_school" ON public.fee_discounts;
CREATE POLICY "discounts_school" ON public.fee_discounts
  USING (school_id IN (SELECT school_id FROM public.profiles WHERE id = auth.uid()))
  WITH CHECK (school_id IN (SELECT school_id FROM public.profiles WHERE id = auth.uid()));

-- ── payment_receipts ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.payment_receipts (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  receipt_number  text UNIQUE,
  school_id       uuid REFERENCES public.schools(id) ON DELETE CASCADE,
  student_id      uuid REFERENCES public.students(id) ON DELETE CASCADE,
  invoice_id      uuid REFERENCES public.student_invoices(id),
  amount          numeric(12,2) NOT NULL,
  payment_method  text NOT NULL,
  payment_date    date NOT NULL,
  reference       text,
  notes           text,
  recorded_by     uuid REFERENCES public.profiles(id),
  created_at      timestamptz DEFAULT now()
);
ALTER TABLE public.payment_receipts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "receipts_school" ON public.payment_receipts;
CREATE POLICY "receipts_school" ON public.payment_receipts
  USING (school_id IN (SELECT school_id FROM public.profiles WHERE id = auth.uid()))
  WITH CHECK (school_id IN (SELECT school_id FROM public.profiles WHERE id = auth.uid()));

-- ── Sequence helpers ───────────────────────────────────────────────
CREATE SEQUENCE IF NOT EXISTS public.wallet_number_seq START 1000;
CREATE SEQUENCE IF NOT EXISTS public.invoice_number_seq START 10000;
CREATE SEQUENCE IF NOT EXISTS public.receipt_number_seq START 100000;

SELECT 'ERP schema created' AS status;
`.trim();
