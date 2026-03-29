create table public.student_packages (
  id uuid primary key default uuid_generate_v4(),
  school_id uuid not null references public.schools(id) on delete cascade,
  student_id uuid not null references public.student_profiles(id) on delete cascade,
  package_id uuid not null references public.lesson_packages(id) on delete cascade,
  instructor_id uuid not null references public.instructors(id) on delete restrict,
  total_lessons integer not null check (total_lessons > 0),
  used_lessons integer not null default 0 check (used_lessons >= 0),
  total_amount numeric(10,2) not null check (total_amount >= 0),
  status text not null default 'active' check (status in ('pending','active','completed','cancelled')),
  payment_method public.payment_method,
  payment_status public.payment_status not null default 'pending',
  payment_ref text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.student_package_lessons (
  id uuid primary key default uuid_generate_v4(),
  student_package_id uuid not null references public.student_packages(id) on delete cascade,
  sequence integer not null check (sequence > 0),
  lesson_date date not null,
  time_slots text[] not null,
  booking_id uuid references public.bookings(id) on delete set null,
  status text not null default 'scheduled' check (status in ('scheduled','completed','cancelled')),
  created_at timestamptz not null default now(),
  unique(student_package_id, sequence)
);

create trigger trg_student_packages_updated_at
  before update on public.student_packages
  for each row execute function public.handle_updated_at();

alter table public.student_packages enable row level security;
create policy "student owns their packages select"
  on public.student_packages
  for select
  using (student_id in (select id from public.student_profiles where user_id = auth.uid()));
create policy "student owns their packages insert"
  on public.student_packages
  for insert
  with check (student_id in (select id from public.student_profiles where user_id = auth.uid()));
create policy "owner sees school packages"
  on public.student_packages
  for select
  using (school_id = public.my_school_id());
create policy "owner updates school packages"
  on public.student_packages
  for update
  using (school_id = public.my_school_id())
  with check (school_id = public.my_school_id());

alter table public.student_package_lessons enable row level security;
create policy "student owns their package lessons select"
  on public.student_package_lessons
  for select
  using (
    student_package_id in (
      select id from public.student_packages
      where student_id in (select id from public.student_profiles where user_id = auth.uid())
    )
  );
create policy "student owns their package lessons insert"
  on public.student_package_lessons
  for insert
  with check (
    student_package_id in (
      select id from public.student_packages
      where student_id in (select id from public.student_profiles where user_id = auth.uid())
    )
  );
create policy "owner sees school package lessons"
  on public.student_package_lessons
  for select
  using (
    student_package_id in (
      select id from public.student_packages where school_id = public.my_school_id()
    )
  );
create policy "owner updates school package lessons"
  on public.student_package_lessons
  for update
  using (
    student_package_id in (
      select id from public.student_packages where school_id = public.my_school_id()
    )
  )
  with check (
    student_package_id in (
      select id from public.student_packages where school_id = public.my_school_id()
    )
  );
