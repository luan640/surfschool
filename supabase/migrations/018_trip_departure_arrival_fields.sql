alter table public.trips
add column if not exists departure_at timestamptz;

alter table public.trips
add column if not exists arrival_at timestamptz;

update public.trips
set
  departure_at = coalesce(departure_at, starts_at),
  arrival_at = coalesce(arrival_at, ends_at)
where departure_at is null
   or arrival_at is null;
2