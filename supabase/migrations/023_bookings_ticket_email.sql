-- Track passenger ticket confirmation email (idempotent send after payment).

alter table public.bookings
  add column if not exists ticket_email_sent_at timestamptz;

create index if not exists bookings_ticket_email_pending_idx
  on public.bookings (payment_status, ticket_email_sent_at)
  where payment_status = 'completed' and ticket_email_sent_at is null;
