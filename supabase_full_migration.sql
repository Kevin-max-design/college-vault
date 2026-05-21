-- ══════════════════════════════════════════════════════════════════
--  CampusVault — College Management System
--  Full Database Migration  (Supabase / PostgreSQL)
--
--  Run this ONCE in the Supabase SQL Editor.
--  It is idempotent: safe to re-run (uses IF NOT EXISTS / OR REPLACE).
-- ══════════════════════════════════════════════════════════════════

-- ── 0  Extensions ─────────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "pgcrypto";   -- gen_random_uuid()

-- ── 1  Enums ──────────────────────────────────────────────────────
DO $$ BEGIN
  CREATE TYPE user_role      AS ENUM ('student','faculty','hod','principal');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE classroom_type AS ENUM ('study','project');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE subject_type   AS ENUM ('core','elective');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE post_type      AS ENUM ('doubt','material','announcement','thread');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE notice_scope   AS ENUM ('global','department','personal');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE notice_tag     AS ENUM ('academic','event','urgent','general');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE listing_type   AS ENUM ('buy','rent');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE listing_cat    AS ENUM ('books','electronics','lab','clothing','other');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE listing_status AS ENUM ('available','sold','rented');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE game_type      AS ENUM ('quiz','puzzle','challenge');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE member_role    AS ENUM ('member','ta','owner');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;


-- ══════════════════════════════════════════════════════════════════
--  2  TABLES
-- ══════════════════════════════════════════════════════════════════

