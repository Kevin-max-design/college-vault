-- ── 1. SAVED LISTINGS (BOOKMARKS) ───────────────────────────────────
CREATE TABLE IF NOT EXISTS saved_listings (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  listing_id  UUID NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, listing_id)
);

-- Enable RLS
ALTER TABLE saved_listings ENABLE ROW LEVEL SECURITY;

-- Policies for saved_listings
CREATE POLICY "Users can read own saved listings"
ON saved_listings
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own saved listings"
ON saved_listings
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own saved listings"
ON saved_listings
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- Performance Indexes
CREATE INDEX IF NOT EXISTS idx_saved_listings_user_id ON saved_listings(user_id);
CREATE INDEX IF NOT EXISTS idx_saved_listings_listing_id ON saved_listings(listing_id);


-- ── 2. LISTING REQUESTS (BUY/RENT REQUESTS) ──────────────────────────
CREATE TABLE IF NOT EXISTS listing_requests (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id    UUID NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
  requester_id  UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  seller_id     UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  request_type  TEXT NOT NULL CHECK (request_type IN ('buy', 'rent')),
  status        TEXT NOT NULL DEFAULT 'pending',
  message       TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(listing_id, requester_id)
);

-- Enable RLS
ALTER TABLE listing_requests ENABLE ROW LEVEL SECURITY;

-- Policies for listing_requests
CREATE POLICY "Users can read own sent or received listing requests"
ON listing_requests
FOR SELECT
TO authenticated
USING (auth.uid() = requester_id OR auth.uid() = seller_id);

CREATE POLICY "Users can create own listing requests"
ON listing_requests
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = requester_id);

CREATE POLICY "Users can update received listing requests"
ON listing_requests
FOR UPDATE
TO authenticated
USING (auth.uid() = seller_id)
WITH CHECK (auth.uid() = seller_id);

-- Performance Indexes
CREATE INDEX IF NOT EXISTS idx_listing_requests_requester ON listing_requests(requester_id);
CREATE INDEX IF NOT EXISTS idx_listing_requests_seller ON listing_requests(seller_id);
CREATE INDEX IF NOT EXISTS idx_listing_requests_listing ON listing_requests(listing_id);
