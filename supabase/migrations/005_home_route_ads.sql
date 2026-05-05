-- Homepage route-linked ads: transporter applications + published banners.

-- 1) Applications -----------------------------------------------------------

create table if not exists public.route_home_ad_applications (
  id uuid primary key default gen_random_uuid(),
  applicant_user_id uuid not null references public.users (id) on delete cascade,
  route_id uuid not null references public.transporter_routes (id) on delete cascade,
  headline text not null check (char_length(headline) <= 160),
  subheadline text check (subheadline is null or char_length(subheadline) <= 240),
  cta_label text not null check (char_length(cta_label) <= 64),
  target_url text not null check (char_length(target_url) <= 2048),
  image_url text not null check (char_length(image_url) <= 2048),
  status text not null default 'pending_review'
    check (status in ('draft', 'pending_review', 'approved', 'rejected', 'withdrawn')),
  reviewed_by uuid references public.users (id) on delete set null,
  reviewed_at timestamptz,
  rejection_reason text check (rejection_reason is null or char_length(rejection_reason) <= 1000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists route_home_ad_applications_applicant_idx
  on public.route_home_ad_applications (applicant_user_id);

create index if not exists route_home_ad_applications_route_idx
  on public.route_home_ad_applications (route_id);

create index if not exists route_home_ad_applications_status_idx
  on public.route_home_ad_applications (status);

create unique index if not exists route_home_ad_applications_one_pending_per_route_idx
  on public.route_home_ad_applications (route_id)
  where status = 'pending_review';

alter table public.route_home_ad_applications enable row level security;

create or replace function public.route_home_ad_applications_set_updated_at()
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

drop trigger if exists route_home_ad_applications_set_updated_at on public.route_home_ad_applications;

create trigger route_home_ad_applications_set_updated_at
  before update on public.route_home_ad_applications
  for each row
  execute function public.route_home_ad_applications_set_updated_at();

create or replace function public.route_home_ad_applications_route_owned_by_applicant()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (
    select 1 from public.transporter_routes r
    where r.id = new.route_id and r.owner_user_id = new.applicant_user_id
  ) then
    raise exception 'route_id must belong to applicant_user_id';
  end if;
  return new;
end;
$$;

drop trigger if exists route_home_ad_applications_route_owner on public.route_home_ad_applications;

create trigger route_home_ad_applications_route_owner
  before insert or update on public.route_home_ad_applications
  for each row
  execute function public.route_home_ad_applications_route_owned_by_applicant();

-- RLS: transporter own rows
create policy "route_home_ad_applications_select_own"
  on public.route_home_ad_applications
  for select
  to authenticated
  using (
    applicant_user_id = auth.uid()
    and public.is_transporter(auth.uid())
  );

create policy "route_home_ad_applications_insert_own"
  on public.route_home_ad_applications
  for insert
  to authenticated
  with check (
    applicant_user_id = auth.uid()
    and public.is_transporter(auth.uid())
    and exists (
      select 1 from public.transporter_routes r
      where r.id = route_id and r.owner_user_id = auth.uid()
    )
  );

create policy "route_home_ad_applications_update_own"
  on public.route_home_ad_applications
  for update
  to authenticated
  using (
    applicant_user_id = auth.uid()
    and public.is_transporter(auth.uid())
  )
  with check (
    applicant_user_id = auth.uid()
    and public.is_transporter(auth.uid())
    and exists (
      select 1 from public.transporter_routes r
      where r.id = route_id and r.owner_user_id = auth.uid()
    )
  );

-- RLS: admin all access
create policy "route_home_ad_applications_select_admin"
  on public.route_home_ad_applications
  for select
  to authenticated
  using (public.is_admin(auth.uid()));

create policy "route_home_ad_applications_update_admin"
  on public.route_home_ad_applications
  for update
  to authenticated
  using (public.is_admin(auth.uid()))
  with check (public.is_admin(auth.uid()));

-- 2) Published banners ------------------------------------------------------

create table if not exists public.home_banners (
  id uuid primary key default gen_random_uuid(),
  source_application_id uuid references public.route_home_ad_applications (id) on delete set null,
  image_url text not null check (char_length(image_url) <= 2048),
  title text not null check (char_length(title) <= 160),
  subtitle text check (subtitle is null or char_length(subtitle) <= 240),
  cta_label text not null check (char_length(cta_label) <= 64),
  link_url text not null check (char_length(link_url) <= 2048),
  sponsored_label text check (sponsored_label is null or char_length(sponsored_label) <= 64),
  starts_at timestamptz not null,
  ends_at timestamptz,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_by uuid not null references public.users (id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (ends_at is null or ends_at >= starts_at)
);

create index if not exists home_banners_active_schedule_idx
  on public.home_banners (is_active, starts_at, ends_at, sort_order);

alter table public.home_banners enable row level security;

create or replace function public.home_banners_set_updated_at()
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

drop trigger if exists home_banners_set_updated_at on public.home_banners;

create trigger home_banners_set_updated_at
  before update on public.home_banners
  for each row
  execute function public.home_banners_set_updated_at();

-- Public read: active slot within schedule
create policy "home_banners_select_public"
  on public.home_banners
  for select
  to anon, authenticated
  using (
    is_active
    and starts_at <= now()
    and (ends_at is null or ends_at >= now())
  );

-- Admin CRUD
create policy "home_banners_select_admin"
  on public.home_banners
  for select
  to authenticated
  using (public.is_admin(auth.uid()));

create policy "home_banners_insert_admin"
  on public.home_banners
  for insert
  to authenticated
  with check (public.is_admin(auth.uid()));

create policy "home_banners_update_admin"
  on public.home_banners
  for update
  to authenticated
  using (public.is_admin(auth.uid()))
  with check (public.is_admin(auth.uid()));

create policy "home_banners_delete_admin"
  on public.home_banners
  for delete
  to authenticated
  using (public.is_admin(auth.uid()));

-- Admins need route context when reviewing homepage ad applications.
drop policy if exists "transporter_routes_select_admin" on public.transporter_routes;

create policy "transporter_routes_select_admin"
  on public.transporter_routes
  for select
  to authenticated
  using (public.is_admin(auth.uid()));
