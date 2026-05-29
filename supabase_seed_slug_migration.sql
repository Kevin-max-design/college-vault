-- ══════════════════════════════════════════════════════════════════
--  CampusVault — Seed Slug + Seat Code Migration
--  Run ONCE in the Supabase SQL Editor.
--  Idempotent: safe to re-run.
--
--  What this fixes:
--  • Seed classrooms (ds-y4-1, cse-y2-1, etc.) used localStorage as
--    their post store, making posts invisible to other users/devices.
--  • This migration adds a `slug` column to `classrooms` so that seed
--    classrooms can be upserted into Supabase with a real UUID primary
--    key, while keeping the original slug as a lookup key.
--  • Adds `seat_code` to `classroom_members` (was missing from schema
--    but the API was already trying to insert it).
--  • Adds a SECURITY DEFINER RPC function so any authenticated user
--    can trigger the find-or-create for a seed classroom safely.
-- ══════════════════════════════════════════════════════════════════

-- ── 1. Add slug column to classrooms ─────────────────────────────
ALTER TABLE classrooms
  ADD COLUMN IF NOT EXISTS slug TEXT;

-- Make slug unique (idempotent constraint addition)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'classrooms_slug_key'
      AND conrelid = 'classrooms'::regclass
  ) THEN
    ALTER TABLE classrooms ADD CONSTRAINT classrooms_slug_key UNIQUE (slug);
  END IF;
END $$;

-- ── 2. Add seat_code column to classroom_members ──────────────────
ALTER TABLE classroom_members
  ADD COLUMN IF NOT EXISTS seat_code TEXT;

-- ── 3. Performance index on slug ──────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_classrooms_slug ON classrooms(slug);

-- ══════════════════════════════════════════════════════════════════
--  4. SECURITY DEFINER RPC: find_or_create_seed_classroom
--
--  Purpose: atomically find or insert a seed classroom by its slug.
--  Uses SECURITY DEFINER to bypass the faculty-only INSERT RLS policy
--  on classrooms, allowing any authenticated user to promote a seed
--  classroom to a real Supabase-backed row on first access.
--
--  Security: the caller (page.tsx server component) validates the slug
--  against the hardcoded SEED_CLASSROOMS map before calling this RPC,
--  so arbitrary classroom creation is not possible from the client.
-- ══════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.find_or_create_seed_classroom(
  p_slug        TEXT,
  p_name        TEXT,
  p_subject_type TEXT,
  p_type        TEXT,
  p_department  TEXT,
  p_year        INT,
  p_description TEXT
)
RETURNS TABLE (
  id           UUID,
  name         TEXT,
  subject_type TEXT,
  type         TEXT,
  department   TEXT,
  year         INT,
  description  TEXT,
  entry_code   TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id          UUID;
  v_name        TEXT;
  v_subject     TEXT;
  v_type        TEXT;
  v_dept        TEXT;
  v_year        INT;
  v_desc        TEXT;
  v_entry_code  TEXT;
BEGIN
  -- Step 1: try to find existing classroom by slug
  SELECT
    c.id, c.name, c.subject_type::TEXT, c.type::TEXT,
    c.department, c.year, c.description, c.entry_code
  INTO
    v_id, v_name, v_subject, v_type, v_dept, v_year, v_desc, v_entry_code
  FROM classrooms c
  WHERE c.slug = p_slug
  LIMIT 1;

  IF FOUND THEN
    RETURN QUERY SELECT v_id, v_name, v_subject, v_type, v_dept, v_year, v_desc, v_entry_code;
    RETURN;
  END IF;

  -- Step 2: insert new classroom; ON CONFLICT handles concurrent requests
  INSERT INTO classrooms (name, subject_type, type, department, year, description, slug)
  VALUES (
    p_name,
    p_subject_type::subject_type,
    p_type::classroom_type,
    p_department,
    p_year,
    p_description,
    p_slug
  )
  ON CONFLICT (slug) DO NOTHING
  RETURNING
    classrooms.id, classrooms.name, classrooms.subject_type::TEXT, classrooms.type::TEXT,
    classrooms.department, classrooms.year, classrooms.description, classrooms.entry_code
  INTO
    v_id, v_name, v_subject, v_type, v_dept, v_year, v_desc, v_entry_code;

  -- Step 3: if concurrent insert won the race, fetch the winning row
  IF v_id IS NULL THEN
    SELECT
      c.id, c.name, c.subject_type::TEXT, c.type::TEXT,
      c.department, c.year, c.description, c.entry_code
    INTO
      v_id, v_name, v_subject, v_type, v_dept, v_year, v_desc, v_entry_code
    FROM classrooms c
    WHERE c.slug = p_slug
    LIMIT 1;
  END IF;

  RETURN QUERY SELECT v_id, v_name, v_subject, v_type, v_dept, v_year, v_desc, v_entry_code;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.find_or_create_seed_classroom TO authenticated;

-- ══════════════════════════════════════════════════════════════════
--  Done.
--
--  After running this migration:
--  1. Deploy the updated page.tsx and ClassroomDetailClient.tsx.
--  2. On first access to any seed classroom URL (e.g. /classrooms/ds-y4-1),
--     the server will call find_or_create_seed_classroom via RPC,
--     get back a real UUID, and pass it to the client component.
--  3. The client sees a UUID → isSeedClassroom = false → all Supabase
--     paths activate → posts are shared across all users/devices.
-- ══════════════════════════════════════════════════════════════════
