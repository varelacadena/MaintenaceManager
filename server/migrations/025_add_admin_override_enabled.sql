
-- Add admin override enabled column to vehicle reservations
ALTER TABLE vehicle_reservations 
ADD COLUMN IF NOT EXISTS admin_override_enabled BOOLEAN DEFAULT false;
