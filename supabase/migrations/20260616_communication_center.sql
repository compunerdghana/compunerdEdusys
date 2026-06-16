-- ============================================================
-- CompunerdEduSys — Communication Center Tables
-- Run this in the Supabase SQL editor after schema.sql
-- ============================================================

-- ── 1. communication_templates ─────────────────────────────
create table if not exists communication_templates (
  id           uuid primary key default gen_random_uuid(),
  name         text not null,
  category     text not null default 'general'
               check (category in ('subscription','onboarding','payment','maintenance','feature','general')),
  channel      text not null default 'all'
               check (channel in ('whatsapp','sms','email','notification','all')),
  subject      text,                         -- email subject
  body         text not null,
  variables    text[] default '{}',          -- e.g. {school_name, expiry_date}
  is_active    boolean not null default true,
  created_by   uuid references platform_users(id) on delete set null,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

-- ── 2. communication_campaigns ─────────────────────────────
create table if not exists communication_campaigns (
  id               uuid primary key default gen_random_uuid(),
  name             text not null,
  description      text,
  type             text not null default 'custom'
                   check (type in ('trial_conversion','renewal','product_update','engagement','custom')),
  channels         text[] not null default '{}'::text[],
  target_audience  text not null default 'all'
                   check (target_audience in ('all','active','trial','premium','expiring','expired','selected')),
  target_school_ids uuid[] default '{}'::uuid[],
  template_id      uuid references communication_templates(id) on delete set null,
  subject          text,
  message_body     text not null,
  status           text not null default 'draft'
                   check (status in ('draft','scheduled','active','paused','completed','archived')),
  scheduled_at     timestamptz,
  started_at       timestamptz,
  completed_at     timestamptz,
  total_recipients int not null default 0,
  sent_count       int not null default 0,
  delivered_count  int not null default 0,
  read_count       int not null default 0,
  failed_count     int not null default 0,
  created_by       uuid references platform_users(id) on delete set null,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

-- ── 3. platform_messages ───────────────────────────────────
create table if not exists platform_messages (
  id              uuid primary key default gen_random_uuid(),
  campaign_id     uuid references communication_campaigns(id) on delete set null,
  template_id     uuid references communication_templates(id) on delete set null,
  channel         text not null
                  check (channel in ('whatsapp','sms','email','notification')),
  direction       text not null default 'outbound'
                  check (direction in ('outbound','inbound')),
  recipient_type  text not null default 'school'
                  check (recipient_type in ('school','school_owner','headmaster','admin','all')),
  school_id       uuid references schools(id) on delete set null,
  school_name     text,
  recipient_name  text,
  recipient_phone text,
  recipient_email text,
  subject         text,
  body            text not null,
  status          text not null default 'pending'
                  check (status in ('pending','sent','delivered','read','failed')),
  provider        text,                -- hubtel, arkesel, meta, smtp
  provider_msg_id text,                -- external message ID from provider
  error_message   text,
  sent_by         uuid references platform_users(id) on delete set null,
  sent_at         timestamptz,
  delivered_at    timestamptz,
  read_at         timestamptz,
  created_at      timestamptz not null default now()
);

-- ── 4. communication_logs ───────────────────────────────────
create table if not exists communication_logs (
  id           uuid primary key default gen_random_uuid(),
  message_id   uuid references platform_messages(id) on delete cascade,
  campaign_id  uuid references communication_campaigns(id) on delete set null,
  channel      text not null,
  sender_name  text,
  sender_id    uuid references platform_users(id) on delete set null,
  school_id    uuid references schools(id) on delete set null,
  school_name  text,
  recipient    text,        -- phone or email
  message_preview text,    -- first 160 chars
  status       text not null default 'sent',
  created_at   timestamptz not null default now()
);

-- ── 5. delivery_reports ────────────────────────────────────
create table if not exists delivery_reports (
  id           uuid primary key default gen_random_uuid(),
  message_id   uuid references platform_messages(id) on delete cascade,
  campaign_id  uuid references communication_campaigns(id) on delete set null,
  channel      text not null,
  school_id    uuid references schools(id) on delete set null,
  school_name  text,
  recipient    text,
  status       text not null default 'sent'
               check (status in ('sent','delivered','read','failed','bounced')),
  provider_status text,
  error_code   text,
  error_detail text,
  sent_at      timestamptz,
  delivered_at timestamptz,
  read_at      timestamptz,
  updated_at   timestamptz not null default now()
);

-- ── 6. platform_notifications (platform-wide, shown in school dashboards) ──
create table if not exists platform_notifications (
  id              uuid primary key default gen_random_uuid(),
  title           text not null,
  body            text,
  type            text not null default 'info'
                  check (type in ('info','success','warning','danger','urgent')),
  category        text not null default 'general'
                  check (category in ('general','maintenance','feature','subscription','update','support')),
  target_audience text not null default 'all'
                  check (target_audience in ('all','active','trial','premium','expiring','expired','selected')),
  target_school_ids uuid[] default '{}'::uuid[],
  is_active       boolean not null default true,
  link            text,
  expires_at      timestamptz,
  created_by      uuid references platform_users(id) on delete set null,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- ── 7. automation_rules ────────────────────────────────────
create table if not exists automation_rules (
  id              uuid primary key default gen_random_uuid(),
  name            text not null,
  description     text,
  trigger_event   text not null
                  check (trigger_event in (
                    'trial_expiring_7d','trial_expiring_3d','trial_expiring_1d',
                    'subscription_expiring_30d','subscription_expiring_7d','subscription_expiring_3d',
                    'subscription_expired','school_created','payment_received','payment_failed'
                  )),
  channels        text[] not null default '{}'::text[],
  template_id     uuid references communication_templates(id) on delete set null,
  message_body    text,
  target_role     text default 'school_owner',
  is_active       boolean not null default false,
  last_run_at     timestamptz,
  run_count       int not null default 0,
  created_by      uuid references platform_users(id) on delete set null,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- ── 8. communication_settings ──────────────────────────────
create table if not exists communication_settings (
  id              uuid primary key default gen_random_uuid(),
  channel         text not null unique
                  check (channel in ('whatsapp','sms','email')),
  provider        text,
  api_key         text,
  api_secret      text,
  sender_id       text,
  extra_config    jsonb default '{}'::jsonb,
  is_active       boolean not null default false,
  updated_by      uuid references platform_users(id) on delete set null,
  updated_at      timestamptz not null default now()
);

-- ── Indexes ────────────────────────────────────────────────
create index if not exists idx_platform_messages_channel   on platform_messages(channel);
create index if not exists idx_platform_messages_status    on platform_messages(status);
create index if not exists idx_platform_messages_school    on platform_messages(school_id);
create index if not exists idx_platform_messages_created   on platform_messages(created_at desc);
create index if not exists idx_communication_logs_created  on communication_logs(created_at desc);
create index if not exists idx_delivery_reports_status     on delivery_reports(status);
create index if not exists idx_delivery_reports_campaign   on delivery_reports(campaign_id);
create index if not exists idx_platform_notifications_active on platform_notifications(is_active, target_audience);
create index if not exists idx_automation_rules_event      on automation_rules(trigger_event, is_active);

-- ── Seed default templates ─────────────────────────────────
insert into communication_templates (name, category, channel, subject, body, variables) values
  ('Subscription Expiry Reminder (30 Days)', 'subscription', 'all',
   'Your EduSys Subscription Expires Soon',
   'Dear {school_name},\n\nYour CompunerdEduSys subscription will expire on {expiry_date} — that is in 30 days.\n\nTo ensure uninterrupted access for your school, please renew before this date.\n\nRenewal Amount: {amount}\n\nContact us on WhatsApp or call our support line to renew.\n\nThank you,\nCompunerd Ghana Team',
   ARRAY['school_name','expiry_date','amount']),

  ('Subscription Expiry Reminder (7 Days)', 'subscription', 'all',
   'URGENT: Subscription Expires in 7 Days',
   'Dear {school_name},\n\nThis is an urgent reminder that your EduSys subscription expires on {expiry_date} — only 7 days away.\n\nPlease renew immediately to avoid interruption.\n\nThank you,\nCompunerd Ghana Team',
   ARRAY['school_name','expiry_date']),

  ('Trial Ending Reminder', 'subscription', 'all',
   'Your Free Trial is Ending Soon',
   'Dear {school_name},\n\nYour 30-day free trial ends on {expiry_date}.\n\nUpgrade to a paid plan to keep all your school data and continue using all features.\n\nContact us today!\n\nCompunerd Ghana Team',
   ARRAY['school_name','expiry_date']),

  ('Welcome School Message', 'onboarding', 'all',
   'Welcome to CompunerdEduSys!',
   'Dear {school_name},\n\nWelcome to CompunerdEduSys — Ghana''s leading school management platform!\n\nYour school has been successfully onboarded. Your trial period begins today and lasts 30 days.\n\nLogin URL: https://edusys.compunerd.com\nSchool Code: {school_code}\n\nOur team is here to help. Contact us anytime.\n\nCompunerd Ghana Team',
   ARRAY['school_name','school_code']),

  ('Payment Confirmation', 'payment', 'all',
   'Payment Received — CompunerdEduSys',
   'Dear {school_name},\n\nWe confirm receipt of your payment of GH₵ {amount} on {payment_date}.\n\nYour subscription is now active until {expiry_date}.\n\nThank you for choosing CompunerdEduSys!\n\nCompunerd Ghana Team',
   ARRAY['school_name','amount','payment_date','expiry_date']),

  ('Platform Maintenance Notice', 'maintenance', 'all',
   'Scheduled Maintenance — CompunerdEduSys',
   'Dear {school_name},\n\nWe will be performing scheduled maintenance on {maintenance_date} from {start_time} to {end_time}.\n\nDuring this time, the platform may be temporarily unavailable.\n\nWe apologize for any inconvenience.\n\nCompunerd Ghana Team',
   ARRAY['school_name','maintenance_date','start_time','end_time']),

  ('Feature Release Announcement', 'feature', 'all',
   'New Feature: {feature_name} is Now Live!',
   'Dear {school_name},\n\nWe are excited to announce that {feature_name} is now available on CompunerdEduSys!\n\n{feature_description}\n\nLog in to explore this new feature today.\n\nCompunerd Ghana Team',
   ARRAY['school_name','feature_name','feature_description'])
on conflict do nothing;

-- ── Seed default communication settings ────────────────────
insert into communication_settings (channel, provider, is_active) values
  ('whatsapp', 'meta', false),
  ('sms', 'arkesel', false),
  ('email', 'smtp', false)
on conflict (channel) do nothing;
