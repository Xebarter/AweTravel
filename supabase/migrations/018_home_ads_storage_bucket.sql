-- Storage bucket + RLS policies for homepage ad banner uploads.
-- Needed for transporter homepage ad applications (image upload only).

-- 1) Bucket -----------------------------------------------------------------
-- Keep this bucket public so the homepage can show banners without signed URLs.
insert into storage.buckets (id, name, public)
values ('home-ads', 'home-ads', true)
on conflict (id) do update
set public = excluded.public;

-- 2) Policies ----------------------------------------------------------------
-- Note: storage.objects has RLS enabled by default in Supabase projects.
-- We create explicit policies for read + write.

-- Read: allow anyone to fetch banner images from this bucket.
drop policy if exists "home_ads_read_public" on storage.objects;
create policy "home_ads_read_public"
on storage.objects
for select
to anon, authenticated
using (bucket_id = 'home-ads');

-- Write: transporters can upload/update their own objects (by user folder prefix).
-- We store under: route-home-ads/<routeId>/<timestamp>-<filename>
-- This policy scopes by owner column set by Supabase on upload.
drop policy if exists "home_ads_write_transporter_own" on storage.objects;
create policy "home_ads_write_transporter_own"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'home-ads'
  and owner = auth.uid()
  and public.is_transporter(auth.uid())
);

drop policy if exists "home_ads_update_transporter_own" on storage.objects;
create policy "home_ads_update_transporter_own"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'home-ads'
  and owner = auth.uid()
  and public.is_transporter(auth.uid())
)
with check (
  bucket_id = 'home-ads'
  and owner = auth.uid()
  and public.is_transporter(auth.uid())
);

-- Delete: transporters can delete their own uploads.
drop policy if exists "home_ads_delete_transporter_own" on storage.objects;
create policy "home_ads_delete_transporter_own"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'home-ads'
  and owner = auth.uid()
  and public.is_transporter(auth.uid())
);

-- Admins: full control over the bucket objects (e.g., moderation/cleanup).
drop policy if exists "home_ads_admin_all" on storage.objects;
create policy "home_ads_admin_all"
on storage.objects
for all
to authenticated
using (bucket_id = 'home-ads' and public.is_admin(auth.uid()))
with check (bucket_id = 'home-ads' and public.is_admin(auth.uid()));

