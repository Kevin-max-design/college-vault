-- ==============================================================================
-- Migration Plan / TODO: Rename 'thread' to 'reply' in 'post_type' DB Enum
-- ==============================================================================
--
-- This script outlines the simple database-level steps required to align the 
-- database schema with the new frontend model:
--   - Root posts: doubt, material
--   - Nested comments/replies: reply
--
-- Run this query in the Supabase SQL Editor during the next scheduled
-- database maintenance window.
--
-- Note: PostgreSQL 10+ supports renaming enum values instantly and safely.
-- This operation modifies all existing rows containing 'thread' to 'reply' 
-- automatically with zero downtime.

BEGIN;

-- 1. Rename the 'thread' value to 'reply' inside the 'post_type' enum
ALTER TYPE post_type RENAME VALUE 'thread' TO 'reply';

COMMIT;

-- ==============================================================================
-- Verification queries:
-- ==============================================================================
--
-- -- Check that the enum values are updated:
-- SELECT enumlabel 
-- FROM pg_enum 
-- WHERE enumtypid = 'post_type'::regtype;
--
-- -- Check that all existing posts of type 'thread' have been successfully renamed:
-- SELECT id, content, type FROM posts WHERE type = 'reply';
