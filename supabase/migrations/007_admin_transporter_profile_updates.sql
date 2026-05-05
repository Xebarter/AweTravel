-- Allow administrators to update transporter profile fields (name, email, phone, KYC, etc.),
-- not only approval columns. Still forbid changing id, created_at, or user_type via this path.

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
    if old.id is distinct from new.id
       or old.created_at is distinct from new.created_at
       or old.user_type is distinct from new.user_type
    then
      raise exception 'Admins cannot change id, created_at, or user_type for transporter accounts';
    end if;
  end if;

  return new;
end;
$$;
