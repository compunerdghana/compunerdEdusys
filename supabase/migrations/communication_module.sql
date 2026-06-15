-- ============================================================
-- COMPUNERDEDUSYS — Communication & Notification Module
-- Run in Supabase SQL Editor
-- ============================================================

-- ─── 1. IN-APP NOTIFICATIONS ────────────────────────────────
CREATE TABLE IF NOT EXISTS notifications (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id    UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  recipient_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_by   UUID REFERENCES profiles(id),
  title        TEXT NOT NULL,
  body         TEXT,
  type         TEXT NOT NULL DEFAULT 'info'
               CHECK (type IN ('info','success','warning','danger','urgent')),
  category     TEXT DEFAULT 'general',
  link         TEXT,
  is_read      BOOLEAN NOT NULL DEFAULT FALSE,
  read_at      TIMESTAMPTZ,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── 2. COMMUNICATION TEMPLATES ─────────────────────────────
CREATE TABLE IF NOT EXISTS communication_templates (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id    UUID REFERENCES schools(id) ON DELETE CASCADE,
  channel      TEXT NOT NULL DEFAULT 'whatsapp'
               CHECK (channel IN ('whatsapp','sms','email','notification')),
  category     TEXT NOT NULL DEFAULT 'general',
  name         TEXT NOT NULL,
  subject      TEXT,
  body         TEXT NOT NULL,
  variables    JSONB DEFAULT '[]'::jsonb,
  is_system    BOOLEAN NOT NULL DEFAULT FALSE,
  is_active    BOOLEAN NOT NULL DEFAULT TRUE,
  created_by   UUID REFERENCES profiles(id),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- seed default templates
INSERT INTO communication_templates (name, channel, category, body, variables, is_system) VALUES
('Payment Confirmation', 'whatsapp', 'finance',
 'Dear {parent_name}, payment of GHS {amount} has been received for {student_name}. Balance: GHS {balance}. Thank you — {school_name}.',
 '["parent_name","amount","student_name","balance","school_name"]'::jsonb, TRUE),
('Outstanding Fees Reminder', 'whatsapp', 'finance',
 'Dear {parent_name}, your ward {student_name} has an outstanding balance of GHS {balance}. Please make payment promptly. — {school_name}.',
 '["parent_name","student_name","balance","school_name"]'::jsonb, TRUE),
('Attendance Alert', 'whatsapp', 'attendance',
 'Dear {parent_name}, your ward {student_name} was absent from school today ({date}). Please contact us if necessary. — {school_name}.',
 '["parent_name","student_name","date","school_name"]'::jsonb, TRUE),
('Admission Confirmation', 'whatsapp', 'admission',
 'Dear {parent_name}, {student_name} has been successfully admitted to {school_name}. Welcome to our school family!',
 '["parent_name","student_name","school_name"]'::jsonb, TRUE),
('Report Card Published', 'whatsapp', 'academics',
 'Dear {parent_name}, the report card for {student_name} is now available. Please log in to view it. — {school_name}.',
 '["parent_name","student_name","school_name"]'::jsonb, TRUE),
('PTA Meeting Reminder', 'whatsapp', 'events',
 'Dear Parent, you are invited to attend the PTA meeting at {school_name} on {date} at {time}. Attendance is important.',
 '["school_name","date","time"]'::jsonb, TRUE),
('Leave Approved', 'notification', 'staff',
 'Your leave request from {start_date} to {end_date} has been approved.',
 '["start_date","end_date"]'::jsonb, TRUE),
('Expense Approved', 'notification', 'finance',
 'Expense "{title}" of GHS {amount} has been approved.',
 '["title","amount"]'::jsonb, TRUE),
('SMS - Fees Reminder', 'sms', 'finance',
 'Hi {parent_name}, {student_name} owes GHS {balance} in fees. Pay now to avoid inconvenience. {school_name}.',
 '["parent_name","student_name","balance","school_name"]'::jsonb, TRUE),
('SMS - Absence Alert', 'sms', 'attendance',
 'Dear {parent_name}, {student_name} was absent today. Call {school_phone} for info. {school_name}.',
 '["parent_name","student_name","school_phone","school_name"]'::jsonb, TRUE)
ON CONFLICT DO NOTHING;

-- ─── 3. COMMUNICATION LOGS ──────────────────────────────────
CREATE TABLE IF NOT EXISTS communication_logs (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id     UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  channel       TEXT NOT NULL CHECK (channel IN ('whatsapp','sms','email','notification','announcement')),
  recipient_type TEXT NOT NULL DEFAULT 'individual'
                CHECK (recipient_type IN ('individual','class','all_parents','all_staff','school','bulk')),
  recipient_id  UUID,
  recipient_ref TEXT,
  template_id   UUID REFERENCES communication_templates(id),
  subject       TEXT,
  body          TEXT NOT NULL,
  status        TEXT NOT NULL DEFAULT 'sent'
                CHECK (status IN ('sent','delivered','read','failed','pending')),
  provider      TEXT,
  provider_ref  TEXT,
  sent_by       UUID REFERENCES profiles(id),
  recipient_count INTEGER DEFAULT 1,
  error_message TEXT,
  metadata      JSONB DEFAULT '{}'::jsonb,
  sent_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── 4. AUTOMATION RULES ────────────────────────────────────
CREATE TABLE IF NOT EXISTS automation_rules (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id      UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  name           TEXT NOT NULL,
  description    TEXT,
  trigger_event  TEXT NOT NULL,
  trigger_filter JSONB DEFAULT '{}'::jsonb,
  channel        TEXT NOT NULL DEFAULT 'notification'
                 CHECK (channel IN ('whatsapp','sms','email','notification','all')),
  template_id    UUID REFERENCES communication_templates(id),
  custom_message TEXT,
  recipient_type TEXT NOT NULL DEFAULT 'parent'
                 CHECK (recipient_type IN ('parent','staff','owner','headmaster','self','all')),
  is_active      BOOLEAN NOT NULL DEFAULT TRUE,
  delay_minutes  INTEGER DEFAULT 0,
  created_by     UUID REFERENCES profiles(id),
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- seed default automation rules
INSERT INTO automation_rules (school_id, name, description, trigger_event, channel, recipient_type, is_active, created_by)
SELECT id, 'Attendance Absent → WhatsApp Parent', 'Send WhatsApp when student is marked absent', 'student_absent', 'whatsapp', 'parent', FALSE, NULL FROM schools LIMIT 0
ON CONFLICT DO NOTHING;

-- ─── 5. COMMUNICATION SETTINGS ──────────────────────────────
CREATE TABLE IF NOT EXISTS communication_settings (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id         UUID NOT NULL UNIQUE REFERENCES schools(id) ON DELETE CASCADE,
  whatsapp_enabled  BOOLEAN NOT NULL DEFAULT FALSE,
  whatsapp_provider TEXT DEFAULT 'meta',
  whatsapp_phone_id TEXT,
  whatsapp_token    TEXT,
  whatsapp_waba_id  TEXT,
  sms_enabled       BOOLEAN NOT NULL DEFAULT FALSE,
  sms_provider      TEXT DEFAULT 'arkesel',
  sms_api_key       TEXT,
  sms_sender_id     TEXT,
  sms_sender_name   TEXT,
  email_enabled     BOOLEAN NOT NULL DEFAULT FALSE,
  email_provider    TEXT DEFAULT 'sendgrid',
  email_api_key     TEXT,
  email_from        TEXT,
  email_from_name   TEXT,
  sms_credits       NUMERIC(10,2) NOT NULL DEFAULT 0,
  whatsapp_credits  NUMERIC(10,2) NOT NULL DEFAULT 0,
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── 6. COMMUNICATION WALLET ────────────────────────────────
CREATE TABLE IF NOT EXISTS communication_wallet_transactions (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id   UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  type        TEXT NOT NULL CHECK (type IN ('topup','deduction','refund')),
  channel     TEXT NOT NULL CHECK (channel IN ('whatsapp','sms','email')),
  amount      NUMERIC(10,4) NOT NULL,
  balance_after NUMERIC(10,2) NOT NULL,
  description TEXT,
  reference   TEXT,
  created_by  UUID REFERENCES profiles(id),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── INDEXES ─────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_notifications_recipient ON notifications(recipient_id);
CREATE INDEX IF NOT EXISTS idx_notifications_school    ON notifications(school_id, is_read);
CREATE INDEX IF NOT EXISTS idx_comm_logs_school        ON communication_logs(school_id, sent_at DESC);
CREATE INDEX IF NOT EXISTS idx_comm_logs_channel       ON communication_logs(channel);
CREATE INDEX IF NOT EXISTS idx_automation_school       ON automation_rules(school_id);

-- ─── RLS ─────────────────────────────────────────────────────
ALTER TABLE notifications              ENABLE ROW LEVEL SECURITY;
ALTER TABLE communication_templates    ENABLE ROW LEVEL SECURITY;
ALTER TABLE communication_logs         ENABLE ROW LEVEL SECURITY;
ALTER TABLE automation_rules           ENABLE ROW LEVEL SECURITY;
ALTER TABLE communication_settings     ENABLE ROW LEVEL SECURITY;
ALTER TABLE communication_wallet_transactions ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='notifications' AND policyname='notif_recipient_access') THEN
    CREATE POLICY notif_recipient_access ON notifications
      USING (recipient_id = auth.uid() OR school_id IN (SELECT school_id FROM profiles WHERE id = auth.uid() AND role IN ('owner','headmaster','accountant')));
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='communication_templates' AND policyname='comm_templates_school') THEN
    CREATE POLICY comm_templates_school ON communication_templates FOR SELECT
      USING (school_id IS NULL OR school_id IN (SELECT school_id FROM profiles WHERE id = auth.uid()));
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='communication_logs' AND policyname='comm_logs_school') THEN
    CREATE POLICY comm_logs_school ON communication_logs
      USING (school_id IN (SELECT school_id FROM profiles WHERE id = auth.uid()));
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='automation_rules' AND policyname='automation_school') THEN
    CREATE POLICY automation_school ON automation_rules
      USING (school_id IN (SELECT school_id FROM profiles WHERE id = auth.uid()));
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='communication_settings' AND policyname='comm_settings_school') THEN
    CREATE POLICY comm_settings_school ON communication_settings
      USING (school_id IN (SELECT school_id FROM profiles WHERE id = auth.uid()));
  END IF;
END $$;
