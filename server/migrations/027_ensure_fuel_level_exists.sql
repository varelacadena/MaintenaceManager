
-- Ensure fuel_level column exists in vehicle_check_out_logs
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'vehicle_check_out_logs' 
    AND column_name = 'fuel_level'
  ) THEN
    ALTER TABLE vehicle_check_out_logs 
    ADD COLUMN fuel_level VARCHAR(20) NOT NULL DEFAULT 'full';
  END IF;
END $$;

-- Ensure fuel_level column exists in vehicle_check_in_logs
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'vehicle_check_in_logs' 
    AND column_name = 'fuel_level'
  ) THEN
    ALTER TABLE vehicle_check_in_logs 
    ADD COLUMN fuel_level VARCHAR(20) NOT NULL DEFAULT 'full';
  END IF;
END $$;

-- Drop old camelCase columns if they exist
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'vehicle_check_out_logs' 
    AND column_name = 'fuelLevel'
  ) THEN
    ALTER TABLE vehicle_check_out_logs DROP COLUMN "fuelLevel";
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'vehicle_check_in_logs' 
    AND column_name = 'fuelLevel'
  ) THEN
    ALTER TABLE vehicle_check_in_logs DROP COLUMN "fuelLevel";
  END IF;
END $$;
