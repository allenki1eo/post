-- POST v1 schema.
--
-- Conventions:
--   * every instant is timestamptz stored in UTC; wall-clock promises ("08:00")
--     are stored as text alongside the patient's timezone (see DECISIONS.md D5)
--   * a doctor may only ever see their own patients; every query path filters on
--     doctor_id and the API never accepts a doctor_id from the client

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------- doctors

create table doctors (
  id            uuid primary key default gen_random_uuid(),
  name          text        not null,
  specialty     text,
  phone         text        not null unique,          -- E.164
  facility      text,                                 -- free text, optional: solo practitioners (D4)
  password_hash text        not null,
  created_at    timestamptz not null default now()
);

-- ---------------------------------------------------------------- patients

create type patient_channel as enum ('app', 'sms');
create type patient_status  as enum ('active', 'archived');
create type language        as enum ('sw', 'en');

create table patients (
  id                uuid primary key default gen_random_uuid(),
  doctor_id         uuid not null references doctors(id) on delete restrict,
  name              text not null,
  phone             text not null,                    -- E.164, normalised on entry (D10)
  diagnosis         text not null,
  treatment_summary text,
  discharge_date    date not null,
  has_app           boolean not null default false,
  preferred_channel patient_channel not null default 'sms',
  timezone          text not null default 'Africa/Dar_es_Salaam',
  language          language not null default 'sw',
  -- consent is the basis for everything the reminder engine does (D9)
  consent_sms          boolean     not null,
  phone_is_personal    boolean     not null,
  consent_recorded_at  timestamptz not null default now(),
  opted_out            boolean     not null default false,
  opted_out_at         timestamptz,
  status            patient_status not null default 'active',
  created_at        timestamptz not null default now(),
  unique (doctor_id, phone)
);

create index patients_doctor_status_idx on patients (doctor_id, status);

-- -------------------------------------------------------------- care plans

create type care_plan_status as enum ('active', 'closed');

create table care_plans (
  id            uuid primary key default gen_random_uuid(),
  patient_id    uuid not null references patients(id) on delete cascade,
  created_by    uuid not null references doctors(id),
  status        care_plan_status not null default 'active',
  open_ended    boolean not null default false,       -- chronic care: no derived end (D3)
  red_flag_symptoms text[] not null default '{}',
  starts_on     date not null,
  -- derived: max(last dose end, last visit) + 7d tail. null while open_ended.
  ends_on       date,
  review_due_on date,                                 -- open-ended plans re-confirmed every 90d
  created_at    timestamptz not null default now(),
  closed_at     timestamptz
);

create index care_plans_patient_idx on care_plans (patient_id, status);

create table medications (
  id           uuid primary key default gen_random_uuid(),
  care_plan_id uuid not null references care_plans(id) on delete cascade,
  name         text not null,
  dosage       text not null,
  times        text[] not null,                       -- local wall clock, 'HH:MM' (D5)
  start_date   date not null,
  end_date     date not null,
  created_at   timestamptz not null default now()
);

create table follow_up_visits (
  id                uuid primary key default gen_random_uuid(),
  care_plan_id      uuid not null references care_plans(id) on delete cascade,
  visit_date        date not null,
  location          text not null,                    -- required: a reminder without a place is useless (D4)
  notes             text,
  reminder_lead_days integer[] not null default '{3,1}',
  confirmed         boolean not null default false,
  attended          boolean,
  created_at        timestamptz not null default now()
);

-- ------------------------------------------------------------------- logs

create type dose_source as enum ('app', 'sms', 'missed-no-response');

create table medication_logs (
  id            uuid primary key default gen_random_uuid(),
  patient_id    uuid not null references patients(id) on delete cascade,
  medication_id uuid not null references medications(id) on delete cascade,
  scheduled_for timestamptz not null,                 -- UTC instant of the local promise
  local_date    date not null,                        -- for "3 misses in 7 days" windows
  taken         boolean,                              -- null = not yet answered
  logged_at     timestamptz,
  source        dose_source,
  created_at    timestamptz not null default now(),
  unique (medication_id, scheduled_for)
);