-- ── 2.1  profiles ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS profiles (
  id            UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name     TEXT NOT NULL DEFAULT '',
  college_id    TEXT UNIQUE,
  email         TEXT NOT NULL DEFAULT '',
  role          user_role NOT NULL DEFAULT 'student',
  department    TEXT NOT NULL DEFAULT '',
  year_of_study INT NOT NULL DEFAULT 1 CHECK (year_of_study BETWEEN 1 AND 4),
  avatar_url    TEXT,
  otp_verified  BOOLEAN NOT NULL DEFAULT false,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Auto-create a profile row when a user signs up via Supabase Auth
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email)
  VALUES (NEW.id, COALESCE(NEW.email, ''))
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ── 2.2  classrooms ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS classrooms (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name          TEXT NOT NULL,
  type          classroom_type NOT NULL DEFAULT 'study',
  subject_type  subject_type NOT NULL DEFAULT 'core',
  department    TEXT NOT NULL DEFAULT '',
  year          INT NOT NULL DEFAULT 1 CHECK (year BETWEEN 1 AND 4),
  description   TEXT NOT NULL DEFAULT '',
  entry_code    TEXT UNIQUE DEFAULT substr(md5(random()::text), 1, 6),
  created_by    UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── 2.3  classroom_members ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS classroom_members (
  classroom_id  UUID NOT NULL REFERENCES classrooms(id) ON DELETE CASCADE,
  user_id       UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  role          member_role NOT NULL DEFAULT 'member',
  joined_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (classroom_id, user_id)
);

-- ── 2.4  posts (doubts, materials, threads) ───────────────────────
CREATE TABLE IF NOT EXISTS posts (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  classroom_id  UUID NOT NULL REFERENCES classrooms(id) ON DELETE CASCADE,
  author_id     UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  content       TEXT NOT NULL DEFAULT '',
  type          post_type NOT NULL DEFAULT 'doubt',
  attachments   JSONB DEFAULT '[]'::jsonb,
  resolved      BOOLEAN NOT NULL DEFAULT false,
  parent_id     UUID REFERENCES posts(id) ON DELETE CASCADE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── 2.5  reactions ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS reactions (
  post_id       UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  user_id       UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  emoji         TEXT NOT NULL DEFAULT '👍',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (post_id, user_id)
);

-- ── 2.6  notices ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS notices (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id     UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  scope         notice_scope NOT NULL DEFAULT 'personal',
  department    TEXT,                       -- NULL for global notices
  title         TEXT NOT NULL,
  body          TEXT NOT NULL DEFAULT '',
  tag           notice_tag NOT NULL DEFAULT 'general',
  pinned        BOOLEAN NOT NULL DEFAULT false,
  archived      BOOLEAN NOT NULL DEFAULT false,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── 2.7  listings (shop / rent) ───────────────────────────────────
CREATE TABLE IF NOT EXISTS listings (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id     UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title         TEXT NOT NULL,
  description   TEXT NOT NULL DEFAULT '',
  price         NUMERIC(10,2) NOT NULL DEFAULT 0,
  type          listing_type NOT NULL DEFAULT 'buy',
  category      listing_cat NOT NULL DEFAULT 'other',
  status        listing_status NOT NULL DEFAULT 'available',
  images        JSONB DEFAULT '[]'::jsonb,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── 2.8  messages (buyer ↔ seller DMs) ────────────────────────────
CREATE TABLE IF NOT EXISTS messages (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id    UUID NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
  sender_id     UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  receiver_id   UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  body          TEXT NOT NULL DEFAULT '',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── 2.9  games ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS games (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title         TEXT NOT NULL,
  type          game_type NOT NULL DEFAULT 'quiz',
  description   TEXT NOT NULL DEFAULT '',
  created_by    UUID REFERENCES profiles(id) ON DELETE SET NULL,
  config        JSONB DEFAULT '{}'::jsonb,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── 2.10  game_sessions ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS game_sessions (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id       UUID NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  player_id     UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  score         INT NOT NULL DEFAULT 0,
  completed_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── 2.11  badges ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS badges (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  label         TEXT NOT NULL,
  icon          TEXT NOT NULL DEFAULT '🏆',
  awarded_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);


-- ══════════════════════════════════════════════════════════════════
--  3  INDEXES
-- ══════════════════════════════════════════════════════════════════

CREATE INDEX IF NOT EXISTS idx_classrooms_dept_year   ON classrooms(department, year);
CREATE INDEX IF NOT EXISTS idx_posts_classroom        ON posts(classroom_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_posts_parent           ON posts(parent_id);
CREATE INDEX IF NOT EXISTS idx_notices_scope_dept     ON notices(scope, department, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_listings_cat_status    ON listings(category, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_listing       ON messages(listing_id, created_at);
CREATE INDEX IF NOT EXISTS idx_game_sessions_game     ON game_sessions(game_id, score DESC);
CREATE INDEX IF NOT EXISTS idx_game_sessions_player   ON game_sessions(player_id);
CREATE INDEX IF NOT EXISTS idx_badges_user            ON badges(user_id);


-- ══════════════════════════════════════════════════════════════════
--  4  ROW LEVEL SECURITY
-- ══════════════════════════════════════════════════════════════════

-- Enable RLS on every table
ALTER TABLE profiles          ENABLE ROW LEVEL SECURITY;
ALTER TABLE classrooms        ENABLE ROW LEVEL SECURITY;
ALTER TABLE classroom_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE posts             ENABLE ROW LEVEL SECURITY;
ALTER TABLE reactions          ENABLE ROW LEVEL SECURITY;
ALTER TABLE notices           ENABLE ROW LEVEL SECURITY;
ALTER TABLE listings          ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages          ENABLE ROW LEVEL SECURITY;
ALTER TABLE games             ENABLE ROW LEVEL SECURITY;
ALTER TABLE game_sessions     ENABLE ROW LEVEL SECURITY;
ALTER TABLE badges            ENABLE ROW LEVEL SECURITY;


-- ── 4.1  profiles ─────────────────────────────────────────────────
DROP POLICY IF EXISTS "profiles_select" ON profiles;
CREATE POLICY "profiles_select" ON profiles
  FOR SELECT USING (true);                 -- anyone authenticated can read

DROP POLICY IF EXISTS "profiles_update_own" ON profiles;
CREATE POLICY "profiles_update_own" ON profiles
  FOR UPDATE USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "profiles_insert_own" ON profiles;
CREATE POLICY "profiles_insert_own" ON profiles
  FOR INSERT WITH CHECK (auth.uid() = id);


-- ── 4.2  classrooms ───────────────────────────────────────────────
DROP POLICY IF EXISTS "classrooms_select" ON classrooms;
CREATE POLICY "classrooms_select" ON classrooms
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "classrooms_insert" ON classrooms;
CREATE POLICY "classrooms_insert" ON classrooms
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
        AND role IN ('faculty','hod','principal')
    )
  );

DROP POLICY IF EXISTS "classrooms_update" ON classrooms;
CREATE POLICY "classrooms_update" ON classrooms
  FOR UPDATE USING (
    created_by = auth.uid() OR EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('hod','principal')
    )
  );


-- ── 4.3  classroom_members ────────────────────────────────────────
DROP POLICY IF EXISTS "cm_select" ON classroom_members;
CREATE POLICY "cm_select" ON classroom_members
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "cm_insert" ON classroom_members;
CREATE POLICY "cm_insert" ON classroom_members
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "cm_delete" ON classroom_members;
CREATE POLICY "cm_delete" ON classroom_members
  FOR DELETE USING (auth.uid() = user_id);


-- ── 4.4  posts ────────────────────────────────────────────────────
DROP POLICY IF EXISTS "posts_select" ON posts;
CREATE POLICY "posts_select" ON posts
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "posts_insert" ON posts;
CREATE POLICY "posts_insert" ON posts
  FOR INSERT WITH CHECK (auth.uid() = author_id);

DROP POLICY IF EXISTS "posts_update" ON posts;
CREATE POLICY "posts_update" ON posts
  FOR UPDATE USING (
    author_id = auth.uid() OR EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('faculty','hod','principal')
    )
  );

DROP POLICY IF EXISTS "posts_delete" ON posts;
CREATE POLICY "posts_delete" ON posts
  FOR DELETE USING (
    author_id = auth.uid() OR EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('faculty','hod','principal')
    )
  );


-- ── 4.5  reactions ────────────────────────────────────────────────
DROP POLICY IF EXISTS "reactions_select" ON reactions;
CREATE POLICY "reactions_select" ON reactions
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "reactions_insert" ON reactions;
CREATE POLICY "reactions_insert" ON reactions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "reactions_delete" ON reactions;
CREATE POLICY "reactions_delete" ON reactions
  FOR DELETE USING (auth.uid() = user_id);


-- ── 4.6  notices ──────────────────────────────────────────────────
DROP POLICY IF EXISTS "notices_select" ON notices;
CREATE POLICY "notices_select" ON notices
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "notices_insert" ON notices;
CREATE POLICY "notices_insert" ON notices
  FOR INSERT WITH CHECK (auth.uid() = author_id);
  -- Scope enforcement (global=principal, dept=hod/faculty) is done at API layer

DROP POLICY IF EXISTS "notices_update" ON notices;
CREATE POLICY "notices_update" ON notices
  FOR UPDATE USING (
    author_id = auth.uid() OR EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('hod','principal')
    )
  );

DROP POLICY IF EXISTS "notices_delete" ON notices;
CREATE POLICY "notices_delete" ON notices
  FOR DELETE USING (
    author_id = auth.uid() OR EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'principal'
    )
  );


-- ── 4.7  listings ─────────────────────────────────────────────────
DROP POLICY IF EXISTS "listings_select" ON listings;
CREATE POLICY "listings_select" ON listings
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "listings_insert" ON listings;
CREATE POLICY "listings_insert" ON listings
  FOR INSERT WITH CHECK (auth.uid() = seller_id);

DROP POLICY IF EXISTS "listings_update" ON listings;
CREATE POLICY "listings_update" ON listings
  FOR UPDATE USING (auth.uid() = seller_id);

DROP POLICY IF EXISTS "listings_delete" ON listings;
CREATE POLICY "listings_delete" ON listings
  FOR DELETE USING (auth.uid() = seller_id);


-- ── 4.8  messages ─────────────────────────────────────────────────
DROP POLICY IF EXISTS "messages_select" ON messages;
CREATE POLICY "messages_select" ON messages
  FOR SELECT USING (auth.uid() = sender_id OR auth.uid() = receiver_id);

DROP POLICY IF EXISTS "messages_insert" ON messages;
CREATE POLICY "messages_insert" ON messages
  FOR INSERT WITH CHECK (auth.uid() = sender_id);


-- ── 4.9  games ────────────────────────────────────────────────────
DROP POLICY IF EXISTS "games_select" ON games;
CREATE POLICY "games_select" ON games
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "games_insert" ON games;
CREATE POLICY "games_insert" ON games
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
        AND role IN ('faculty','hod','principal')
    )
  );

DROP POLICY IF EXISTS "games_update" ON games;
CREATE POLICY "games_update" ON games
  FOR UPDATE USING (
    created_by = auth.uid() OR EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'principal'
    )
  );


