-- Fleet vehicles owned by transporter users (1:1 with public.users for owner).

create table if not exists public.transporter_vehicles (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null references public.users (id) on delete cascade,
  registration text not null,
  vehicle_type text not null,
  capacity integer not null
    check (capacity >= 1 and capacity <= 200),
  status text not null default 'active'
    check (status in ('active', 'maintenance', 'inactive')),
  last_maintenance_date date not null,
  mileage_km integer not null default 0 check (mileage_km >= 0),
  acquisition_date date not null,
  vin text,
  color text,
  fuel_type text,
  insurer text,
  policy_expires date,
  next_inspection_due date,
  notes text,
  wheelchair_accessible boolean not null default false,
  gps_tracked boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists transporter_vehicles_owner_registration_lower_idx
  on public.transporter_vehicles (owner_user_id, lower(registration));

create index if not exists transporter_vehicles_owner_user_id_idx
  on public.transporter_vehicles (owner_user_id);

alter table public.transporter_vehicles enable row level security;

create or replace function public.transporter_vehicles_set_updated_at()
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

drop trigger if exists transporter_vehicles_set_updated_at on public.transporter_vehicles;

create trigger transporter_vehicles_set_updated_at
  before update on public.transporter_vehicles
  for each row
  execute function public.transporter_vehicles_set_updated_at();

-- Helpers: only transporter profiles may manage fleet rows.
create or replace function public.is_transporter(uid uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.users u
    where u.id = uid and u.user_type = 'transporter'
  );
$$;

create policy "transporter_vehicles_select_own"
  on public.transporter_vehicles
  for select
  to authenticated
  using (
    owner_user_id = auth.uid()
    and public.is_transporter(auth.uid())
  );

create policy "transporter_vehicles_insert_own"
  on public.transporter_vehicles
  for insert
  to authenticated
  with check (
    owner_user_id = auth.uid()
    and public.is_transporter(auth.uid())
  );

create policy "transporter_vehicles_update_own"
  on public.transporter_vehicles
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

create policy "transporter_vehicles_delete_own"
  on public.transporter_vehicles
  for delete
  to authenticated
  using (
    owner_user_id = auth.uid()
    and public.is_transporter(auth.uid())
  );
