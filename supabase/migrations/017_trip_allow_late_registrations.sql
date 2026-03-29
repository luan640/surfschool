alter table public.trips
add column if not exists allow_late_registrations boolean not null default false;
