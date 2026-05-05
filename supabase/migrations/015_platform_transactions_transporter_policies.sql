-- Allow transporters to view their own payout ledger rows and their attributed sales.

-- Payouts: counterparty_user_id points at the transporter.
create policy "platform_transactions_select_transporter_payouts"
  on public.platform_transactions
  for select
  to authenticated
  using (
    public.is_transporter(auth.uid())
    and kind = 'transporter_payout'
    and counterparty_user_id = auth.uid()
  );

-- Passenger payments: attributed via metadata.transporter_user_id (string UUID).
create policy "platform_transactions_select_transporter_sales"
  on public.platform_transactions
  for select
  to authenticated
  using (
    public.is_transporter(auth.uid())
    and kind = 'passenger_payment'
    and (metadata ->> 'transporter_user_id') = auth.uid()::text
  );

