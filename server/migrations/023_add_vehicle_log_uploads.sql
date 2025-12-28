
-- Add columns for vehicle check-out and check-in log uploads
ALTER TABLE uploads 
ADD COLUMN vehicle_check_out_log_id VARCHAR REFERENCES vehicle_check_out_logs(id) ON DELETE CASCADE,
ADD COLUMN vehicle_check_in_log_id VARCHAR REFERENCES vehicle_check_in_logs(id) ON DELETE CASCADE;

-- Add indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_uploads_checkout_log ON uploads(vehicle_check_out_log_id);
CREATE INDEX IF NOT EXISTS idx_uploads_checkin_log ON uploads(vehicle_check_in_log_id);
