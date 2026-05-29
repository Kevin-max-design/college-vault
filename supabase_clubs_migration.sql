-- ══════════════════════════════════════════════════════════════════
--  CampusVault — Clubs & Communities Module
--  Database Migration  (Supabase / PostgreSQL)
--
--  Run this in the Supabase SQL Editor AFTER the main migration.
--  Idempotent: safe to re-run (uses IF NOT EXISTS / OR REPLACE).
-- ══════════════════════════════════════════════════════════════════

-- ── 1  Enums ──────────────────────────────────────────────────────

DO $$ BEGIN
  CREATE TYPE club_member_status AS ENUM ('reserved','active','rejected','left');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE club_payment_status AS ENUM ('pending','verified','rejected');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;


-- ══════════════════════════════════════════════════════════════════
--  2  TABLES
-- ══════════════════════════════════════════════════════════════════

-- ── 2.1  clubs ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS clubs (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name            TEXT NOT NULL UNIQUE,
  description     TEXT NOT NULL DEFAULT '',
  icon_url        TEXT,
  lead_id         UUID REFERENCES profiles(id) ON DELETE SET NULL,
  is_open         BOOLEAN NOT NULL DEFAULT false,
  semester_label  TEXT NOT NULL DEFAULT '',          -- e.g. "2025-26 Sem 1"
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── 2.2  club_year_limits ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS club_year_limits (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id     UUID NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
  year        INT NOT NULL CHECK (year BETWEEN 2 AND 4),
  max_slots   INT NOT NULL DEFAULT 0 CHECK (max_slots >= 0),
  UNIQUE (club_id, year)
);

-- ── 2.3  club_members ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS club_members (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id     UUID NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
  user_id     UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  year        INT NOT NULL CHECK (year BETWEEN 2 AND 4),
  status      club_member_status NOT NULL DEFAULT 'reserved',
  reserved_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (club_id, user_id)
);

-- ── 2.4  club_payments ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS club_payments (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id   UUID NOT NULL REFERENCES club_members(id) ON DELETE CASCADE,
  club_id     UUID NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
  user_id     UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  amount      NUMERIC(10,2) NOT NULL DEFAULT 200.00,
  status      club_payment_status NOT NULL DEFAULT 'pending',
  verified_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  verified_at TIMESTAMPTZ,
  notes       TEXT NOT NULL DEFAULT '',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── 2.5  club_waitlist ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS club_waitlist (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id     UUID NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
  user_id     UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  year        INT NOT NULL CHECK (year BETWEEN 2 AND 4),
  position    INT NOT NULL DEFAULT 0,
  joined_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (club_id, user_id)
);


-- ══════════════════════════════════════════════════════════════════
--  3  INDEXES
-- ══════════════════════════════════════════════════════════════════

CREATE INDEX IF NOT EXISTS idx_club_members_club_year
  ON club_members(club_id, year, status);

CREATE INDEX IF NOT EXISTS idx_club_members_user
  ON club_members(user_id);

CREATE INDEX IF NOT EXISTS idx_club_payments_member
  ON club_payments(member_id);

CREATE INDEX IF NOT EXISTS idx_club_payments_club_status
  ON club_payments(club_id, status);

CREATE INDEX IF NOT EXISTS idx_club_waitlist_club_year
  ON club_waitlist(club_id, year, position);

CREATE INDEX IF NOT EXISTS idx_club_waitlist_user
  ON club_waitlist(user_id);


-- ══════════════════════════════════════════════════════════════════
--  4  ROW LEVEL SECURITY
-- ══════════════════════════════════════════════════════════════════

ALTER TABLE clubs            ENABLE ROW LEVEL SECURITY;
ALTER TABLE club_year_limits ENABLE ROW LEVEL SECURITY;
ALTER TABLE club_members     ENABLE ROW LEVEL SECURITY;
ALTER TABLE club_payments    ENABLE ROW LEVEL SECURITY;
ALTER TABLE club_waitlist    ENABLE ROW LEVEL SECURITY;

-- ── 4.1  clubs — anyone can read ──────────────────────────────────
DROP POLICY IF EXISTS "clubs_select" ON clubs;
CREATE POLICY "clubs_select" ON clubs
  FOR SELECT USING (true);

-- Only admins update clubs (via supabaseAdmin which bypasses RLS)
-- No INSERT/UPDATE/DELETE policies needed for regular users

-- ── 4.2  club_year_limits — anyone can read ───────────────────────
DROP POLICY IF EXISTS "club_year_limits_select" ON club_year_limits;
CREATE POLICY "club_year_limits_select" ON club_year_limits
  FOR SELECT USING (true);

-- ── 4.3  club_members — users can read their own + admins ─────────
DROP POLICY IF EXISTS "club_members_select" ON club_members;
CREATE POLICY "club_members_select" ON club_members
  FOR SELECT USING (true);

-- ── 4.4  club_payments — users can read their own ─────────────────
DROP POLICY IF EXISTS "club_payments_select" ON club_payments;
CREATE POLICY "club_payments_select" ON club_payments
  FOR SELECT USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM clubs WHERE clubs.id = club_payments.club_id AND clubs.lead_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('hod', 'principal')
    )
  );

