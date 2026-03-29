alter table public.trips
add column if not exists allow_over_capacity boolean not null default false;
