-- Fix RLS policies that need explicit WITH CHECK clauses for inserts/updates.

drop policy if exists "owner manages their school" on public.schools;
create policy "owner manages their school select"
  on public.schools
  for select
  using (owner_id = auth.uid());
create policy "owner manages their school insert"
  on public.schools
  for insert
  with check (owner_id = auth.uid());
create policy "owner manages their school update"
  on public.schools
  for update
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());
create policy "owner manages their school delete"
  on public.schools
  for delete
  using (owner_id = auth.uid());

drop policy if exists "student owns their profile" on public.student_profiles;
create policy "student owns their profile select"
  on public.student_profiles
  for select
  using (user_id = auth.uid());
create policy "student owns their profile insert"
  on public.student_profiles
  for insert
  with check (user_id = auth.uid());
create policy "student owns their profile update"
  on public.student_profiles
  for update
  using (user_id = auth.uid())
  with check (user_id = auth.uid());
create policy "student owns their profile delete"
  on public.student_profiles
  for delete
  using (user_id = auth.uid());

drop policy if exists "owner manages instructors" on public.instructors;
create policy "owner manages instructors select"
  on public.instructors
  for select
  using (school_id = public.my_school_id());
create policy "owner manages instructors insert"
  on public.instructors
  for insert
  with check (school_id = public.my_school_id());
create policy "owner manages instructors update"
  on public.instructors
  for update
  using (school_id = public.my_school_id())
  with check (school_id = public.my_school_id());
create policy "owner manages instructors delete"
  on public.instructors
  for delete
  using (school_id = public.my_school_id());

drop policy if exists "owner manages availability" on public.instructor_availability;
create policy "owner manages availability select"
  on public.instructor_availability
  for select
  using (
    instructor_id in (
      select id from public.instructors where school_id = public.my_school_id()
    )
  );
create policy "owner manages availability insert"
  on public.instructor_availability
  for insert
  with check (
    instructor_id in (
      select id from public.instructors where school_id = public.my_school_id()
    )
  );
create policy "owner manages availability update"
  on public.instructor_availability
  for update
  using (
    instructor_id in (
      select id from public.instructors where school_id = public.my_school_id()
    )
  )
  with check (
    instructor_id in (
      select id from public.instructors where school_id = public.my_school_id()
    )
  );
create policy "owner manages availability delete"
  on public.instructor_availability
  for delete
  using (
    instructor_id in (
      select id from public.instructors where school_id = public.my_school_id()
    )
  );

drop policy if exists "owner updates booking status" on public.bookings;
create policy "owner updates booking status"
  on public.bookings
  for update
  using (school_id = public.my_school_id())
  with check (school_id = public.my_school_id());
