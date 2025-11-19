
-- Add vehicle-related columns to uploads table
ALTER TABLE uploads
ADD COLUMN IF NOT EXISTS vehicle_id TEXT REFERENCES vehicles(id) ON DELETE CASCADE,
ADD COLUMN IF NOT EXISTS check_out_log_id TEXT REFERENCES vehicle_check_out_logs(id) ON DELETE CASCADE,
ADD COLUMN IF NOT EXISTS check_in_log_id TEXT REFERENCES vehicle_check_in_logs(id) ON DELETE CASCADE;

-- Make requestId and taskId nullable since uploads can now be for vehicles too
ALTER TABLE uploads
ALTER COLUMN request_id DROP NOT NULL,
ALTER COLUMN task_id DROP NOT NULL;
