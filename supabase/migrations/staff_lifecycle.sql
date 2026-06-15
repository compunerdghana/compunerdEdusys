-- ============================================================
-- COMPUNERDEDUSYS — Staff Lifecycle Management Migration
-- Run in Supabase SQL Editor (split into 2 parts if needed)
-- ============================================================

-- ─── 1. STAFF LEAVE TYPES ───────────────────────────────────
CREATE TABLE IF NOT EXISTS staff_leave_types (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id    UUID REFERENCES schools(id) ON DELETE CASCADE,
  name         TEXT NOT NULL,
  max_days     INTEGER NOT NULL DEFAULT 14,
  is_paid      BOOLEAN NOT NULL DEFAULT TRUE,
  is_system    BOOLEAN NOT NULL DEFAULT FALSE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- seed default leave types (school_id NULL = global)
INSERT INTO staff_leave_types (name, max_days, is_paid, is_system) VALUES
  ('Annual Leave',     21,  TRUE,  TRUE),
  ('Sick Leave',       14,  TRUE,  TRUE),
  ('Maternity Leave',  84,  TRUE,  TRUE),
  ('Paternity Leave',   3,  TRUE,  TRUE),
  ('Emergency Leave',   3,  TRUE,  TRUE),
  ('Study Leave',      30,  FALSE, TRUE)
ON CONFLICT DO NOTHING;

-- ─── 2. STAFF LEAVE REQUESTS ────────────────────────────────
CREATE TABLE IF NOT EXISTS staff_leave_requests (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id         UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  profile_id        UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  leave_type_id     UUID REFERENCES staff_leave_types(id),
  leave_type_name   TEXT NOT NULL,
  start_date        DATE NOT NULL,
  end_date          DATE NOT NULL,
  days_requested    INTEGER NOT NULL DEFAULT 1,
  reason            TEXT,
  status            TEXT NOT NULL DEFAULT 'pending'
                    CHECK (status IN ('pending','approved','rejected','cancelled')),
  reviewed_by       UUID REFERENCES profiles(id),
  reviewed_at       TIMESTAMPTZ,
  reviewer_note     TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── 3. STAFF ATTENDANCE RECORDS ────────────────────────────
CREATE TABLE IF NOT EXISTS staff_attendance_records (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id    UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  profile_id   UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  date         DATE NOT NULL,
  status       TEXT NOT NULL DEFAULT 'present'
               CHECK (status IN ('present','absent','late','half_day','on_leave')),
  check_in     TIME,
  check_out    TIME,
  note         TEXT,
  marked_by    UUID REFERENCES profiles(id),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (school_id, profile_id, date)
);

-- ─── 4. STAFF PERFORMANCE RECORDS ───────────────────────────
CREATE TABLE IF NOT EXISTS staff_performance_records (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id           UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  profile_id          UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  period              TEXT NOT NULL,               -- e.g. "2025-Term-1"
  attendance_score    NUMERIC(5,2) DEFAULT 0,
  task_score          NUMERIC(5,2) DEFAULT 0,
  submission_score    NUMERIC(5,2) DEFAULT 0,
  conduct_score       NUMERIC(5,2) DEFAULT 0,
  overall_score       NUMERIC(5,2) GENERATED ALWAYS AS (
                        (COALESCE(attendance_score,0) + COALESCE(task_score,0) +
                         COALESCE(submission_score,0) + COALESCE(conduct_score,0)) / 4
                      ) STORED,
  remarks             TEXT,
  reviewed_by         UUID REFERENCES profiles(id),
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (school_id, profile_id, period)
);

-- ─── 5. STAFF TIMELINE EVENTS ───────────────────────────────
CREATE TABLE IF NOT EXISTS staff_timeline_events (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id    UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  profile_id   UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  event_type   TEXT NOT NULL,   -- 'employed','promoted','transferred','trained','leave','exit','note'
  title        TEXT NOT NULL,
  description  TEXT,
  event_date   DATE NOT NULL DEFAULT CURRENT_DATE,
  created_by   UUID REFERENCES profiles(id),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── 6. STAFF TRAINING RECORDS ──────────────────────────────
CREATE TABLE IF NOT EXISTS staff_training_records (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id       UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  profile_id      UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  training_type   TEXT NOT NULL DEFAULT 'workshop'
                  CHECK (training_type IN ('workshop','seminar','conference','certification','in-house','online','other')),
  title           TEXT NOT NULL,
  organizer       TEXT,
  start_date      DATE NOT NULL,
  end_date        DATE,
  location        TEXT,
  certificate_url TEXT,
  notes           TEXT,
  created_by      UUID REFERENCES profiles(id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── 7. STAFF PROMOTION HISTORY ─────────────────────────────
CREATE TABLE IF NOT EXISTS staff_promotion_history (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id           UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  profile_id          UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  previous_designation TEXT,
  new_designation      TEXT NOT NULL,
  previous_salary      NUMERIC(12,2),
  new_salary           NUMERIC(12,2),
  effective_date       DATE NOT NULL,
  reason               TEXT,
  approved_by          UUID REFERENCES profiles(id),
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── 8. STAFF TRANSFER RECORDS ──────────────────────────────
CREATE TABLE IF NOT EXISTS staff_transfer_records (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id             UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  profile_id            UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  transfer_type         TEXT NOT NULL DEFAULT 'department'
                        CHECK (transfer_type IN ('department','branch','school')),
  previous_department   TEXT,
  new_department        TEXT NOT NULL,
  previous_branch       TEXT,
  new_branch            TEXT,
  effective_date        DATE NOT NULL,
  reason                TEXT,
  approved_by           UUID REFERENCES profiles(id),
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── 9. STAFF EXIT RECORDS ──────────────────────────────────
CREATE TABLE IF NOT EXISTS staff_exit_records (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id        UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  profile_id       UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  exit_type        TEXT NOT NULL
                   CHECK (exit_type IN ('resignation','retirement','termination','death','contract_end','transfer_out')),
  exit_date        DATE NOT NULL,
  notice_date      DATE,
  last_working_day DATE,
  reason           TEXT,
  clearance_status TEXT NOT NULL DEFAULT 'pending'
                   CHECK (clearance_status IN ('pending','partial','cleared')),
  handover_notes   TEXT,
  processed_by     UUID REFERENCES profiles(id),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── INDEXES ─────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_staff_leave_requests_school   ON staff_leave_requests(school_id);
CREATE INDEX IF NOT EXISTS idx_staff_leave_requests_profile  ON staff_leave_requests(profile_id);
CREATE INDEX IF NOT EXISTS idx_staff_attendance_school_date  ON staff_attendance_records(school_id, date);
CREATE INDEX IF NOT EXISTS idx_staff_attendance_profile      ON staff_attendance_records(profile_id);
CREATE INDEX IF NOT EXISTS idx_staff_timeline_profile        ON staff_timeline_events(profile_id);
CREATE INDEX IF NOT EXISTS idx_staff_training_profile        ON staff_training_records(profile_id);
CREATE INDEX IF NOT EXISTS idx_staff_promotions_profile      ON staff_promotion_history(profile_id);
CREATE INDEX IF NOT EXISTS idx_staff_transfers_profile       ON staff_transfer_records(profile_id);
CREATE INDEX IF NOT EXISTS idx_staff_exits_profile           ON staff_exit_records(profile_id);

-- ─── RLS ENABLE ──────────────────────────────────────────────
ALTER TABLE staff_leave_types         ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff_leave_requests      ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff_attendance_records  ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff_performance_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff_timeline_events     ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff_training_records    ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff_promotion_history   ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff_transfer_records    ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff_exit_records        ENABLE ROW LEVEL SECURITY;

-- ─── RLS POLICIES (service-role bypasses all, so minimal client policies needed) ─
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='staff_attendance_records' AND policyname='staff_attendance_school_access') THEN
    CREATE POLICY staff_attendance_school_access ON staff_attendance_records
      USING (school_id IN (SELECT school_id FROM profiles WHERE id = auth.uid()));
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='staff_leave_requests' AND policyname='staff_leave_school_access') THEN
    CREATE POLICY staff_leave_school_access ON staff_leave_requests
      USING (school_id IN (SELECT school_id FROM profiles WHERE id = auth.uid()));
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='staff_timeline_events' AND policyname='staff_timeline_school_access') THEN
    CREATE POLICY staff_timeline_school_access ON staff_timeline_events
      USING (school_id IN (SELECT school_id FROM profiles WHERE id = auth.uid()));
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='staff_training_records' AND policyname='staff_training_school_access') THEN
    CREATE POLICY staff_training_school_access ON staff_training_records
      USING (school_id IN (SELECT school_id FROM profiles WHERE id = auth.uid()));
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='staff_promotion_history' AND policyname='staff_promotions_school_access') THEN
    CREATE POLICY staff_promotions_school_access ON staff_promotion_history
      USING (school_id IN (SELECT school_id FROM profiles WHERE id = auth.uid()));
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='staff_transfer_records' AND policyname='staff_transfers_school_access') THEN
    CREATE POLICY staff_transfers_school_access ON staff_transfer_records
      USING (school_id IN (SELECT school_id FROM profiles WHERE id = auth.uid()));
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='staff_exit_records' AND policyname='staff_exits_school_access') THEN
    CREATE POLICY staff_exits_school_access ON staff_exit_records
      USING (school_id IN (SELECT school_id FROM profiles WHERE id = auth.uid()));
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='staff_performance_records' AND policyname='staff_performance_school_access') THEN
    CREATE POLICY staff_performance_school_access ON staff_performance_records
      USING (school_id IN (SELECT school_id FROM profiles WHERE id = auth.uid()));
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='staff_leave_types' AND policyname='staff_leave_types_read') THEN
    CREATE POLICY staff_leave_types_read ON staff_leave_types FOR SELECT USING (true);
  END IF;
END $$;
