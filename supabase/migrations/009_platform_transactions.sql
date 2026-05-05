-- Platform finance ledger: incoming (e.g. passenger payments) and outgoing (disbursements).

create table if not exists public.platform_transactions (
  id uuid primary key default gen_random_uuid(),
  flow text not null
    check (flow in ('incoming', 'outgoing')),
  kind text not null
    check (
      kind in (
        'passenger_payment',
        'transporter_payout',
        'refund',
        'adjustment'
      )
    ),
  status text not null
    check (status in ('pending', 'processing', 'completed', 'failed', 'cancelled')),
  amount_ugx bigint not null
    check (amount_ugx > 0),
  currency text not null default 'UGX'
    check (currency = 'UGX'),
  counterparty_user_id uuid references public.users (id) on delete set null,
  counterparty_name text,
  counterparty_email text,
  gateway_reference text,
  external_reference text,
  idempotency_key text,
  payout_method text
    check (
      payout_method is null
      or payout_method in ('mobile_money', 'bank_transfer', 'cash', 'other')
    ),
  payout_details jsonb not null default '{}'::jsonb,
  metadata jsonb not null default '{}'::jsonb,
  notes text,
  failure_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references public.users (id) on delete set null,
  completed_at timestamptz
);

create unique index if not exists platform_transactions_idempotency_key_uidx
  on public.platform_transactions (idempotency_key)
  where idempotency_key is not null;

create index if not exists platform_transactions_created_at_idx
  on public.platform_transactions (created_at desc);

create index if not exists platform_transactions_flow_status_idx
  on public.platform_transactions (flow, status);

create index if not exists platform_transactions_counterparty_idx
  on public.platform_transactions (counterparty_user_id);

alter table public.platform_transactions enable row level security;

create or replace function public.is_admin_user()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.users u
    where u.id = auth.uid()
      and u.user_type = 'admin'
  );
$$;

create policy "platform_transactions_select_admin"
  on public.platform_transactions
  for select
  to authenticated
  using (public.is_admin_user());

create policy "platform_transactions_insert_admin"
  on public.platform_transactions
  for insert
  to authenticated
  with check (public.is_admin_user());

create policy "platform_transactions_update_admin"
  on public.platform_transactions
  for update
  to authenticated
  using (public.is_admin_user())
  with check (public.is_admin_user());

create or replace function public.platform_transactions_set_updated_at()
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

drop trigger if exists platform_transactions_set_updated_at on public.platform_transactions;

create trigger platform_transactions_set_updated_at
  before update on public.platform_transactions
  for each row
  execute function public.platform_transactions_set_updated_at();
