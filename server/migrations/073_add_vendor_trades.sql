-- Trades a vendor can be hired for, used to filter the vendor directory.

ALTER TABLE vendors ADD COLUMN IF NOT EXISTS trades text[] NOT NULL DEFAULT '{}';
