-- Transporter payout requests (withdrawals): created by transporter, reviewed by admin.

create table if not exists public.transporter_payout_requests (
  id uuid primary key default gen_random_uuid(),
  transporter_user_id uuid not null references public.users (id) on delete cascade,
  status text not null
    check (status in ('pending', 'approved', 'rejected', 'cancelled', 'paid')),
  amount_ugx bigint not null
    check (amount_ugx > 0),
  currency text not null default 'UGX'
    check (currency = 'UGX'),
  payout_method text
    check (
      payout_method is null
      or payout_method in ('mobile_money', 'bank_transfer', 'cash', 'other')
    ),
  payout_details jsonb not null default '{}'::jsonb,
  transporter_note text,
  admin_note text,
  reviewed_by uuid references public.users (id) on delete set null,
  reviewed_at timestamptz,
  paid_transaction_id uuid references public.platform_transactions (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists transporter_payout_requests_transporter_idx
  on public.transporter_payout_requests (transporter_user_id, created_at desc);

create index if not exists transporter_payout_requests_status_idx
  on public.transporter_payout_requests (status, created_at desc);

alter table public.transporter_payout_requests enable row level security;

create or replace function public.transporter_payout_requests_set_updated_at()
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

drop trigger if exists transporter_payout_requests_set_updated_at on public.transporter_payout_requests;
create trigger transporter_payout_requests_set_updated_at
  before update on public.transporter_payout_requests
  for each row
  execute function public.transporter_payout_requests_set_updated_at();

-- Transporters: view their own requests.
create policy "transporter_payout_requests_select_own"
  on public.transporter_payout_requests
  for select
  to authenticated
  using (
    public.is_transporter(auth.uid())
    and transporter_user_id = auth.uid()
  );

-- Transporters: create payout requests for themselves (pending only).
create policy "transporter_payout_requests_insert_own"
  on public.transporter_payout_requests
  for insert
  to authenticated
  with check (
    public.is_transporter(auth.uid())
    and transporter_user_id = auth.uid()
    and status = 'pending'
  );

-- Transporters: can cancel their own pending requests.
create policy "transporter_payout_requests_update_cancel_own"
  on public.transporter_payout_requests
  for update
  to authenticated
  using (
    public.is_transporter(auth.uid())
    and transporter_user_id = auth.uid()
    and status = 'pending'
  )
  with check (
    public.is_transporter(auth.uid())
    and transporter_user_id = auth.uid()
    and status in ('pending', 'cancelled')
  );

-- Admins: full read/write.
create policy "transporter_payout_requests_select_admin"
  on public.transporter_payout_requests
  for select
  to authenticated
  using (public.is_admin_user());

create policy "transporter_payout_requests_update_admin"
  on public.transporter_payout_requests
  for update
  to authenticated
  using (public.is_admin_user())
  with check (public.is_admin_user());

create policy "transporter_payout_requests_insert_admin"
  on public.transporter_payout_requests
  for insert
  to authenticated
  with check (public.is_admin_user());

