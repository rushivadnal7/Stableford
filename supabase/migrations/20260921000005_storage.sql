-- Storage buckets. Uploads never go through the Next.js server (Vercel caps request bodies near
-- 4.5 MB): the API hands the browser a short-lived signed upload URL after checking the request.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types) values
  ('proofs', 'proofs', false, 5242880, array['image/png', 'image/jpeg', 'image/webp']),
  ('charity-media', 'charity-media', true, 5242880, array['image/png', 'image/jpeg', 'image/webp'])
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- A member can read back their own proof files (path is `<user id>/<winner id>/<file>`).
-- There is deliberately no insert policy: signed upload URLs are the only way in.
create policy proofs_read_own on storage.objects
  for select to authenticated
  using (bucket_id = 'proofs' and (storage.foldername(name))[1] = (select auth.uid())::text);
