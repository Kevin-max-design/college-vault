-- ══════════════════════════════════════════════════════════════════
--  CampusVault — Clubs Payment System Upgrade
--  Database Migration  (Supabase / PostgreSQL)
--
--  Run this in the Supabase SQL Editor.
-- ══════════════════════════════════════════════════════════════════

-- Alter club_payments table to support manual proofs and future payment gateway integrations
ALTER TABLE club_payments ADD COLUMN IF NOT EXISTS proof_url TEXT;
ALTER TABLE club_payments ADD COLUMN IF NOT EXISTS proof_uploaded_at TIMESTAMPTZ;
ALTER TABLE club_payments ADD COLUMN IF NOT EXISTS payment_note TEXT;
ALTER TABLE club_payments ADD COLUMN IF NOT EXISTS payment_method TEXT NOT NULL DEFAULT 'manual';
ALTER TABLE club_payments ADD COLUMN IF NOT EXISTS gateway TEXT;
ALTER TABLE club_payments ADD COLUMN IF NOT EXISTS gateway_order_id TEXT;
ALTER TABLE club_payments ADD COLUMN IF NOT EXISTS gateway_payment_id TEXT;
ALTER TABLE club_payments ADD COLUMN IF NOT EXISTS gateway_signature TEXT;
ALTER TABLE club_payments ADD COLUMN IF NOT EXISTS paid_at TIMESTAMPTZ;

-- Re-grant SELECT permission to anyone, matching previous policies
ALTER TABLE club_payments ENABLE ROW LEVEL SECURITY;
