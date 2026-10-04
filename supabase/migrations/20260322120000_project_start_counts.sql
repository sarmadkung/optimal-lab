-- Run in Supabase SQL editor or via supabase db push.
-- Stores public "started" counts for catalog projects (roadmap.sh-style).

create table if not exists public.project_start_counts (
  project_key text primary key,
  started_count bigint not null default 0 check (started_count >= 0),
  updated_at timestamptz not null default now()
);

alter table public.project_start_counts enable row level security;

-- No direct client access; Next.js Route Handlers use the service role.
create policy "no anon access"
  on public.project_start_counts
  for all
  using (false);

create or replace function public.increment_project_start(p_key text)
returns bigint
language plpgsql
security definer
set search_path = public
as $$
declare
  new_count bigint;
begin
  insert into public.project_start_counts (project_key, started_count)
  values (p_key, 1)
  on conflict (project_key) do update
    set started_count = public.project_start_counts.started_count + 1,
        updated_at = now()
  returning started_count into new_count;
  return new_count;
end;
$$;

revoke all on function public.increment_project_start(text) from public;
grant execute on function public.increment_project_start(text) to service_role;
