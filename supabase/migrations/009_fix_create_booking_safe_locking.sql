drop function if exists public.create_booking_safe(uuid, uuid, uuid, date, text[], numeric, public.payment_method);
drop function if exists public.create_booking_safe(uuid, uuid, uuid, date, text[], numeric, public.payment_method, text, uuid);

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
) returns public.bookings
language plpgsql
security definer
as $$
declare
  conflict_exists boolean;
  new_booking public.bookings;
begin
  select exists(
    select 1
    from public.bookings
    where instructor_id = p_instructor_id
      and lesson_date = p_lesson_date
      and status <> 'cancelled'
      and time_slots && p_time_slots
  ) into conflict_exists;

  if conflict_exists then
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
  )
  returning * into new_booking;

  return new_booking;
end;
$$;
