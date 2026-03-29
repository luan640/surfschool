alter table public.student_profiles
  add column if not exists cpf text,
  add column if not exists birth_date date;

create unique index if not exists idx_student_profiles_school_cpf
  on public.student_profiles(school_id, cpf)
  where cpf is not null;

alter table public.student_profiles
  drop constraint if exists student_profiles_cpf_format;

alter table public.student_profiles
  add constraint student_profiles_cpf_format
  check (cpf is null or cpf ~ '^[0-9]{11}$');
