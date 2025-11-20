-- Add missing vehicle-related columns to uploads table
ALTER TABLE uploads ADD COLUMN IF NOT EXISTS vehicle_id varchar REFERENCES vehicles(id) ON DELETE CASCADE;
ALTER TABLE uploads ADD COLUMN IF NOT EXISTS check_out_log_id varchar REFERENCES vehicle_check_out_logs(id) ON DELETE CASCADE;
ALTER TABLE uploads ADD COLUMN IF NOT EXISTS check_in_log_id varchar REFERENCES vehicle_check_in_logs(id) ON DELETE CASCADE;

-- Update the constraint to include new columns
ALTER TABLE uploads DROP CONSTRAINT IF EXISTS uploads_parent_check;
ALTER TABLE uploads ADD CONSTRAINT uploads_parent_check 
  CHECK (
    request_id IS NOT NULL OR 
    task_id IS NOT NULL OR 
    vehicle_id IS NOT NULL OR 
    check_out_log_id IS NOT NULL OR 
    check_in_log_id IS NOT NULL
  );

-- Ensure request_id and task_id are nullable
ALTER TABLE uploads 
ALTER COLUMN request_id DROP NOT NULL,
ALTER COLUMN task_id DROP NOT NULL;