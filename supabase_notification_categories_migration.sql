-- ══════════════════════════════════════════════════════════════════
--  CampusVault — Notification Categories & Priority Migration
--  Run this in Supabase SQL Editor AFTER user_notifications exists.
-- ══════════════════════════════════════════════════════════════════

-- 1. Add category column (default 'general' for existing rows)
ALTER TABLE user_notifications
  ADD COLUMN IF NOT EXISTS category TEXT DEFAULT 'general';

-- 2. Add priority column (default 'normal' for existing rows)
ALTER TABLE user_notifications
  ADD COLUMN IF NOT EXISTS priority TEXT DEFAULT 'normal';

-- 3. Add source column (nullable — older rows won't have it)
ALTER TABLE user_notifications
  ADD COLUMN IF NOT EXISTS source TEXT;

-- 4. Add optional expiration timestamp (for deadline notifications)
ALTER TABLE user_notifications
  ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ;

-- ── Indexes for fast filtered queries ─────────────────────────────

CREATE INDEX IF NOT EXISTS idx_user_notifications_category
  ON user_notifications(user_id, category, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_user_notifications_priority
  ON user_notifications(user_id, priority, created_at DESC);
