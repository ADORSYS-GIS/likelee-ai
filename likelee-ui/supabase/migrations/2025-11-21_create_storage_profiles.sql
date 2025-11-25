-- Create storage bucket 'profiles' with public read
insert into storage.buckets (id, name, public)
values ('profiles', 'profiles', true)
    on conflict (id) do nothing;

-- Public read
create policy "Public read for profiles"
  on storage.objects for select
                                    using (bucket_id = 'profiles');

-- Authenticated can insert into profiles bucket
create policy "Authenticated insert into profiles"
  on storage.objects for insert
  with check (bucket_id = 'profiles');

-- Authenticated can update their own objects
create policy "Authenticated update own profiles objects"
  on storage.objects for update
                                           using (bucket_id = 'profiles' and owner = auth.uid())
                         with check (bucket_id = 'profiles' and owner = auth.uid());

-- Authenticated can delete their own objects
create policy "Authenticated delete own profiles objects"
  on storage.objects for delete
using (bucket_id = 'profiles' and owner = auth.uid());
