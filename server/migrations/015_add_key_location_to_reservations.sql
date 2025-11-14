
-- Add key_location and cancellation_reason columns to vehicle_reservations
ALTER TABLE vehicle_reservations
ADD COLUMN IF NOT EXISTS key_location VARCHAR(100),
ADD COLUMN IF NOT EXISTS cancellation_reason TEXT;
