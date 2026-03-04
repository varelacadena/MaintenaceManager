-- Create lockbox_status enum if not exists
DO $$ BEGIN
  CREATE TYPE lockbox_status AS ENUM ('active', 'inactive');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Create lockbox_code_status enum if not exists
DO $$ BEGIN
  CREATE TYPE lockbox_code_status AS ENUM ('active', 'inactive');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Create lockboxes table
CREATE TABLE IF NOT EXISTS lockboxes (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  location VARCHAR(200) NOT NULL,
  lockbox_status lockbox_status NOT NULL DEFAULT 'active',
  created_at TIMESTAMP DEFAULT NOW()
);

-- Create lockbox_codes table
CREATE TABLE IF NOT EXISTS lockbox_codes (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  lockbox_id VARCHAR NOT NULL REFERENCES lockboxes(id) ON DELETE CASCADE,
  code VARCHAR(50) NOT NULL,
  lockbox_code_status lockbox_code_status NOT NULL DEFAULT 'active',
  last_used_at TIMESTAMP,
  use_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Add lockbox_id to vehicles
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'vehicles' AND column_name = 'lockbox_id'
  ) THEN
    ALTER TABLE vehicles ADD COLUMN lockbox_id VARCHAR REFERENCES lockboxes(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Add assigned_code_id to vehicle_check_out_logs
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'vehicle_check_out_logs' AND column_name = 'assigned_code_id'
  ) THEN
    ALTER TABLE vehicle_check_out_logs ADD COLUMN assigned_code_id VARCHAR REFERENCES lockbox_codes(id) ON DELETE SET NULL;
  END IF;
END $$;