-- ── 4.10  game_sessions ───────────────────────────────────────────
DROP POLICY IF EXISTS "gs_select" ON game_sessions;
CREATE POLICY "gs_select" ON game_sessions
  FOR SELECT USING (true);          -- leaderboards need to read all

DROP POLICY IF EXISTS "gs_insert" ON game_sessions;
CREATE POLICY "gs_insert" ON game_sessions
  FOR INSERT WITH CHECK (auth.uid() = player_id);


-- ── 4.11  badges ──────────────────────────────────────────────────
DROP POLICY IF EXISTS "badges_select" ON badges;
CREATE POLICY "badges_select" ON badges
  FOR SELECT USING (true);

-- Only service-role (admin) can insert badges; no user policy needed
-- (badges are awarded server-side)


-- ══════════════════════════════════════════════════════════════════
--  5  SEED DATA
-- ══════════════════════════════════════════════════════════════════

-- ── Classrooms (no author needed — created_by is nullable) ──────
INSERT INTO classrooms (name, type, subject_type, department, year, description, entry_code) VALUES
  ('Data Structures & Algorithms', 'study',   'core',     'CSE', 3, 'Focus on graph theory and dynamic programming patterns this week. TA sessions available.', 'dsa301'),
  ('Operating Systems',            'study',   'core',     'CSE', 3, 'Memory management modules ongoing.',                                                       'opsys3'),
  ('Cloud Computing',              'study',   'elective', 'CSE', 3, 'AWS practicals starting tomorrow.',                                                         'cloud3'),
  ('Machine Learning',             'study',   'elective', 'CSE', 3, 'Neural networks and backpropagation deep dive this sprint.',                                'mlcse3'),
  ('Database Management Systems',  'study',   'core',     'CSE', 2, 'SQL joins and normalization week.',                                                         'dbms02'),
  ('Web-based DBMS',               'project', 'core',     'CSE', 3, 'Team Alpha — Sprint 2 active.',                                                             'wdbms3'),
  ('Linux Kernel Module',          'project', 'core',     'CSE', 3, 'Reviewing patch submission guidelines.',                                                     'lkmod3'),
  -- ECE
  ('Electronic Devices and Circuits', 'study', 'core', 'ECE', 2, 'Diodes, BJTs, MOSFETs and amplifier topologies.', 'ece201'),
  ('Switching Theory & Logic Design', 'study', 'core', 'ECE', 2, 'K-maps, logic families, combinational and sequential circuit design.', 'ece202'),
  ('Signals and Systems', 'study', 'core', 'ECE', 2, 'Fourier, Laplace, and Z-transforms; LTI systems analysis.', 'ece203'),
  ('VLSI Design', 'study', 'core', 'ECE', 4, 'CMOS fabrication, inverter delay, stick diagrams, and layout.', 'ece401'),
  -- EEE
  ('DC Machines and Transformers', 'study', 'core', 'EEE', 2, 'DC generator, motor characteristics, and single-phase transformers.', 'eee201'),
  ('Control Systems', 'study', 'core', 'EEE', 3, 'Block diagrams, transfer functions, and root-locus/bode plots.', 'eee301'),
  -- ME
  ('Thermodynamics', 'study', 'core', 'ME', 2, 'First and second laws, properties of pure substances, gas cycles.', 'me201'),
  ('CAD/CAM', 'study', 'core', 'ME', 4, 'Geometric modeling, NC programming, and computer networks.', 'me401'),
  -- CE
  ('Strength of Materials', 'study', 'core', 'CE', 2, 'Shear and bending stresses, deflection in beams, columns.', 'ce201'),
  ('Design of Steel Structures', 'study', 'core', 'CE', 4, 'Tension, compression members, bolted and welded joints.', 'ce401'),
  -- MCA
  ('Data Structures using C++', 'study', 'core', 'MCA', 1, 'Memory structures, complexity algorithms, tree models.', 'mca101'),
  ('Java Programming', 'study', 'core', 'MCA', 2, 'Inheritance, exception rules, database interfaces via JDBC.', 'mca201'),
  -- MBA
  ('Management & Org Behavior', 'study', 'core', 'MBA', 1, 'Leadership principles, motivation models, and team dynamics.', 'mba101'),
  ('Strategic Management', 'study', 'core', 'MBA', 2, 'SWOT analyses, BCG matrices, corporate growth strategies.', 'mba201')
