create table if not exists public.trips (
  id uuid primary key default uuid_generate_v4(),
  school_id uuid not null references public.schools(id) on delete cascade,
  slug text not null,
  title text not null,
  summary text,
  description text,
  location text,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  price numeric(10,2) not null check (price >= 0),
  capacity integer check (capacity is null or capacity > 0),
  active boolean not null default true,
  cover_image_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint trips_school_slug_unique unique (school_id, slug),
  constraint trips_date_range_check check (ends_at >= starts_at)
);

create table if not exists public.trip_images (
  id uuid primary key default uuid_generate_v4(),
  trip_id uuid not null references public.trips(id) on delete cascade,
  image_url text not null,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.trip_registrations (
  id uuid primary key default uuid_generate_v4(),
  trip_id uuid not null references public.trips(id) on delete cascade,
  school_id uuid not null references public.schools(id) on delete cascade,
  full_name text not null,
  email text not null,
  phone text,
  notes text,
  status public.booking_status not null default 'pending',
  payment_status public.payment_status not null default 'pending',
  amount numeric(10,2) not null check (amount >= 0),
  external_reference text unique,
  mercadopago_payment_id bigint,
  mercadopago_status text,
  mercadopago_status_detail text,
  ticket_url text,
  qr_code text,
  qr_code_base64 text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_trips_school_active
  on public.trips(school_id, active, starts_at desc);

create index if not exists idx_trip_images_trip_sort
  on public.trip_images(trip_id, sort_order asc);

create index if not exists idx_trip_registrations_trip_payment
  on public.trip_registrations(trip_id, payment_status, created_at desc);

drop trigger if exists trg_trips_updated_at on public.trips;
create trigger trg_trips_updated_at
  before update on public.trips
  for each row execute function public.handle_updated_at();

drop trigger if exists trg_trip_registrations_updated_at on public.trip_registrations;
create trigger trg_trip_registrations_updated_at
  before update on public.trip_registrations
  for each row execute function public.handle_updated_at();

alter table public.trips enable row level security;
alter table public.trip_images enable row level security;
alter table public.trip_registrations enable row level security;

create policy "owner manages trips"
  on public.trips
  for all
  using (school_id = public.my_school_id())
  with check (school_id = public.my_school_id());

create policy "public reads active trips"
  on public.trips
  for select
  using (active = true);

create policy "owner manages trip images"
  on public.trip_images
  for all
  using (
    trip_id in (
      select id from public.trips where school_id = public.my_school_id()
    )
  )
  with check (
    trip_id in (
      select id from public.trips where school_id = public.my_school_id()
    )
  );

create policy "public reads trip images"
  on public.trip_images
  for select
  using (
    trip_id in (
      select id from public.trips where active = true
    )
  );

create policy "owner reads trip registrations"
  on public.trip_registrations
  for select
  using (school_id = public.my_school_id());

create policy "owner updates trip registrations"
  on public.trip_registrations
  for update
  using (school_id = public.my_school_id())
  with check (school_id = public.my_school_id());
