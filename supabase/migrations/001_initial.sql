-- ═══════════════════════════════════════════════════════════════
-- SurfBook — Initial Schema
-- ═══════════════════════════════════════════════════════════════

create extension if not exists "uuid-ossp";

-- ── Schools ──────────────────────────────────────────────────────
create table public.schools (
  id            uuid primary key default uuid_generate_v4(),
  owner_id      uuid not null references auth.users(id) on delete cascade,
  slug          text not null unique,
  name          text not null,
  tagline       text,
  address       text,
  phone         text,
  whatsapp      text,
  logo_url      text,
  primary_color text not null default '#0077b6',
  cta_color     text not null default '#f77f00',
  active        boolean not null default true,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  constraint schools_slug_format check (slug ~ '^[a-z0-9-]+$')
);

-- ── Student profiles (scoped per school) ─────────────────────────
create table public.student_profiles (
  id         uuid primary key default uuid_generate_v4(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  school_id  uuid not null references public.schools(id) on delete cascade,
  full_name  text not null,
  phone      text,
  created_at timestamptz not null default now(),
  unique(user_id, school_id)
);

-- ── Instructors ───────────────────────────────────────────────────
create table public.instructors (
  id           uuid primary key default uuid_generate_v4(),
  school_id    uuid not null references public.schools(id) on delete cascade,
  full_name    text not null,
  photo_url    text,
  phone        text,
  instagram    text,
  specialty    text,
  bio          text,
  hourly_price numeric(10,2) not null,
  color        text not null default '#0077b6',
  active       boolean not null default true,
  created_at   timestamptz not null default now()
);

-- ── Instructor availability ───────────────────────────────────────
create table public.instructor_availability (
  id            uuid primary key default uuid_generate_v4(),
  instructor_id uuid not null references public.instructors(id) on delete cascade,
  weekday       smallint not null check (weekday between 0 and 6),
  time_slots    text[] not null default '{}',
  unique(instructor_id, weekday)
);

-- ── Bookings ──────────────────────────────────────────────────────
create type public.booking_status  as enum ('pending','confirmed','cancelled','completed');
create type public.payment_method  as enum ('pix','credit_card','debit_card','cash');
create type public.payment_status  as enum ('pending','paid','refunded','failed');

create table public.bookings (
  id             uuid primary key default uuid_generate_v4(),
  school_id      uuid not null references public.schools(id) on delete cascade,
  student_id     uuid not null references public.student_profiles(id),
  instructor_id  uuid not null references public.instructors(id),
  lesson_date    date not null,
  time_slots     text[] not null,
  unit_price     numeric(10,2) not null,
  total_amount   numeric(10,2) generated always as (
    array_length(time_slots, 1) * unit_price
  ) stored,
  status         public.booking_status  not null default 'pending',
  payment_method public.payment_method,
  payment_status public.payment_status  not null default 'pending',
  payment_ref    text,
  notes          text,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

create index idx_bookings_instructor_date
  on public.bookings(instructor_id, lesson_date)
  where status <> 'cancelled';

create index idx_bookings_school_date
  on public.bookings(school_id, lesson_date);

-- ── Updated-at trigger ────────────────────────────────────────────
create or replace function public.handle_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end; $$;

create trigger trg_schools_updated_at
  before update on public.schools
  for each row execute function public.handle_updated_at();

create trigger trg_bookings_updated_at
  before update on public.bookings
  for each row execute function public.handle_updated_at();

-- ── Helper functions ──────────────────────────────────────────────
create or replace function public.my_school_id()
returns uuid language sql stable security definer as $$
  select id from public.schools where owner_id = auth.uid() limit 1;
$$;

-- ── Safe booking creation (atomic slot-conflict check) ────────────
create or replace function public.create_booking_safe(
  p_school_id      uuid,
  p_student_id     uuid,
  p_instructor_id  uuid,
  p_lesson_date    date,
  p_time_slots     text[],
  p_unit_price     numeric,
  p_payment_method public.payment_method
) returns public.bookings language plpgsql security definer as $$
declare
  conflict_count int;
  new_booking    public.bookings;
begin
  select count(*) into conflict_count
  from public.bookings
  where instructor_id = p_instructor_id
    and lesson_date   = p_lesson_date
    and status       <> 'cancelled'
    and time_slots   && p_time_slots
  for update;

  if conflict_count > 0 then
    raise exception 'SLOT_CONFLICT: one or more selected slots are already taken';
  end if;

  insert into public.bookings (
    school_id, student_id, instructor_id,
    lesson_date, time_slots, unit_price, payment_method
  ) values (
    p_school_id, p_student_id, p_instructor_id,
    p_lesson_date, p_time_slots, p_unit_price, p_payment_method
  ) returning * into new_booking;

  return new_booking;
end;
$$;

-- ── Row Level Security ────────────────────────────────────────────
alter table public.schools enable row level security;
create policy "owner manages their school"     on public.schools for all    using (owner_id = auth.uid());
create policy "public reads active schools"    on public.schools for select using (active = true);

alter table public.student_profiles enable row level security;
create policy "student owns their profile"     on public.student_profiles for all    using (user_id = auth.uid());
create policy "owner reads school students"    on public.student_profiles for select using (school_id = public.my_school_id());

alter table public.instructors enable row level security;
create policy "owner manages instructors"      on public.instructors for all    using (school_id = public.my_school_id());
create policy "anyone reads active instructors" on public.instructors for select using (active = true);

alter table public.instructor_availability enable row level security;
create policy "owner manages availability"    on public.instructor_availability for all
  using (instructor_id in (select id from public.instructors where school_id = public.my_school_id()));
create policy "anyone reads availability"     on public.instructor_availability for select using (true);

alter table public.bookings enable row level security;
create policy "student sees own bookings"     on public.bookings for select
  using (student_id in (select id from public.student_profiles where user_id = auth.uid()));
create policy "student creates bookings"      on public.bookings for insert
  with check (student_id in (select id from public.student_profiles where user_id = auth.uid()));
create policy "owner sees school bookings"    on public.bookings for select
  using (school_id = public.my_school_id());
create policy "owner updates booking status"  on public.bookings for update
  using (school_id = public.my_school_id());

-- ── Dashboard views ───────────────────────────────────────────────
create or replace view public.booking_metrics as
select
  b.school_id,
  date_trunc('month', b.lesson_date::timestamp) as month,
  count(*)                                       as total_bookings,
  coalesce(sum(b.total_amount), 0)               as total_revenue,
  count(*) filter (where b.status = 'completed') as completed,
  count(*) filter (where b.status = 'cancelled') as cancelled
from public.bookings b
group by b.school_id, date_trunc('month', b.lesson_date::timestamp);

create or replace view public.instructor_ranking as
select
  i.id,
  i.school_id,
  i.full_name,
  i.photo_url,
  i.color,
  i.hourly_price,
  i.specialty,
  count(b.id)                    as total_bookings,
  coalesce(sum(b.total_amount), 0) as total_revenue,
  coalesce(avg(array_length(b.time_slots, 1)), 0) as avg_hours
from public.instructors i
left join public.bookings b
  on b.instructor_id = i.id and b.status <> 'cancelled'
group by i.id;

-- ── Storage buckets (run via Supabase dashboard or CLI) ───────────
-- insert into storage.buckets (id, name, public) values ('school-assets',      'school-assets',      true);
-- insert into storage.buckets (id, name, public) values ('instructor-photos',  'instructor-photos',  true);
