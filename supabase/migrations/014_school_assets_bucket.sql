insert into storage.buckets (id, name, public)
values ('school-assets', 'school-assets', true)
on conflict (id) do update
set public = excluded.public;

drop policy if exists "public reads school assets" on storage.objects;
create policy "public reads school assets"
  on storage.objects
  for select
  using (bucket_id = 'school-assets');

drop policy if exists "owner manages own school assets" on storage.objects;
create policy "owner manages own school assets"
  on storage.objects
  for all
  using (
    bucket_id = 'school-assets'
    and (storage.foldername(name))[1] = 'schools'
    and (storage.foldername(name))[2] = public.my_school_id()::text
  )
  with check (
    bucket_id = 'school-assets'
    and (storage.foldername(name))[1] = 'schools'
    and (storage.foldername(name))[2] = public.my_school_id()::text
  );
