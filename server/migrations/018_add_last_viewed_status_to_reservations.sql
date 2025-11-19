
-- Add last_viewed_status to track the status when user last viewed the reservation
ALTER TABLE vehicle_reservations ADD COLUMN IF NOT EXISTS last_viewed_status VARCHAR(50);

-- Set initial value to current status for existing reservations
UPDATE vehicle_reservations SET last_viewed_status = status WHERE last_viewed_status IS NULL;
