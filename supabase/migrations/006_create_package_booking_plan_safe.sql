create or replace function public.create_package_booking_plan_safe(
  p_school_id uuid,
  p_student_id uuid,
  p_instructor_id uuid,
  p_package_id uuid,
  p_lessons jsonb,
  p_total_amount numeric,
  p_payment_method public.payment_method
) returns uuid
language plpgsql
security definer
as $$
declare
  package_row public.lesson_packages;
  lesson jsonb;
  new_student_package_id uuid;
  v_lesson_date date;
  v_time_slots text[];
  conflict_count int;
  booking_row public.bookings;
  lesson_index int := 0;
begin
  select * into package_row
  from public.lesson_packages
  where id = p_package_id
    and school_id = p_school_id;

  if package_row.id is null then
    raise exception 'PACKAGE_NOT_FOUND';
  end if;

  if jsonb_array_length(p_lessons) <> package_row.lesson_count then
    raise exception 'PACKAGE_LESSON_COUNT_MISMATCH';
  end if;

  if not exists (
    select 1
    from public.lesson_package_instructors
    where package_id = p_package_id
      and instructor_id = p_instructor_id
  ) then
    raise exception 'PACKAGE_INSTRUCTOR_MISMATCH';
  end if;

  insert into public.student_packages (
    school_id,
    student_id,
    package_id,
    instructor_id,
    total_lessons,
    total_amount,
    status,
    payment_method,
    payment_status
  ) values (
    p_school_id,
    p_student_id,
    p_package_id,
    p_instructor_id,
    package_row.lesson_count,
    p_total_amount,
    'active',
    p_payment_method,
    'pending'
  )
  returning id into new_student_package_id;

  for lesson in select * from jsonb_array_elements(p_lessons)
  loop
    lesson_index := lesson_index + 1;
    v_lesson_date := (lesson->>'lessonDate')::date;
    select array_agg(value) into v_time_slots
    from jsonb_array_elements_text(lesson->'timeSlots');

    if v_lesson_date is null or coalesce(array_length(v_time_slots, 1), 0) = 0 then
      raise exception 'INVALID_PACKAGE_LESSON_%', lesson_index;
    end if;

    select count(*) into conflict_count
    from public.bookings b
    where b.instructor_id = p_instructor_id
      and b.lesson_date = v_lesson_date
      and b.status <> 'cancelled'
      and b.time_slots && v_time_slots;

    if conflict_count > 0 then
      raise exception 'SLOT_CONFLICT_LESSON_%', lesson_index;
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
      'package',
      v_lesson_date,
      v_time_slots,
      0,
      p_payment_method
    )
    returning * into booking_row;

    insert into public.student_package_lessons (
      student_package_id,
      sequence,
      lesson_date,
      time_slots,
      booking_id
    ) values (
      new_student_package_id,
      lesson_index,
      v_lesson_date,
      v_time_slots,
      booking_row.id
    );
  end loop;

  return new_student_package_id;
end;
$$;
