-- Link multiple booking rows paid together in one Paytota checkout (reference = checkout_group_id).

alter table public.bookings
  add column if not exists checkout_group_id uuid;

create index if not exists bookings_checkout_group_idx
  on public.bookings (checkout_group_id)
  where checkout_group_id is not null;
