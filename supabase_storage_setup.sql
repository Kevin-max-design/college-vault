-- ══════════════════════════════════════════════════════════════════
--  CampusVault — Supabase Storage Setup Script (Audit Approved)
--  
--  Run this script in the Supabase SQL Editor to:
--  1. Create/configure the public 'avatars' bucket.
--  2. Enable secure Row Level Security (RLS) policies.
-- ══════════════════════════════════════════════════════════════════

INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO UPDATE
SET public = true;

DROP POLICY IF EXISTS "Avatar files are publicly readable" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload avatars" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update avatars" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete avatars" ON storage.objects;

DROP POLICY IF EXISTS "Allow public select access on avatars" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated upload access on avatars" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated update access on avatars" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated delete access on avatars" ON storage.objects;

CREATE POLICY "Avatar files are publicly readable"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'avatars');

CREATE POLICY "Authenticated users can upload avatars"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'avatars');

CREATE POLICY "Authenticated users can update avatars"
ON storage.objects
FOR UPDATE
TO authenticated
USING (bucket_id = 'avatars')
WITH CHECK (bucket_id = 'avatars');

CREATE POLICY "Authenticated users can delete avatars"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'avatars');
