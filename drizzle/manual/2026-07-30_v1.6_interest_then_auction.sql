ALTER TABLE auctions ADD COLUMN IF NOT EXISTS mode varchar(40) NOT NULL DEFAULT 'INTEREST_THEN_AUCTION';
ALTER TABLE auctions ADD COLUMN IF NOT EXISTS interest_deadline timestamptz;
ALTER TABLE auctions ADD COLUMN IF NOT EXISTS interest_duration_hours integer NOT NULL DEFAULT 48;
ALTER TABLE auctions ADD COLUMN IF NOT EXISTS auction_duration_hours integer NOT NULL DEFAULT 24;

CREATE TABLE IF NOT EXISTS listing_interests (
  id text PRIMARY KEY,
  listing_id text NOT NULL REFERENCES listings(id),
  auction_id text NOT NULL REFERENCES auctions(id),
  user_id text NOT NULL REFERENCES users(id),
  status varchar(30) NOT NULL DEFAULT 'ACTIVE',
  confirmed_at timestamptz NOT NULL DEFAULT now(),
  withdrawn_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);
CREATE UNIQUE INDEX IF NOT EXISTS listing_interests_auction_user_unique ON listing_interests(auction_id,user_id);
CREATE INDEX IF NOT EXISTS listing_interests_listing_idx ON listing_interests(listing_id);
CREATE INDEX IF NOT EXISTS listing_interests_auction_status_idx ON listing_interests(auction_id,status);
