create table public.payment_provider_connections (
  id uuid primary key default uuid_generate_v4(),
  school_id uuid not null references public.schools(id) on delete cascade,
  provider text not null check (provider in ('mercadopago')),
  mp_user_id text,
  access_token text,
  refresh_token text,
  expires_at timestamptz,
  status text not null default 'disconnected'
    check (status in ('connected', 'expired', 'revoked', 'error', 'disconnected')),
  last_error text,
  connected_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (school_id, provider)
);

create trigger trg_payment_provider_connections_updated_at
  before update on public.payment_provider_connections
  for each row execute function public.handle_updated_at();

alter table public.payment_provider_connections enable row level security;

create policy "owner sees school payment provider connections"
  on public.payment_provider_connections for select
  using (school_id = public.my_school_id());
