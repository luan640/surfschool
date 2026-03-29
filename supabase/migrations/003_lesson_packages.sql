create table public.lesson_packages (
  id uuid primary key default uuid_generate_v4(),
  school_id uuid not null references public.schools(id) on delete cascade,
  name text not null,
  description text,
  lesson_count integer not null check (lesson_count > 0),
  price numeric(10,2) not null check (price >= 0),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.lesson_package_instructors (
  package_id uuid not null references public.lesson_packages(id) on delete cascade,
  instructor_id uuid not null references public.instructors(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (package_id, instructor_id)
);

create index idx_lesson_packages_school on public.lesson_packages(school_id, created_at desc);
create index idx_lesson_package_instructors_instructor on public.lesson_package_instructors(instructor_id);

create trigger trg_lesson_packages_updated_at
  before update on public.lesson_packages
  for each row execute function public.handle_updated_at();

alter table public.lesson_packages enable row level security;
create policy "owner manages lesson packages select"
  on public.lesson_packages
  for select
  using (school_id = public.my_school_id());
create policy "owner manages lesson packages insert"
  on public.lesson_packages
  for insert
  with check (school_id = public.my_school_id());
create policy "owner manages lesson packages update"
  on public.lesson_packages
  for update
  using (school_id = public.my_school_id())
  with check (school_id = public.my_school_id());
create policy "owner manages lesson packages delete"
  on public.lesson_packages
  for delete
  using (school_id = public.my_school_id());
create policy "public reads active lesson packages"
  on public.lesson_packages
  for select
  using (active = true);

alter table public.lesson_package_instructors enable row level security;
create policy "owner manages lesson package instructors select"
  on public.lesson_package_instructors
  for select
  using (
    exists (
      select 1
      from public.lesson_packages p
      where p.id = package_id
        and p.school_id = public.my_school_id()
    )
  );
create policy "owner manages lesson package instructors insert"
  on public.lesson_package_instructors
  for insert
  with check (
    exists (
      select 1
      from public.lesson_packages p
      where p.id = package_id
        and p.school_id = public.my_school_id()
    )
    and exists (
      select 1
      from public.instructors i
      where i.id = instructor_id
        and i.school_id = public.my_school_id()
    )
  );
create policy "owner manages lesson package instructors delete"
  on public.lesson_package_instructors
  for delete
  using (
    exists (
      select 1
      from public.lesson_packages p
      where p.id = package_id
        and p.school_id = public.my_school_id()
    )
  );
create policy "public reads active lesson package instructors"
  on public.lesson_package_instructors
  for select
  using (
    exists (
      select 1
      from public.lesson_packages p
      where p.id = package_id
        and p.active = true
    )
  );
