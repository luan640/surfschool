alter table public.student_profiles
  add column if not exists trial_lesson_eligible boolean not null default true;
