-- Transport company profile (owned by a transporter user).
-- Keeps company/business identity separate from personal user profile details.

create table if not exists public.transporter_company_profiles (
  owner_user_id uuid primary key references public.users (id) on delete cascade,
  company_name text not null,
  trading_name text,
  support_email text,
  support_phone text,
  ops_email text,
  ops_phone text,
  website text,
  logo_url text,
  address_line1 text,
  address_line2 text,
  city text,
  region text,
  country text not null default 'Uganda',
  registration_number text,
  tax_id text,
  about text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists transporter_company_profiles_owner_idx
  on public.transporter_company_profiles (owner_user_id);

alter table public.transporter_company_profiles enable row level security;

create or replace function public.transporter_company_profiles_set_updated_at()
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

drop trigger if exists transporter_company_profiles_set_updated_at on public.transporter_company_profiles;
create trigger transporter_company_profiles_set_updated_at
  before update on public.transporter_company_profiles
  for each row
  execute function public.transporter_company_profiles_set_updated_at();

-- Transporter: read their own company profile.
create policy "transporter_company_profiles_select_own"
  on public.transporter_company_profiles
  for select
  to authenticated
  using (
    owner_user_id = auth.uid()
    and public.is_transporter(auth.uid())
  );

-- Transporter: create their own company profile row.
create policy "transporter_company_profiles_insert_own"
  on public.transporter_company_profiles
  for insert
  to authenticated
  with check (
    owner_user_id = auth.uid()
    and public.is_transporter(auth.uid())
  );

-- Transporter: update their own company profile row.
create policy "transporter_company_profiles_update_own"
  on public.transporter_company_profiles
  for update
  to authenticated
  using (
    owner_user_id = auth.uid()
    and public.is_transporter(auth.uid())
  )
  with check (
    owner_user_id = auth.uid()
    and public.is_transporter(auth.uid())
  );

-- Admin: full read/update.
create policy "transporter_company_profiles_select_admin"
  on public.transporter_company_profiles
  for select
  to authenticated
  using (public.is_admin_user());

create policy "transporter_company_profiles_update_admin"
  on public.transporter_company_profiles
  for update
  to authenticated
  using (public.is_admin_user())
  with check (public.is_admin_user());

