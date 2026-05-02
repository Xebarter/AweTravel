-- AweTravel: public.users profile table + RLS aligned with app auth.
-- Supabase Auth manages auth.users; this migration adds the app profile row.

-- 1) Profile table (1:1 with auth.users)
create table if not exists public.users (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  full_name text not null,
  user_type text not null
    check (user_type in ('passenger', 'transporter', 'admin')),
  kyc_verified boolean not null default false,
  phone text,
  profile_image text,
  created_at timestamptz not null default now()
);

create index if not exists users_email_idx on public.users (email);

alter table public.users enable row level security;

-- Read own row
create policy "users_select_own"
  on public.users
  for select
  to authenticated
  using (auth.uid() = id);

-- Signup: only passenger or transporter (admin is not self-serve)
create policy "users_insert_own"
  on public.users
  for insert
  to authenticated
  with check (
    auth.uid() = id
    and user_type in ('passenger', 'transporter')
  );

-- Update own row; user_type changes are blocked for JWT clients (see trigger)
create policy "users_update_own"
  on public.users
  for update
  to authenticated
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- Block user_type changes from the browser; allow service role + dashboard SQL
create or replace function public.users_prevent_user_type_escalation()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  jwt_role text;
begin
  if tg_op <> 'update' or new.user_type is not distinct from old.user_type then
    return new;
  end if;

  jwt_role := coalesce(auth.jwt() ->> 'role', '');

  if jwt_role = 'service_role' then
    return new;
  end if;

  if jwt_role = 'authenticated' then
    raise exception 'user_type cannot be changed from the client';
  end if;

  return new;
end;
$$;

drop trigger if exists users_prevent_user_type_escalation on public.users;

create trigger users_prevent_user_type_escalation
  before update on public.users
  for each row
  execute function public.users_prevent_user_type_escalation();
