
-- Add admin override column to vehicle check-out logs
ALTER TABLE vehicle_check_out_logs 
ADD COLUMN IF NOT EXISTS admin_override BOOLEAN DEFAULT false;
