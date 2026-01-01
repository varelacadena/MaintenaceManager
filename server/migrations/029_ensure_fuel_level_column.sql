
-- Drop any incorrectly named columns and ensure fuel_level exists correctly
DO $$
BEGIN
  -- First, remove any incorrectly cased columns if they exist
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'vehicle_check_out_logs' 
    AND column_name = 'fuelLevel'
  ) THEN
    ALTER TABLE vehicle_check_out_logs DROP COLUMN "fuelLevel";
  END IF;

  -- Now ensure fuel_level exists with correct type and constraint
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'vehicle_check_out_logs' 
    AND column_name = 'fuel_level'
  ) THEN
    ALTER TABLE vehicle_check_out_logs 
    ADD COLUMN fuel_level VARCHAR(20) NOT NULL DEFAULT 'full';
  END IF;
END $$;

-- Do the same for check-in logs
DO $$
BEGIN
  -- First, remove any incorrectly cased columns if they exist
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'vehicle_check_in_logs' 
    AND column_name = 'fuelLevel'
  ) THEN
    ALTER TABLE vehicle_check_in_logs DROP COLUMN "fuelLevel";
  END IF;

  -- Now ensure fuel_level exists with correct type and constraint
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'vehicle_check_in_logs' 
    AND column_name = 'fuel_level'
  ) THEN
    ALTER TABLE vehicle_check_in_logs 
    ADD COLUMN fuel_level VARCHAR(20) NOT NULL DEFAULT 'full';
  END IF;
END $$;
