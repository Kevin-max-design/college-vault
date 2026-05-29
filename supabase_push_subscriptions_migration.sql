-- ══════════════════════════════════════════════════════════════════
--  CampusVault — Web Push Subscriptions Migration
-- ══════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS push_subscriptions (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  endpoint      TEXT NOT NULL UNIQUE,
  p256dh        TEXT NOT NULL,
  auth_secret   TEXT NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable Row Level Security (RLS)
ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;

-- Select Policy: Users can read only their own subscriptions
CREATE POLICY "Users can select own push subscriptions"
ON push_subscriptions
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Insert Policy: Users can register their own subscriptions
CREATE POLICY "Users can insert own push subscriptions"
ON push_subscriptions
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Update Policy: Users can update their own subscriptions
CREATE POLICY "Users can update own push subscriptions"
ON push_subscriptions
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Delete Policy: Users can delete their own subscriptions
CREATE POLICY "Users can delete own push subscriptions"
ON push_subscriptions
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- Index for lightning-fast lookups by user_id
CREATE INDEX IF NOT EXISTS idx_push_subscriptions_user ON push_subscriptions(user_id);
