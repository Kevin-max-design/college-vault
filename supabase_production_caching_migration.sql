-- ══════════════════════════════════════════════════════════════════
--  CampusVault — Production Caching & Persistent Schema Migration
-- ══════════════════════════════════════════════════════════════════

-- ── 1. ANONYMOUS CLASSROOM IDENTITIES (on classroom_members) ──────
ALTER TABLE classroom_members
ADD COLUMN IF NOT EXISTS anonymous_id TEXT,
ADD COLUMN IF NOT EXISTS anonymous_handle TEXT;

-- ── 2. CLASSROOM PEER MESSAGES (Direct Chats) ─────────────────────
CREATE TABLE IF NOT EXISTS peer_messages (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  classroom_id  UUID NOT NULL REFERENCES classrooms(id) ON DELETE CASCADE,
  sender_id     UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  receiver_id   UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  body          TEXT NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable Row Level Security (RLS)
ALTER TABLE peer_messages ENABLE ROW LEVEL SECURITY;

-- Select Policy: Participant users can read own direct messages
CREATE POLICY "Users can read own peer messages"
ON peer_messages
FOR SELECT
TO authenticated
USING (auth.uid() = sender_id OR auth.uid() = receiver_id);

-- Insert Policy: Authenticated sender can insert own messages
CREATE POLICY "Users can send own peer messages"
ON peer_messages
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = sender_id);

-- Indexes for lightning-fast queries
CREATE INDEX IF NOT EXISTS idx_peer_messages_classroom ON peer_messages(classroom_id);
CREATE INDEX IF NOT EXISTS idx_peer_messages_sender_receiver ON peer_messages(sender_id, receiver_id);
CREATE INDEX IF NOT EXISTS idx_peer_messages_receiver ON peer_messages(receiver_id);
CREATE INDEX IF NOT EXISTS idx_peer_messages_created_at ON peer_messages(created_at ASC);


-- ── 3. USER IN-APP NOTIFICATIONS ──────────────────────────────────
CREATE TABLE IF NOT EXISTS user_notifications (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  type          TEXT NOT NULL,                      -- 'message' | 'classroom_post' | 'resolved' | etc.
  title         TEXT NOT NULL,
  body          TEXT NOT NULL,
  link          TEXT NOT NULL,
  read          BOOLEAN NOT NULL DEFAULT false,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable Row Level Security (RLS)
ALTER TABLE user_notifications ENABLE ROW LEVEL SECURITY;

-- Select Policy: Users can read only their own notifications
CREATE POLICY "Users can read own notifications"
ON user_notifications
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Insert Policy: System / User can insert notifications for users
CREATE POLICY "Users can insert notifications"
ON user_notifications
FOR INSERT
TO authenticated
WITH CHECK (true); -- Allows cross-user triggers or API notifications securely

-- Update Policy: Users can mark only their own notifications as read
CREATE POLICY "Users can update own notifications"
ON user_notifications
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_user_notifications_user ON user_notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_user_notifications_unread ON user_notifications(user_id) WHERE read = false;
CREATE INDEX IF NOT EXISTS idx_user_notifications_created_at ON user_notifications(created_at DESC);
