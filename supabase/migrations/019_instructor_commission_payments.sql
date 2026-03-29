create table if not exists public.instructor_commission_payments (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools(id) on delete cascade,
  instructor_id uuid not null references public.instructors(id) on delete cascade,
  amount numeric(10,2) not null check (amount > 0),
  payment_date date not null,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_instructor_commission_payments_school_id
  on public.instructor_commission_payments(school_id);

create index if not exists idx_instructor_commission_payments_instructor_id
  on public.instructor_commission_payments(instructor_id);

create index if not exists idx_instructor_commission_payments_payment_date
  on public.instructor_commission_payments(payment_date desc);

drop trigger if exists trg_instructor_commission_payments_updated_at on public.instructor_commission_payments;

create trigger trg_instructor_commission_payments_updated_at
  before update on public.instructor_commission_payments
  for each row execute function public.handle_updated_at();

alter table public.instructor_commission_payments enable row level security;

create policy "owner manages instructor commission payments"
  on public.instructor_commission_payments
  for all
  using (school_id = public.my_school_id())
  with check (school_id = public.my_school_id());
