-- Transporter onboarding: operators must be admin-approved before fleet/route RLS allows access.

-- 1) Columns on public.users ------------------------------------------------

alter table public.users
  add column if not exists transporter_approval_status text
    check (
      transporter_approval_status is null
      or transporter_approval_status in ('pending', 'approved', 'rejected')
    );

alter table public.users
  add column if not exists transporter_approved_at timestamptz,
  add column if not exists transporter_approved_by uuid references public.users (id) on delete set null,
  add column if not exists transporter_rejection_reason text;

-- Existing transporters: treat as already approved (no service disruption).
update public.users
set
  transporter_approval_status = 'approved',
  transporter_approved_at = coalesce(transporter_approved_at, created_at, now())
where user_type = 'transporter'
  and transporter_approval_status is null;

update public.users
set transporter_approval_status = null,
    transporter_approved_at = null,
    transporter_approved_by = null,
    transporter_rejection_reason = null
where user_type <> 'transporter';

alter table public.users
  drop constraint if exists users_transporter_approval_by_type;

alter table public.users
  add constraint users_transporter_approval_by_type
  check (
    (user_type = 'transporter' and transporter_approval_status is not null)
    or (user_type <> 'transporter' and transporter_approval_status is null)
  );

create index if not exists users_transporter_approval_status_idx
  on public.users (transporter_approval_status)
  where user_type = 'transporter';

-- 2) Default pending on new transporter signups + keep approval fields sane

create or replace function public.users_set_transporter_approval_defaults()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.user_type = 'transporter' then
    if tg_op = 'INSERT' and coalesce(auth.jwt() ->> 'role', '') <> 'service_role' then
      new.transporter_approval_status := 'pending';
      new.transporter_approved_at := null;
      new.transporter_approved_by := null;
      new.transporter_rejection_reason := null;
    elsif tg_op = 'INSERT' and new.transporter_approval_status is null then
      new.transporter_approval_status := 'pending';
    end if;
    if new.transporter_approval_status in ('pending', 'rejected') then
      new.transporter_approved_at := null;
      new.transporter_approved_by := null;
    end if;
    if new.transporter_approval_status <> 'rejected' then
      new.transporter_rejection_reason := null;
    end if;
  else
    new.transporter_approval_status := null;
    new.transporter_approved_at := null;
    new.transporter_approved_by := null;
    new.transporter_rejection_reason := null;
  end if;
  return new;
end;
$$;

drop trigger if exists users_set_transporter_approval_defaults on public.users;

create trigger users_set_transporter_approval_defaults
  before insert or update on public.users
  for each row
  execute function public.users_set_transporter_approval_defaults();

-- Users cannot self-approve or change approval metadata (admins only).
create or replace function public.users_prevent_self_transporter_approval_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if old.id is distinct from auth.uid() then
    return new;
  end if;
  if (old.transporter_approval_status is distinct from new.transporter_approval_status)
     or (old.transporter_approved_at is distinct from new.transporter_approved_at)
     or (old.transporter_approved_by is distinct from new.transporter_approved_by)
     or (old.transporter_rejection_reason is distinct from new.transporter_rejection_reason)
  then
    raise exception 'Transporter approval can only be changed by an administrator';
  end if;
  return new;
end;
$$;

drop trigger if exists users_prevent_self_transporter_approval_change on public.users;

create trigger users_prevent_self_transporter_approval_change
  before update on public.users
  for each row
  execute function public.users_prevent_self_transporter_approval_change();

-- 3) Helpers: admin + approved transporter ---------------------------------

create or replace function public.is_admin(uid uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.users u
    where u.id = uid and u.user_type = 'admin'
  );
$$;

-- RLS for fleet/routes uses this name: only *approved* transporters count.
create or replace function public.is_transporter(uid uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.users u
    where u.id = uid
      and u.user_type = 'transporter'
      and u.transporter_approval_status = 'approved'
  );
$$;

-- 4) RLS: admins may read all users ----------------------------------------

drop policy if exists "users_select_all_if_admin" on public.users;

create policy "users_select_all_if_admin"
  on public.users
  for select
  to authenticated
  using (public.is_admin(auth.uid()));

-- 5) RLS: admins may update transporter approval fields only ---------------

create or replace function public.users_admin_transporter_update_guard()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  actor_is_admin boolean;
begin
  select exists(select 1 from public.users where id = auth.uid() and user_type = 'admin')
    into actor_is_admin;

  if not actor_is_admin or old.id = auth.uid() then
    return new;
  end if;

  if old.user_type = 'transporter' then
    if (old.email is distinct from new.email)
       or (old.full_name is distinct from new.full_name)
       or (old.user_type is distinct from new.user_type)
       or (old.kyc_verified is distinct from new.kyc_verified)
       or (old.phone is distinct from new.phone)
       or (old.profile_image is distinct from new.profile_image)
       or (old.created_at is distinct from new.created_at)
       or (old.id is distinct from new.id)
    then
      raise exception 'Admins may only change transporter approval fields for transporter accounts';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists users_admin_transporter_update_guard on public.users;

create trigger users_admin_transporter_update_guard
  before update on public.users
  for each row
  execute function public.users_admin_transporter_update_guard();

drop policy if exists "users_admin_update_transporter_approval" on public.users;

create policy "users_admin_update_transporter_approval"
  on public.users
  for update
  to authenticated
  using (public.is_admin(auth.uid()) and user_type = 'transporter')
  with check (public.is_admin(auth.uid()) and user_type = 'transporter');
