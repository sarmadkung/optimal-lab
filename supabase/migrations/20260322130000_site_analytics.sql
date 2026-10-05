-- Anonymous site metrics: page views and unique visitors (cookie id).
-- Run after project_start_counts migration.

create table if not exists public.site_counters (
  id text primary key check (id = 'main'),
  page_views bigint not null default 0 check (page_views >= 0),
  unique_visitors bigint not null default 0 check (unique_visitors >= 0),
  updated_at timestamptz not null default now()
);

insert into public.site_counters (id) values ('main') on conflict (id) do nothing;

create table if not exists public.site_visitors (
  visitor_id uuid primary key,
  first_seen timestamptz not null default now()
);

alter table public.site_counters enable row level security;
alter table public.site_visitors enable row level security;

create policy "no anon site_counters"
  on public.site_counters for all using (false);

create policy "no anon site_visitors"
  on public.site_visitors for all using (false);

create or replace function public.record_site_visit(p_visitor_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  is_new boolean := false;
  views bigint;
  uniques bigint;
begin
  update public.site_counters
  set page_views = page_views + 1, updated_at = now()
  where id = 'main';

  insert into public.site_visitors (visitor_id) values (p_visitor_id)
  on conflict (visitor_id) do nothing;

  get diagnostics is_new = (row_count > 0);

  if is_new then
    update public.site_counters
    set unique_visitors = unique_visitors + 1, updated_at = now()
    where id = 'main';
  end if;

  select page_views, unique_visitors into views, uniques from public.site_counters where id = 'main';

  return jsonb_build_object(
    'page_views', views,
    'unique_visitors', uniques,
    'new_visitor', is_new
  );
end;
$$;

create or replace function public.get_public_site_stats()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  views bigint;
  uniques bigint;
  starts bigint;
begin
  select page_views, unique_visitors into views, uniques
  from public.site_counters where id = 'main';

  select coalesce(sum(started_count), 0) into starts from public.project_start_counts;

  return jsonb_build_object(
    'page_views', coalesce(views, 0),
    'unique_visitors', coalesce(uniques, 0),
    'project_starts', coalesce(starts, 0)
  );
end;
$$;

revoke all on function public.record_site_visit(uuid) from public;
revoke all on function public.get_public_site_stats() from public;
grant execute on function public.record_site_visit(uuid) to service_role;
grant execute on function public.get_public_site_stats() to service_role;
