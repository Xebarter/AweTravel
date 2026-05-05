-- Allow guest (unsigned) bookings: optional passenger account, required guest contact when no account.

alter table public.bookings
  add column if not exists guest_full_name text,
  add column if not exists guest_email text,
  add column if not exists guest_phone text;

alter table public.bookings
  alter column passenger_user_id drop not null;

alter table public.bookings
  add constraint bookings_passenger_or_guest_chk check (
    (
      passenger_user_id is not null
      and guest_full_name is null
      and guest_email is null
    )
    or
    (
      passenger_user_id is null
      and guest_full_name is not null
      and length(trim(guest_full_name)) > 0
      and guest_email is not null
      and length(trim(guest_email)) > 0
    )
  );

create index if not exists bookings_guest_email_idx
  on public.bookings (guest_email)
  where guest_email is not null;
