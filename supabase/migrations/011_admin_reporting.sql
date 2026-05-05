-- Admin reporting RPCs: timezone-aware aggregates, security definer + is_admin_user() gate.

-- UTC bounds for inclusive calendar [p_from, p_to] in p_tz (end is exclusive upper bound).
create or replace function public.admin_report_period_bounds(
  p_from date,
  p_to date,
  p_tz text
)
returns table (
  start_utc timestamptz,
  end_utc_exclusive timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin_user() then
    raise exception 'forbidden';
  end if;

  return query
  select
    (p_from::timestamp AT TIME ZONE p_tz),
    ((p_to + interval '1 day')::date::timestamp AT TIME ZONE p_tz);
end;
$$;

grant execute on function public.admin_report_period_bounds(date, date, text) to authenticated;

-- Finance totals for [p_from, p_to] inclusive calendar dates interpreted in p_tz.
create or replace function public.admin_report_finance_totals(
  p_from date,
  p_to date,
  p_tz text
)
returns table (
  incoming_completed_ugx bigint,
  outgoing_completed_ugx bigint,
  net_ugx bigint,
  pending_outgoing_count bigint,
  pending_outgoing_ugx bigint,
  by_kind_completed jsonb
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_start timestamptz;
  v_end timestamptz;
begin
  if not public.is_admin_user() then
    raise exception 'forbidden';
  end if;

  v_start := (p_from::timestamp AT TIME ZONE p_tz);
  v_end := ((p_to + interval '1 day')::date::timestamp AT TIME ZONE p_tz);

  return query
  with base as (
    select t.*
    from public.platform_transactions t
    where t.created_at >= v_start
      and t.created_at < v_end
  ),
  kind_totals as (
    select coalesce(jsonb_object_agg(sub.kind, sub.tot), '{}'::jsonb) as j
    from (
      select kind, sum(amount_ugx)::bigint as tot
      from base
      where status = 'completed'
      group by kind
    ) sub
  )
  select
    coalesce((select sum(amount_ugx) from base where flow = 'incoming' and status = 'completed'), 0)::bigint,
    coalesce((select sum(amount_ugx) from base where flow = 'outgoing' and status = 'completed'), 0)::bigint,
    coalesce(
      (
        select sum(
          case
            when flow = 'incoming' and status = 'completed' then amount_ugx
            when flow = 'outgoing' and status = 'completed' then -amount_ugx
            else 0
          end
        )
        from base
      ),
      0
    )::bigint,
    coalesce((select count(*)::bigint from base where flow = 'outgoing' and status in ('pending', 'processing')), 0)::bigint,
    coalesce(
      (select sum(amount_ugx) from base where flow = 'outgoing' and status in ('pending', 'processing')),
      0
    )::bigint,
    coalesce((select j from kind_totals), '{}'::jsonb);
end;
$$;

-- Daily buckets (completed incoming/outgoing UGX) in report timezone.
create or replace function public.admin_report_finance_daily(
  p_from date,
  p_to date,
  p_tz text
)
returns table (
  day date,
  incoming_completed_ugx bigint,
  outgoing_completed_ugx bigint,
  incoming_completed_count bigint,
  outgoing_completed_count bigint
)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_start timestamptz;
  v_end timestamptz;
begin
  if not public.is_admin_user() then
    raise exception 'forbidden';
  end if;

  v_start := (p_from::timestamp AT TIME ZONE p_tz);
  v_end := ((p_to + interval '1 day')::date::timestamp AT TIME ZONE p_tz);

  return query
  select
    (date_trunc('day', timezone(p_tz, t.created_at)))::date as day,
    coalesce(sum(case when t.flow = 'incoming' and t.status = 'completed' then t.amount_ugx else 0 end), 0)::bigint,
    coalesce(sum(case when t.flow = 'outgoing' and t.status = 'completed' then t.amount_ugx else 0 end), 0)::bigint,
    coalesce(count(*) filter (where t.flow = 'incoming' and t.status = 'completed'), 0)::bigint,
    coalesce(count(*) filter (where t.flow = 'outgoing' and t.status = 'completed'), 0)::bigint
  from public.platform_transactions t
  where t.created_at >= v_start
    and t.created_at < v_end
  group by 1
  order by 1;
end;
$$;

-- New signups per day by user_type bucket.
create or replace function public.admin_report_signups_daily(
  p_from date,
  p_to date,
  p_tz text
)
returns table (
  day date,
  new_passengers bigint,
  new_transporters bigint,
  new_admins bigint
)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_start timestamptz;
  v_end timestamptz;
begin
  if not public.is_admin_user() then
    raise exception 'forbidden';
  end if;

  v_start := (p_from::timestamp AT TIME ZONE p_tz);
  v_end := ((p_to + interval '1 day')::date::timestamp AT TIME ZONE p_tz);

  return query
  select
    (date_trunc('day', timezone(p_tz, u.created_at)))::date as day,
    coalesce(count(*) filter (where u.user_type = 'passenger'), 0)::bigint,
    coalesce(count(*) filter (where u.user_type = 'transporter'), 0)::bigint,
    coalesce(count(*) filter (where u.user_type = 'admin'), 0)::bigint
  from public.users u
  where u.created_at >= v_start
    and u.created_at < v_end
  group by 1
  order by 1;
end;
$$;

-- Fleet / route totals (bypasses transporter-only RLS for read).
create or replace function public.admin_report_operations_counts()
returns table (
  routes_total bigint,
  vehicles_total bigint,
  departures_total bigint,
  routes_active bigint
)
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin_user() then
    raise exception 'forbidden';
  end if;

  return query
  select
    (select count(*)::bigint from public.transporter_routes),
    (select count(*)::bigint from public.transporter_vehicles),
    (select count(*)::bigint from public.transporter_route_departures),
    (select count(*)::bigint from public.transporter_routes where status = 'active');
end;
$$;

grant execute on function public.admin_report_finance_totals(date, date, text) to authenticated;
grant execute on function public.admin_report_finance_daily(date, date, text) to authenticated;
grant execute on function public.admin_report_signups_daily(date, date, text) to authenticated;
grant execute on function public.admin_report_operations_counts() to authenticated;