create index medication_logs_open_idx on medication_logs (patient_id, scheduled_for)
  where taken is null;

create type check_in_kind as enum ('adherence', 'symptom', 'wellbeing');

create table check_ins (
  id                uuid primary key default gen_random_uuid(),
  patient_id        uuid not null references patients(id) on delete cascade,
  medication_log_id uuid references medication_logs(id) on delete cascade,
  kind              check_in_kind not null,
  sent_at           timestamptz,
  responded_at      timestamptz,
  response_code     text,                             -- '1' | '2' | '3' after parsing
  response_raw      text,                             -- always kept, parsed or not (D2)
  flagged           boolean not null default false,
  created_at        timestamptz not null default now()
);

create index check_ins_open_idx on check_ins (patient_id, sent_at)
  where responded_at is null;

-- --------------------------------------------------------------- messaging

-- Delivery is a state machine, not a fire-and-forget call (D8).
create type message_status  as enum ('queued', 'sending', 'sent', 'delivered', 'failed');
create type message_channel as enum ('sms', 'push');
create type message_kind    as enum ('medication', 'visit', 'checkin_followup', 'plan_closed');

create table messages (
  id            uuid primary key default gen_random_uuid(),
  patient_id    uuid not null references patients(id) on delete cascade,
  check_in_id   uuid references check_ins(id) on delete set null,
  follow_up_visit_id uuid references follow_up_visits(id) on delete cascade,
  kind          message_kind not null,
  channel       message_channel not null,
  to_phone      text not null,
  body          text not null,
  locale        language not null,
  status        message_status not null default 'queued',
  attempts      integer not null default 0,
  scheduled_for timestamptz not null,                 -- after quiet-hours clamping (D7)
  next_attempt_at timestamptz,
  provider_message_id text,
  failure_reason  text,
  sent_at       timestamptz,
  delivered_at  timestamptz,
  created_at    timestamptz not null default now()
);

-- the worker's claim query rides this index
create index messages_due_idx on messages (scheduled_for)
  where status = 'queued';
create index messages_provider_idx on messages (provider_message_id);
-- one reminder per visit per lead day, so re-expanding the plan is idempotent
create unique index messages_visit_unique_idx on messages (follow_up_visit_id, scheduled_for)
  where follow_up_visit_id is not null;

create table inbound_messages (
  id              uuid primary key default gen_random_uuid(),
  from_phone      text not null,
  body            text not null,
  received_at     timestamptz not null default now(),
  provider_message_id text unique,                    -- idempotency for redelivered webhooks
  patient_id      uuid references patients(id) on delete set null,
  check_in_id     uuid references check_ins(id) on delete set null,
  parsed_code     text,                               -- null = unparsed, still surfaced to the doctor
  created_at      timestamptz not null default now()
);

-- ----------------------------------------------------------------- alerts

create type alert_type as enum (
  'missed_meds', 'red_flag_symptom', 'missed_visit', 'unreachable', 'unparsed_reply', 'opted_out'
);
create type alert_severity as enum ('critical', 'warning', 'info');

create table alerts (
  id          uuid primary key default gen_random_uuid(),
  patient_id  uuid not null references patients(id) on delete cascade,
  doctor_id   uuid not null references doctors(id) on delete cascade,
  type        alert_type not null,
  severity    alert_severity not null,
  context     jsonb not null default '{}',
  created_at  timestamptz not null default now(),
  resolved    boolean not null default false,
  resolved_at timestamptz
);

-- one open alert per patient per type: an alert is a state, not an event log
create unique index alerts_open_unique_idx on alerts (patient_id, type)
  where resolved = false;
create index alerts_doctor_open_idx on alerts (doctor_id, severity)
  where resolved = false;

-- ------------------------------------------------------------- audit trail

-- Append-only. Who read or wrote which patient record, and when (PRODUCT.md §8).
create table access_log (
  id         bigserial primary key,
  doctor_id  uuid references doctors(id),
  patient_id uuid references patients(id) on delete set null,
  action     text not null,
  at         timestamptz not null default now()
);
