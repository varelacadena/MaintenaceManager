
-- Make request_id nullable in uploads table (PostgreSQL)
ALTER TABLE uploads ALTER COLUMN request_id DROP NOT NULL;
