create table if not exists public.discount_coupons (
  id uuid primary key default uuid_generate_v4(),
  school_id uuid not null references public.schools(id) on delete cascade,
  code text not null,
  name text not null,
  description text,
  discount_type text not null check (discount_type in ('percentage', 'fixed')),
  discount_value numeric(10,2) not null check (discount_value > 0),
  min_order_amount numeric(10,2),
  usage_limit_total integer,
  usage_limit_per_user integer,
  starts_at timestamptz,
  ends_at timestamptz,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint discount_coupons_code_unique unique (school_id, code),
  constraint discount_coupons_usage_limit_total_check check (usage_limit_total is null or usage_limit_total > 0),
  constraint discount_coupons_usage_limit_per_user_check check (usage_limit_per_user is null or usage_limit_per_user > 0),
  constraint discount_coupons_min_order_amount_check check (min_order_amount is null or min_order_amount >= 0),
  constraint discount_coupons_date_range_check check (starts_at is null or ends_at is null or starts_at <= ends_at)
);

create table if not exists public.discount_coupon_redemptions (
  id uuid primary key default uuid_generate_v4(),
  coupon_id uuid not null references public.discount_coupons(id) on delete cascade,
  school_id uuid not null references public.schools(id) on delete cascade,
  student_id uuid not null references public.student_profiles(id) on delete cascade,
  booking_id uuid references public.bookings(id) on delete set null,
  applied_code text not null,
  discount_amount numeric(10,2) not null check (discount_amount >= 0),
  created_at timestamptz not null default now()
);

create index if not exists idx_discount_coupons_school_active
  on public.discount_coupons(school_id, active, created_at desc);

create index if not exists idx_discount_coupon_redemptions_coupon_student
  on public.discount_coupon_redemptions(coupon_id, student_id, created_at desc);

drop trigger if exists trg_discount_coupons_updated_at on public.discount_coupons;

create trigger trg_discount_coupons_updated_at
  before update on public.discount_coupons
  for each row execute function public.handle_updated_at();

alter table public.discount_coupons enable row level security;
alter table public.discount_coupon_redemptions enable row level security;

create policy "owner manages discount coupons"
  on public.discount_coupons
  for all
  using (school_id = public.my_school_id())
  with check (school_id = public.my_school_id());

create policy "owner reads coupon redemptions"
  on public.discount_coupon_redemptions
  for select
  using (school_id = public.my_school_id());
