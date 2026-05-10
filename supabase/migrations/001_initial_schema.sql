-- Daily manual entries (finance + habits + faith)
create table if not exists daily_entries (
  id uuid primary key default gen_random_uuid(),
  date date not null unique,
  checking_balance numeric,
  savings_balance numeric,
  roth_balance numeric,
  prayer_done boolean default false,
  bible_done boolean default false,
  workout_done boolean default false,
  journal_done boolean default false,
  reflection text,
  created_at timestamptz default now()
);

-- WHOOP data (pulled server-side via WHOOP API)
create table if not exists whoop_daily (
  id uuid primary key default gen_random_uuid(),
  date date not null unique,
  recovery_score numeric,       -- 0-100
  hrv numeric,                  -- ms
  resting_hr numeric,           -- bpm
  sleep_performance numeric,    -- 0-100
  sleep_hours numeric,
  strain_score numeric,         -- 0-21
  created_at timestamptz default now()
);

-- Jobber data (pushed via Zapier webhook)
create table if not exists jobber_daily (
  id uuid primary key default gen_random_uuid(),
  date date not null unique,
  revenue_today numeric,
  revenue_mtd numeric,
  jobs_completed_today integer,
  jobs_completed_mtd integer,
  estimates_sent_today integer,
  open_estimates integer,
  avg_response_time_hours numeric,
  created_at timestamptz default now()
);

-- AI-generated tasks
create table if not exists tasks (
  id uuid primary key default gen_random_uuid(),
  date date not null,
  title text not null,
  source text,          -- 'ai_agent', 'notion', 'manual'
  priority text,        -- 'High', 'Medium', 'Low'
  category text,        -- 'Tap Ins', 'Personal', 'Golf', 'Faith', 'Finance', 'Health', 'Evergreen', 'Smart Pro'
  completed boolean default false,
  created_at timestamptz default now()
);

-- Golf rounds (manual entry)
create table if not exists golf_rounds (
  id uuid primary key default gen_random_uuid(),
  date date not null,
  course text,
  score integer,
  handicap_index numeric,
  notes text,
  created_at timestamptz default now()
);

-- Row Level Security: enable on all tables
alter table daily_entries enable row level security;
alter table whoop_daily enable row level security;
alter table jobber_daily enable row level security;
alter table tasks enable row level security;
alter table golf_rounds enable row level security;

-- Policies: authenticated user can read/write all rows
create policy "Allow authenticated full access" on daily_entries
  for all using (auth.role() = 'authenticated');

create policy "Allow authenticated full access" on whoop_daily
  for all using (auth.role() = 'authenticated');

create policy "Allow authenticated full access" on jobber_daily
  for all using (auth.role() = 'authenticated');

create policy "Allow authenticated full access" on tasks
  for all using (auth.role() = 'authenticated');

create policy "Allow authenticated full access" on golf_rounds
  for all using (auth.role() = 'authenticated');
