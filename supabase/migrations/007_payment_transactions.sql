create table public.payment_transactions (
  id uuid primary key default uuid_generate_v4(),
  school_id uuid not null references public.schools(id) on delete cascade,
  student_id uuid not null references public.student_profiles(id) on delete cascade,
  booking_ids uuid[] not null default '{}',
  student_package_id uuid references public.student_packages(id) on delete set null,
  product_type text not null check (product_type in ('single_lesson', 'package')),
  payment_method public.payment_method not null,
  amount numeric(10,2) not null,
  currency_id text not null default 'BRL',
  status public.payment_status not null default 'pending',
  external_reference text not null unique,
  mercadopago_payment_id bigint,
  mercadopago_status text,
  mercadopago_status_detail text,
  payment_method_id text,
  payment_type_id text,
  checkout_payload jsonb,
  gateway_response jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_payment_transactions_external_reference
  on public.payment_transactions(external_reference);

create index idx_payment_transactions_mp_payment_id
  on public.payment_transactions(mercadopago_payment_id);

alter table public.bookings
  add column payment_transaction_id uuid references public.payment_transactions(id) on delete set null;

create trigger trg_payment_transactions_updated_at
  before update on public.payment_transactions
  for each row execute function public.handle_updated_at();

alter table public.payment_transactions enable row level security;

create policy "student sees own payment transactions"
  on public.payment_transactions for select
  using (student_id in (select id from public.student_profiles where user_id = auth.uid()));

create policy "owner sees school payment transactions"
  on public.payment_transactions for select
  using (school_id = public.my_school_id());

create policy "owner updates school payment transactions"
  on public.payment_transactions for update
  using (school_id = public.my_school_id())
  with check (school_id = public.my_school_id());
