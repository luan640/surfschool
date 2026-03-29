alter table public.student_profiles
  add column if not exists email text;

update public.student_profiles sp
set email = lower(u.email)
from auth.users u
where u.id = sp.user_id
  and sp.email is null
  and u.email is not null;

create unique index if not exists idx_student_profiles_school_email
  on public.student_profiles(school_id, lower(email))
  where email is not null;
