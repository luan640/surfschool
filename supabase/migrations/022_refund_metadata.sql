alter table public.payment_transactions
  add column if not exists refund_reason text,
  add column if not exists refunded_at timestamptz;

alter table public.trip_registrations
  add column if not exists refund_reason text,
  add column if not exists refunded_at timestamptz;
