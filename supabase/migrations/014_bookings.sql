-- Bookings: passenger reservations tied to transporter routes/departures.
-- This powers transporter booking management + earnings reporting.

create table if not exists public.bookings (
  id uuid primary key default gen_random_uuid(),
  booking_code text not null,
  passenger_user_id uuid not null references public.users (id) on delete cascade,
  route_id uuid not null references public.transporter_routes (id) on delete restrict,
  departure_id uuid references public.transporter_route_departures (id) on delete set null,
  travel_date date not null,
  seat_code text not null,
  status text not null default 'pending'
    check (status in ('pending', 'confirmed', 'cancelled', 'completed')),
  amount_minor integer not null default 0 check (amount_minor >= 0),
  currency text not null default 'UGX',
  payment_status text not null default 'pending'
    check (payment_status in ('pending', 'completed', 'failed', 'cancelled')),
  payment_reference text,
  platform_transaction_id uuid references public.platform_transactions (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists bookings_booking_code_uidx on public.bookings (booking_code);
create index if not exists bookings_passenger_idx on public.bookings (passenger_user_id, created_at desc);
create index if not exists bookings_route_idx on public.bookings (route_id, created_at desc);
create index if not exists bookings_departure_idx on public.bookings (departure_id, created_at desc);
create index if not exists bookings_payment_reference_idx
  on public.bookings (payment_reference)
  where payment_reference is not null;

alter table public.bookings enable row level security;

create or replace function public.bookings_set_updated_at()
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

drop trigger if exists bookings_set_updated_at on public.bookings;

create trigger bookings_set_updated_at
  before update on public.bookings
  for each row
  execute function public.bookings_set_updated_at();

-- Passenger: read own bookings
create policy "bookings_select_own"
  on public.bookings
  for select
  to authenticated
  using (passenger_user_id = auth.uid());

-- Passenger: create booking rows for themselves (payment is handled separately)
create policy "bookings_insert_own"
  on public.bookings
  for insert
  to authenticated
  with check (
    passenger_user_id = auth.uid()
    and status in ('pending', 'confirmed')
  );

-- Passenger: allow cancelling own pending/confirmed bookings
create policy "bookings_update_own_cancel"
  on public.bookings
  for update
  to authenticated
  using (passenger_user_id = auth.uid())
  with check (
    passenger_user_id = auth.uid()
    and status in ('cancelled', 'pending', 'confirmed', 'completed')
  );

-- Transporter: read bookings for routes they own.
create policy "bookings_select_transporter"
  on public.bookings
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

-- Transporter: update booking status (e.g. confirm/cancel/complete).
create policy "bookings_update_transporter"
  on public.bookings
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

-- Admin: full access (consistent with other tables)
create policy "bookings_select_admin"
  on public.bookings
  for select
  to authenticated
  using (public.is_admin(auth.uid()));

create policy "bookings_update_admin"
  on public.bookings
  for update
  to authenticated
  using (public.is_admin(auth.uid()))
  with check (public.is_admin(auth.uid()));

