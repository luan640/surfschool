alter table public.bookings
  add column if not exists billing_mode text not null default 'hourly';

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'bookings_billing_mode_check'
  ) then
    alter table public.bookings
      add constraint bookings_billing_mode_check
      check (billing_mode in ('hourly', 'package'));
  end if;
end
$$;

alter table public.bookings
  add column if not exists package_id uuid references public.lesson_packages(id) on delete set null;

alter table public.bookings
  add column if not exists total_amount numeric(10,2);

do $$
declare
  total_amount_is_generated boolean;
begin
  select exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'bookings'
      and column_name = 'total_amount'
      and is_generated = 'ALWAYS'
  )
  into total_amount_is_generated;

  if not total_amount_is_generated then
    update public.bookings
    set total_amount = case
      when billing_mode = 'package' then unit_price
      else coalesce(array_length(time_slots, 1), 0) * unit_price
    end
    where total_amount is null;

    drop function if exists public.handle_bookings_total_amount();

    create or replace function public.handle_bookings_total_amount()
    returns trigger
    language plpgsql
    as $fn$
    begin
      new.total_amount := case
        when new.billing_mode = 'package' then new.unit_price
        else coalesce(array_length(new.time_slots, 1), 0) * new.unit_price
      end;
      return new;
    end;
    $fn$;

    drop trigger if exists trg_bookings_total_amount on public.bookings;

    create trigger trg_bookings_total_amount
    before insert or update on public.bookings
    for each row execute function public.handle_bookings_total_amount();
  end if;
end
$$;
