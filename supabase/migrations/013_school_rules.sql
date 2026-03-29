create table if not exists public.school_rules (
  school_id uuid primary key references public.schools(id) on delete cascade,
  allow_student_cancellation boolean not null default true,
  cancellation_notice_hours integer not null default 24
    check (cancellation_notice_hours >= 0),
  allow_student_reschedule boolean not null default true,
  reschedule_notice_hours integer not null default 24
    check (reschedule_notice_hours >= 0),
  minimum_booking_notice_hours integer not null default 2
    check (minimum_booking_notice_hours >= 0),
  booking_window_days integer not null default 90
    check (booking_window_days > 0),
  max_active_bookings_per_student integer
    check (max_active_bookings_per_student is null or max_active_bookings_per_student > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists trg_school_rules_updated_at on public.school_rules;

create trigger trg_school_rules_updated_at
  before update on public.school_rules
  for each row execute function public.handle_updated_at();

alter table public.school_rules enable row level security;

create policy "owner manages school rules"
  on public.school_rules
  for all
  using (school_id = public.my_school_id())
  with check (school_id = public.my_school_id());
