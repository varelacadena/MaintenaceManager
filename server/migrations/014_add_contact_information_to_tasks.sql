DO $$ BEGIN
  CREATE TYPE contact_type AS ENUM ('requester', 'staff', 'other');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

ALTER TABLE tasks 
  ADD COLUMN IF NOT EXISTS contact_type contact_type,
  ADD COLUMN IF NOT EXISTS contact_staff_id TEXT REFERENCES users(id),
  ADD COLUMN IF NOT EXISTS contact_name TEXT,
  ADD COLUMN IF NOT EXISTS contact_email TEXT,
  ADD COLUMN IF NOT EXISTS contact_phone TEXT;
