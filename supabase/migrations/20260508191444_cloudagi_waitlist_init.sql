-- CloudAGI waitlist table.
-- Single source of truth for early-access signups.
-- Stored in CloudAGI-AI-Tommy org, project cloudagi-SWARM.

create table if not exists public.cloudagi_waitlist (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  role text not null check (role in ('seller', 'buyer', 'builder')),
  source text not null default 'landing',
  ip text,
  created_at timestamptz not null default now()
);

create unique index if not exists cloudagi_waitlist_email_lower_uniq
  on public.cloudagi_waitlist (lower(email));

create index if not exists cloudagi_waitlist_created_at_idx
  on public.cloudagi_waitlist (created_at desc);

alter table public.cloudagi_waitlist enable row level security;

drop policy if exists cloudagi_waitlist_insert_anon on public.cloudagi_waitlist;
create policy cloudagi_waitlist_insert_anon
  on public.cloudagi_waitlist
  for insert
  to anon
  with check (true);

drop policy if exists cloudagi_waitlist_select_anon_count on public.cloudagi_waitlist;
create policy cloudagi_waitlist_select_anon_count
  on public.cloudagi_waitlist
  for select
  to anon
  using (true);
