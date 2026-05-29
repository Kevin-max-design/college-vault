-- ══════════════════════════════════════════════════════════════════
--  CampusVault — Supabase Storage Setup Script
--  
--  Run this script in the Supabase SQL Editor to:
--  1. Create the public 'avatars' bucket.
--  2. Enable secure Row Level Security (RLS) policies.
-- ══════════════════════════════════════════════════════════════════

-- ── 1  Create the Bucket ───────────────────────────────────────────
-- Inserts a row into Supabase storage.buckets for the 'avatars' bucket.
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

-- ── 2  Drop Existing Storage Policies (For Idempotency) ───────────
DROP POLICY IF EXISTS "Allow public select access on avatars" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated upload access on avatars" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated update access on avatars" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated delete access on avatars" ON storage.objects;

-- ── 3  Create Secure Storage Policies ─────────────────────────────

-- 3.1  Public Select: Anyone can view avatar images
CREATE POLICY "Allow public select access on avatars"
ON storage.objects FOR SELECT
USING ( bucket_id = 'avatars' );

-- 3.2  Authenticated Insert: Users can only upload their own avatar files.
-- Supports both folder-prefixed 'avatars/user_id.ext' and plain 'user_id.ext' paths.
CREATE POLICY "Allow authenticated upload access on avatars"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'avatars' AND (
    (auth.uid())::text = split_part(name, '.', 1)
    OR
    (auth.uid())::text = split_part(split_part(name, '/', 2), '.', 1)
  )
);

-- 3.3  Authenticated Update: Users can only update their own avatar files.
CREATE POLICY "Allow authenticated update access on avatars"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'avatars' AND (
    (auth.uid())::text = split_part(name, '.', 1)
    OR
    (auth.uid())::text = split_part(split_part(name, '/', 2), '.', 1)
  )
);

-- 3.4  Authenticated Delete: Users can only delete their own avatar files.
CREATE POLICY "Allow authenticated delete access on avatars"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'avatars' AND (
    (auth.uid())::text = split_part(name, '.', 1)
    OR
    (auth.uid())::text = split_part(split_part(name, '/', 2), '.', 1)
  )
);