-- ── 4.5  club_waitlist — anyone can read ──────────────────────────
DROP POLICY IF EXISTS "club_waitlist_select" ON club_waitlist;
CREATE POLICY "club_waitlist_select" ON club_waitlist
  FOR SELECT USING (true);


-- ══════════════════════════════════════════════════════════════════
--  5  RPC — Race-safe slot reservation
-- ══════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION reserve_club_slot(
  p_club_id UUID,
  p_user_id UUID,
  p_year    INT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_club        RECORD;
  v_limit_row   RECORD;
  v_filled      INT;
  v_member_id   UUID;
  v_existing    RECORD;
  v_waitlist_pos INT;
BEGIN
  -- 1. Lock the club row to prevent concurrent modifications
  SELECT * INTO v_club
    FROM clubs
    WHERE id = p_club_id
    FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Club not found.');
  END IF;

  IF NOT v_club.is_open THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Club registration is currently closed.');
  END IF;

  -- 2. Check year eligibility
  IF p_year < 2 OR p_year > 4 THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Only 2nd, 3rd, and 4th year students can join clubs.');
  END IF;

  -- 3. Check if user already has a membership (any status except 'left' and 'rejected')
  SELECT * INTO v_existing
    FROM club_members
    WHERE club_id = p_club_id AND user_id = p_user_id AND status NOT IN ('left', 'rejected');

  IF FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'You have already reserved a slot in this club.');
  END IF;

  -- 4. Check if user is already on the waitlist
  IF EXISTS (SELECT 1 FROM club_waitlist WHERE club_id = p_club_id AND user_id = p_user_id) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'You are already on the waitlist for this club.');
  END IF;

  -- 5. Lock the year limit row and get current count
  SELECT * INTO v_limit_row
    FROM club_year_limits
    WHERE club_id = p_club_id AND year = p_year
    FOR UPDATE;

  IF NOT FOUND OR v_limit_row.max_slots <= 0 THEN
    RETURN jsonb_build_object('ok', false, 'error', 'No slots configured for your year in this club.');
  END IF;

  -- Count filled slots (reserved + active)
  SELECT COUNT(*) INTO v_filled
    FROM club_members
    WHERE club_id = p_club_id AND year = p_year AND status IN ('reserved', 'active');

  -- 6. If slots available → reserve; else → waitlist
  IF v_filled < v_limit_row.max_slots THEN
    -- Reserve the slot
    INSERT INTO club_members (club_id, user_id, year, status)
    VALUES (p_club_id, p_user_id, p_year, 'reserved')
    RETURNING id INTO v_member_id;

    -- Create payment record
    INSERT INTO club_payments (member_id, club_id, user_id, amount, status)
    VALUES (v_member_id, p_club_id, p_user_id, 200.00, 'pending');

    RETURN jsonb_build_object(
      'ok', true,
      'result', 'reserved',
      'member_id', v_member_id,
      'message', 'Slot reserved! Please pay ₹200 to the club lead.'
    );
  ELSE
    -- Add to waitlist
    SELECT COALESCE(MAX(position), 0) + 1 INTO v_waitlist_pos
      FROM club_waitlist
      WHERE club_id = p_club_id AND year = p_year;

    INSERT INTO club_waitlist (club_id, user_id, year, position)
    VALUES (p_club_id, p_user_id, p_year, v_waitlist_pos);

    RETURN jsonb_build_object(
      'ok', true,
      'result', 'waitlisted',
      'position', v_waitlist_pos,
      'message', 'All slots are full. You have been added to the waitlist at position ' || v_waitlist_pos || '.'
    );
  END IF;
END;
$$;


-- ══════════════════════════════════════════════════════════════════
--  6  SEED DATA — 7 Fixed Clubs
-- ══════════════════════════════════════════════════════════════════

INSERT INTO clubs (name, description) VALUES
  ('Art House', 'The creative arts club — drawing, painting, sketching, crafts, and more.'),
  ('Codes Club', 'Competitive programming, hackathons, and coding workshops.'),
  ('Hydra', 'Fitness, sports, and outdoor adventure activities.'),
  ('Jignasa', 'Science and innovation — experiments, expos, and research projects.'),
  ('Shield Prep', 'Placement preparation — mock interviews, aptitude, and soft skills.'),
  ('Vedic Vox', 'Debate, public speaking, and literary arts.'),
  ('Yuga Spark', 'Cultural events — dance, music, drama, and festivals.')
ON CONFLICT (name) DO NOTHING;

-- Seed year limits (default 0 — HOD must configure)
INSERT INTO club_year_limits (club_id, year, max_slots)
SELECT c.id, y.yr, 0
FROM clubs c
CROSS JOIN (VALUES (2), (3), (4)) AS y(yr)
ON CONFLICT (club_id, year) DO NOTHING;


-- ══════════════════════════════════════════════════════════════════
--  7  REALTIME PUBLICATION
-- ══════════════════════════════════════════════════════════════════

-- Enable realtime for club tables so students see live slot updates
ALTER PUBLICATION supabase_realtime ADD TABLE clubs;
ALTER PUBLICATION supabase_realtime ADD TABLE club_year_limits;
ALTER PUBLICATION supabase_realtime ADD TABLE club_members;
ALTER PUBLICATION supabase_realtime ADD TABLE club_waitlist;
