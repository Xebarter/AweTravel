-- Seats offered for sale on a route (drives passenger booking seat map). Capped on the server against vehicle capacity when a vehicle is assigned.

alter table public.transporter_routes
  add column if not exists passenger_seating_capacity integer not null default 50
    check (passenger_seating_capacity >= 1 and passenger_seating_capacity <= 120);

comment on column public.transporter_routes.passenger_seating_capacity is
  'Number of sellable passenger seats for this route; booking UI uses min(this, assigned vehicle capacity).';
