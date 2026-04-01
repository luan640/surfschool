alter table public.school_rules
  add column if not exists trial_lesson_enabled boolean not null default false;