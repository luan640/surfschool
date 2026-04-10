-- school_trip_settings: configurações globais de excursão por escola
create table if not exists public.school_trip_settings (
  school_id       uuid primary key references public.schools(id) on delete cascade,
  trip_start_date date,
  trip_end_date   date,
  booking_mode    text not null default 'both' check (booking_mode in ('both', 'trip_only')),
  location_note   text,
  updated_at      timestamptz not null default now()
);

-- RLS
alter table public.school_trip_settings enable row level security;

create policy "school_trip_settings: escola lê própria config"
  on public.school_trip_settings for select
  using (
    school_id in (
      select id from public.schools where owner_id = auth.uid()
    )
  );

create policy "school_trip_settings: escola salva própria config"
  on public.school_trip_settings for all
  using (
    school_id in (
      select id from public.schools where owner_id = auth.uid()
    )
  )
  with check (
    school_id in (
      select id from public.schools where owner_id = auth.uid()
    )
  );
