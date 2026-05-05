-- Sync public.users role fields into auth.users.raw_app_meta_data so JWTs include
-- user_type + transporter_approval_status (middleware can avoid a DB round-trip).

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
      'transporter_approval_status', new.transporter_approval_status
    )
  where au.id = new.id;

  return new;
end;
$$;

drop trigger if exists users_sync_auth_app_metadata on public.users;

create trigger users_sync_auth_app_metadata
  after insert or update of user_type, transporter_approval_status on public.users
  for each row
  execute function public.sync_auth_user_app_metadata();

-- Backfill existing profiles (JWTs refresh on next token rotation or refreshSession)
update auth.users au
set raw_app_meta_data =
  coalesce(au.raw_app_meta_data, '{}'::jsonb)
  || jsonb_build_object(
    'user_type', pu.user_type,
    'transporter_approval_status', pu.transporter_approval_status
  )
from public.users pu
where au.id = pu.id;
