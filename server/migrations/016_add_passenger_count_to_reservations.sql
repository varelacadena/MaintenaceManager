
-- Add passenger_count column to vehicle_reservations
ALTER TABLE vehicle_reservations ADD COLUMN IF NOT EXISTS passenger_count INTEGER;

-- Update existing rows to have a default passenger count of 1
UPDATE vehicle_reservations SET passenger_count = 1 WHERE passenger_count IS NULL;

-- Make passenger_count NOT NULL after setting defaults
ALTER TABLE vehicle_reservations ALTER COLUMN passenger_count SET NOT NULL;

-- Make vehicle_id nullable to allow reservations without assigned vehicles
ALTER TABLE vehicle_reservations ALTER COLUMN vehicle_id DROP NOT NULL;
