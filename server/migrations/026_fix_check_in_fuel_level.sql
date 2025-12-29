
-- Fix fuel level column name in vehicle_check_in_logs
ALTER TABLE vehicle_check_in_logs 
ADD COLUMN IF NOT EXISTS fuel_level VARCHAR(20) NOT NULL DEFAULT '100';

-- Copy data from fuelLevel if it exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'vehicle_check_in_logs' 
    AND column_name = 'fuelLevel'
  ) THEN
    UPDATE vehicle_check_in_logs SET fuel_level = "fuelLevel";
    ALTER TABLE vehicle_check_in_logs DROP COLUMN "fuelLevel";
  END IF;
END $$;
