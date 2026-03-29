alter table public.discount_coupons
  add column if not exists applies_to_single_lesson boolean not null default false;

create table if not exists public.discount_coupon_packages (
  coupon_id uuid not null references public.discount_coupons(id) on delete cascade,
  package_id uuid not null references public.lesson_packages(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (coupon_id, package_id)
);

create index if not exists idx_discount_coupon_packages_coupon
  on public.discount_coupon_packages(coupon_id);

create index if not exists idx_discount_coupon_packages_package
  on public.discount_coupon_packages(package_id);

alter table public.discount_coupon_packages enable row level security;

create policy "owner manages coupon package scope"
  on public.discount_coupon_packages
  for all
  using (
    coupon_id in (
      select id from public.discount_coupons where school_id = public.my_school_id()
    )
  )
  with check (
    coupon_id in (
      select id from public.discount_coupons where school_id = public.my_school_id()
    )
    and package_id in (
      select id from public.lesson_packages where school_id = public.my_school_id()
    )
  );
