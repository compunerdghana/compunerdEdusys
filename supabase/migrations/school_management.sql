-- ============================================================
-- School Management Module
-- ============================================================

-- School health scores
CREATE TABLE IF NOT EXISTS school_health_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID REFERENCES schools(id) ON DELETE CASCADE,
  score INT DEFAULT 0 CHECK (score BETWEEN 0 AND 100),
  status TEXT DEFAULT 'warning' CHECK (status IN ('healthy','warning','critical')),
  subscription_score INT DEFAULT 0,
  login_score INT DEFAULT 0,
  student_score INT DEFAULT 0,
  attendance_score INT DEFAULT 0,
  communication_score INT DEFAULT 0,
  data_score INT DEFAULT 0,
  calculated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(school_id)
);

-- School activity logs
CREATE TABLE IF NOT EXISTS school_activity_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID REFERENCES schools(id) ON DELETE CASCADE,
  actor_id UUID,
  actor_name TEXT,
  actor_role TEXT,
  action TEXT NOT NULL,
  description TEXT,
  metadata JSONB DEFAULT '{}',
  ip_address TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- School documents
CREATE TABLE IF NOT EXISTS school_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID REFERENCES schools(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT DEFAULT 'other' CHECK (type IN ('registration','accreditation','agreement','contract','other')),
  file_url TEXT,
  file_size INT,
  uploaded_by UUID,
  uploaded_by_name TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- School notes (internal)
CREATE TABLE IF NOT EXISTS school_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID REFERENCES schools(id) ON DELETE CASCADE,
  note TEXT NOT NULL,
  author_id UUID,
  author_name TEXT,
  is_pinned BOOL DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- School status history
CREATE TABLE IF NOT EXISTS school_status_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID REFERENCES schools(id) ON DELETE CASCADE,
  old_status TEXT,
  new_status TEXT,
  reason TEXT,
  changed_by UUID,
  changed_by_name TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- School usage metrics (monthly snapshots)
CREATE TABLE IF NOT EXISTS school_usage_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID REFERENCES schools(id) ON DELETE CASCADE,
  month DATE NOT NULL,
  student_count INT DEFAULT 0,
  staff_count INT DEFAULT 0,
  parent_count INT DEFAULT 0,
  attendance_records INT DEFAULT 0,
  messages_sent INT DEFAULT 0,
  reports_generated INT DEFAULT 0,
  login_count INT DEFAULT 0,
  storage_mb NUMERIC(10,2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(school_id, month)
);

-- ============================================================
-- Extend schools table
-- ============================================================
ALTER TABLE schools ADD COLUMN IF NOT EXISTS motto TEXT;
ALTER TABLE schools ADD COLUMN IF NOT EXISTS colors JSONB DEFAULT '{}';
ALTER TABLE schools ADD COLUMN IF NOT EXISTS country TEXT DEFAULT 'Ghana';
ALTER TABLE schools ADD COLUMN IF NOT EXISTS town TEXT;
ALTER TABLE schools ADD COLUMN IF NOT EXISTS district TEXT;
ALTER TABLE schools ADD COLUMN IF NOT EXISTS proprietor_email TEXT;
ALTER TABLE schools ADD COLUMN IF NOT EXISTS health_score INT DEFAULT 0;
ALTER TABLE schools ADD COLUMN IF NOT EXISTS last_active_at TIMESTAMPTZ;

SELECT 'School management schema created' AS status;
