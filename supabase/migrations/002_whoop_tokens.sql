create table if not exists whoop_tokens (
  id uuid primary key default gen_random_uuid(),
  access_token text not null,
  refresh_token text not null,
  expires_at timestamptz not null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table whoop_tokens enable row level security;

create policy "Allow service role full access" on whoop_tokens
  for all using (true);
