alter table public.school_rules
  add column if not exists auto_complete_lessons boolean not null default false;
