-- Run once in Supabase > SQL Editor. Records every successful login from ClientFlow CRM.
create table if not exists public.login_events (
  id bigint generated always as identity primary key,
  user_id uuid references auth.users(id) on delete cascade,
  email text,
  created_at timestamptz not null default now()
);
alter table public.login_events enable row level security;
create policy "users insert own login" on public.login_events
  for insert to authenticated with check (auth.uid() = user_id);

-- How many people have logged in, and how many times:
select count(distinct user_id) as people, count(*) as total_logins from public.login_events;

-- Per person:
select email, count(*) as logins, max(created_at) as last_login
from public.login_events group by email order by last_login desc;
