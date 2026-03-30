alter table public.trip_registrations
  add column if not exists payment_method public.payment_method;

update public.trip_registrations
set payment_method = case
  when qr_code is not null then 'pix'::public.payment_method
  when mercadopago_payment_id is not null then 'credit_card'::public.payment_method
  else payment_method
end
where payment_method is null;

create index if not exists idx_trip_registrations_payment_method
  on public.trip_registrations(trip_id, payment_method, created_at desc);
