-- Optional setup for a fresh project; the existing listing-images bucket already works.
-- Public image downloads and direct browser uploads using the publishable key.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('listing-images', 'listing-images', true, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;
-- This app uses Express authentication, which does not establish a Supabase session.
-- This INSERT policy allows anyone holding the public key to upload to listings/.
-- It grants no overwrite, delete, or list permissions. To restrict uploads to
-- admins in Supabase, integrate Supabase Auth and replace this policy accordingly.
drop policy if exists "Browser room photo uploads" on storage.objects;
create policy "Browser room photo uploads"
on storage.objects for insert to anon
with check (
  bucket_id = 'listing-images'
  and (storage.foldername(name))[1] = 'listings'
  and lower(storage.extension(name)) in ('jpg', 'png', 'webp')
);
