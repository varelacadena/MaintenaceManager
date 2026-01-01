
-- Force fix for fuel_level column
-- This migration will run regardless of previous attempts

-- For vehicle_check_out_logs
ALTER TABLE vehicle_check_out_logs DROP COLUMN IF EXISTS "fuelLevel";
ALTER TABLE vehicle_check_out_logs DROP COLUMN IF EXISTS fuel_level;
ALTER TABLE vehicle_check_out_logs ADD COLUMN fuel_level VARCHAR(20) NOT NULL DEFAULT 'full';

-- For vehicle_check_in_logs  
ALTER TABLE vehicle_check_in_logs DROP COLUMN IF EXISTS "fuelLevel";
ALTER TABLE vehicle_check_in_logs DROP COLUMN IF EXISTS fuel_level;
ALTER TABLE vehicle_check_in_logs ADD COLUMN fuel_level VARCHAR(20) NOT NULL DEFAULT 'full';
