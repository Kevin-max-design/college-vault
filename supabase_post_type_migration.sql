-- ══════════════════════════════════════════════════════════════════
--  CampusVault — Classroom Post Type Migration
-- ══════════════════════════════════════════════════════════════════

-- Safe updates to permanently classify legacy doubt posts containing files as materials
UPDATE posts
SET type = 'material'::post_type
WHERE type = 'doubt'::post_type
AND attachments IS NOT NULL
AND jsonb_array_length(attachments) > 0;
