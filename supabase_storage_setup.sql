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

-- NOTE: No SELECT policy is created. Because the 'avatars' bucket is public,
-- files are served automatically via public CDN URLs without requiring an RLS SELECT policy.
-- Removing the SELECT policy prevents clients from listing all files in the bucket.

-- 3.1  Authenticated Insert: Any logged-in student or faculty can upload avatar files to this bucket.
CREATE POLICY "Allow authenticated upload access on avatars"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK ( bucket_id = 'avatars' );

-- 3.2  Authenticated Update: Any logged-in student or faculty can update avatar files in this bucket.
CREATE POLICY "Allow authenticated update access on avatars"
ON storage.objects FOR UPDATE
TO authenticated
USING ( bucket_id = 'avatars' );

-- 3.3  Authenticated Delete: Any logged-in student or faculty can delete avatar files in this bucket.
CREATE POLICY "Allow authenticated delete access on avatars"
ON storage.objects FOR DELETE
TO authenticated
USING ( bucket_id = 'avatars' );
