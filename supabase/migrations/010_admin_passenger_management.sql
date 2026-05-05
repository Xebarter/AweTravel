-- Passenger admin: suspension flag, JWT sync, and admin RLS to manage passenger profiles.

-- 1) Account status ----------------------------------------------------------

alter table public.users
  add column if not exists account_suspended boolean not null default false;

comment on column public.users.account_suspended is
  'When true, passenger routes are blocked in middleware after JWT refresh; admins may toggle via API.';

-- 2) JWT app_metadata includes account_suspended ----------------------------

create or replace function public.sync_auth_user_app_metadata()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update auth.users au
  set raw_app_meta_data =
    coalesce(au.raw_app_meta_data, '{}'::jsonb)
    || jsonb_build_object(
      'user_type', new.user_type,
      'transporter_approval_status', new.transporter_approval_status,
      'account_suspended', new.account_suspended
    )
  where au.id = new.id;

  return new;
end;
$$;

drop trigger if exists users_sync_auth_app_metadata on public.users;

create trigger users_sync_auth_app_metadata
  after insert or update of user_type, transporter_approval_status, account_suspended on public.users
  for each row
  execute function public.sync_auth_user_app_metadata();

update auth.users au
set raw_app_meta_data =
  coalesce(au.raw_app_meta_data, '{}'::jsonb)
  || jsonb_build_object('account_suspended', pu.account_suspended)
from public.users pu
where au.id = pu.id;

-- 3) Admin updates to passenger rows (profile + suspension) ------------------

create or replace function public.users_admin_passenger_update_guard()
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

  if old.user_type = 'passenger' then
    if old.id is distinct from new.id
       or old.created_at is distinct from new.created_at
       or old.user_type is distinct from new.user_type
       or old.transporter_approval_status is distinct from new.transporter_approval_status
       or old.transporter_approved_at is distinct from new.transporter_approved_at
       or old.transporter_approved_by is distinct from new.transporter_approved_by
       or old.transporter_rejection_reason is distinct from new.transporter_rejection_reason
    then
      raise exception 'Admins cannot change id, created_at, user_type, or transporter fields for passenger accounts';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists users_admin_passenger_update_guard on public.users;

create trigger users_admin_passenger_update_guard
  before update on public.users
  for each row
  execute function public.users_admin_passenger_update_guard();

drop policy if exists "users_admin_update_passenger_profile" on public.users;

create policy "users_admin_update_passenger_profile"
  on public.users
  for update
  to authenticated
  using (public.is_admin(auth.uid()) and user_type = 'passenger')
  with check (public.is_admin(auth.uid()) and user_type = 'passenger');
