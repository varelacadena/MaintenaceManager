
-- Add key pickup method, admin notes, and advisory acceptance to vehicle reservations
ALTER TABLE vehicle_reservations
ADD COLUMN IF NOT EXISTS key_pickup_method VARCHAR(50),
ADD COLUMN IF NOT EXISTS admin_notes TEXT,
ADD COLUMN IF NOT EXISTS advisory_accepted BOOLEAN DEFAULT FALSE;
