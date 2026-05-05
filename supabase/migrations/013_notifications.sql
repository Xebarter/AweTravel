-- In-app notifications (per-user) + preferences + realtime enablement.
-- Designed to work with Supabase RLS + Realtime (Postgres Changes).

-- 1) Notification records ----------------------------------------------------

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  recipient_id uuid not null references public.users (id) on delete cascade,
  actor_id uuid references public.users (id) on delete set null,

  -- Display content
  title text not null check (char_length(title) <= 140),
  message text not null check (char_length(message) <= 2000),
  type text not null default 'info'
    check (type in ('success', 'warning', 'error', 'info')),
  category text not null default 'general'
    check (char_length(category) <= 64),

  -- Optional routing payload for the client (e.g. { href: "/passenger/bookings" })
  data jsonb not null default '{}'::jsonb,

  created_at timestamptz not null default now(),
  read_at timestamptz,
  dismissed_at timestamptz
);

create index if not exists notifications_recipient_created_idx
  on public.notifications (recipient_id, created_at desc);

create index if not exists notifications_unread_idx
  on public.notifications (recipient_id, created_at desc)
  where read_at is null and dismissed_at is null;

alter table public.notifications enable row level security;

-- 2) Preferences (singleton per user) ---------------------------------------

create table if not exists public.notification_preferences (
  user_id uuid primary key references public.users (id) on delete cascade,
  in_app_enabled boolean not null default true,
  email_enabled boolean not null default false,
  categories_muted text[] not null default '{}'::text[],
  do_not_disturb boolean not null default false,
  dnd_start_local time,
  dnd_end_local time,
  updated_at timestamptz not null default now()
);

alter table public.notification_preferences enable row level security;

create or replace function public.notification_preferences_set_updated_at()
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

drop trigger if exists notification_preferences_set_updated_at on public.notification_preferences;

create trigger notification_preferences_set_updated_at
  before update on public.notification_preferences
  for each row
  execute function public.notification_preferences_set_updated_at();

-- 3) RLS policies ------------------------------------------------------------

-- Notifications: recipient can read their own; admins can also read all.
drop policy if exists "notifications_select_own" on public.notifications;
create policy "notifications_select_own"
  on public.notifications
  for select
  to authenticated
  using (recipient_id = auth.uid() or public.is_admin(auth.uid()));

-- Insert: a user may insert for themselves (rare); admins may insert for anyone.
drop policy if exists "notifications_insert_self_or_admin" on public.notifications;
create policy "notifications_insert_self_or_admin"
  on public.notifications
  for insert
  to authenticated
  with check (
    (recipient_id = auth.uid())
    or public.is_admin(auth.uid())
  );

-- Update: only recipient may mark read/dismiss; admin updates allowed too.
drop policy if exists "notifications_update_read_state" on public.notifications;
create policy "notifications_update_read_state"
  on public.notifications
  for update
  to authenticated
  using (recipient_id = auth.uid() or public.is_admin(auth.uid()))
  with check (recipient_id = auth.uid() or public.is_admin(auth.uid()));

-- Preferences: user manages their own; admins can read for support.
drop policy if exists "notification_prefs_select_own" on public.notification_preferences;
create policy "notification_prefs_select_own"
  on public.notification_preferences
  for select
  to authenticated
  using (user_id = auth.uid() or public.is_admin(auth.uid()));

drop policy if exists "notification_prefs_upsert_own" on public.notification_preferences;
create policy "notification_prefs_upsert_own"
  on public.notification_preferences
  for insert
  to authenticated
  with check (user_id = auth.uid());

drop policy if exists "notification_prefs_update_own" on public.notification_preferences;
create policy "notification_prefs_update_own"
  on public.notification_preferences
  for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- 4) Guards: prevent client edits to immutable notification fields ----------

create or replace function public.notifications_update_guard()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  jwt_role text;
begin
  jwt_role := coalesce(auth.jwt() ->> 'role', '');
  if jwt_role = 'service_role' then
    return new;
  end if;

  if tg_op <> 'update' then
    return new;
  end if;

  -- Allow only read/dismiss timestamps to change from JWT clients.
  if (new.recipient_id is distinct from old.recipient_id)
     or (new.actor_id is distinct from old.actor_id)
     or (new.title is distinct from old.title)
     or (new.message is distinct from old.message)
     or (new.type is distinct from old.type)
     or (new.category is distinct from old.category)
     or (new.data is distinct from old.data)
     or (new.created_at is distinct from old.created_at)
  then
    raise exception 'Only read/dismiss fields may be updated';
  end if;

  return new;
end;
$$;

drop trigger if exists notifications_update_guard on public.notifications;
create trigger notifications_update_guard
  before update on public.notifications
  for each row
  execute function public.notifications_update_guard();

-- 5) Helper functions --------------------------------------------------------

-- Ensure prefs row exists for a user (idempotent).
create or replace function public.ensure_notification_preferences(p_user_id uuid)
returns void
language sql
security definer
set search_path = public
as $$
  insert into public.notification_preferences (user_id)
  values (p_user_id)
  on conflict (user_id) do nothing;
$$;

grant execute on function public.ensure_notification_preferences(uuid) to authenticated;

-- Unread count for the current user.
create or replace function public.notifications_unread_count()
returns integer
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(count(*), 0)::int
  from public.notifications n
  where n.recipient_id = auth.uid()
    and n.read_at is null
    and n.dismissed_at is null;
$$;

grant execute on function public.notifications_unread_count() to authenticated;

-- 6) Realtime: publish notifications + prefs changes ------------------------

-- Supabase Realtime listens to tables in the `supabase_realtime` publication.
-- This enables the client to subscribe to inserts for its own `recipient_id`.
do $$
begin
  begin
    alter publication supabase_realtime add table public.notifications;
  exception when duplicate_object then
    null;
  end;

  begin
    alter publication supabase_realtime add table public.notification_preferences;
  exception when duplicate_object then
    null;
  end;
end;
$$;

