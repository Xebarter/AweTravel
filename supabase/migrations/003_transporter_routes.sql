-- Transporter routes, stops, and departures.
-- A route describes a path from origin to destination. Each route can have many
-- departures (a bus moving at a specific time, optionally tied to a vehicle).

-- 1) Routes ---------------------------------------------------------------

create table if not exists public.transporter_routes (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null references public.users (id) on delete cascade,
  route_code text not null,
  origin text not null,
  destination text not null,
  distance_km numeric(8, 2) not null check (distance_km > 0 and distance_km <= 100000),
  duration_minutes integer not null check (duration_minutes > 0 and duration_minutes <= 10080),
  vehicle_class text not null default 'Bus',
  base_price_minor integer not null default 0 check (base_price_minor >= 0),
  currency text not null default 'UGX',
  status text not null default 'active'
    check (status in ('active', 'paused', 'archived')),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists transporter_routes_owner_code_lower_idx
  on public.transporter_routes (owner_user_id, lower(route_code));

create index if not exists transporter_routes_owner_user_id_idx
  on public.transporter_routes (owner_user_id);

alter table public.transporter_routes enable row level security;

create or replace function public.transporter_routes_set_updated_at()
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

drop trigger if exists transporter_routes_set_updated_at on public.transporter_routes;

create trigger transporter_routes_set_updated_at
  before update on public.transporter_routes
  for each row
  execute function public.transporter_routes_set_updated_at();

-- Owner-only RLS, gated to transporter profiles.
create policy "transporter_routes_select_own"
  on public.transporter_routes
  for select
  to authenticated
  using (
    owner_user_id = auth.uid()
    and public.is_transporter(auth.uid())
  );

create policy "transporter_routes_insert_own"
  on public.transporter_routes
  for insert
  to authenticated
  with check (
    owner_user_id = auth.uid()
    and public.is_transporter(auth.uid())
  );

create policy "transporter_routes_update_own"
  on public.transporter_routes
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

create policy "transporter_routes_delete_own"
  on public.transporter_routes
  for delete
  to authenticated
  using (
    owner_user_id = auth.uid()
    and public.is_transporter(auth.uid())
  );


-- 2) Stops ----------------------------------------------------------------

create table if not exists public.transporter_route_stops (
  id uuid primary key default gen_random_uuid(),
  route_id uuid not null references public.transporter_routes (id) on delete cascade,
  position integer not null check (position >= 0 and position <= 64),
  name text not null,
  eta_offset_minutes integer check (eta_offset_minutes is null or eta_offset_minutes >= 0),
  created_at timestamptz not null default now()
);

create unique index if not exists transporter_route_stops_route_position_idx
  on public.transporter_route_stops (route_id, position);

create index if not exists transporter_route_stops_route_idx
  on public.transporter_route_stops (route_id);

alter table public.transporter_route_stops enable row level security;

-- Children policies: join to parent route to verify ownership.
create policy "transporter_route_stops_select_own"
  on public.transporter_route_stops
  for select
  to authenticated
  using (
    exists (
      select 1 from public.transporter_routes r
      where r.id = route_id
        and r.owner_user_id = auth.uid()
        and public.is_transporter(auth.uid())
    )
  );

create policy "transporter_route_stops_insert_own"
  on public.transporter_route_stops
  for insert
  to authenticated
  with check (
    exists (
      select 1 from public.transporter_routes r
      where r.id = route_id
        and r.owner_user_id = auth.uid()
        and public.is_transporter(auth.uid())
    )
  );

create policy "transporter_route_stops_update_own"
  on public.transporter_route_stops
  for update
  to authenticated
  using (
    exists (
      select 1 from public.transporter_routes r
      where r.id = route_id
        and r.owner_user_id = auth.uid()
        and public.is_transporter(auth.uid())
    )
  )
  with check (
    exists (
      select 1 from public.transporter_routes r
      where r.id = route_id
        and r.owner_user_id = auth.uid()
        and public.is_transporter(auth.uid())
    )
  );

create policy "transporter_route_stops_delete_own"
  on public.transporter_route_stops
  for delete
  to authenticated
  using (
    exists (
      select 1 from public.transporter_routes r
      where r.id = route_id
        and r.owner_user_id = auth.uid()
        and public.is_transporter(auth.uid())
    )
  );


-- 3) Departures -----------------------------------------------------------
-- Bit 0 = Sunday … bit 6 = Saturday. Bitmask range 1..127 keeps at least one day.

create table if not exists public.transporter_route_departures (
  id uuid primary key default gen_random_uuid(),
  route_id uuid not null references public.transporter_routes (id) on delete cascade,
  vehicle_id uuid references public.transporter_vehicles (id) on delete set null,
  departure_time time not null,
  days_of_week smallint not null check (days_of_week between 1 and 127),
  status text not null default 'active'
    check (status in ('active', 'paused')),
  price_override_minor integer check (price_override_minor is null or price_override_minor >= 0),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists transporter_route_departures_route_idx
  on public.transporter_route_departures (route_id);

create index if not exists transporter_route_departures_vehicle_idx
  on public.transporter_route_departures (vehicle_id);

alter table public.transporter_route_departures enable row level security;

create or replace function public.transporter_route_departures_set_updated_at()
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

drop trigger if exists transporter_route_departures_set_updated_at on public.transporter_route_departures;

create trigger transporter_route_departures_set_updated_at
  before update on public.transporter_route_departures
  for each row
  execute function public.transporter_route_departures_set_updated_at();

create policy "transporter_route_departures_select_own"
  on public.transporter_route_departures
  for select
  to authenticated
  using (
    exists (
      select 1 from public.transporter_routes r
      where r.id = route_id
        and r.owner_user_id = auth.uid()
        and public.is_transporter(auth.uid())
    )
  );

create policy "transporter_route_departures_insert_own"
  on public.transporter_route_departures
  for insert
  to authenticated
  with check (
    exists (
      select 1 from public.transporter_routes r
      where r.id = route_id
        and r.owner_user_id = auth.uid()
        and public.is_transporter(auth.uid())
    )
    and (
      vehicle_id is null
      or exists (
        select 1 from public.transporter_vehicles v
        where v.id = vehicle_id
          and v.owner_user_id = auth.uid()
      )
    )
  );

create policy "transporter_route_departures_update_own"
  on public.transporter_route_departures
  for update
  to authenticated
  using (
    exists (
      select 1 from public.transporter_routes r
      where r.id = route_id
        and r.owner_user_id = auth.uid()
        and public.is_transporter(auth.uid())
    )
  )
  with check (
    exists (
      select 1 from public.transporter_routes r
      where r.id = route_id
        and r.owner_user_id = auth.uid()
        and public.is_transporter(auth.uid())
    )
    and (
      vehicle_id is null
      or exists (
        select 1 from public.transporter_vehicles v
        where v.id = vehicle_id
          and v.owner_user_id = auth.uid()
      )
    )
  );

create policy "transporter_route_departures_delete_own"
  on public.transporter_route_departures
  for delete
  to authenticated
  using (
    exists (
      select 1 from public.transporter_routes r
      where r.id = route_id
        and r.owner_user_id = auth.uid()
        and public.is_transporter(auth.uid())
    )
  );