ON CONFLICT (entry_code) DO NOTHING;

-- ── Games (no author needed — created_by is nullable) ────────────
INSERT INTO games (title, type, description, config) VALUES
  ('DSA Speed Quiz', 'quiz', 'Test your Data Structures knowledge in 60 seconds!',
   '{"time_limit":60,"questions":[{"q":"Time complexity of binary search?","opts":["O(n)","O(log n)","O(n^2)","O(1)"],"answer":1},{"q":"Which DS uses LIFO?","opts":["Queue","Stack","Array","Tree"],"answer":1}]}'::jsonb),
  ('Code Puzzle #1', 'puzzle', 'Rearrange the code lines to fix the function.',
   '{"lines":["return sum","for i in range(n):","sum += arr[i]","sum = 0"],"correct_order":[3,1,2,0]}'::jsonb)
ON CONFLICT DO NOTHING;

-- ── User-dependent seed (notices & listings) ─────────────────────
-- Only runs if at least one profile row exists (i.e., a user has signed up).
-- Safe to re-run: ON CONFLICT DO NOTHING prevents duplicates.
DO $$
DECLARE
  v_author UUID;
BEGIN
  SELECT id INTO v_author FROM profiles LIMIT 1;

  IF v_author IS NOT NULL THEN

    INSERT INTO notices (author_id, scope, department, title, body, tag, pinned)
    VALUES
      (v_author, 'global',      NULL,  'Mid-Semester Examination Schedule Released',
       'The mid-semester examination schedule for all departments has been published on the college portal.',
       'academic', true),
      (v_author, 'department',  'CSE', 'CSE Lab Hours Extended',
       'Lab 4 and Lab 5 will remain open until 8 PM on weekdays starting next week for project work.',
       'event', false),
      (v_author, 'personal',    NULL,  'Looking for study partners for GATE prep',
       'Anyone preparing for GATE 2027? Let us form a study group. DM me.',
       'general', false)
    ON CONFLICT DO NOTHING;

    INSERT INTO listings (seller_id, title, description, price, type, category, status)
    VALUES
      (v_author, 'Engineering Mathematics Textbook (Kreyszig)',
       'Lightly used, 10th edition. Includes solution manual.',
       450, 'buy', 'books', 'available'),
      (v_author, 'Scientific Calculator (Casio FX-991EX)',
       'Available for rent during exam period.',
       50, 'rent', 'electronics', 'available')
    ON CONFLICT DO NOTHING;

  ELSE
    RAISE NOTICE 'No profiles found — skipping notices & listings seed. Re-run after first user signs up.';
  END IF;
END $$;

-- ══════════════════════════════════════════════════════════════════
--  Done.  Tables, policies, indexes, and seed data are in place.
--  Tip: After your first user signs up, re-run just the DO $$ block
--  above to seed the notices and listings with a real author.
-- ══════════════════════════════════════════════════════════════════
