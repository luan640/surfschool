alter table public.bookings
  add column billing_mode text not null default 'hourly'
    check (billing_mode in ('hourly', 'package')),
  add column package_id uuid references public.lesson_packages(id) on delete set null;

alter table public.bookings
  drop column total_amount;

alter table public.bookings
  add column total_amount numeric(10,2) generated always as (
    case
      when billing_mode = 'package' then unit_price
      else array_length(time_slots, 1) * unit_price
    end
  ) stored;

drop function if exists public.create_booking_safe(uuid, uuid, uuid, date, text[], numeric, public.payment_method);

create or replace function public.create_booking_safe(
  p_school_id      uuid,
  p_student_id     uuid,
  p_instructor_id  uuid,
  p_lesson_date    date,
  p_time_slots     text[],
  p_unit_price     numeric,
  p_payment_method public.payment_method,
  p_billing_mode   text default 'hourly',
  p_package_id     uuid default null
) returns public.bookings language plpgsql security definer as $$
declare
  conflict_count int;
  new_booking    public.bookings;
begin
  select count(*) into conflict_count
  from public.bookings
  where instructor_id = p_instructor_id
    and lesson_date   = p_lesson_date
    and status       <> 'cancelled'
    and time_slots   && p_time_slots
  for update;

  if conflict_count > 0 then
    raise exception 'SLOT_CONFLICT: one or more selected slots are already taken';
  end if;

  insert into public.bookings (
    school_id,
    student_id,
    instructor_id,
    package_id,
    billing_mode,
    lesson_date,
    time_slots,
    unit_price,
    payment_method
  ) values (
    p_school_id,
    p_student_id,
    p_instructor_id,
    p_package_id,
    p_billing_mode,
    p_lesson_date,
    p_time_slots,
    p_unit_price,
    p_payment_method
  ) returning * into new_booking;

  return new_booking;
end;
$$;
