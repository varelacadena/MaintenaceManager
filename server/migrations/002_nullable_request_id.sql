
-- Make request_id nullable in uploads table
ALTER TABLE uploads ALTER COLUMN request_id DROP NOT NULL;
