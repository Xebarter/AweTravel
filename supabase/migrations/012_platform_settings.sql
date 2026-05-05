-- Singleton platform configuration (admin-editable; safe subset exposed via RPC).

create table if not exists public.platform_settings (
  id uuid primary key default gen_random_uuid(),
  site_name text not null default 'AweTravel'
    check (char_length(site_name) <= 120),
  support_email text
    check (support_email is null or char_length(support_email) <= 320),
  support_phone text
    check (support_phone is null or char_length(support_phone) <= 64),
  terms_url text
    check (terms_url is null or char_length(terms_url) <= 2048),
  privacy_url text
    check (privacy_url is null or char_length(privacy_url) <= 2048),
  default_report_timezone text not null default 'Africa/Kampala'
    check (char_length(default_report_timezone) <= 64),
  maintenance_mode boolean not null default false,
  platform_fee_bps integer not null default 500
    check (platform_fee_bps >= 0 and platform_fee_bps <= 10000),
  updated_by uuid references public.users (id) on delete set null,
  updated_at timestamptz not null default now()
);

alter table public.platform_settings enable row level security;

create or replace function public.platform_settings_set_updated_at()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists platform_settings_set_updated_at on public.platform_settings;

create trigger platform_settings_set_updated_at
  before update on public.platform_settings
  for each row
  execute function public.platform_settings_set_updated_at();

-- Fixed singleton id (referenced by app and RPC).
insert into public.platform_settings (id)
values ('a0000001-0000-4000-8000-000000000001'::uuid)
on conflict (id) do nothing;

create policy "platform_settings_select_admin"
  on public.platform_settings
  for select
  to authenticated
  using (public.is_admin(auth.uid()));

create policy "platform_settings_update_admin"
  on public.platform_settings
  for update
  to authenticated
  using (public.is_admin(auth.uid()))
  with check (public.is_admin(auth.uid()));

-- Public read of non-sensitive fields (anon + authenticated clients).
create or replace function public.get_public_platform_settings()
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (
      select jsonb_build_object(
        'site_name', ps.site_name,
        'platform_fee_bps', ps.platform_fee_bps,
        'maintenance_mode', ps.maintenance_mode,
        'support_email', ps.support_email
      )
      from public.platform_settings ps
      where ps.id = 'a0000001-0000-4000-8000-000000000001'::uuid
    ),
    '{"site_name":"AweTravel","platform_fee_bps":500,"maintenance_mode":false,"support_email":null}'::jsonb
  );
$$;

grant execute on function public.get_public_platform_settings() to anon, authenticated;
