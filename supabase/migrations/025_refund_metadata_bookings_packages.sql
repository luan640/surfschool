alter table public.bookings
  add column if not exists refund_reason text,
  add column if not exists refunded_at timestamptz;

alter table public.student_packages
  add column if not exists refund_reason text,
  add column if not exists refunded_at timestamptz;
