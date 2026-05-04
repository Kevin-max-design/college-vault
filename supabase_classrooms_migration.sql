-- ============================================================
-- CampusVault — Classrooms Feature Migration
-- Run this in the Supabase SQL Editor:
-- https://supabase.com/dashboard/project/lhmlmxcerkfbsytohnza/sql/new
-- ============================================================

-- 1. Classrooms
CREATE TABLE IF NOT EXISTS classrooms (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name          text NOT NULL,
  type          text NOT NULL DEFAULT 'study',          -- 'study' | 'project'
  subject_type  text NOT NULL DEFAULT 'core',           -- 'core'  | 'elective'
  department    text NOT NULL DEFAULT 'cse',
  year          int  NOT NULL DEFAULT 3,
  description   text,
  created_by    uuid REFERENCES auth.users(id),
  created_at    timestamptz NOT NULL DEFAULT now()
);

-- 2. Classroom members
CREATE TABLE IF NOT EXISTS classroom_members (
  classroom_id  uuid REFERENCES classrooms(id) ON DELETE CASCADE,
  user_id       uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  role          text NOT NULL DEFAULT 'member',          -- 'member' | 'ta' | 'owner'
  joined_at     timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (classroom_id, user_id)
);

-- 3. Classroom doubts
CREATE TABLE IF NOT EXISTS classroom_doubts (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  classroom_id  uuid REFERENCES classrooms(id) ON DELETE CASCADE,
  user_id       uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  body          text NOT NULL,
  resolved      boolean NOT NULL DEFAULT false,
  created_at    timestamptz NOT NULL DEFAULT now()
);

-- 4. Projects
CREATE TABLE IF NOT EXISTS projects (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name          text NOT NULL,
  phase         text NOT NULL DEFAULT 'Project',
  description   text,
  status        text NOT NULL DEFAULT 'on_track',        -- 'on_track' | 'blocked' | 'at_risk'
  icon          text NOT NULL DEFAULT 'architecture',
  department    text NOT NULL DEFAULT 'cse',
  created_by    uuid REFERENCES auth.users(id),
  created_at    timestamptz NOT NULL DEFAULT now()
);

-- 5. Project members
CREATE TABLE IF NOT EXISTS project_members (
  project_id    uuid REFERENCES projects(id) ON DELETE CASCADE,
  user_id       uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  role          text NOT NULL DEFAULT 'member',
  joined_at     timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (project_id, user_id)
);

-- ── Row Level Security ────────────────────────────────────────
ALTER TABLE classrooms        ENABLE ROW LEVEL SECURITY;
ALTER TABLE classroom_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE classroom_doubts  ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects          ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_members   ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to read all classrooms
CREATE POLICY "Classrooms are readable by authenticated users"
  ON classrooms FOR SELECT
  TO authenticated
  USING (true);

-- Allow authenticated users to read classroom members
CREATE POLICY "Classroom members are readable by authenticated users"
  ON classroom_members FOR SELECT
  TO authenticated
  USING (true);

-- Allow authenticated users to read doubts
CREATE POLICY "Doubts are readable by authenticated users"
  ON classroom_doubts FOR SELECT
  TO authenticated
  USING (true);

-- Allow users to post their own doubts
CREATE POLICY "Users can post doubts"
  ON classroom_doubts FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Allow authenticated users to read projects
CREATE POLICY "Projects are readable by authenticated users"
  ON projects FOR SELECT
  TO authenticated
  USING (true);

-- Allow authenticated users to read project members
CREATE POLICY "Project members are readable by authenticated users"
  ON project_members FOR SELECT
  TO authenticated
  USING (true);

-- ── Seed demo data ────────────────────────────────────────────
-- (only runs if classrooms is empty)
INSERT INTO classrooms (name, type, subject_type, department, year, description)
SELECT * FROM (VALUES
  ('Data Structures & Algorithms', 'study', 'core',     'cse', 3, 'Focus on graph theory and dynamic programming patterns this week. TA sessions available.'),
  ('Operating Systems',            'study', 'core',     'cse', 3, 'Memory management modules ongoing. Deep dive into page tables and scheduling.'),
  ('Cloud Computing',              'study', 'elective',  'cse', 3, 'AWS practicals starting tomorrow. EC2, S3, and IAM fundamentals.'),
  ('Machine Learning',             'study', 'elective',  'cse', 3, 'Neural networks and backpropagation deep dive this sprint.')
) AS v(name, type, subject_type, department, year, description)
WHERE NOT EXISTS (SELECT 1 FROM classrooms LIMIT 1);

INSERT INTO projects (name, phase, description, status, icon, department)
SELECT * FROM (VALUES
  ('Web-based DBMS',     'Minor Project Phase I', 'Team Alpha — Sprint 2 active.',              'on_track', 'architecture', 'cse'),
  ('Linux Kernel Module','Open Source Contrib',   'Reviewing patch submission guidelines.',      'blocked',  'code',         'cse')
) AS v(name, phase, description, status, icon, department)
WHERE NOT EXISTS (SELECT 1 FROM projects LIMIT 1);
